import { storageService } from "@/lib/services/storage.service";

/**
 * Presign coverUrl on each item in a { beat, startingPrice } array.
 */
export async function withPresignedBeatCovers<
  T extends { beat: { coverUrl?: string | null; audioTaggedUrl?: string | null } }
>(items: T[]): Promise<T[]> {
  return Promise.all(
    items.map(async (item) => ({
      ...item,
      beat: {
        ...item.beat,
        coverUrl: await storageService.presignUrl(item.beat.coverUrl),
        audioTaggedUrl: await storageService.presignUrl(item.beat.audioTaggedUrl),
      },
    }))
  );
}

/**
 * Presign coverUrl and imageUrls on a beat-pack-shaped object.
 */
export async function withPresignedPackImages<
  T extends { coverUrl?: string | null; imageUrls?: (string | null | undefined)[] }
>(pack: T): Promise<T> {
  const [coverUrl, imageUrls] = await Promise.all([
    storageService.presignUrl(pack.coverUrl),
    storageService.presignUrls(pack.imageUrls || []),
  ]);
  return { ...pack, coverUrl, imageUrls };
}
