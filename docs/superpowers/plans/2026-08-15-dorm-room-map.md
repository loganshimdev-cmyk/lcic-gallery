# 기숙사 방 점검 맵(방별 시각화) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `room-check.html`에 클러스터 카드형 방 맵을 추가해, 관리자와 점검자가 기숙사 방 573개의 점검 상태를 한 화면에서 보게 한다.

**Architecture:** 그룹핑 로직(`groupRooms`)만 `assets/room-map.js`로 떼어내 순수 함수로 만들고 node:test로 검증한다. 나머지(마크업·CSS·렌더·탭)는 `room-check.html` 안에 넣는다. 기존 `statusOf()` · `filtered()` · `openRoom()` · `renderRooms()`는 손대지 않고 재사용한다. 맵과 리스트는 탭으로 전환하며, 선택은 localStorage에 남는다.

**Tech Stack:** 정적 HTML + 브라우저 ES 모듈, Supabase(읽기 전용, 변경 없음), 테스트는 `node --test` (`scripts/*.test.mjs` 관례), 배포는 GitHub Pages(빌드 없음).

**설계 문서:** `docs/superpowers/specs/2026-08-15-dorm-room-map-design.md`

---

## 사전 확인 (구현자가 먼저 읽을 것)

- 이 저장소는 **빌드 단계가 없다.** 파일을 고치고 push하면 GitHub Pages가 그대로 서빙한다.
- `assets/*.js`는 브라우저 ES 모듈이지만 `scripts/*.test.mjs`에서 그대로 `import` 할 수 있다. 선례: `scripts/team-util.test.mjs` → `../assets/team-util.js`. `package.json`은 없고 필요도 없다.
- 방 상태는 5가지다: `none`(미점검) `ok` `issue`(문제 미해결) `resolved`(수리완료) `occupied`(사람 있어 못 봄). `room-check.html:285` `statusOf()`가 만든다.
- 화면 문구는 **전부 영어**로 쓴다. 현지 스태프가 쓰는 페이지다. (주석·커밋 메시지는 한국어 OK)
- 방 `101-7`처럼 `-7`로 끝나는 방이 `room_type='quad'`(4인실)다. `502-7`은 `active=false`라 아예 안 내려온다 — **클러스터당 방이 7개라고 가정하지 말 것.**

---

## File Structure

| 파일 | 역할 | 작업 |
|---|---|---|
| `assets/room-map.js` | `groupRooms()` · `floorOf()` — 방 배열을 `건물 > 층 > 클러스터`로 묶는 순수 함수. DOM·네트워크 없음 | **신규** |
| `scripts/room-map.test.mjs` | 위 함수의 node:test 단위 테스트 | **신규** |
| `room-check.html` | 마크업(탭 + 맵 컨테이너), CSS, `renderMap()`, 탭 전환, 인쇄 | **수정** |

---

## Task 1: `groupRooms()` — 방을 건물 > 층 > 클러스터로 묶기

**Files:**
- Create: `assets/room-map.js`
- Test: `scripts/room-map.test.mjs`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`scripts/room-map.test.mjs` 를 새로 만든다. 실제 기숙사 번호 체계를 그대로 쓰는 픽스처를 포함한다.

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { groupRooms, floorOf } from "../assets/room-map.js";

// 실제 기숙사 번호 체계 (클러스터 82개)
const MALE   = [101,102,103,111,112,113,114, 201,202,203,204,205,206,207,208,209,
                301,302,303,304,305,306,307,308,309, 401,402,403,404,405,406,407,408,409,
                501,502,503,504,505,506,507];
const FEMALE = [104,105,106,107,108,109,110, 210,211,212,213,214,215,216,217,218,
                310,311,312,313,314,315,316,317,318, 410,411,412,413,414,415,416,417,418,
                508,509,510,511,512,513,514];

