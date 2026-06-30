# 백석대 버디시스템 주간 신청 체크 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 백석대 학생이 매주 수요일 버디시스템 신청 스크린샷을 본인 인증 후 자가 보고하고, 관리자가 기존 status-reports.html에서 주차별 현황을 확인하는 기능을 추가한다.

**Architecture:** 기존 lcic-gallery 패턴(이메일+생일+휴대폰4 AES-GCM 본인확인 게이트 / Supabase anon-INSERT·admin-read / status-reports 비공개 버킷)을 그대로 복제한다. 신규 학생 페이지 `buddy-check.html`, 신규 암호화 스크립트 `scripts/encrypt-buddy.cjs`, 신규 테이블 `buddy_checkins`, 기존 관리자 페이지에 탭 1개 추가.

**Tech Stack:** 정적 HTML + ES 모듈, Web Crypto(AES-256-GCM/PBKDF2), Supabase JS v2, Node.js(crypto) 빌드 스크립트, Playwright(검증).

---

## File Structure

- **Create** `scripts/encrypt-buddy.cjs` — `_apply-export.csv`에서 University가 "백석" 포함인 학생만 필터해 `{ k, b }`(b는 `{name}`만 암호화) 블롭 배열 + BUDDY_PEPPER를 `buddy-check.html`의 `@@BUDDY_DATA@@` 센티넬에 주입.
- **Create** `scripts/test-encrypt-buddy.cjs` — encrypt→decrypt 라운드트립 단위 테스트(node:test).
- **Create** `buddy-check.html` — 학생용. 로그인 게이트(이름만 복호화) + 주차 계산 + 스크린샷 업로드(스토리지 + buddy_checkins INSERT).
- **Modify** `status-reports.html` — 4번째 탭 "버디 신청"(학생×주차 매트릭스, signed URL 열람) 추가.
- **Modify** `SETUP.md` — buddy_checkins 테이블/RLS SQL 문서화.
- **Manual** Supabase 대시보드 — buddy_checkins 테이블 + RLS 생성(SQL은 Task 1에 포함).

**설정 상수(빌드/페이지 공통, 기본값 — 사용자 확정 필요):**
- `PROGRAM_START = "2026-07-01"` — 백석대 프로그램 **첫 수요일**(이 날짜가 수요일이어야 주차 계산이 수요일에 맞음).
- `TOTAL_WEEKS = 4` — 체크 대상 주차 수.

---

## Task 1: Supabase 테이블 + RLS 생성 (수동 + 문서화)

**Files:**
- Modify: `SETUP.md` (끝에 섹션 추가)

- [ ] **Step 1: SETUP.md에 buddy_checkins 섹션 추가**

`SETUP.md` 파일 맨 끝에 아래 내용을 추가한다:

````markdown

---

## 버디 신청 주간 체크 (buddy_checkins)

`buddy-check.html`(학생 자가 보고) → INSERT, `status-reports.html`(관리자) → SELECT.
`student_applications`/`status_reports`와 동일한 anon-INSERT / admin-read 패턴.
스크린샷은 기존 `status-reports` 버킷의 `buddy/` 하위 폴더를 재사용한다(신규 버킷 불필요).

Supabase 대시보드 → SQL Editor 에서 1회 실행:

```sql
create table if not exists buddy_checkins (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  student_name text,
  student_email text,
  university text,
  week_no int,
  week_label text,
  checkin_date date,
  file_path text
);

create index if not exists buddy_checkins_email_idx on buddy_checkins (student_email);
create index if not exists buddy_checkins_week_idx on buddy_checkins (week_no);

alter table buddy_checkins enable row level security;

-- 누구나 제출(INSERT)만 가능 — anon SELECT 정책은 만들지 않는다.
create policy "anyone can submit buddy checkin"
  on buddy_checkins for insert
  to anon, authenticated
  with check (true);

create policy "admin can read buddy checkins"
  on buddy_checkins for select
  to authenticated using (true);

create policy "admin can delete buddy checkins"
  on buddy_checkins for delete
  to authenticated using (true);
```

스토리지 정책은 기존 `status-reports` 버킷 정책(anyone can upload / admin read·delete)을
그대로 사용하므로 추가 작업이 없다.
````

- [ ] **Step 2: 사용자에게 SQL 실행 요청을 기록**

이 SQL은 Supabase 대시보드에서 사용자가 직접 1회 실행해야 한다(자동 실행 불가).
구현 마지막(Task 7)에서 안내한다. 지금은 문서화만 한다.

- [ ] **Step 3: Commit**

```bash
git add SETUP.md
git commit -m "docs(버디체크): buddy_checkins 테이블·RLS SETUP 추가"
```

---

## Task 2: encrypt-buddy.cjs 작성

**Files:**
- Create: `scripts/encrypt-buddy.cjs`

- [ ] **Step 1: encrypt-buddy.cjs 작성**

`scripts/encrypt-buddy.cjs` 생성. encrypt-status.cjs의 검증된 CSV 파서·normalizer·encrypt를
그대로 쓰되, University가 "백석" 포함인 행만 필터하고 암호문 내용은 `{name}`만 담는다:

```js
#!/usr/bin/env node
// Builds the per-student identity payload for buddy-check.html (백석대만).
//
// 본인확인 전용: 암호문에는 학생 이름만 담는다(복호화 성공 = 본인 인증).
//   cred = normEmail + "|" + birth8 + "|" + phone4     (PBKDF2 password)
//   k    = sha256(normEmail + BUDDY_PEPPER).hex[:32]    (cheap email-only index)
//   b    = salt(16)||iv(12)||tag(16)||ct  (base64)      (AES-256-GCM, PBKDF2 100k)
//
// Reads scripts/_apply-export.csv (gitignored PII). Injects constants between
// the @@BUDDY_DATA@@ sentinels in buddy-check.html. 블롭은 커밋 안전, CSV/스크립트는 금지.
//
// Run:  node scripts/encrypt-buddy.cjs

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const csvPath = path.join(__dirname, "_apply-export.csv");
const htmlPath = path.join(__dirname, "..", "buddy-check.html");

// --- minimal RFC-4180 CSV parser (encrypt-status.cjs와 동일) ---
function parseCsv(text) {
  text = text.replace(/^﻿/, "");
  const rows = [];
  let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\r") { /* skip */ }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

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

// --- normalizers (buddy-check.html 클라이언트와 반드시 일치) ---
const normEmail = (e) => String(e || "").trim().toLowerCase();
const digits = (s) => String(s || "").replace(/\D/g, "");
const phone4 = (p) => digits(p).slice(-4);
function birth8(b) {                       // CSV "MM/DD/YYYY" -> "YYYYMMDD"
  const m = String(b || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return "";
  return m[3] + m[1].padStart(2, "0") + m[2].padStart(2, "0");
}
function cleanName(n) { return String(n || "").replace(/\s+/g, "").trim(); }
function cleanUni(u) {
  return String(u || "").replace(/\s*\(Other\)\s*/i, "").split(/\s{2,}/)[0].trim();
}

const PEPPER = crypto.randomBytes(16).toString("hex");
const idLookup = (email) =>
  crypto.createHash("sha256").update(normEmail(email) + PEPPER).digest("hex").slice(0, 32);

const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
const header = rows[0];
const col = (name) => header.indexOf(name);
for (const k of ["Email", "Birthday", "Phone Number", "Name", "University"]) {
  if (col(k) < 0) { console.error("missing column:", k); process.exit(1); }
}

const blobs = [];
const seen = new Set();
let enabled = 0, skippedNoCred = 0, notBaekseok = 0, dupEmail = 0;

for (let r = 1; r < rows.length; r++) {
  const row = rows[r];
  if (!row || row.every((c) => !String(c).trim())) continue;
  const get = (name) => String(row[col(name)] || "").trim();

  const uni = get("University");
  if (!/백석/.test(uni)) { notBaekseok++; continue; }

  const email = get("Email");
  const b8 = birth8(get("Birthday"));
  const p4 = phone4(get("Phone Number"));
  const name = cleanName(get("Name"));
  if (!email || !b8 || !p4) { skippedNoCred++; continue; }

  const id = idLookup(email);
  if (seen.has(id)) { dupEmail++; continue; }
  seen.add(id);

  const record = { name: name || cleanName(get("Passport Name")) || "학생", uni: cleanUni(uni) };
  const cred = normEmail(email) + "|" + b8 + "|" + p4;
  blobs.push({ k: id, b: encrypt(record, cred) });
  enabled++;
}

// shuffle (Fisher–Yates) so page order leaks nothing
for (let i = blobs.length - 1; i > 0; i--) {
  const j = crypto.randomInt(i + 1);
  [blobs[i], blobs[j]] = [blobs[j], blobs[i]];
}

const dataJs =
  `/* @@BUDDY_DATA@@ — generated by scripts/encrypt-buddy.cjs, do not edit by hand */\n` +
  `  const BUDDY_PEPPER = ${JSON.stringify(PEPPER)};\n` +
  `  const BUDDY_BLOBS = ${JSON.stringify(blobs)};\n` +
  `  /* @@END_BUDDY_DATA@@ */`;

let injected = false;
if (fs.existsSync(htmlPath)) {
  const html = fs.readFileSync(htmlPath, "utf8");
  const re = /\/\* @@BUDDY_DATA@@[\s\S]*?@@END_BUDDY_DATA@@ \*\//;
  if (re.test(html)) {
    fs.writeFileSync(htmlPath, html.replace(re, dataJs), "utf8");
    injected = true;
  }
}

console.error(JSON.stringify({
  rows: rows.length - 1, baekseokEnabled: enabled,
  notBaekseok, skippedNoCred, dupEmail, blobCount: blobs.length,
  injectedIntoHtml: injected,
}, null, 2));

if (!injected) console.log(dataJs);   // buddy-check.html이 아직 없으면 stdout
```

- [ ] **Step 2: Commit**

