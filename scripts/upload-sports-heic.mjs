import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { readdir, readFile } from "fs/promises";
import { join, extname } from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const SUPABASE_URL = "https://rzsmcysgijeshiiuyqjn.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6c21jeXNnaWplc2hpaXV5cWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA1MTMyOCwiZXhwIjoyMDkwNjI3MzI4fQ.yTzO6Inb9o1re6O83hK2eIjqvpJ1q9n2TnlwcHfZh_4";

const BUCKET = "lcic-gallery";
const STORAGE_PREFIX = "photos/Students_2026-02/Sports_Day";
const THUMB_PREFIX = "thumbs/Students_2026-02/Sports_Day";

const SRC_DIR =
  "H:/공유 드라이브/MARKETING TEAM/KOREA/International Marketing Asian Division I_Team Korea/LCIC Student Photo/2026/2. Feb 2026/Students Photo _ February 2026/3. LCIC ACTIVITY/sports";

const FAILED_FILES = [
  "IMG_2579.jpg", "IMG_2581.jpg", "IMG_2582.jpg", "IMG_2583.jpg",
  "IMG_2584.jpg", "IMG_2585.jpg", "IMG_2586.jpg", "IMG_2587.jpg",
  "IMG_2588.jpg", "IMG_2589.jpg",
];

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function convertAndUpload(filePath, name, index, total) {
  const photoKey = `${STORAGE_PREFIX}/${name}`;
  const thumbKey = `${THUMB_PREFIX}/${name}`;

  try {
    // Use ffmpeg to decode (handles HEIC disguised as jpg)
    const { stdout } = await execFileAsync(
      "ffmpeg",
      ["-i", filePath, "-frames:v", "1", "-f", "image2pipe", "-vcodec", "mjpeg", "-q:v", "2", "-"],
      { encoding: "buffer", maxBuffer: 50 * 1024 * 1024 }
    );

    const photoBuf = await sharp(stdout, { failOn: "none" })
      .rotate()
      .resize({ width: 1920, withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();

    const thumbBuf = await sharp(stdout, { failOn: "none" })
      .rotate()
      .resize({ width: 480, withoutEnlargement: true })
      .jpeg({ quality: 70, mozjpeg: true })
      .toBuffer();

    const { error: e1 } = await supabase.storage.from(BUCKET).upload(photoKey, photoBuf, { contentType: "image/jpeg", upsert: true });
    if (e1) throw e1;
    const { error: e2 } = await supabase.storage.from(BUCKET).upload(thumbKey, thumbBuf, { contentType: "image/jpeg", upsert: true });
    if (e2) throw e2;

    console.log(`[${index + 1}/${total}] ✓ ${name} (${(photoBuf.length / 1024 / 1024).toFixed(1)}MB)`);
    return { success: true };
  } catch (err) {
    console.error(`[${index + 1}/${total}] ✗ ${name}: ${err.message}`);
    return { success: false };
  }
}

async function main() {
  for (let i = 0; i < FAILED_FILES.length; i++) {
    const name = FAILED_FILES[i];
    await convertAndUpload(join(SRC_DIR, name), name, i, FAILED_FILES.length);
  }
}

main().catch(console.error);