// listRooms()가 내려주는 모양 그대로. 502-7은 active=false라 빠져 있다.
function fixture() {
  const out = [];
  const push = (building, cluster) => {
    for (let i = 1; i <= 7; i++) {
      if (cluster === 502 && i === 7) continue;          // active=false
      out.push({
        id: `${cluster}-${i}`,
        building,
        cluster: String(cluster),
        floor: Math.floor(cluster / 100),
        room_number: `${cluster}-${i}`,
        room_type: i === 7 ? "quad" : "single",
        sort: i,
      });
    }
  };
  MALE.forEach((c) => push("Male", c));
  FEMALE.forEach((c) => push("Female", c));
  return out;
}

const allOk = () => "ok";

test("건물 2개가 이름순으로 나온다", () => {
  const g = groupRooms(fixture(), allOk);
  assert.deepEqual(g.map((b) => b.building), ["Female", "Male"]);
});

test("클러스터가 모두 82개다", () => {
  const g = groupRooms(fixture(), allOk);
  const n = g.reduce((a, b) => a + b.floors.reduce((x, f) => x + f.clusters.length, 0), 0);
  assert.equal(n, 82);
});

test("방을 하나도 잃지 않는다", () => {
  const rooms = fixture();
  const g = groupRooms(rooms, allOk);
  const n = g.reduce((a, b) => a + b.floors.reduce(
    (x, f) => x + f.clusters.reduce((y, c) => y + c.rooms.length, 0), 0), 0);
  assert.equal(rooms.length, 573);
  assert.equal(n, 573);
});

test("클러스터마다 quad가 정확히 1개 — 502만 빼고", () => {
  const g = groupRooms(fixture(), allOk);
  for (const b of g) for (const f of b.floors) for (const c of f.clusters) {
    const quads = c.rooms.filter((r) => r.room_type === "quad").length;
    assert.equal(quads, c.cluster === "502" ? 0 : 1, `cluster ${c.cluster}`);
  }
});

test("502는 6칸이다 (502-7은 비활성)", () => {
  const g = groupRooms(fixture(), allOk);
  const c = g.flatMap((b) => b.floors).flatMap((f) => f.clusters).find((x) => x.cluster === "502");
  assert.equal(c.total, 6);
  assert.equal(c.rooms.length, 6);
});

test("합계가 층·건물까지 맞아 올라간다", () => {
  for (const b of groupRooms(fixture(), allOk)) {
    assert.equal(b.total, b.floors.reduce((n, f) => n + f.total, 0));
    assert.equal(b.done,  b.floors.reduce((n, f) => n + f.done,  0));
    for (const f of b.floors) {
      assert.equal(f.total, f.clusters.reduce((n, c) => n + c.total, 0));
      assert.equal(f.done,  f.clusters.reduce((n, c) => n + c.done,  0));
    }
  }
});

test("done은 상태가 none이 아닌 방의 수다", () => {
  const rooms = fixture();
  // 101-1, 101-2 두 개만 미점검
  const st = (r) => (r.id === "101-1" || r.id === "101-2" ? "none" : "ok");
  const g = groupRooms(rooms, st);
  const c101 = g.flatMap((b) => b.floors).flatMap((f) => f.clusters).find((x) => x.cluster === "101");
  assert.equal(c101.total, 7);
  assert.equal(c101.done, 5);
  const male = g.find((b) => b.building === "Male");
  assert.equal(male.done, male.total - 2);
});

test("occupied·resolved·issue도 done으로 센다", () => {
  const rooms = fixture();
  const st = (r) => ({ "101-1": "occupied", "101-2": "resolved", "101-3": "issue" }[r.id] ?? "none");
  const g = groupRooms(rooms, st);
  const c101 = g.flatMap((b) => b.floors).flatMap((f) => f.clusters).find((x) => x.cluster === "101");
  assert.equal(c101.done, 3);
});

test("층이 오름차순이고 1~5층이 다 있다", () => {
  const g = groupRooms(fixture(), allOk);
  const male = g.find((b) => b.building === "Male");
  assert.deepEqual(male.floors.map((f) => f.floor), [1, 2, 3, 4, 5]);
});

