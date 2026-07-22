import { v2 as cloudinary } from "cloudinary";

function mask(value) {
  if (!value) return "(missing)";
  if (value.length <= 4) return "****";
  return `${"*".repeat(Math.max(value.length - 4, 4))}${value.slice(-4)}`;
}

async function run() {
  const cloudinaryUrl = process.env.CLOUDINARY_URL;

  if (!cloudinaryUrl) {
    throw new Error(
      "CLOUDINARY_URL is not set. Run with `node --env-file=.env scripts/test-cloudinary-credentials.mjs` or export the variable first."
    );
  }

  cloudinary.config({ secure: true });
  const config = cloudinary.config();

  if (!config.cloud_name || !config.api_key || !config.api_secret) {
    throw new Error("Cloudinary credentials are incomplete. Check CLOUDINARY_URL format.");
  }

  console.log("Checking Cloudinary credentials...");
  console.log(`Cloud name: ${config.cloud_name}`);
  console.log(`API key: ${mask(String(config.api_key))}`);

  const pingResult = await cloudinary.api.ping();
  if (pingResult?.status !== "ok") {
    throw new Error(`Unexpected Cloudinary ping response: ${JSON.stringify(pingResult)}`);
  }

  console.log("Cloudinary auth successful. API ping status: ok");
}

run().catch((error) => {
  console.error("Cloudinary credential test failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