```bash
git add scripts/encrypt-buddy.cjs
git commit -m "feat(버디체크): 백석대 본인확인 블롭 생성 스크립트"
```

---

## Task 3: encrypt-buddy 라운드트립 단위 테스트

**Files:**
- Create: `scripts/test-encrypt-buddy.cjs`

- [ ] **Step 1: 실패하는 테스트 작성**

`scripts/test-encrypt-buddy.cjs` 생성. encrypt-buddy.cjs와 동일한 암호화 원시함수를 사용해
"올바른 cred는 복호화 성공, 틀린 cred는 실패"를 검증한다(Web Crypto 대신 node crypto로 동형 검증):

```js
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
```

- [ ] **Step 2: 테스트 실행(통과 확인)**

Run: `node --test scripts/test-encrypt-buddy.cjs`
Expected: `# pass 2` `# fail 0`

- [ ] **Step 3: Commit**

```bash
git add scripts/test-encrypt-buddy.cjs
git commit -m "test(버디체크): 본인확인 암복호화 라운드트립"
```

---

## Task 4: buddy-check.html 학생 페이지 작성

**Files:**
- Create: `buddy-check.html`

- [ ] **Step 1: buddy-check.html 전체 작성**

`buddy-check.html` 생성. status.html의 게이트 CSS/마크업·crypto 헬퍼를 재사용하고,
대시보드는 주차 계산 + 업로드로 단순화한다. (`@@BUDDY_DATA@@` 센티넬은 Task 5에서 주입됨.)

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow, noarchive">
<title>버디시스템 주간 신청 · LCIC</title>
<link rel="icon" type="image/png" href="assets/brand/lcic-logo.png">
<script src="assets/background.js?v=8"></script>
<link rel="stylesheet" href="assets/shared.css?v=13">
<script src="https://code.iconify.design/iconify-icon/2.3.0/iconify-icon.min.js"></script>
<style>
  .gate-wrap { min-height: 100dvh; display: flex; align-items: center; justify-content: center; padding: 120px 20px 60px; }
  .gate-card { max-width: 440px; width: 100%; }
  .gate-card .bezel-inner { padding: 36px 32px; }
  .gate-icon { width: 64px; height: 64px; border-radius: 999px; background: var(--accent-soft); color: var(--accent-deep);
    display: flex; align-items: center; justify-content: center; font-size: 28px; margin: 0 auto 20px; }
  .gate-title { text-align: center; font-size: 1.35rem; font-weight: 600; letter-spacing: -0.01em; margin-bottom: 8px; }
  .gate-sub { text-align: center; color: var(--text-dim); font-size: 0.92rem; line-height: 1.55; margin-bottom: 24px; }
  .gate-form { display: flex; flex-direction: column; gap: 12px; }
  .gate-field { display: flex; flex-direction: column; gap: 6px; text-align: left; }
  .gate-label { font-size: 0.82rem; font-weight: 600; color: var(--text-dim); padding-left: 2px; }
  .gate-input { width: 100%; padding: 13px 15px; border: 1px solid var(--hairline-strong); border-radius: 13px;
    background: var(--bg-elev); font-family: inherit; font-size: 1rem; color: var(--text); transition: border-color 0.15s, box-shadow 0.15s; }
  .gate-input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 4px var(--accent-soft); }
  .gate-btn { width: 100%; padding: 14px 16px; margin-top: 4px; border: none; border-radius: 14px; background: var(--accent);
    color: white; font-family: inherit; font-size: 1rem; font-weight: 600; cursor: pointer; transition: background 0.15s, transform 0.05s; box-shadow: var(--shadow-accent); }
  .gate-btn:hover { background: var(--accent-hover); }
  .gate-btn[disabled] { opacity: 0.55; cursor: not-allowed; }
  .gate-err { color: #dc2626; font-size: 0.86rem; text-align: center; min-height: 20px; line-height: 1.5; }
  .gate-privacy { text-align: center; font-size: 0.8rem; color: var(--text-faint); margin-top: 8px; display: flex; align-items: center; justify-content: center; gap: 5px; }

  .dash { display: none; }
  .dash-head { text-align: center; margin-bottom: 22px; }
  .dash-greet { font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em; }
  .dash-greet .nm { color: var(--accent-deep); }
  .dash-sub { color: var(--text-dim); font-size: 0.95rem; margin-top: 6px; }
  .week-banner { margin: 0 0 16px; padding: 16px 18px; border-radius: 18px; border: 1px solid var(--accent);
    background: var(--accent-soft); color: var(--accent-deep); font-weight: 700; text-align: center; }
  .week-banner small { display:block; font-weight:600; color: var(--text-dim); margin-top: 4px; }
  .week-list { list-style: none; margin: 0 0 16px; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
  .week-chip { font-size: 0.82rem; font-weight: 700; padding: 7px 12px; border-radius: 999px;
    border: 1px solid var(--hairline-strong); color: var(--text-dim); display:inline-flex; align-items:center; gap:5px; }
  .week-chip.done { background: rgba(22,163,74,0.12); color: #15803d; border-color: rgba(22,163,74,0.4); }
  .week-chip.now { border-color: var(--accent); color: var(--accent-deep); }
  .up-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .file-name { font-size: 0.86rem; color: var(--text-dim); }
  .dash-foot { text-align:center; margin: 26px 0 60px; }
  .logout-btn { background:none; border:1px solid var(--hairline-strong); color: var(--text-dim);
    padding: 8px 16px; border-radius: 10px; font-family: inherit; cursor: pointer; }
  .logout-btn:hover { color: var(--accent-deep); }
</style>
</head>
<body>

<!-- ── 로그인 ── -->
<section id="login" class="gate-wrap">
  <div class="bezel gate-card fade-up">
    <div class="bezel-inner">
      <div class="gate-icon"><iconify-icon icon="solar:users-group-rounded-bold-duotone"></iconify-icon></div>
      <div class="gate-title">버디시스템 주간 신청 체크</div>
      <div class="gate-sub">백석대 학생 본인만 확인할 수 있습니다.<br>아래 정보로 로그인해 주세요.</div>
      <form id="login-form" class="gate-form" autocomplete="off">
        <div class="gate-field">
          <label class="gate-label" for="in-email">이메일 (신청 시 입력한 이메일)</label>
          <input id="in-email" class="gate-input" type="email" inputmode="email" placeholder="example@email.com" autocomplete="email" required>
        </div>
        <div class="gate-field">
          <label class="gate-label" for="in-birth">생년월일</label>
          <input id="in-birth" class="gate-input" type="date" required>
        </div>
        <div class="gate-field">
          <label class="gate-label" for="in-phone">휴대폰 번호 끝 4자리</label>
          <input id="in-phone" class="gate-input" type="tel" inputmode="numeric" maxlength="4" placeholder="예: 1451" autocomplete="off" required>
        </div>
        <button id="login-btn" class="gate-btn" type="submit"><span id="login-btn-label">확인</span></button>
        <div id="login-err" class="gate-err" role="alert"></div>
        <div class="gate-privacy"><iconify-icon icon="solar:lock-keyhole-minimalistic-bold"></iconify-icon> 본인 정보만 표시됩니다.</div>
      </form>
    </div>
  </div>
</section>

<!-- ── 대시보드 ── -->
<main id="dash" class="dash container-narrow" style="padding: 110px 14px 0;">
  <div class="dash-head fade-up">
    <div class="dash-greet"><span class="nm" id="d-name"></span>님, 안녕하세요 👋</div>
    <div class="dash-sub">매주 <b>수요일</b>까지 버디시스템 신청 스크린샷을 올려 주세요.</div>
  </div>

  <div id="week-banner" class="week-banner fade-up"></div>
  <ul id="week-list" class="week-list fade-up"></ul>

  <section class="card fade-up">
    <div class="card-title"><iconify-icon icon="solar:upload-track-bold-duotone"></iconify-icon> 이번 주 신청 스크린샷 올리기</div>
    <div id="up-area" style="margin-top:12px;">
      <div class="up-row">
        <input id="file-input" type="file" accept="image/*" capture="environment" class="gate-input" style="padding:9px;">
      </div>
      <button id="submit-btn" class="gate-btn" style="margin-top:14px;" disabled>
        <span id="submit-label">스크린샷 제출</span>
      </button>
      <div id="up-msg" class="gate-err" style="color:var(--text-dim);"></div>
    </div>
  </section>

  <div class="dash-foot">
    <button class="logout-btn" id="logout-btn">로그아웃</button>
  </div>
</main>

<div class="toast" id="toast"></div>

<script type="module">
import { supabase } from "./assets/supabase.js?v=4";
const BUCKET = "status-reports";
window.lcicBuddyUpload = async (file) => {
  try {
    const ext = (file.name.split(".").pop() || "dat").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "dat";
    const id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
    const path = `buddy/${id}.${ext}`;
    const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || "application/octet-stream", upsert: false });
    return error ? { error: error.message || "오류" } : { path: data.path };
  } catch (e) { return { error: e && e.message ? e.message : "네트워크 오류" }; }
};
window.lcicBuddyInsert = async (payload) => {
  try { const { error } = await supabase.from("buddy_checkins").insert(payload);
    return error ? (error.message || "오류") : null;
  } catch (e) { return e && e.message ? e.message : "네트워크 오류"; }
};
</script>

<script>
(function () {
  "use strict";

  // ── 설정 상수 (사용자 확정 필요) ──
  const PROGRAM_START = "2026-07-01";   // 백석대 프로그램 첫 수요일
  const TOTAL_WEEKS = 4;

  const PBKDF2_ITER = 100000;
  const SS_KEY = "lcic.buddy.session";
  const $ = (id) => document.getElementById(id);
  const toast = $("toast");
  function showToast(msg, type = "") { toast.textContent = msg; toast.className = `toast show ${type}`; setTimeout(() => toast.classList.remove("show"), 2800); }

  /* @@BUDDY_DATA@@ — generated by scripts/encrypt-buddy.cjs, do not edit by hand */
  const BUDDY_PEPPER = "";
  const BUDDY_BLOBS = [];
  /* @@END_BUDDY_DATA@@ */

  // ── crypto helpers (status.html과 동일) ──
  function b64ToBytes(b64) {
    const bin = atob(b64); const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }
  async function decrypt(blobB64, password) {
    const raw = b64ToBytes(blobB64);
    const salt = raw.slice(0, 16), iv = raw.slice(16, 28), tag = raw.slice(28, 44), ct = raw.slice(44);
    const ctWithTag = new Uint8Array(ct.length + tag.length);
    ctWithTag.set(ct); ctWithTag.set(tag, ct.length);
    const pwKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: PBKDF2_ITER, hash: "SHA-256" },
      pwKey, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ctWithTag);
    return JSON.parse(new TextDecoder().decode(plain));
  }
  async function sha256hex(str) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  const normEmail = (e) => String(e || "").trim().toLowerCase();
  const birth8 = (d) => String(d || "").replace(/-/g, "");
  const phone4 = (p) => String(p || "").replace(/\D/g, "").slice(-4);

  // ── 주차 계산 (수요일 앵커) ──
  const DAY = 86400000;
  function ymd(d) { const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; }
  function startDate() { const [y,m,dd] = PROGRAM_START.split("-").map(Number); return new Date(y, m-1, dd); }
  // 오늘이 속한 주차(1..TOTAL_WEEKS), 범위 밖이면 0
  function currentWeek() {
    const diff = Math.floor((new Date().setHours(0,0,0,0) - startDate().getTime()) / (7*DAY));
    const wk = diff + 1;
    return (wk >= 1 && wk <= TOTAL_WEEKS) ? wk : 0;
  }
  function weekDeadline(wk) { return new Date(startDate().getTime() + (wk-1)*7*DAY); }  // 해당 주 수요일
  const weekKey = (email, wk) => `lcic.buddy.${email}.w${wk}`;
  const isDone = (email, wk) => { try { return localStorage.getItem(weekKey(email, wk)) === "1"; } catch (_) { return false; } };

  let CUR = null;  // { email, name }

  function render() {
    $("login").style.display = "none";
    $("dash").style.display = "block";
    $("d-name").textContent = CUR.name;
    const wk = currentWeek();
    const banner = $("week-banner");
    if (wk === 0) {
      banner.innerHTML = `프로그램 기간이 아닙니다.<small>${PROGRAM_START} ~ ${TOTAL_WEEKS}주차</small>`;
      $("file-input").disabled = true; $("submit-btn").disabled = true;
    } else {
      const dl = weekDeadline(wk);
      banner.innerHTML = `${wk}주차 · 이번 주 수요일(${ymd(dl)})까지 제출<small>${isDone(CUR.email, wk) ? "이번 주 제출 완료 ✓ (다시 올리면 갱신)" : "아직 제출하지 않았습니다"}</small>`;
    }
    const ul = $("week-list");
    let chips = "";
    for (let w = 1; w <= TOTAL_WEEKS; w++) {
      const done = isDone(CUR.email, w);
      const cls = done ? "week-chip done" : (w === wk ? "week-chip now" : "week-chip");
      const mark = done ? "✓" : (w === wk ? "●" : "·");
      chips += `<li class="${cls}">${mark} ${w}주차</li>`;
    }
    ul.innerHTML = chips;
  }

  // ── 업로드 ──
  $("file-input").addEventListener("change", () => { $("submit-btn").disabled = !$("file-input").files.length; });
  $("submit-btn").addEventListener("click", async () => {
    const wk = currentWeek();
    if (wk === 0) { showToast("프로그램 기간이 아닙니다.", "error"); return; }
    const file = $("file-input").files[0];
    if (!file) { showToast("스크린샷을 선택해 주세요.", "error"); return; }
    const btn = $("submit-btn"), label = $("submit-label");
    btn.disabled = true; label.textContent = "업로드 중…";
    const up = await window.lcicBuddyUpload(file);
    if (up.error) { btn.disabled = false; label.textContent = "스크린샷 제출"; showToast(`업로드 실패: ${up.error}`, "error"); return; }
    const err = await window.lcicBuddyInsert({
      student_name: CUR.name, student_email: CUR.email, university: CUR.uni || "백석대학교",
      week_no: wk, week_label: `${wk}주차`, checkin_date: ymd(weekDeadline(wk)), file_path: up.path });
    btn.disabled = false; label.textContent = "스크린샷 제출";
    if (err) { showToast(`제출 실패: ${err}`, "error"); return; }
    try { localStorage.setItem(weekKey(CUR.email, wk), "1"); } catch (_) {}
    $("file-input").value = ""; $("submit-btn").disabled = true;
    showToast(`${wk}주차 제출 완료!`, "success");
    render();
  });

  // ── 로그인 ──
  const errEl = $("login-err"), btn = $("login-btn"), btnLabel = $("login-btn-label");
  function showErr() { errEl.textContent = "정보가 일치하지 않습니다. 이메일·생년월일·휴대폰 끝 4자리를 확인해 주세요."; }
  async function tryLogin(email, birthVal, phoneVal) {
    const id = (await sha256hex(normEmail(email) + BUDDY_PEPPER)).slice(0, 32);
    const entry = BUDDY_BLOBS.find((e) => e.k === id);
    if (!entry) throw new Error("nomatch");
    const cred = normEmail(email) + "|" + birth8(birthVal) + "|" + phone4(phoneVal);
    const rec = await decrypt(entry.b, cred);   // 틀리면 GCM 태그 실패 → throw
    CUR = { email: normEmail(email), name: rec.name || "학생", uni: rec.uni || "백석대학교" };
    try { sessionStorage.setItem(SS_KEY, JSON.stringify({ e: email, b: birthVal, p: phoneVal })); } catch (_) {}
    render();
  }
  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault(); errEl.textContent = "";
    const email = $("in-email").value, birth = $("in-birth").value, phone = $("in-phone").value;
    if (!email || !birth || !phone) { showErr(); return; }
    btn.disabled = true; btnLabel.textContent = "확인 중…";
    try { await tryLogin(email, birth, phone); }
    catch (_) { showErr(); }
    finally { btn.disabled = false; btnLabel.textContent = "확인"; }
  });
  $("logout-btn").addEventListener("click", () => { try { sessionStorage.removeItem(SS_KEY); } catch (_) {} location.reload(); });

  // 새로고침 자동 복원
  (async function () {
    let s = null;
    try { s = JSON.parse(sessionStorage.getItem(SS_KEY) || "null"); } catch (_) {}
    if (s && s.e) { try { await tryLogin(s.e, s.b, s.p); return; } catch (_) {} }
    setTimeout(() => { const el = $("in-email"); if (el) el.focus(); }, 60);
  })();
})();
</script>
</body>
</html>
```

- [ ] **Step 2: 페이지가 정상 로드되는지 확인(파싱 에러 없음)**

Run: `node -e "const s=require('fs').readFileSync('buddy-check.html','utf8'); if(!s.includes('@@BUDDY_DATA@@'))process.exit(1); console.log('sentinel ok, len', s.length)"`
Expected: `sentinel ok, len <number>`

- [ ] **Step 3: Commit**

```bash
git add buddy-check.html
git commit -m "feat(버디체크): 백석대 학생 주간 신청 업로드 페이지"
```

---

## Task 5: 블롭 생성 실행 (encrypt-buddy.cjs로 주입)

**Files:**
- Modify: `buddy-check.html` (`@@BUDDY_DATA@@` 블록 — 스크립트가 자동 주입)

- [ ] **Step 1: 암호화 스크립트 실행**

Run: `node scripts/encrypt-buddy.cjs`
Expected(예시): stderr JSON에 `"baekseokEnabled": 41`(또는 자격증명 있는 백석대 학생 수), `"injectedIntoHtml": true`.
`_apply-export.csv`가 없으면 먼저 사용자에게 최신 apply export CSV를 `scripts/_apply-export.csv`로 받아야 한다.

- [ ] **Step 2: 주입 결과 확인 (PEPPER·BLOBS 채워짐)**

Run: `node -e "const s=require('fs').readFileSync('buddy-check.html','utf8'); const m=s.match(/BUDDY_BLOBS = (\[.*?\]);/s); console.log('blobs:', JSON.parse(m[1]).length)"`
Expected: `blobs: <백석대 학생 수>` (0이 아니어야 함)

- [ ] **Step 3: Commit (블롭은 커밋 안전, CSV는 절대 금지)**

```bash
git add buddy-check.html
git status --porcelain scripts/_apply-export.csv   # 이 줄이 출력되면 커밋 금지 대상이 staged 됐는지 점검
git commit -m "data(버디체크): 백석대 본인확인 블롭 주입"
```

---

## Task 6: status-reports.html 관리자 탭 추가

**Files:**
- Modify: `status-reports.html` (탭 버튼 / 탭 패널 / loadActive 분기 / 로딩 함수)

- [ ] **Step 1: 탭 버튼 추가**

`status-reports.html`의 탭 버튼 묶음(`.tabs` div, 약 105-109행)에서 마지막 버튼 뒤에 추가:

찾기:
```html
      <button class="tab-btn" data-tab="views"><iconify-icon icon="solar:eye-bold-duotone"></iconify-icon> 확인 현황</button>
    </div>