test("클러스터는 숫자 순 — 101, 111이 문자열 순으로 뒤엉키지 않는다", () => {
  const g = groupRooms(fixture(), allOk);
  const f1 = g.find((b) => b.building === "Male").floors[0];
  assert.deepEqual(f1.clusters.map((c) => c.cluster),
    ["101", "102", "103", "111", "112", "113", "114"]);
});

test("방은 sort 순으로 나오고 quad가 마지막이다", () => {
  const rooms = fixture().reverse();          // 일부러 뒤섞어 넣는다
  const g = groupRooms(rooms, allOk);
  const c = g.flatMap((b) => b.floors).flatMap((f) => f.clusters).find((x) => x.cluster === "101");
  assert.deepEqual(c.rooms.map((r) => r.room_number),
    ["101-1", "101-2", "101-3", "101-4", "101-5", "101-6", "101-7"]);
  assert.equal(c.rooms.at(-1).room_type, "quad");
});

test("floorOf: floor 컬럼이 비면 클러스터 첫 자리로 유도한다", () => {
  assert.equal(floorOf({ floor: 3, cluster: "101" }), 3);
  assert.equal(floorOf({ floor: null, cluster: "205" }), 2);
  assert.equal(floorOf({ cluster: "514" }), 5);
  assert.equal(floorOf({ cluster: null }), 0);
});

test("building이 비어도 안 터진다", () => {
  const g = groupRooms(
    [{ id: "x", building: null, cluster: "101", room_number: "101-1", sort: 1 }], allOk);
  assert.equal(g.length, 1);
  assert.equal(g[0].building, "—");
});
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인한다**

Run: `node --test scripts/room-map.test.mjs`
Expected: FAIL — `Cannot find module .../assets/room-map.js`

- [ ] **Step 3: 최소 구현을 쓴다**

`assets/room-map.js` 를 새로 만든다.

```js
// 기숙사 방 맵(room-check.html)용 그룹핑. DOM도 네트워크도 안 쓰는 순수 함수라
// scripts/room-map.test.mjs 에서 그대로 단위 테스트한다.

// 방이 몇 층인지. floor 컬럼을 우선 쓰고, 비어 있으면 클러스터 첫 자리에서
// 유도한다('205' -> 2). 둘 다 없으면 0.
export function floorOf(room) {
  if (Number.isFinite(room.floor)) return room.floor;
  const d = parseInt(String(room.cluster ?? "").trim().charAt(0), 10);
  return Number.isFinite(d) ? d : 0;
}

// '101' < '111' < '201' 이 되도록 숫자로 비교한다(문자열 정렬이면 뒤엉킨다).
function clusterKey(c) {
  const n = parseInt(String(c ?? ""), 10);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

// 클러스터 안 방 순서: sort 우선, 같으면 방번호 자연 정렬.
function roomOrder(a, b) {
  const s = (a.sort ?? 0) - (b.sort ?? 0);
  if (s !== 0) return s;
  return String(a.room_number).localeCompare(String(b.room_number), undefined, { numeric: true });
}

// rooms  : listRooms()가 준 방 배열
// statusOf: (room) => 'none'|'ok'|'issue'|'resolved'|'occupied'
//
// 반환:
// [{ building, total, done, floors:[
//      { floor, total, done, clusters:[
//          { cluster, total, done, rooms:[room, …] } ] } ] }]
//
// done = 상태가 'none'이 아닌 방의 수. 클러스터 방 개수는 고정하지 않는다
// (502-7은 active=false라 안 내려온다).
export function groupRooms(rooms, statusOf) {
  const byBuilding = new Map();
  for (const r of rooms) {
    const b = r.building || "—";
    if (!byBuilding.has(b)) byBuilding.set(b, new Map());
    const byFloor = byBuilding.get(b);
    const f = floorOf(r);
    if (!byFloor.has(f)) byFloor.set(f, new Map());
    const byCluster = byFloor.get(f);
    const c = String(r.cluster ?? "—");
    if (!byCluster.has(c)) byCluster.set(c, []);
    byCluster.get(c).push(r);
  }

  const sum = (list, k) => list.reduce((n, x) => n + x[k], 0);

  return [...byBuilding.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([building, byFloor]) => {
      const floors = [...byFloor.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([floor, byCluster]) => {
          const clusters = [...byCluster.entries()]
            .sort((a, b) => clusterKey(a[0]) - clusterKey(b[0]))
            .map(([cluster, list]) => {
              const sorted = [...list].sort(roomOrder);
              return {
                cluster,
                rooms: sorted,
                total: sorted.length,
                done: sorted.filter((r) => statusOf(r) !== "none").length,
              };
            });
          return { floor, clusters, total: sum(clusters, "total"), done: sum(clusters, "done") };
        });
      return { building, floors, total: sum(floors, "total"), done: sum(floors, "done") };
    });
}
```

