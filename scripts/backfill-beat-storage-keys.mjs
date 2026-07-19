import mongoose from "mongoose";

function extractCloudinaryKey(url) {
  try {
    const parsed = new URL(url);
    const marker = "/upload/";
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex < 0) return null;

    let remainder = parsed.pathname.slice(markerIndex + marker.length);
    remainder = remainder.replace(/^v\d+\//, "");
    return decodeURIComponent(remainder);
  } catch {
    return null;
  }
}

function extractR2Key(url, r2PublicUrl) {
  if (!r2PublicUrl || !url.startsWith(r2PublicUrl)) return null;
  return url.slice(r2PublicUrl.length).replace(/^\/+/, "");
}

function inferStorageKey(value, r2PublicUrl) {
  if (!value) return null;
  if (!value.startsWith("http://") && !value.startsWith("https://")) {
    return value;
  }

  const fromCloudinary = extractCloudinaryKey(value);
  if (fromCloudinary) return fromCloudinary;

  const fromR2 = extractR2Key(value, r2PublicUrl);
  if (fromR2) return fromR2;

  return null;
}

async function run() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI is required");

  const r2PublicUrl = process.env.R2_PUBLIC_URL
    ? process.env.R2_PUBLIC_URL.replace(/\/+$/, "")
    : "";

  await mongoose.connect(mongoUri, { bufferCommands: false });
  const db = mongoose.connection.db;
  const beats = await db.collection("beats").find({}).toArray();

  let updated = 0;
  const unresolved = [];

  for (const beat of beats) {
    const storageKeys = beat.storageKeys || {};

    const nextKeys = {
      preview:
        storageKeys.preview ||
        inferStorageKey(beat.audioTaggedUrl, r2PublicUrl) ||
        undefined,
      master:
        storageKeys.master ||
        inferStorageKey(beat.audioFullUrl, r2PublicUrl) ||
        undefined,
      stems:
        storageKeys.stems ||
        inferStorageKey(beat.stemsUrl, r2PublicUrl) ||
        undefined,
      artwork:
        storageKeys.artwork ||
        inferStorageKey(beat.coverUrl, r2PublicUrl) ||
        undefined,
    };

    const changed =
      nextKeys.preview !== storageKeys.preview ||
      nextKeys.master !== storageKeys.master ||
      nextKeys.stems !== storageKeys.stems ||
      nextKeys.artwork !== storageKeys.artwork;

    if (changed) {
      await db.collection("beats").updateOne(
        { _id: beat._id },
        {
          $set: {
            storageKeys: nextKeys,
          },
        }
      );
      updated += 1;
    }

    if (beat.audioTaggedUrl && !nextKeys.preview) {
      unresolved.push({ beatId: String(beat._id), field: "audioTaggedUrl", value: beat.audioTaggedUrl });
    }
    if (beat.audioFullUrl && !nextKeys.master) {
      unresolved.push({ beatId: String(beat._id), field: "audioFullUrl", value: beat.audioFullUrl });
    }
    if (beat.stemsUrl && !nextKeys.stems) {
      unresolved.push({ beatId: String(beat._id), field: "stemsUrl", value: beat.stemsUrl });
    }
    if (beat.coverUrl && !nextKeys.artwork) {
      unresolved.push({ beatId: String(beat._id), field: "coverUrl", value: beat.coverUrl });
    }
  }

  console.log(
    JSON.stringify(
      {
        scanned: beats.length,
        updated,
        unresolvedCount: unresolved.length,
        unresolved: unresolved.slice(0, 100),
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {
    // noop
  }
  process.exit(1);
});