```
바꾸기:
```html
      <button class="tab-btn" data-tab="views"><iconify-icon icon="solar:eye-bold-duotone"></iconify-icon> 확인 현황</button>
      <button class="tab-btn" data-tab="buddy"><iconify-icon icon="solar:users-group-rounded-bold-duotone"></iconify-icon> 버디 신청</button>
    </div>
```

- [ ] **Step 2: 탭 패널 추가**

`#pane-views` 닫는 `</div>`(약 174행, `</div>` 다음이 `</div>` 관리화면 닫기) 바로 뒤,
즉 `<!-- 탭 3 ... -->` 패널 블록이 끝나는 지점 다음에 새 패널을 추가한다.

찾기 (탭3 패널의 마지막):
```html
        </table>
      </div>
    </div>
  </div>
</main>
```
바꾸기:
```html
        </table>
      </div>
    </div>

    <!-- 탭 4: 버디 신청 -->
    <div class="tab-pane" id="pane-buddy">
      <div class="stat-row">
        <div class="stat-card"><div class="n" id="stat-buddy-students">–</div><div class="l">보고한 학생</div></div>
        <div class="stat-card"><div class="n" id="stat-buddy-week">–</div><div class="l">이번 주 미제출</div></div>
        <div class="stat-card"><div class="n" id="stat-buddy-rows">–</div><div class="l">총 제출 건수</div></div>
      </div>
      <div class="search-row">
        <input class="input" type="search" id="buddy-search" placeholder="이름·이메일 검색">
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr id="buddy-head"><th>학생</th><th>이메일</th><th>대학</th></tr></thead>
          <tbody id="buddy-rows">
            <tr><td colspan="3" class="muted" style="text-align:center; padding:50px;">
              <iconify-icon icon="svg-spinners:ring-resize" inline style="font-size:22px;"></iconify-icon>
            </td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</main>
```