- [ ] **Step 4: 테스트를 돌려 통과를 확인한다**

Run: `node --test scripts/room-map.test.mjs`
Expected: PASS — `pass 13`, `fail 0`

- [ ] **Step 5: 커밋한다**

```bash
git add assets/room-map.js scripts/room-map.test.mjs
git commit -m "feat(dorm): 방 맵용 groupRooms() 순수 함수 + 단위 테스트 13개"
```

---

## Task 2: 맵 CSS

**Files:**
- Modify: `room-check.html` — `.toast` 규칙 뒤, `/* ---- admin dashboard ---- */` 주석 바로 앞 (현재 116행 부근)

- [ ] **Step 1: CSS 블록을 넣는다**

`room-check.html`에서 이 줄을 찾는다:

```
  /* ---- admin dashboard ---- */
```

그 **앞에** 다음을 넣는다. 색·테두리는 전부 기존 CSS 변수를 쓴다. 새 색을 만들지 않는다.

```css
  /* ---- room map (cluster cards) ---- */
  .view-tabs { display:flex; gap:6px; margin:0 0 14px; }
  .view-tabs button { border:1px solid var(--hairline); background:var(--bg-elev); color:var(--text-dim);
    font-family:inherit; font-size:.82rem; font-weight:700; padding:7px 15px; border-radius:11px; cursor:pointer; }
  .view-tabs button.on { border-color:var(--accent); background:var(--accent-soft); color:var(--accent); }

  .map-legend { display:flex; flex-wrap:wrap; gap:13px; font-size:.76rem; color:var(--text-dim); margin-bottom:14px; }
  .map-legend i { display:inline-block; width:12px; height:12px; border-radius:4px; margin-right:5px; vertical-align:-2px; }

  .map-bld { font-size:1rem; font-weight:700; margin:20px 0 0; }
  .map-bld em { font-style:normal; font-size:.8rem; font-weight:600; color:var(--text-faint); margin-left:7px; }
  .map-flr { display:flex; align-items:baseline; justify-content:space-between; gap:10px;
    font-size:.72rem; font-weight:700; color:var(--text-faint); letter-spacing:.06em; margin:13px 0 6px; }
  .map-flr em { font-style:normal; color:var(--text-dim); }

  .cl-wrap { display:grid; grid-template-columns:repeat(auto-fill, minmax(96px, 1fr)); gap:9px; }
  .cl { border:1px solid var(--hairline); border-radius:11px; padding:6px; background:var(--bg-elev); }
  .cl-lab { display:flex; justify-content:space-between; align-items:center; gap:4px;
    font-size:.68rem; font-weight:800; color:var(--text-dim); margin-bottom:4px; }
  .cl-lab em { font-style:normal; font-size:.6rem; font-weight:600; color:var(--text-faint); }
  .cl-cells { display:grid; grid-template-columns:repeat(3, 1fr); gap:3px; }
  .cl-cells button { aspect-ratio:1; border:none; border-radius:5px; padding:0; cursor:pointer;
    font-family:inherit; font-size:.6rem; font-weight:700; color:#fff; line-height:1.05;
    display:flex; flex-direction:column; align-items:center; justify-content:center; }
  .cl-cells button i { font-style:normal; font-size:.68rem; }
  .cl-cells button.quad { grid-column:span 3; aspect-ratio:3 / 1; border-radius:6px;
    flex-direction:row; gap:4px; font-size:.62rem; }
  .cl-cells button.dim { opacity:.16; }
  .cl-cells button:hover { outline:2px solid var(--text); outline-offset:1px; }
  .m-ok { background:var(--accent); }
  .m-issue { background:#dc2626; }
  .m-resolved { background:#0d9488; }
  .m-occupied { background:#d97706; }
  .m-none { background:var(--hairline); color:var(--text-faint); }
```

