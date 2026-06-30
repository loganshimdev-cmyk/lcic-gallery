/* Encrypt the standalone invoice app and emit a password-gated invoice.html.
   Scheme matches open-slots.html: salt(16)+iv(12)+tag(16)+ct, PBKDF2 100k SHA-256, AES-GCM-256. */
const fs = require("fs");
const path = require("path");
const { webcrypto } = require("crypto");
const subtle = webcrypto.subtle;

const SRC = path.resolve(__dirname, "../../lcic-invoice/index.html");
const OUT = path.resolve(__dirname, "../invoice.html");
const PASSWORD = "lcic!4692";
const ITER = 100000;

(async () => {
  const html = fs.readFileSync(SRC, "utf8");
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const pwKey = await subtle.importKey("raw", new TextEncoder().encode(PASSWORD), "PBKDF2", false, ["deriveKey"]);
  const key = await subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" },
    pwKey, { name: "AES-GCM", length: 256 }, false, ["encrypt"]
  );
  const enc = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(html)));
  const ct = enc.slice(0, enc.length - 16), tag = enc.slice(enc.length - 16);
  const out = new Uint8Array(16 + 12 + 16 + ct.length);
  out.set(salt, 0); out.set(iv, 16); out.set(tag, 28); out.set(ct, 44);
  const blob = Buffer.from(out).toString("base64");

  const page = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LCIC Invoice</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;font-family:"Pretendard","Malgun Gothic",-apple-system,sans-serif;background:#e9edf2;color:#1f2733}
  .gate{max-width:340px;margin:20vh auto;text-align:center;padding:28px 24px;background:#fff;border:1px solid #d9e0ea;border-radius:16px;box-shadow:0 8px 30px rgba(20,40,70,.12)}
  .gate h1{font-size:18px;color:#3d4e6b;margin:0 0 4px}
  .gate .sub{font-size:13px;color:#6b7686;margin:0 0 18px}
  .gate input{width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:10px;font-size:1rem}
  .gate button{margin-top:10px;width:100%;padding:12px;border:0;border-radius:10px;background:#3d4e6b;color:#fff;font-size:1rem;font-weight:700;cursor:pointer}
  .gate .err{color:#dc2626;font-size:.85rem;min-height:1.2em;margin-top:8px}
</style>
</head>
<body>
<div id="gate" class="gate">
  <h1>LCIC 인보이스 시스템</h1>
  <p class="sub">비밀번호를 입력하세요</p>
  <input id="pw" type="password" placeholder="비밀번호" autofocus />
  <button onclick="unlock()">열기</button>
  <div id="err" class="err"></div>
</div>
<script>
const BLOB = "${blob}";
const ITER = ${ITER};
function b64ToBytes(b64){ const bin=atob(b64); const a=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i); return a; }
async function decrypt(blobB64, password){
  const raw=b64ToBytes(blobB64);
  const salt=raw.slice(0,16), iv=raw.slice(16,28), tag=raw.slice(28,44), ct=raw.slice(44);
  const ctWithTag=new Uint8Array(ct.length+tag.length); ctWithTag.set(ct); ctWithTag.set(tag,ct.length);
  const pwKey=await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  const key=await crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:ITER,hash:"SHA-256"}, pwKey, {name:"AES-GCM",length:256}, false, ["decrypt"]);
  const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv}, key, ctWithTag);
  return new TextDecoder().decode(plain);
}
async function unlock(){
  const err=document.getElementById("err"); err.textContent="";
  let html;
  try{ html=await decrypt(BLOB, document.getElementById("pw").value); }
  catch{ err.textContent="비밀번호가 올바르지 않습니다."; return; }
  document.open(); document.write(html); document.close();
}
document.getElementById("pw").addEventListener("keydown",function(e){ if(e.key==="Enter") unlock(); });
</script>
</body>
</html>
`;
  fs.writeFileSync(OUT, page);
  console.log("wrote", OUT, "| blob b64 len:", blob.length, "| page bytes:", page.length);
})();