- [ ] **Step 3: loadActive 분기에 buddy 추가**

찾기 (약 247-251행):
```js
function loadActive() {
  if (activeTab === "course") loadCourse();
  else if (activeTab === "views") loadViews();
  else loadReports();
}
```
바꾸기:
```js
function loadActive() {
  if (activeTab === "course") loadCourse();
  else if (activeTab === "views") loadViews();
  else if (activeTab === "buddy") loadBuddy();
  else loadReports();
}
```

- [ ] **Step 4: 탭 전환 토글에 buddy 패널 추가**

찾기 (약 241-243행):
```js
    $("pane-reports").classList.toggle("active", activeTab === "reports");
    $("pane-course").classList.toggle("active", activeTab === "course");
    $("pane-views").classList.toggle("active", activeTab === "views");
```
바꾸기:
```js
    $("pane-reports").classList.toggle("active", activeTab === "reports");
    $("pane-course").classList.toggle("active", activeTab === "course");
    $("pane-views").classList.toggle("active", activeTab === "views");
    $("pane-buddy").classList.toggle("active", activeTab === "buddy");
```

- [ ] **Step 5: 버디 로딩/렌더 함수 추가**

`// ================= 탭 3: 확인 현황 =================` 블록의 `renderViews()` 함수가
끝나는 `}` 다음(약 423행, 마지막 자동복원 IIFE 앞)에 아래를 삽입:

```js
// ================= 탭 4: 버디 신청 =================
// thisWeek = 데이터에 존재하는 가장 큰 week_no(관리자 통계의 '진행 중 주차' 기준)
let buddyData = { students: [], weeks: [], thisWeek: 0 };
$("buddy-search").addEventListener("input", renderBuddy);
async function loadBuddy() {
  $("buddy-rows").innerHTML = `<tr><td colspan="3" class="muted" style="text-align:center; padding:50px;"><iconify-icon icon="svg-spinners:ring-resize" inline style="font-size:22px;"></iconify-icon></td></tr>`;
  const { data, error } = await supabase.from("buddy_checkins").select("*").order("created_at", { ascending: false });
  if (error) { showToast(`불러오기 실패: ${error.message}`, "error"); return; }
  const rows = data || [];
  const weeks = [...new Set(rows.map((r) => r.week_no).filter((n) => n != null))].sort((a, b) => a - b);
  const byEmail = new Map();
  for (const r of rows) {
    const key = (r.student_email || "").trim().toLowerCase();
    if (!byEmail.has(key)) byEmail.set(key, { name: r.student_name || "", email: r.student_email || "", uni: r.university || "", cells: {} });
    const st = byEmail.get(key);
    if (!st.name && r.student_name) st.name = r.student_name;
    // 같은 주차 재제출이면 최신(파일경로) 유지
    if (!st.cells[r.week_no]) st.cells[r.week_no] = r.file_path || "";
  }
  buddyData = { students: [...byEmail.values()], weeks, thisWeek: weeks.length ? Math.max(...weeks) : 0 };
  $("stat-buddy-students").textContent = buddyData.students.length;
  $("stat-buddy-rows").textContent = rows.length;
  const tw = buddyData.thisWeek;
  const missing = tw ? buddyData.students.filter((s) => !s.cells[tw]).length : 0;
  $("stat-buddy-week").textContent = tw ? missing : "–";
  $("count-meta").textContent = `버디 보고 ${buddyData.students.length}명 · 총 ${rows.length}건`;
  // 헤더 주차 컬럼 구성
  const head = $("buddy-head");
  head.innerHTML = `<th>학생</th><th>이메일</th><th>대학</th>` + weeks.map((w) => `<th>${w}주차</th>`).join("");
  renderBuddy();
}
function renderBuddy() {
  const q = ($("buddy-search").value || "").trim().toLowerCase();
  const weeks = buddyData.weeks;
  const list = q ? buddyData.students.filter((s) => (s.name || "").toLowerCase().includes(q) || (s.email || "").toLowerCase().includes(q)) : buddyData.students;
  if (!list.length) {
    $("buddy-rows").innerHTML = `<tr><td colspan="${3 + weeks.length}" class="muted" style="text-align:center; padding:60px;">${buddyData.students.length ? "검색 결과가 없습니다." : "아직 버디 신청 보고가 없습니다."}</td></tr>`;
    return;
  }
  $("buddy-rows").innerHTML = list.map((s) => {
    const mail = s.email ? `<a class="mail" href="mailto:${esc(s.email)}">${esc(s.email)}</a>` : "";
    const cells = weeks.map((w) => {
      const fp = s.cells[w];
      return fp
        ? `<td><button class="act-btn buddy-file-btn" data-file="${esc(fp)}"><iconify-icon icon="solar:gallery-bold" inline></iconify-icon> 보기</button></td>`
        : `<td class="muted">—</td>`;
    }).join("");
    return `<tr><td class="nm">${esc(s.name || "")}</td><td>${mail}</td><td class="muted">${esc(s.uni || "")}</td>${cells}</tr>`;
  }).join("");
  document.querySelectorAll("#pane-buddy .buddy-file-btn").forEach((b) => {
    b.addEventListener("click", async () => {
      const orig = b.innerHTML; b.disabled = true; b.innerHTML = '<iconify-icon icon="svg-spinners:ring-resize" inline></iconify-icon> 여는 중…';
      const { data, error } = await supabase.storage.from("status-reports").createSignedUrl(b.dataset.file, 300);
      b.disabled = false; b.innerHTML = orig;
      if (error || !data) { showToast(`첨부 열기 실패: ${error ? error.message : "오류"}`, "error"); return; }
      window.open(data.signedUrl, "_blank", "noopener");
    });
  });
}
```