- [ ] **Step 2: 문법이 안 깨졌는지 확인한다**

Run: `node -e "const s=require('fs').readFileSync('room-check.html','utf8'); const m=s.match(/<style>[\s\S]*?<\/style>/)[0]; const o=(m.match(/{/g)||[]).length, c=(m.match(/}/g)||[]).length; console.log('{',o,'}',c, o===c?'OK':'MISMATCH');"`
Expected: `{ ... } ... OK` — 중괄호 짝이 맞아야 한다

- [ ] **Step 3: 커밋한다**

```bash
git add room-check.html
git commit -m "style(dorm): 방 맵 클러스터 카드 CSS"
```

---

## Task 3: 마크업 · import · 탭 상태

**Files:**
- Modify: `room-check.html:262` (마크업), `room-check.html:265` (import), `room-check.html` 상태 변수부

- [ ] **Step 1: 탭과 맵 컨테이너를 넣는다**

`room-check.html`에서 이 줄을 찾는다:

```html
  <div id="rooms" class="rooms"></div>
```

그 **앞에** 다음을 넣는다. 문구는 영어다.

```html
  <div id="view-tabs" class="view-tabs">
    <button type="button" data-view="map">🟦 Map</button>
    <button type="button" data-view="list">☰ List</button>
  </div>
  <div id="rooms-map"></div>
```

- [ ] **Step 2: `groupRooms`를 import 한다**

이 줄을 찾는다 (265행 부근):

```js
} from "./assets/room-check-data.js?v=8";
```

그 **바로 뒤에** 한 줄을 더한다:

```js
import { groupRooms } from "./assets/room-map.js?v=1";
```

- [ ] **Step 3: 탭 상태 변수를 더한다**

이 줄을 찾는다 (292행):

```js
const STATUS_LABEL = { none: "Not inspected", ok: "OK", issue: "Issues", occupied: "Occupied", resolved: "Resolved" };
```

그 **바로 뒤에** 다음을 넣는다:

```js
// 맵/리스트 탭. 점검 한 건 끝내고 돌아올 때마다 리스트로 튕기면 안 되므로 기억한다.
const VIEW_KEY = "lcic-dorm-view";
let view = localStorage.getItem(VIEW_KEY) === "list" ? "list" : "map";
```

- [ ] **Step 4: 브라우저에서 페이지가 안 깨졌는지 확인한다**

로컬 서버를 띄운다 (ES 모듈이라 `file://` 로는 안 열린다):

```bash
python -m http.server 8899
```

브라우저에서 `http://localhost:8899/room-check.html` 을 열고 `miguel` 로 로그인한다.
확인할 것:
- 개발자도구 콘솔에 빨간 에러가 없다 (특히 `room-map.js` 404 나 import 실패)
- 필터 아래에 `🟦 Map` `☰ List` 버튼 두 개가 보인다
- 기존 방 카드 리스트가 그대로 나온다

아직 탭을 눌러도 아무 일도 안 일어나는 게 정상이다. 배선은 Task 4에서 한다.

- [ ] **Step 5: 커밋한다**

```bash
git add room-check.html
git commit -m "feat(dorm): 맵/리스트 탭 마크업 + groupRooms import + 탭 상태"
```

---

## Task 4: `renderMap()` 과 렌더 배선

**Files:**
- Modify: `room-check.html` — `renderRooms()` 앞에 `renderMap()` 추가, `render()`(340행) 수정, 필터 핸들러(835~837행) 수정

- [ ] **Step 1: `renderMap()` 과 `renderViews()` 를 쓴다**

`room-check.html`에서 이 줄을 찾는다 (616행 부근):

