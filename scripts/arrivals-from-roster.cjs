#!/usr/bin/env node
// Builds the arrival / dorm check-in roster for arrivals.html FROM THE ONESHEET ROSTER
// (lcic-roster-hub Supabase) instead of the old apply-export CSV.
//
// Scope: KR students (한국팀 보드), arrival window passed as argv — default 2026-07-31..2026-08-04.
// Grouping/blob format is identical to encrypt-arrivals.cjs so arrivals.html needs no change:
//   sections[dormDate] -> flights{flightNo,arrDate,arrTime,carry,students[{id,n,u}]}
// Student id = sha256(email)[:16] — same rule as before, so dorm check-in rows keyed by id
// survive the refresh for unchanged students.
//
// Also builds DEPART sections (7월 과정 귀국) from return_date, window 2026-07-31..08-15,
// grouped by 출국일 -> 항공편, with 정문 픽업 시간(status.html과 동일 표) and 개별이동(self) 배지
// (roster_audit transfer_mode=self 이벤트 기준).
// Run:  node scripts/arrivals-from-roster.cjs [entry-password] [fromISO] [toISO]

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const password = process.argv[2] || "8686"; // 담당자 페이지 통일 비번
const fromISO = process.argv[3] || "2026-07-31";
const toISO = process.argv[4] || "2026-08-04";
const htmlPath = path.join(__dirname, "..", "arrivals.html");
const updated = new Date().toISOString().slice(0, 10);

const envPath = "C:/Users/MiguelShim/Projects/lcic-roster-hub/.env";
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: key, Authorization: "Bearer " + key };

function encrypt(obj, pw) {
  const plaintext = Buffer.from(JSON.stringify(obj), "utf8");
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const k = crypto.pbkdf2Sync(pw, salt, 100000, 32, "sha256");
  const cipher = crypto.createCipheriv("aes-256-gcm", k, iv);
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([salt, iv, cipher.getAuthTag(), ct]).toString("base64");
}

function addDays(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
const cleanName = (n) => String(n || "").replace(/\s+/g, "").trim();
const cleanUni = (u) =>
  String(u || "").replace(/\s*\(Other\)\s*/i, "").split(/\s{2,}/)[0].split("(")[0].trim();
const sid = (e) =>
  crypto.createHash("sha256").update(String(e || "").trim().toLowerCase()).digest("hex").slice(0, 16);

// roster arrival_date holds "MM/DD/YYYY HH:MM" (time may be missing)
function parseArrival(s) {
  const m = String(s || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}:\d{2}))?/);
  if (!m) return null;
  return { iso: `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`, time: m[4] || "" };
}

const DEP_FROM = "2026-07-31", DEP_TO = "2026-08-15";
const DEPARTURE_PICKUP = {
  "2026-07-31|KE602": "2026-07-30 22:00",
  "2026-08-01|KE602": "2026-07-31 22:00",
  "2026-08-01|BX712": "2026-07-31 22:00",
  "2026-08-01|7C2114": "2026-07-31 22:00",
  "2026-08-01|LJ62": "2026-07-31 23:15",
  "2026-08-01|LJ32": "2026-07-31 23:15",
  "2026-08-01|KE5782": "2026-07-31 23:15",
  "2026-08-01|MU5024": "2026-07-31 23:15",
  "2026-08-02|KE602": "2026-08-01 22:00",
  "2026-08-02|BX712": "2026-08-01 22:30",
  "2026-08-02|7C2114": "2026-08-01 22:30",
  "2026-08-02|LJ32": "2026-08-01 23:20",
  "2026-08-03|KE602": "2026-08-02 22:00",
  "2026-08-03|LJ62": "2026-08-02 23:15",
  "2026-08-04|KE602": "2026-08-03 22:00",
  "2026-08-04|BX712": "2026-08-03 22:30",
  "2026-08-07|BX712": "2026-08-06 22:30",
  "2026-08-02|PR2860": "2026-08-01 20:00",
};
const normFlightNo = (s) =>
  String(s || "").replace(/\s+/g, "").toUpperCase().replace(/^([A-Z0-9]{2})0+(?=\d)/, "$1");

