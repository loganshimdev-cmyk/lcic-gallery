import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { readdir, readFile } from "fs/promises";
import { join, extname, relative } from "path";

const SUPABASE_URL = "https://rzsmcysgijeshiiuyqjn.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6c21jeXNnaWplc2hpaXV5cWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA1MTMyOCwiZXhwIjoyMDkwNjI3MzI4fQ.yTzO6Inb9o1re6O83hK2eIjqvpJ1q9n2TnlwcHfZh_4";

const BUCKET = "lcic-gallery";
const STORAGE_PREFIX = "photos/Students_2026-02/Sports_Day";
const THUMB_PREFIX = "thumbs/Students_2026-02/Sports_Day";

const SRC_DIR =
  "H:/공유 드라이브/MARKETING TEAM/KOREA/International Marketing Asian Division I_Team Korea/LCIC Student Photo/2026/2. Feb 2026/Students Photo _ February 2026/3. LCIC ACTIVITY/sports";

const MAX_WIDTH = 1920;
const THUMB_WIDTH = 480;
const QUALITY = 80;
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".heic"]);
const CONCURRENT = 5;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function getFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => !e.isDirectory() && IMAGE_EXTS.has(extname(e.name).toLowerCase()))
    .map((e) => join(dir, e.name));
}

async function convertAndUpload(filePath, index, total) {
  const name = filePath.split(/[\\/]/).pop().replace(/\.[^.]+$/, ".jpg");
  const photoKey = `${STORAGE_PREFIX}/${name}`;
  const thumbKey = `${THUMB_PREFIX}/${name}`;

  try {
    const buf = await readFile(filePath);

    const photoBuf = await sharp(buf, { failOn: "none" })
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toBuffer();

    const thumbBuf = await sharp(buf, { failOn: "none" })
      .rotate()
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 70, mozjpeg: true })
      .toBuffer();

    const { error: e1 } = await supabase.storage.from(BUCKET).upload(photoKey, photoBuf, { contentType: "image/jpeg", upsert: true });
    if (e1) throw e1;

    const { error: e2 } = await supabase.storage.from(BUCKET).upload(thumbKey, thumbBuf, { contentType: "image/jpeg", upsert: true });
    if (e2) throw e2;

    const sizeMB = (photoBuf.length / 1024 / 1024).toFixed(1);
    console.log(`[${index + 1}/${total}] ✓ ${name} (${sizeMB}MB)`);
    return { success: true, name };
  } catch (err) {
    console.error(`[${index + 1}/${total}] ✗ ${name}: ${err.message}`);
    return { success: false, name, error: err.message };
  }
}

async function main() {
  const files = await getFiles(SRC_DIR);
  console.log(`Found ${files.length} images\n`);

  const results = [];
  for (let i = 0; i < files.length; i += CONCURRENT) {
    const batch = files.slice(i, i + CONCURRENT);
    const r = await Promise.all(batch.map((f, j) => convertAndUpload(f, i + j, files.length)));
    results.push(...r);
  }

  const ok = results.filter((r) => r.success).length;
  const fail = results.filter((r) => !r.success);
  console.log(`\n=== Done === Success: ${ok}/${files.length}`);
  if (fail.length) fail.forEach((f) => console.log(`  ✗ ${f.name}: ${f.error}`));
}

main().catch(console.error);