```js
function renderRooms() {
```

그 **앞에** 다음을 넣는다.

```js
// ---- room map (cluster cards) ----------------------------------------------
// 흑백 인쇄에서도 상태가 구분되도록 색과 함께 기호를 찍는다.
const MAP_SYM = { ok: "✓", issue: "⚠", resolved: "✚", occupied: "●", none: "" };

function renderMap() {
  // 뼈대는 보이는 방 전체로 만들고, 필터에 안 걸리는 칸만 흐리게 한다.
  // 칸을 빼버리면 카드에 구멍이 뚫려 배치가 매번 흔들린다.
  const match = new Set(filtered().map((r) => r.id));
  let html = "";

  for (const b of groupRooms(rooms, statusOf)) {
    let bHtml = "";
    for (const f of b.floors) {
      const cards = f.clusters.map((c) => {
        if (!c.rooms.some((r) => match.has(r.id))) return "";   // 매칭 0개면 카드째 숨김
        const cells = c.rooms.map((r) => {
          const s = statusOf(r);
          const quad = r.room_type === "quad";
          const n = String(r.room_number).split("-").pop();
          const cls = `m-${s}${quad ? " quad" : ""}${match.has(r.id) ? "" : " dim"}`;
          return `<button type="button" class="${cls}" data-id="${r.id}"
            title="${esc(r.room_number)} — ${STATUS_LABEL[s]}"><i>${MAP_SYM[s]}</i>${esc(quad ? `${n} · 4-person` : n)}</button>`;
        }).join("");
        return `<div class="cl"><div class="cl-lab">${esc(c.cluster)}<em>${c.done}/${c.total}</em></div>
          <div class="cl-cells">${cells}</div></div>`;
      }).join("");
      if (!cards) continue;
      bHtml += `<div class="map-flr"><span>${f.floor ? f.floor + "F" : "—"}</span><em>${f.done}/${f.total}</em></div>
        <div class="cl-wrap">${cards}</div>`;
    }
    if (!bHtml) continue;
    html += `<div class="map-bld">${esc(b.building)}<em>${b.done}/${b.total}</em></div>${bHtml}`;
  }

  const legend = `<div class="map-legend">
    <span><i class="m-ok"></i>✓ Inspected</span>
    <span><i class="m-issue"></i>⚠ Issue</span>
    <span><i class="m-resolved"></i>✚ Fixed</span>
    <span><i class="m-occupied"></i>● Occupied</span>
    <span><i class="m-none"></i>Not inspected</span></div>`;

  $("rooms-map").innerHTML = html
    ? legend + html
    : `<div class="empty">No rooms match your filters.</div>`;
}

// 활성 탭만 그린다. 필터를 칠 때마다 대시보드까지 다시 그리지 않으려고 분리했다.
function renderViews() {
  if (view === "map") renderMap(); else renderRooms();
}
```

- [ ] **Step 2: 칸 클릭을 위임으로 받는다**

칸이 573개라 버튼마다 리스너를 달지 않고 컨테이너 하나에 위임한다. 이 줄을 찾는다 (838행 부근, 파일 끝 근처):

```js
$("f-status").addEventListener("change", (e) => { filters.status = e.target.value; render(); });
```

그 **바로 뒤에** 다음을 넣는다:

```js
// 맵 칸 클릭은 위임으로 한 번만 건다(칸이 573개다). openRoom이 역할에 따라
// 관리자=리포트 / 점검자=점검폼으로 알아서 보낸다.
$("rooms-map").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-id]");
  if (b) openRoom(b.dataset.id);
});

$("view-tabs").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-view]");
  if (!b || b.dataset.view === view) return;
  view = b.dataset.view;
  localStorage.setItem(VIEW_KEY, view);
  render();
});
```

- [ ] **Step 3: `render()` 를 고친다**

340행의 `render()` 전체를 다음으로 바꾼다. 바뀐 곳은 `#view-tabs`·`#rooms-map` 표시 토글과, 마지막 `renderRooms()` → 뷰 분기다.