- [ ] **Step 6: 구문 점검 (괄호/스크립트 깨짐 없음)**

Run: `node -e "const s=require('fs').readFileSync('status-reports.html','utf8'); ['pane-buddy','loadBuddy','renderBuddy','buddy-head'].forEach(k=>{ if(!s.includes(k)){console.error('missing',k);process.exit(1);} }); console.log('all present')"`
Expected: `all present`

- [ ] **Step 7: Commit**

```bash
git add status-reports.html
git commit -m "feat(버디체크): 관리자 버디 신청 탭(학생×주차 매트릭스)"
```

---

## Task 7: 통합 검증 (Playwright + 수동 안내)

**Files:** (없음 — 검증 전용)

- [ ] **Step 1: Supabase SQL 실행 안내**

사용자에게 Task 1의 SQL(buddy_checkins 테이블 + RLS)을 Supabase 대시보드 → SQL Editor에서
1회 실행하도록 안내한다. 실행 전에는 INSERT/SELECT가 실패하므로 라이브 검증을 진행할 수 없다.

- [ ] **Step 2: 로컬 정적 서버로 buddy-check.html 로그인 검증**

Run: `python -m http.server 8765` (lcic-gallery 루트에서, 백그라운드)
Playwright(또는 수동)로 `http://localhost:8765/buddy-check.html` 열기:
  - 백석대 테스트 학생의 (이메일/생일/휴대폰4) 입력 → 대시보드 진입, 이름·주차 배너 표시 확인.
  - 틀린 휴대폰4 입력 → "정보가 일치하지 않습니다" 에러 확인.
