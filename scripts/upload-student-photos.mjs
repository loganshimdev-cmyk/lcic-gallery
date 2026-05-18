import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { readdir, readFile, mkdir, stat } from "fs/promises";
import { join, extname, relative } from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// ── Config ──────────────────────────────────────────────
const SUPABASE_URL = "https://rzsmcysgijeshiiuyqjn.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6c21jeXNnaWplc2hpaXV5cWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA1MTMyOCwiZXhwIjoyMDkwNjI3MzI4fQ.yTzO6Inb9o1re6O83hK2eIjqvpJ1q9n2TnlwcHfZh_4";

const BUCKET = "lcic-gallery";
const STORAGE_PREFIX = "photos/Students_2026-01"; // destination in Supabase
const THUMB_PREFIX = "thumbs/Students_2026-01";

// Korean folder name → English mapping
const FOLDER_MAP = {
  "1. 입학식": "01_Orientation",
  "2. CLASS": "02_Class",
  "3. LCIC ACTIVITY": "03_Activity",
  "4. 방과후 프로그램": "04_After_School",
  "5. 졸업식": "05_Graduation",
  "extra": "extra",
  "마시멜로우 챌린지": "Marshmallow_Challenge",
  "망고 견학 편집 사진": "Mango_Farm_Tour",
  "세부 주청사 투어": "Cebu_Capitol_Tour",
  "호핑투어": "Hopping_Tour",
  "버디": "Buddy",
  "액티비티": "Activity",
  "1. LCIC 학생 단체 사진": "01_Group_Photo",
  "2. 개인 스피치 + 공연": "02_Speech_Performance",
  "3. I love Cebu Dance": "03_I_Love_Cebu_Dance",
  "4. 수료증 수여 사진": "04_Certificate",
};

const SRC_DIR =
  "H:/공유 드라이브/MARKETING TEAM/KOREA/International Marketing Asian Division I_Team Korea/LCIC Student Photo/2026/1. Jan 2026/Students Photo _ January 2026";

const MAX_WIDTH = 1920;
const THUMB_WIDTH = 480;
const QUALITY = 80;
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".heic", ".webp"]);
const CONCURRENT = 3; // parallel uploads (lower for ffmpeg)
const SKIP_EXISTING = true; // skip already uploaded files

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ── Helpers ─────────────────────────────────────────────
async function walkDir(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkDir(full)));
    } else {
      const ext = extname(entry.name).toLowerCase();
      if (IMAGE_EXTS.has(ext)) {
        files.push(full);
      }
    }
  }
  return files;
}

function sanitize(name) {
  // Replace Korean folder names, then clean up remaining characters
  return name
    .split("/")
    .map((part) => FOLDER_MAP[part] || part.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_\-().]/g, ""))
    .join("/");
}

function buildStoragePath(filePath) {
  const rel = relative(SRC_DIR, filePath).replace(/\\/g, "/");
  const sanitized = sanitize(rel);
  // Change extension to .jpg
  return sanitized.replace(/\.[^.]+$/, ".jpg");
}

async function convertAndUpload(filePath, index, total) {
  const storagePath = buildStoragePath(filePath);
  const photoKey = `${STORAGE_PREFIX}/${storagePath}`;
  const thumbKey = `${THUMB_PREFIX}/${storagePath}`;

  // Skip if already uploaded
  if (SKIP_EXISTING) {
    const { data } = await supabase.storage.from(BUCKET).list(
      photoKey.substring(0, photoKey.lastIndexOf("/")),
      { search: photoKey.substring(photoKey.lastIndexOf("/") + 1) }
    );
    if (data && data.length > 0) {
      console.log(`[${index + 1}/${total}] ⊘ ${storagePath} (skipped)`);
      return { success: true, path: storagePath, skipped: true };
    }
  }

  try {
    const ext = extname(filePath).toLowerCase();
    let buf;

    if (ext === ".heic") {
      // Use ffmpeg to convert HEIC → raw JPG buffer
      const { stdout } = await execFileAsync(
        "ffmpeg",
        ["-i", filePath, "-frames:v", "1", "-f", "image2pipe", "-vcodec", "mjpeg", "-q:v", "2", "-"],
        { encoding: "buffer", maxBuffer: 50 * 1024 * 1024 }
      );
      buf = stdout;
    } else {
      buf = await readFile(filePath);
    }

    // Convert to JPG, resize for web
    const photoBuf = await sharp(buf, { failOn: "none" })
      .rotate() // auto-rotate based on EXIF
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toBuffer();

    // Create thumbnail
    const thumbBuf = await sharp(buf, { failOn: "none" })
      .rotate()
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 70, mozjpeg: true })
      .toBuffer();

    // Upload photo
    const { error: photoErr } = await supabase.storage
      .from(BUCKET)
      .upload(photoKey, photoBuf, {
        contentType: "image/jpeg",
        upsert: true,
      });
    if (photoErr) throw photoErr;

    // Upload thumbnail
    const { error: thumbErr } = await supabase.storage
      .from(BUCKET)
      .upload(thumbKey, thumbBuf, {
        contentType: "image/jpeg",
        upsert: true,
      });
    if (thumbErr) throw thumbErr;

    const sizeMB = (photoBuf.length / 1024 / 1024).toFixed(1);
    console.log(`[${index + 1}/${total}] ✓ ${storagePath} (${sizeMB}MB)`);
    return { success: true, path: storagePath };
  } catch (err) {
    console.error(`[${index + 1}/${total}] ✗ ${storagePath}: ${err.message}`);
    return { success: false, path: storagePath, error: err.message };
  }
}

// ── Main ────────────────────────────────────────────────
async function main() {
  console.log("Scanning files...");
  const files = await walkDir(SRC_DIR);
  console.log(`Found ${files.length} images\n`);

  const results = [];
  // Process in batches of CONCURRENT
  for (let i = 0; i < files.length; i += CONCURRENT) {
    const batch = files.slice(i, i + CONCURRENT);
    const batchResults = await Promise.all(
      batch.map((f, j) => convertAndUpload(f, i + j, files.length))
    );
    results.push(...batchResults);
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success);

  console.log(`\n=== Done ===`);
  console.log(`Success: ${succeeded}/${files.length}`);
  if (failed.length > 0) {
    console.log(`Failed:`);
    failed.forEach((f) => console.log(`  - ${f.path}: ${f.error}`));
  }
}

main().catch(console.error);