```js
function render() {
  const handler = me && me.role === "handler";
  $("handler-view").classList.toggle("hidden", !handler);
  $("summary-bar").classList.toggle("hidden", handler);
  $("filters").classList.toggle("hidden", handler);
  $("view-tabs").classList.toggle("hidden", handler);
  $("rooms").classList.toggle("hidden", handler || view !== "list");
  $("rooms-map").classList.toggle("hidden", handler || view !== "map");
  if (handler) {
    $("admin-dash").classList.add("hidden");
    $("empty").classList.add("hidden");
    renderHandlerView();
    return;
  }
  $("view-tabs").querySelectorAll("button").forEach((b) =>
    b.classList.toggle("on", b.dataset.view === view));
  renderSummary();
  renderAdminDashboard();
  if (view === "map") $("empty").classList.add("hidden");   // 맵은 자기 빈 화면을 직접 그린다
  renderViews();
}
```

- [ ] **Step 4: 필터 핸들러가 맵도 다시 그리게 한다**

835~837행 세 줄에서 `renderRooms()` 를 `renderViews()` 로 바꾼다. (838행 `f-status`는 요약 칩도 갱신해야 하므로 `render()` 그대로 둔다.)

```js
$("f-search").addEventListener("input", (e) => { filters.q = e.target.value; renderViews(); });
$("f-building").addEventListener("change", (e) => { filters.building = e.target.value; renderViews(); });
$("f-gender").addEventListener("change", (e) => { filters.gender = e.target.value; renderViews(); });
```

- [ ] **Step 5: 브라우저에서 확인한다**

```bash
python -m http.server 8899
```

`http://localhost:8899/room-check.html` 에서 `miguel` 로 로그인하고 확인한다:

- 맵이 기본으로 뜨고, 건물 2개 · 층 5개씩 · 클러스터 82개가 보인다
- 클러스터 `502`가 6칸이다
- 칸을 누르면 리포트 모달이 뜬다
- 검색창에 `205` 를 치면 205 클러스터만 남고 나머지 카드는 사라진다
- 상태 필터를 `Issues (open)` 로 바꾸면 문제 있는 칸만 진하게 남고 같은 카드의 나머지 칸은 흐려진다
- 층 헤더 진행률(`38/49`)은 필터를 바꿔도 그대로다
- `☰ List` 를 누르면 기존 카드 리스트가 나오고, 새로고침해도 리스트로 남아 있다

- [ ] **Step 6: 커밋한다**

```bash
git add room-check.html
git commit -m "feat(dorm): renderMap() — 클러스터 카드 맵 + 탭 전환 + 필터 연동"
```

---

## Task 5: 인쇄

**Files:**
- Modify: `room-check.html:162-172` (`@media print` 블록), 이벤트 배선부

기존 인쇄물은 대시보드(차트·점검자표·이슈리스트)만 나갔다. 여기에 맵이 한 덩어리 붙는다. 리스트 뷰는 계속 제외한다.

- [ ] **Step 1: 인쇄 CSS를 고친다**

이 줄을 찾는다 (163행):

```css
    .topbar .who, #pw-hint, .filters, #rooms, #empty, #summary-bar, #print-btn, .toast, .icat-bar { display:none !important; }
```

`#view-tabs` 를 숨김 목록에 더한다:

```css
    .topbar .who, #pw-hint, .filters, #rooms, #empty, #summary-bar, #print-btn, .toast, .icat-bar,
    #view-tabs { display:none !important; }
```

그리고 `@media print` 블록 안, `.donut { print-color-adjust:exact; ... }` 줄 **앞에** 다음을 넣는다:

```css
    #rooms-map { display:block !important; margin-top:18px; }
    .cl, .cl-wrap { break-inside:avoid; }
    .cl-cells button { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .cl-cells button.dim { opacity:1; }
```

`.dim { opacity:1 }` 이 필요한 이유: 필터를 걸어둔 채 인쇄하면 흐린 칸이 종이에서 거의 안 보인다. 인쇄물은 항상 전체를 보여준다.

