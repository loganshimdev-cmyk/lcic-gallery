const test = require("node:test");
const assert = require("node:assert");
const crypto = require("crypto");

// encrypt-buddy.cjs와 동일한 encrypt
function encrypt(obj, password) {
  const plaintext = Buffer.from(JSON.stringify(obj), "utf8");
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([salt, iv, tag, ct]).toString("base64");
}
// buddy-check.html decrypt와 동형(레이아웃: salt16|iv12|tag16|ct)
function decrypt(b64, password) {
  const raw = Buffer.from(b64, "base64");
  const salt = raw.subarray(0, 16), iv = raw.subarray(16, 28),
        tag = raw.subarray(28, 44), ct = raw.subarray(44);
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
  const d = crypto.createDecipheriv("aes-256-gcm", key, iv);
  d.setAuthTag(tag);
  return JSON.parse(Buffer.concat([d.update(ct), d.final()]).toString("utf8"));
}

test("올바른 cred 복호화 성공", () => {
  const cred = "lee@example.com|20020315|1451";
  const blob = encrypt({ name: "이가나", uni: "백석대" }, cred);
  assert.deepStrictEqual(decrypt(blob, cred), { name: "이가나", uni: "백석대" });
});

test("틀린 cred 복호화 실패", () => {
  const blob = encrypt({ name: "이가나" }, "lee@example.com|20020315|1451");
  assert.throws(() => decrypt(blob, "lee@example.com|20020315|9999"));
});