(async () => {
  const q =
    "/rest/v1/roster_students?select=id,name,university,email,flight_number,arrival_date," +
    "return_flight_number,return_date,return_time" +
    "&source_country=eq.KR&deleted_at=is.null&is_cancelled=not.is.true&limit=3000";
  const rows = await (await fetch(url + q, { headers: H })).json();
  if (!Array.isArray(rows)) throw new Error("roster fetch failed: " + JSON.stringify(rows));

  // 개별이동(self) — roster_audit transfer_mode 최신 이벤트가 'self'인 학생
  const evq = "/rest/v1/roster_audit?select=student_id,new_value,changed_at&field_key=eq.transfer_mode&order=changed_at.desc&limit=1000";
  const evs = await (await fetch(url + evq, { headers: H })).json();
  const selfIds = new Set();
  const seenEv = new Set();
  for (const e of Array.isArray(evs) ? evs : []) {
    const k = String(e.student_id);
    if (seenEv.has(k)) continue;
    seenEv.add(k);
    if (e.new_value === "self") selfIds.add(k);
  }

  const dormMap = new Map();
  let used = 0;
  for (const r of rows) {
    const name = cleanName(r.name) || cleanName(r.passport_name);
    if (!name || name === "데모학생") continue;
    const arr = parseArrival(r.arrival_date);
    if (!arr || arr.iso < fromISO || arr.iso > toISO) continue;
    const time = arr.time;
    const flightNo = String(r.flight_number || "").trim() || "미상";
    let dorm = arr.iso;
    let carry = false;
    if (time && parseInt(time.slice(0, 2), 10) >= 13) { dorm = addDays(arr.iso, 1); carry = true; }
    const k = `${flightNo}|${arr.iso}|${time}`;
    if (!dormMap.has(dorm)) dormMap.set(dorm, new Map());
    const fm = dormMap.get(dorm);
    if (!fm.has(k)) fm.set(k, { flightNo, arrDate: arr.iso, arrTime: time, carry, students: [] });
    fm.get(k).students.push({ id: sid(r.email), n: name, u: cleanUni(r.university) });
    used++;
  }

  const sections = [...dormMap.keys()].sort().map((dorm) => {
    const flights = [...dormMap.get(dorm).values()].sort((a, b) =>
      (a.arrDate + a.arrTime).localeCompare(b.arrDate + b.arrTime));
    let count = 0;
    for (const f of flights) { f.students.sort((a, b) => a.n.localeCompare(b.n, "ko")); count += f.students.length; }
    return { dorm, count, flights };
  });
  const grand = sections.reduce((a, s) => a + s.count, 0);

  // ── 출국(귀국) 섹션: 출국일 -> 항공편 ──
  const depMap = new Map();
  let depUsed = 0;
  for (const r of rows) {
    const name = cleanName(r.name);
    if (!name || name === "데모학생") continue;
    const d = parseArrival(r.return_date);
    if (!d || d.iso < DEP_FROM || d.iso > DEP_TO) continue;
    const time = String(r.return_time || "").trim();
    const flightNo = normFlightNo(r.return_flight_number) || "미상";
    const k = `${flightNo}|${d.iso}|${time}`;
    if (!depMap.has(d.iso)) depMap.set(d.iso, new Map());
    const fm = depMap.get(d.iso);
    if (!fm.has(k)) {
      fm.set(k, { flightNo, depDate: d.iso, depTime: time,
        pickup: DEPARTURE_PICKUP[d.iso + "|" + flightNo] || "", students: [] });
    }
    const st = { id: sid(r.email), n: name, u: cleanUni(r.university) };
    if (selfIds.has(String(r.id))) st.self = true;
    fm.get(k).students.push(st);
    depUsed++;
  }
  const departs = [...depMap.keys()].sort().map((day) => {
    const flights = [...depMap.get(day).values()].sort((a, b) =>
      (a.depDate + a.depTime).localeCompare(b.depDate + b.depTime));
    let count = 0;
    for (const f of flights) { f.students.sort((a, b) => a.n.localeCompare(b.n, "ko")); count += f.students.length; }
    return { day, count, flights };
  });
  const depGrand = departs.reduce((a, s) => a + s.count, 0);

  const blob = encrypt({ version: 2, updated, sections, departs }, password);
  const dataJs =
    `/* @@ARRIVALS_DATA@@ — generated by scripts/encrypt-arrivals.cjs, do not edit by hand */\n` +
    `  window.ARRIVALS_UPDATED = ${JSON.stringify(updated)};\n` +
    `  window.ARRIVALS_BLOB = ${JSON.stringify(blob)};\n` +
    `  /* @@END_ARRIVALS_DATA@@ */`;

  const html = fs.readFileSync(htmlPath, "utf8");
  const re = /\/\* @@ARRIVALS_DATA@@[\s\S]*?@@END_ARRIVALS_DATA@@ \*\//;
  if (!re.test(html)) throw new Error("marker not found in arrivals.html");
  fs.writeFileSync(htmlPath, html.replace(re, dataJs), "utf8");

  const totals = {};
  for (const s of sections) totals[s.dorm] = s.count;
  console.error(JSON.stringify({ window: [fromISO, toISO], totals, grand, depWindow: [DEP_FROM, DEP_TO], depGrand, departs: departs.map(d => d.day + ":" + d.count) }, null, 2));
})();