- [ ] **Step 2: 리스트 뷰에서 인쇄해도 맵이 나오게 한다**

Task 4 Step 2에서 넣은 `$("view-tabs")` 리스너 **바로 뒤에** 다음을 넣는다:

```js
// 리스트 탭을 보고 있어도 인쇄물에는 맵이 들어가야 하므로, 인쇄 직전에 한 번 그린다.
window.addEventListener("beforeprint", () => { if (me && me.role !== "handler" && view !== "map") renderMap(); });
```

- [ ] **Step 3: 인쇄 결과를 눈으로 확인한다**

화면 미리보기로 갈음하지 말 것. A4 PDF로 렌더해서 이미지로 직접 본다.

```bash
python -m http.server 8899
```

다른 터미널에서:

```bash
node -e "
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('http://localhost:8899/room-check.html');
  console.log('로그인은 수동으로 하세요. 30초 대기합니다.');
  await p.waitForTimeout(30000);
  await p.pdf({ path: 'scripts/_dorm/print-check.pdf', format: 'A4', printBackground: true });
  await b.close();
})();
"
```

Playwright가 없으면 브라우저에서 직접 Ctrl+P → PDF로 저장한 뒤 그 PDF를 이미지로 열어 확인한다.

확인할 것:
- 대시보드 뒤에 맵이 나온다
- 클러스터 카드가 페이지 경계에서 잘리지 않는다
- **흑백으로 인쇄해도** ✓ ⚠ ✚ ● 기호로 상태가 구분된다
- 탭 버튼(`🟦 Map` / `☰ List`)이 종이에 안 나온다

- [ ] **Step 4: 커밋한다**

```bash
git add room-check.html
git commit -m "feat(dorm): 인쇄물에 방 맵 추가 (탭 숨김, 카드 페이지 분할 방지, 흐린 칸 복원)"
```

---

## Task 6: 실데이터 검증과 배포

**Files:** 없음 (검증만)

- [ ] **Step 1: 관리자 계정으로 확인한다**

로컬 서버에서 `miguel` 로 로그인해 확인한다:

- 맵의 방 칸 총합이 요약 칩의 `Total` 과 같다
- 클러스터 라벨 진행률 합(`done`)이 요약 칩의 `Total − Not inspected` 와 같다
- 이슈 리스트에 있는 방번호를 맵에서 찾으면 실제로 빨간 `⚠` 칸이다

- [ ] **Step 2: 점검자 계정으로 확인한다**

점검자 계정 하나(예 `celia`)로 로그인해 확인한다:

- 자기 배정 방만 맵에 나온다 (`listRooms()`가 이미 걸러주므로 별도 코드 없음)
- 칸을 누르면 **리포트가 아니라 점검폼**이 뜬다
- 점검을 저장하고 돌아오면 그 칸 색이 바뀌어 있고, 여전히 맵 탭이다

- [ ] **Step 3: 수리담당 계정이 안 깨졌는지 확인한다**

`fix1` 로 로그인해 확인한다:

- 기존 "Issues to fix" 화면만 나온다
- 탭도 맵도 안 보인다

- [ ] **Step 4: 전체 테스트를 다시 돌린다**

Run: `node --test scripts/room-map.test.mjs scripts/team-util.test.mjs`
Expected: `fail 0` — 기존 테스트도 같이 통과해야 한다

- [ ] **Step 5: 배포한다**

```bash
git push
```

GitHub Pages가 빌드 없이 그대로 서빙한다. 1~2분 뒤 `https://lcic-campus.com/room-check.html` 을 실제로 열어 맵이 뜨는지 확인한다. (`?v=1` 쿼리가 붙은 새 모듈이라 캐시 문제는 없다.)

---

## 하지 않는 것

- `dorm-report.html`(임원 보고용) — 호실 세부를 일부러 뺀 화면이다. 별도 건.
- 수리담당(fix1~10) 화면 — "열린 이슈 목록"이 그 역할에 맞다.
- 호실별 거주자(누가 어느 방) — 별도 건.
- 사진 업로드 — 원래부터 Phase 2.
