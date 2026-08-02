/**
 * Client-side S3 multipart upload with parallel parts and progress.
 *
 * Flow:
 *   1. POST /api/upload/multipart → { uploadId, key, publicUrl, partUrls[], partSize }
 *   2. Slice file → upload each part in parallel (max concurrency) to presigned PUT URLs
 *   3. PUT /api/upload/multipart → { url, key } (complete)
 *   4. On failure → DELETE /api/upload/multipart (abort)
 */

const MAX_CONCURRENCY = 4;
const MAX_RETRIES = 3;

export interface MultipartUploadResult {
  url: string;
  key: string;
}

interface InitiateResponse {
  uploadId: string;
  key: string;
  publicUrl: string;
  partUrls: string[];
  partSize: number;
}

export async function uploadMultipart(
  file: File,
  opts: {
    producerId?: string;
    beatId: string;
    category: string;
    contentType?: string;
    onProgress?: (percent: number) => void;
    signal?: AbortSignal;
  }
): Promise<MultipartUploadResult> {
  const { producerId, beatId, category, onProgress, signal } = opts;
  const mime = opts.contentType || file.type || "application/octet-stream";

  // 1. Initiate
  const initRes = await fetch("/api/upload/multipart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      producerId,
      beatId,
      category,
      contentType: mime,
      fileSize: file.size,
    }),
    signal,
  });

  if (!initRes.ok) {
    const err = await initRes.json().catch(() => ({}));
    throw new Error(err.error || "Failed to initiate multipart upload");
  }

  const { uploadId, key, publicUrl, partUrls, partSize } =
    (await initRes.json()) as InitiateResponse;

  // 2. Upload parts with parallel concurrency
  const totalParts = partUrls.length;
  const partProgress = new Array<number>(totalParts).fill(0);
  const completedParts: { partNumber: number; etag: string }[] = [];

  function reportProgress() {
    if (!onProgress) return;
    const totalLoaded = partProgress.reduce((a, b) => a + b, 0);
    onProgress(Math.min(99, Math.round((totalLoaded / file.size) * 100)));
  }

  async function uploadPart(
    partIndex: number,
    retries = 0
  ): Promise<void> {
    const partNumber = partIndex + 1;
    const start = partIndex * partSize;
    const end = Math.min(start + partSize, file.size);
    const blob = file.slice(start, end);
    const partSizeActual = end - start;

    try {
      const etag = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", partUrls[partIndex]);

        if (signal) {
          signal.addEventListener("abort", () => xhr.abort(), { once: true });
        }

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            partProgress[partIndex] = e.loaded;
            reportProgress();
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const etagHeader = xhr.getResponseHeader("ETag");
            if (!etagHeader) {
              reject(new Error(`Part ${partNumber}: no ETag in response`));
              return;
            }
            partProgress[partIndex] = partSizeActual;
            reportProgress();
            resolve(etagHeader);
          } else {
            reject(new Error(`Part ${partNumber} failed: ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error(`Part ${partNumber}: network error`));
        xhr.onabort = () => reject(new Error("Upload aborted"));
        xhr.send(blob);
      });

      completedParts.push({ partNumber, etag });
    } catch (err) {
      if (retries < MAX_RETRIES && !(err instanceof Error && err.message === "Upload aborted")) {
        await new Promise((r) => setTimeout(r, 1000 * (retries + 1)));
        return uploadPart(partIndex, retries + 1);
      }
      throw err;
    }
  }

  try {
    // Process parts with bounded concurrency
    const queue = Array.from({ length: totalParts }, (_, i) => i);
    const workers: Promise<void>[] = [];

    for (let w = 0; w < Math.min(MAX_CONCURRENCY, totalParts); w++) {
      workers.push(
        (async () => {
          while (queue.length > 0) {
            const idx = queue.shift()!;
            await uploadPart(idx);
          }
        })()
      );
    }

    await Promise.all(workers);

    // Sort by part number before completing
    completedParts.sort((a, b) => a.partNumber - b.partNumber);

    // 3. Complete
    const completeRes = await fetch("/api/upload/multipart", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, uploadId, parts: completedParts }),
      signal,
    });

    if (!completeRes.ok) {
      const err = await completeRes.json().catch(() => ({}));
      throw new Error(err.error || "Failed to complete multipart upload");
    }

    onProgress?.(100);
    const result = await completeRes.json();
    return { url: result.url || publicUrl, key: result.key || key };
  } catch (err) {
    // 4. Abort on failure
    try {
      await fetch("/api/upload/multipart", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, uploadId }),
      });
    } catch {
      // best-effort abort
    }
    throw err;
  }
}

/**
 * Threshold for switching to multipart upload (50 MB).
 * Files smaller than this use a single presigned PUT.
 */
export const MULTIPART_THRESHOLD = 50 * 1024 * 1024;