Expected: 올바른 cred만 통과(본인확인 동작).

- [ ] **Step 3: 업로드 → 관리자 탭 반영 확인 (SQL 실행 후)**

  - buddy-check.html에서 이미지 1장 업로드 → "N주차 제출 완료" 토스트.
  - status-reports.html 관리자 로그인 → "버디 신청" 탭 → 해당 학생 행에 N주차 "보기" 버튼,
    클릭 시 스크린샷 새 탭 열람, "이번 주 미제출" 통계 확인.
Expected: 제출이 매트릭스에 ✓로 반영되고 스크린샷 열람 가능.

- [ ] **Step 4: 최종 커밋 및 배포 안내**

```bash
git status
git push
```
GitHub Pages(lcic-campus.com) 자동 반영 확인. 학생에게 `lcic-campus.com/buddy-check.html` 공유.

---

## 운영 메모

- 주차 계산은 페이지 상수 `PROGRAM_START`(첫 수요일)·`TOTAL_WEEKS`만 바꾸면 된다. 학기/기수가 바뀌면 이 두 값을 수정 후 재배포.
- 명단 갱신(신규 백석대 학생 추가): `scripts/_apply-export.csv` 최신화 → `node scripts/encrypt-buddy.cjs` 재실행 → buddy-check.html 커밋·푸시.
- `_apply-export.csv`는 평문 PII이므로 **절대 커밋 금지**(기존 .gitignore 확인).
