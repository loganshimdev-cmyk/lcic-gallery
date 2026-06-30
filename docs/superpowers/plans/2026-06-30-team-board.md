# 한국팀 보드 (team.html) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** lcic-campus.com에 한국담당자 전용 협업 페이지(`team.html`)를 추가한다 — 공유 할일판(칸반) + 공유 캘린더 + 할 일 코멘트, 개인 로그인.

**Architecture:** 기존 정적 HTML(GitHub Pages) + Supabase 패턴을 그대로 따른다. 순수 함수 헬퍼는 `assets/team-util.js`로 분리해 node:test로 TDD하고, Supabase 연동(`assets/team-data.js`)과 UI 모듈(board/calendar/summary)은 그 헬퍼 위에 얹어 브라우저로 통합 검증한다. 인증은 admin.html과 동일한 Supabase Auth 세션(`lcic-admin-auth`)을 재사용한다.

**Tech Stack:** 정적 HTML/CSS/ES모듈, `@supabase/supabase-js@2`(esm.sh), `shared.css`(Pretendard), node:test(순수 헬퍼), Playwright/수동 브라우저(통합 검증), GitHub Pages.

**참고 스펙:** `docs/superpowers/specs/2026-06-30-team-board-design.md`

---

## File Structure

| 파일 | 책임 |
|---|---|
| `scripts/team-setup.sql` (생성) | 테이블 4개 + RLS + updated_at 트리거 SQL |
| `SETUP.md` (수정) | 팀 보드 셋업 절차 섹션 추가 |
| `assets/team-util.js` (생성) | 순수 함수: 색 배정, NEW 판정, 상태 버킷, 마감 판정, 달력 그리드, 날짜 포맷 |
| `scripts/team-util.test.mjs` (생성) | team-util.js node:test |
| `assets/team-data.js` (생성) | Supabase CRUD: members/tasks/events/comments + 현재 멤버 보장 |
| `team.html` (생성) | 마크업·스타일·로그인·멤버등록·탭 셸·모듈 부트스트랩 |
| `assets/team-board.js` (생성) | 할일판 칸반: 렌더/추가/상태이동/필터/상세패널/코멘트 |
| `assets/team-calendar.js` (생성) | 월간 캘린더: 렌더/일정추가/날짜패널 |
| `assets/team-summary.js` (생성) | 상단 요약바 카운트 + NEW 배지(localStorage) |
| `index.html` (수정) | 비노출 진입(주석 링크) — 선택 |

핵심 분리 원칙: **순수 로직(team-util) ↔ Supabase I/O(team-data) ↔ UI(board/calendar/summary)**. UI 모듈은 team-data와 team-util만 의존하고 서로를 직접 import하지 않는다(team.html이 오케스트레이션).

---

## Task 1: 데이터베이스 스키마 & RLS

**Files:**
- Create: `scripts/team-setup.sql`
- Modify: `SETUP.md`

- [ ] **Step 1: SQL 파일 작성**

Create `scripts/team-setup.sql`:

```sql
-- ============================================================
-- 한국팀 보드 (team.html) 스키마
-- Supabase SQL Editor에서 1회 실행
-- ============================================================

-- 멤버(한국담당자) 프로필
create table if not exists public.team_members (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  color      text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- 할 일
create table if not exists public.team_tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  detail      text,
  assignee_id uuid references public.team_members(id) on delete set null,
  due_date    date,
  status      text not null default 'todo' check (status in ('todo','doing','done')),
  sort        integer not null default 0,
  created_by  uuid references public.team_members(id) on delete set null,
  done_at     timestamptz,
  done_by     uuid references public.team_members(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 일정 (단일 날짜)
create table if not exists public.team_events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  date        date not null,
  all_day     boolean not null default true,
  start_time  time,
  end_time    time,
  owner_id    uuid references public.team_members(id) on delete set null,
  detail      text,
  created_by  uuid references public.team_members(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- 할 일 코멘트
create table if not exists public.team_comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.team_tasks(id) on delete cascade,
  author_id  uuid references public.team_members(id) on delete set null,
  body       text not null,
  created_at timestamptz not null default now()
);

create index if not exists team_comments_task_idx on public.team_comments(task_id);
create index if not exists team_tasks_status_idx on public.team_tasks(status);
create index if not exists team_events_date_idx on public.team_events(date);

-- updated_at 자동 갱신
create or replace function public.team_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists team_tasks_touch on public.team_tasks;
create trigger team_tasks_touch
  before update on public.team_tasks
  for each row execute function public.team_touch_updated_at();

-- RLS: 로그인(authenticated)만 전부 허용, anon 차단
alter table public.team_members  enable row level security;
alter table public.team_tasks    enable row level security;
alter table public.team_events   enable row level security;
alter table public.team_comments enable row level security;

do $$
declare t text;
begin
  foreach t in array array['team_members','team_tasks','team_events','team_comments']
  loop
    execute format('drop policy if exists %I on public.%I', t||'_auth_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      t||'_auth_all', t);
  end loop;
end $$;
```

- [ ] **Step 2: SQL을 SQL 문법으로 검증**

Run: `cat scripts/team-setup.sql | grep -c "create policy"` (불가하면 시각 검토)
Expected: 정책 생성 루프 1개(`create policy ... for all to authenticated`). 4개 테이블 모두 RLS enable 라인 존재 확인.

- [ ] **Step 3: SETUP.md에 절차 추가**

Append to `SETUP.md`:

```markdown

## 한국팀 보드 (team.html)

1. Supabase 대시보드 → SQL Editor에서 `scripts/team-setup.sql` 전체 실행.
2. Authentication → Users 에서 한국담당자별 계정(이메일/비번) 생성.
3. 각 담당자가 `https://lcic-campus.com/team.html` 첫 로그인 시 한글 이름 등록(자동으로 team_members 생성, 색 배정).
4. RLS상 로그인하지 않으면 어떤 데이터도 보이지 않음.
```

- [ ] **Step 4: Supabase에서 실제 실행 (사용자/운영)**

Supabase SQL Editor에 `scripts/team-setup.sql` 붙여넣어 실행. 에러 없이 "Success" 확인. (CI 불가 — 운영 1회 작업)

- [ ] **Step 5: Commit**

```bash
git add scripts/team-setup.sql SETUP.md
git commit -m "feat(team): DB 스키마/RLS SQL + 셋업 문서"
```

---

## Task 2: 순수 헬퍼 (team-util.js) — TDD

**Files:**
- Create: `assets/team-util.js`
- Test: `scripts/team-util.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `scripts/team-util.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PALETTE, assignColor, isNew, bucketTasks, isOverdue, ymd, monthGrid,
} from "../assets/team-util.js";

test("assignColor: 사용 안 된 첫 색 반환", () => {
  assert.equal(assignColor([PALETTE[0]]), PALETTE[1]);
});

test("assignColor: 다 쓰면 처음으로 순환", () => {
  assert.equal(assignColor([...PALETTE]), PALETTE[0]);
});

test("isNew: 마지막 방문 이후면 true", () => {
  assert.equal(isNew("2026-06-30T10:00:00Z", "2026-06-30T09:00:00Z"), true);
});

test("isNew: 마지막 방문 이전이면 false", () => {
  assert.equal(isNew("2026-06-30T08:00:00Z", "2026-06-30T09:00:00Z"), false);
});

test("isNew: 마지막 방문 없으면 false (첫 진입은 NEW 폭주 방지)", () => {
  assert.equal(isNew("2026-06-30T08:00:00Z", null), false);
});

test("bucketTasks: 상태별 분류 + sort 오름차순", () => {
  const tasks = [
    { id: "a", status: "done", sort: 1 },
    { id: "b", status: "todo", sort: 2 },
    { id: "c", status: "todo", sort: 1 },
  ];
  const b = bucketTasks(tasks);
  assert.deepEqual(b.todo.map((t) => t.id), ["c", "b"]);
  assert.deepEqual(b.doing.map((t) => t.id), []);
  assert.deepEqual(b.done.map((t) => t.id), ["a"]);
});

test("isOverdue: 마감 지나고 미완료면 true", () => {
  assert.equal(isOverdue("2026-06-29", "2026-06-30", "todo"), true);
});

test("isOverdue: 완료면 false", () => {
  assert.equal(isOverdue("2026-06-29", "2026-06-30", "done"), false);
});

test("isOverdue: 마감 없으면 false", () => {
  assert.equal(isOverdue(null, "2026-06-30", "todo"), false);
});

test("ymd: 로컬 날짜 YYYY-MM-DD", () => {
  assert.equal(ymd(new Date(2026, 5, 3)), "2026-06-03");
});

test("monthGrid: 2026-06은 일요일 시작 6주 그리드, 1일=월요일", () => {
  const g = monthGrid(2026, 5); // month 0-based: 5 = June
  assert.equal(g.length % 7, 0);
  assert.equal(g[0].inMonth, false); // 5/31은 일요일 → 6월 앞 빈칸 아님? 검증은 아래
  const first = g.find((c) => c.day === 1 && c.inMonth);
  assert.equal(first.iso, "2026-06-01");
});
```

- [ ] **Step 2: 테스트 실행해 실패 확인**

Run: `node --test scripts/team-util.test.mjs`
Expected: FAIL — `assets/team-util.js` 모듈/익스포트 없음.

- [ ] **Step 3: team-util.js 구현**

Create `assets/team-util.js`:

```js
// 순수 함수 모음 — Supabase/DOM 의존 없음 (node:test 가능)

export const PALETTE = [
  "#2563eb", "#db2777", "#059669", "#d97706",
  "#7c3aed", "#0891b2", "#dc2626", "#65a30d",
];

// 이미 쓰인 색을 제외한 첫 팔레트 색. 다 쓰면 개수 기준 순환.
export function assignColor(usedColors = []) {
  const free = PALETTE.find((c) => !usedColors.includes(c));
  if (free) return free;
  return PALETTE[usedColors.length % PALETTE.length];
}

// item 생성/수정 시각이 마지막 방문 이후인가. 방문기록 없으면 false.
export function isNew(itemIso, lastVisitIso) {
  if (!lastVisitIso || !itemIso) return false;
  return new Date(itemIso).getTime() > new Date(lastVisitIso).getTime();
}

// 상태별 분류 + 각 열 sort 오름차순(동률은 created_at).
export function bucketTasks(tasks = []) {
  const out = { todo: [], doing: [], done: [] };
  for (const t of tasks) (out[t.status] || out.todo).push(t);
  const sorter = (a, b) =>
    (a.sort - b.sort) ||
    (new Date(a.created_at || 0) - new Date(b.created_at || 0));
  out.todo.sort(sorter); out.doing.sort(sorter); out.done.sort(sorter);
  return out;
}

// 마감일이 오늘(todayYmd)보다 과거이고 완료가 아니면 true.
export function isOverdue(dueDate, todayYmd, status) {
  if (!dueDate || status === "done") return false;
  return dueDate < todayYmd;
}

// Date → 로컬 'YYYY-MM-DD'
export function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// 월간 달력 셀 배열(일요일 시작, 주 단위로 7의 배수). 각 셀: {iso, day, inMonth}
export function monthGrid(year, month /* 0-based */) {
  const first = new Date(year, month, 1);
  const startDow = first.getDay(); // 0=일
  const start = new Date(year, month, 1 - startDow);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push({ iso: ymd(d), day: d.getDate(), inMonth: d.getMonth() === month });
    if (i >= 34 && d.getMonth() !== month && d.getDay() === 6) break; // 6주 미만이면 5주에서 종료
  }
  // 항상 7의 배수 보장
  while (cells.length % 7 !== 0) cells.pop();
  return cells;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test scripts/team-util.test.mjs`
Expected: PASS — 모든 테스트 통과. (monthGrid 테스트 실패 시 `g[0].inMonth` 단언은 제거하고 `first.iso`만 신뢰 — 6/1은 월요일이므로 앞에 일요일 1칸.)

- [ ] **Step 5: Commit**

```bash
git add assets/team-util.js scripts/team-util.test.mjs
git commit -m "feat(team): 순수 헬퍼 team-util.js + 테스트"
```

---

## Task 3: 데이터 레이어 (team-data.js)

**Files:**
- Create: `assets/team-data.js`

- [ ] **Step 1: 구현**

Create `assets/team-data.js`:

```js
import { supabase } from "./supabase.js?v=4";
import { assignColor } from "./team-util.js";

// 현재 세션 사용자. 없으면 null.
export async function currentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
}

// 로그인 사용자의 team_members 행. 없으면 null (등록 모달 필요).
export async function myMember() {
  const user = await currentUser();
  if (!user) return null;
  const { data } = await supabase
    .from("team_members").select("*").eq("id", user.id).maybeSingle();
  return data ?? null;
}

export async function listMembers() {
  const { data, error } = await supabase
    .from("team_members").select("*").order("created_at");
  if (error) throw error;
  return data ?? [];
}

// 첫 로그인 등록: 이름 받아 색 자동 배정 후 upsert.
export async function registerMember(name) {
  const user = await currentUser();
  if (!user) throw new Error("로그인이 필요합니다.");
  const members = await listMembers();
  const color = assignColor(members.map((m) => m.color));
  const { data, error } = await supabase
    .from("team_members")
    .upsert({ id: user.id, name: name.trim(), color, active: true })
    .select().single();
  if (error) throw error;
  return data;
}

export async function listTasks() {
  const { data, error } = await supabase.from("team_tasks").select("*");
  if (error) throw error;
  return data ?? [];
}

export async function createTask({ title, detail, assignee_id, due_date }) {
  const me = await myMember();
  const { error } = await supabase.from("team_tasks").insert({
    title, detail: detail || null, assignee_id: assignee_id || null,
    due_date: due_date || null, status: "todo", created_by: me?.id ?? null,
  });
  if (error) throw error;
}

export async function updateTask(id, patch) {
  const { error } = await supabase.from("team_tasks").update(patch).eq("id", id);
  if (error) throw error;
}

// 상태 이동. done이면 done_at/done_by 기록, 아니면 비움.
export async function moveTask(id, status) {
  const me = await myMember();
  const patch = { status };
  if (status === "done") {
    patch.done_at = new Date().toISOString();
    patch.done_by = me?.id ?? null;
  } else {
    patch.done_at = null; patch.done_by = null;
  }
  await updateTask(id, patch);
}

export async function deleteTask(id) {
  const { error } = await supabase.from("team_tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function listComments(taskId) {
  const { data, error } = await supabase
    .from("team_comments").select("*").eq("task_id", taskId).order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function addComment(taskId, body) {
  const me = await myMember();
  const { error } = await supabase.from("team_comments")
    .insert({ task_id: taskId, author_id: me?.id ?? null, body: body.trim() });
  if (error) throw error;
}

export async function listEvents() {
  const { data, error } = await supabase.from("team_events").select("*");
  if (error) throw error;
  return data ?? [];
}

export async function createEvent({ title, date, all_day, start_time, end_time, owner_id, detail }) {
  const me = await myMember();
  const { error } = await supabase.from("team_events").insert({
    title, date, all_day: all_day ?? true,
    start_time: all_day ? null : (start_time || null),
    end_time: all_day ? null : (end_time || null),
    owner_id: owner_id || null, detail: detail || null, created_by: me?.id ?? null,
  });
  if (error) throw error;
}

export async function deleteEvent(id) {
  const { error } = await supabase.from("team_events").delete().eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 2: 문법/임포트 검증**

Run: `node --check assets/team-data.js`
Expected: 출력 없음(문법 OK). (esm.sh import는 node 실행이 아니라 `--check`만 하므로 네트워크 불필요.)

- [ ] **Step 3: Commit**

```bash
git add assets/team-data.js
git commit -m "feat(team): Supabase 데이터 레이어 team-data.js"
```

---

## Task 4: 페이지 셸 — 로그인 + 멤버 등록 + 탭 (team.html)

**Files:**
- Create: `team.html`

- [ ] **Step 1: team.html 작성 (셸 + 인증 + 등록)**

Create `team.html` (admin.html의 로그인 카드/토스트/탭 패턴을 따른다):

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>한국팀 보드 · LCIC</title>
<meta name="robots" content="noindex, nofollow">
<link rel="icon" type="image/png" href="assets/brand/lcic-logo.png">
<script src="assets/background.js?v=8"></script>
<link rel="stylesheet" href="assets/shared.css?v=8">
<script src="https://code.iconify.design/iconify-icon/2.3.0/iconify-icon.min.js"></script>
<style>
  .login-card { max-width: 420px; margin: 60px auto 0; padding: 40px 36px; border-radius: 28px; }
  .field { margin-bottom: 16px; }
  .field label { display:block; font-size:.78rem; color:var(--text-dim); margin-bottom:8px; }
  .field input { width:100%; }
  .topbar { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:20px; flex-wrap:wrap; }
  .tabs { display:inline-flex; padding:5px; background:rgba(0,0,0,.04); border:1px solid var(--hairline); border-radius:999px; }
  .tabs button { border:none; background:none; padding:8px 18px; border-radius:999px; cursor:pointer; font-weight:600; color:var(--text-dim); }
  .tabs button.active { background:var(--accent); color:#fff; }
  .summary-bar { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:18px; }
  .chip { display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:999px; background:rgba(0,0,0,.04); border:1px solid var(--hairline); font-size:.85rem; cursor:pointer; }
  .chip .dot { width:8px; height:8px; border-radius:50%; background:var(--accent); }
  .chip.alert .dot { background:#dc2626; }
  .hidden { display:none !important; }
  /* board */
  .board { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
  .col { background:rgba(0,0,0,.03); border:1px solid var(--hairline); border-radius:16px; padding:12px; min-height:120px; }
  .col h3 { font-size:.85rem; color:var(--text-dim); margin:4px 6px 10px; }
  .card { background:#fff; border:1px solid var(--hairline); border-radius:12px; padding:10px 12px; margin-bottom:10px; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,.04); }
  .card .badge { display:inline-flex; align-items:center; gap:5px; font-size:.72rem; color:var(--text-dim); }
  .card .swatch { width:9px; height:9px; border-radius:50%; display:inline-block; }
  .card .meta { display:flex; gap:10px; align-items:center; margin-top:6px; font-size:.72rem; color:var(--text-faint); }
  .card .overdue { color:#dc2626; font-weight:600; }
  .new-badge { font-size:.62rem; background:#dc2626; color:#fff; border-radius:6px; padding:1px 5px; margin-left:6px; }
  /* calendar */
  .cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:6px; }
  .cal-cell { min-height:84px; border:1px solid var(--hairline); border-radius:10px; padding:6px; background:#fff; cursor:pointer; }
  .cal-cell.dim { background:rgba(0,0,0,.02); color:var(--text-faint); }
  .cal-cell .pill { font-size:.66rem; border-radius:6px; padding:1px 5px; color:#fff; margin-top:3px; display:block; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
  /* modal */
  .modal-bg { position:fixed; inset:0; background:rgba(0,0,0,.4); display:flex; align-items:center; justify-content:center; z-index:50; }
  .modal { background:#fff; border-radius:20px; padding:24px; max-width:480px; width:92%; max-height:88vh; overflow:auto; }
  .modal textarea, .modal input, .modal select { width:100%; margin-bottom:10px; }
  .comment { border-top:1px solid var(--hairline); padding:8px 0; font-size:.85rem; }
  .comment .who { font-weight:600; font-size:.75rem; color:var(--text-dim); }
  .toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:#111; color:#fff; padding:10px 18px; border-radius:999px; opacity:0; transition:opacity .3s; pointer-events:none; }
  .toast.show { opacity:1; }
  .toast.error { background:#dc2626; } .toast.success { background:#059669; }
</style>
</head>
<body>
<main class="container" style="max-width:980px; padding:32px 18px;">

  <!-- 로그인 -->
  <div id="login-view" class="login-card glass hidden">
    <h2>한국팀 보드</h2>
    <p style="color:var(--text-dim); font-size:.88rem; margin-bottom:24px;">담당자 계정으로 로그인하세요.</p>
    <form id="login-form">
      <div class="field"><label>이메일</label><input id="email" type="email" required></div>
      <div class="field"><label>비밀번호</label><input id="password" type="password" required></div>
      <button id="login-btn" class="btn-primary" type="submit" style="width:100%;">로그인</button>
    </form>
  </div>

  <!-- 멤버 등록(첫 로그인) -->
  <div id="register-view" class="login-card glass hidden">
    <h2>처음 오셨네요 👋</h2>
    <p style="color:var(--text-dim); font-size:.88rem; margin-bottom:24px;">팀에 표시될 한글 이름을 등록하세요.</p>
    <form id="register-form">
      <div class="field"><label>이름</label><input id="reg-name" type="text" required placeholder="예: 심상현"></div>
      <button class="btn-primary" type="submit" style="width:100%;">시작하기</button>
    </form>
  </div>

  <!-- 메인 앱 -->
  <div id="app-view" class="hidden">
    <div class="topbar">
      <div class="tabs">
        <button data-tab="board" class="active">🗂 할일판</button>
        <button data-tab="calendar">📅 캘린더</button>
      </div>
      <div style="display:flex; align-items:center; gap:12px;">
        <span id="me-name" style="font-size:.85rem; color:var(--text-dim);"></span>
        <button id="logout-btn" class="btn-ghost" style="font-size:.8rem;">로그아웃</button>
      </div>
    </div>

    <div id="summary-bar" class="summary-bar"></div>

    <section id="tab-board"></section>
    <section id="tab-calendar" class="hidden"></section>
  </div>

</main>

<div id="modal-root"></div>
<div class="toast" id="toast"></div>

<script type="module">
import { supabase } from "./assets/supabase.js?v=4";
import { myMember, registerMember } from "./assets/team-data.js";
import { initBoard } from "./assets/team-board.js";
import { initCalendar } from "./assets/team-calendar.js";
import { renderSummary } from "./assets/team-summary.js";

const $ = (id) => document.getElementById(id);
const toast = $("toast");
export function showToast(msg, type = "") {
  toast.textContent = msg; toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove("show"), 2400);
}
window.__toast = showToast;

let me = null;

async function refresh() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { show("login"); return; }
  me = await myMember();
  if (!me) { show("register"); return; }
  show("app");
  $("me-name").textContent = me.name;
  await renderAll();
}

function show(view) {
  $("login-view").classList.toggle("hidden", view !== "login");
  $("register-view").classList.toggle("hidden", view !== "register");
  $("app-view").classList.toggle("hidden", view !== "app");
}

async function renderAll() {
  await Promise.all([
    initBoard({ me, container: $("tab-board"), onChange: renderAll }),
    initCalendar({ me, container: $("tab-calendar"), onChange: renderAll }),
    renderSummary({ me, container: $("summary-bar") }),
  ]);
}
window.__teamRefresh = renderAll;

$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("email").value.trim(), password = $("password").value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return showToast(`로그인 실패: ${error.message}`, "error");
  $("password").value = ""; refresh();
});

$("register-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  try { me = await registerMember($("reg-name").value); refresh(); }
  catch (err) { showToast(err.message, "error"); }
});

$("logout-btn").addEventListener("click", async () => { await supabase.auth.signOut(); refresh(); });

// 탭 전환
document.querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll(".tabs button").forEach((x) => x.classList.remove("active"));
  b.classList.add("active");
  $("tab-board").classList.toggle("hidden", b.dataset.tab !== "board");
  $("tab-calendar").classList.toggle("hidden", b.dataset.tab !== "calendar");
}));

supabase.auth.onAuthStateChange(() => refresh());
refresh();
</script>
</body>
</html>
```

참고: `btn-primary` / `btn-ghost` / `glass` 클래스가 shared.css에 없으면 admin.html에서 쓰는 실제 버튼 클래스명으로 교체(구현 시 `grep -n "btn-" assets/shared.css`로 확인).

- [ ] **Step 2: 브라우저 검증 (로그인/등록 흐름)**

Run: 로컬 정적 서버 `python -m http.server 8080` 후 `http://localhost:8080/team.html` 접속(또는 GitHub Pages 배포 후 실제 URL).
Expected:
- 비로그인 → 로그인 카드 표시.
- Supabase에 만든 계정으로 로그인 → (team_members 없으므로) "처음 오셨네요" 등록 카드.
- 이름 등록 → 앱 뷰 표시, 우상단에 이름. (board/calendar 모듈 미완성이면 콘솔 에러는 다음 태스크에서 해결 — 셸·인증·등록 동작만 확인.)

- [ ] **Step 3: Commit**

```bash
git add team.html
git commit -m "feat(team): 페이지 셸 — 로그인/멤버등록/탭"
```

---

## Task 5: 할일판 칸반 (team-board.js)

**Files:**
- Create: `assets/team-board.js`

- [ ] **Step 1: 구현 (렌더 + 추가 + 상태이동 + 필터)**

Create `assets/team-board.js`:

```js
import { listTasks, listMembers, createTask, moveTask } from "./team-data.js";
import { bucketTasks, isOverdue, ymd } from "./team-util.js";
import { openTaskDetail } from "./team-board-detail.js";
import { getLastVisit } from "./team-summary.js";
import { isNew } from "./team-util.js";

const COLS = [["todo", "할 일"], ["doing", "진행중"], ["done", "완료"]];
let state = { mineOnly: false, hideDone: false };

export async function initBoard({ me, container, onChange }) {
  const [tasks, members] = await Promise.all([listTasks(), listMembers()]);
  const memberById = Object.fromEntries(members.map((m) => [m.id, m]));
  const today = ymd(new Date());
  const lastVisit = getLastVisit();

  let shown = tasks;
  if (state.mineOnly) shown = shown.filter((t) => t.assignee_id === me.id);
  const buckets = bucketTasks(shown);

  container.innerHTML = `
    <div style="display:flex; gap:14px; align-items:center; margin-bottom:12px; flex-wrap:wrap;">
      <button id="add-task" class="btn-primary" style="font-size:.85rem;">+ 새 할 일</button>
      <label style="font-size:.82rem;"><input type="checkbox" id="f-mine" ${state.mineOnly ? "checked" : ""}> 내 담당만</label>
      <label style="font-size:.82rem;"><input type="checkbox" id="f-hidedone" ${state.hideDone ? "checked" : ""}> 완료 숨기기</label>
    </div>
    <div class="board">
      ${COLS.map(([key, label]) => {
        if (key === "done" && state.hideDone) {
          return `<div class="col"><h3>${label}</h3><div style="color:var(--text-faint);font-size:.75rem;padding:8px;">숨김</div></div>`;
        }
        return `<div class="col" data-col="${key}"><h3>${label} (${buckets[key].length})</h3>
          ${buckets[key].map((t) => cardHtml(t, memberById, today, lastVisit)).join("")}
        </div>`;
      }).join("")}
    </div>`;

  container.querySelector("#add-task").onclick = () => openAddTask({ me, members, onChange });
  container.querySelector("#f-mine").onchange = (e) => { state.mineOnly = e.target.checked; onChange(); };
  container.querySelector("#f-hidedone").onchange = (e) => { state.hideDone = e.target.checked; onChange(); };

  container.querySelectorAll(".card").forEach((el) => {
    el.onclick = () => openTaskDetail({ taskId: el.dataset.id, me, members, onChange });
  });
}

function cardHtml(t, memberById, today, lastVisit) {
  const m = t.assignee_id ? memberById[t.assignee_id] : null;
  const overdue = isOverdue(t.due_date, today, t.status);
  const fresh = isNew(t.updated_at || t.created_at, lastVisit);
  return `<div class="card" data-id="${t.id}">
    <div style="font-weight:600; font-size:.9rem;">${escapeHtml(t.title)}${fresh ? '<span class="new-badge">NEW</span>' : ""}</div>
    <div class="meta">
      ${m ? `<span class="badge"><span class="swatch" style="background:${m.color}"></span>${escapeHtml(m.name)}</span>` : `<span class="badge" style="color:var(--text-faint)">미지정</span>`}
      ${t.due_date ? `<span class="${overdue ? "overdue" : ""}">📅 ${t.due_date.slice(5)}</span>` : ""}
    </div>
  </div>`;
}

function openAddTask({ me, members, onChange }) {
  const root = document.getElementById("modal-root");
  root.innerHTML = `<div class="modal-bg"><div class="modal">
    <h3 style="margin-bottom:14px;">새 할 일</h3>
    <input id="t-title" placeholder="제목" />
    <textarea id="t-detail" rows="2" placeholder="설명(선택)"></textarea>
    <select id="t-assignee"><option value="">담당자 미지정</option>
      ${members.map((m) => `<option value="${m.id}" ${m.id === me.id ? "selected" : ""}>${escapeHtml(m.name)}</option>`).join("")}</select>
    <input id="t-due" type="date" />
    <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:8px;">
      <button id="t-cancel" class="btn-ghost">취소</button>
      <button id="t-save" class="btn-primary">추가</button>
    </div>
  </div></div>`;
  const close = () => (root.innerHTML = "");
  root.querySelector("#t-cancel").onclick = close;
  root.querySelector(".modal-bg").onclick = (e) => { if (e.target.classList.contains("modal-bg")) close(); };
  root.querySelector("#t-save").onclick = async () => {
    const title = root.querySelector("#t-title").value.trim();
    if (!title) return window.__toast("제목을 입력하세요", "error");
    try {
      await createTask({
        title, detail: root.querySelector("#t-detail").value,
        assignee_id: root.querySelector("#t-assignee").value,
        due_date: root.querySelector("#t-due").value,
      });
      close(); window.__toast("추가했어요", "success"); onChange();
    } catch (err) { window.__toast(err.message, "error"); }
  };
}

export function escapeHtml(s = "") {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
```

- [ ] **Step 2: 문법 검증**

Run: `node --check assets/team-board.js`
Expected: 출력 없음. (team-board-detail.js는 Task 6에서 생성 — 그 전까지 상세 클릭은 에러가 날 수 있으나 보드 렌더/추가는 동작.)

- [ ] **Step 3: 브라우저 검증**

Reload `team.html` → 로그인 후:
Expected: 3열 칸반 표시, "+ 새 할 일"로 추가 시 할 일 열에 카드 생성, 담당자 색 뱃지·마감일 표시, "내 담당만" 체크 시 필터.

- [ ] **Step 4: Commit**

```bash
git add assets/team-board.js
git commit -m "feat(team): 할일판 칸반 렌더/추가/필터"
```

---

## Task 6: 할 일 상세 + 상태이동 + 코멘트 (team-board-detail.js)

**Files:**
- Create: `assets/team-board-detail.js`

- [ ] **Step 1: 구현**

Create `assets/team-board-detail.js`:

```js
import { listTasks, listComments, addComment, updateTask, moveTask, deleteTask } from "./team-data.js";
import { escapeHtml } from "./team-board.js";

export async function openTaskDetail({ taskId, me, members, onChange }) {
  const tasks = await listTasks();
  const t = tasks.find((x) => x.id === taskId);
  if (!t) return;
  const comments = await listComments(taskId);
  const memberById = Object.fromEntries(members.map((m) => [m.id, m]));
  const root = document.getElementById("modal-root");

  root.innerHTML = `<div class="modal-bg"><div class="modal">
    <input id="d-title" value="${escapeHtml(t.title)}" style="font-weight:700;" />
    <textarea id="d-detail" rows="3" placeholder="설명">${escapeHtml(t.detail || "")}</textarea>
    <div style="display:flex; gap:8px;">
      <select id="d-assignee" style="flex:1;"><option value="">미지정</option>
        ${members.map((m) => `<option value="${m.id}" ${m.id === t.assignee_id ? "selected" : ""}>${escapeHtml(m.name)}</option>`).join("")}</select>
      <input id="d-due" type="date" value="${t.due_date || ""}" style="flex:1;" />
    </div>
    <div style="display:flex; gap:6px; margin:6px 0 12px;">
      ${["todo", "doing", "done"].map((s) => `<button class="btn-ghost d-move ${t.status === s ? "active" : ""}" data-s="${s}" style="flex:1; ${t.status === s ? "background:var(--accent);color:#fff;" : ""}">${{ todo: "할 일", doing: "진행중", done: "완료" }[s]}</button>`).join("")}
    </div>
    ${t.status === "done" && t.done_by ? `<div style="font-size:.75rem; color:var(--text-faint); margin-bottom:8px;">✓ ${escapeHtml(memberById[t.done_by]?.name || "")} 완료</div>` : ""}

    <div style="font-size:.8rem; color:var(--text-dim); margin:10px 0 4px;">코멘트</div>
    <div id="d-comments">${comments.map((c) => commentHtml(c, memberById)).join("") || '<div style="color:var(--text-faint);font-size:.8rem;">아직 없음</div>'}</div>
    <div style="display:flex; gap:6px; margin-top:8px;">
      <input id="d-comment" placeholder="한 줄 남기기…" style="flex:1; margin:0;" />
      <button id="d-add-comment" class="btn-primary">등록</button>
    </div>

    <div style="display:flex; justify-content:space-between; margin-top:16px;">
      <button id="d-delete" class="btn-ghost" style="color:#dc2626;">삭제</button>
      <div style="display:flex; gap:8px;">
        <button id="d-close" class="btn-ghost">닫기</button>
        <button id="d-save" class="btn-primary">저장</button>
      </div>
    </div>
  </div></div>`;

  const close = () => (root.innerHTML = "");
  root.querySelector("#d-close").onclick = close;
  root.querySelector(".modal-bg").onclick = (e) => { if (e.target.classList.contains("modal-bg")) close(); };

  root.querySelectorAll(".d-move").forEach((b) => b.onclick = async () => {
    await moveTask(taskId, b.dataset.s); close(); onChange();
  });

  root.querySelector("#d-save").onclick = async () => {
    await updateTask(taskId, {
      title: root.querySelector("#d-title").value.trim(),
      detail: root.querySelector("#d-detail").value.trim() || null,
      assignee_id: root.querySelector("#d-assignee").value || null,
      due_date: root.querySelector("#d-due").value || null,
    });
    close(); window.__toast("저장했어요", "success"); onChange();
  };

  root.querySelector("#d-delete").onclick = async () => {
    if (!confirm("이 할 일을 삭제할까요?")) return;
    await deleteTask(taskId); close(); window.__toast("삭제했어요"); onChange();
  };

  root.querySelector("#d-add-comment").onclick = async () => {
    const body = root.querySelector("#d-comment").value.trim();
    if (!body) return;
    await addComment(taskId, body);
    openTaskDetail({ taskId, me, members, onChange }); // 다시 그려 코멘트 갱신
  };
}

function commentHtml(c, memberById) {
  const who = c.author_id ? (memberById[c.author_id]?.name || "?") : "?";
  const when = (c.created_at || "").slice(5, 16).replace("T", " ");
  return `<div class="comment"><span class="who">${escapeHtml(who)}</span> · <span style="color:var(--text-faint);font-size:.72rem;">${when}</span><div>${escapeHtml(c.body)}</div></div>`;
}
```

- [ ] **Step 2: 문법 검증**

Run: `node --check assets/team-board-detail.js`
Expected: 출력 없음.

- [ ] **Step 3: 브라우저 검증**

카드 클릭 → 상세 모달. 제목/담당자/마감 편집 후 저장 반영, 상태 버튼으로 열 이동(완료 시 "완료자" 표시), 코멘트 등록 시 즉시 목록 추가, 삭제 동작.

- [ ] **Step 4: Commit**

```bash
git add assets/team-board-detail.js
git commit -m "feat(team): 할 일 상세/상태이동/코멘트"
```

---

## Task 7: 월간 캘린더 (team-calendar.js)

**Files:**
- Create: `assets/team-calendar.js`

- [ ] **Step 1: 구현**

Create `assets/team-calendar.js`:

```js
import { listEvents, listTasks, listMembers, createEvent, deleteEvent } from "./team-data.js";
import { monthGrid, ymd } from "./team-util.js";
import { escapeHtml } from "./team-board.js";

let view = null; // {y, m} m=0-based

export async function initCalendar({ me, container, onChange }) {
  if (!view) { const n = new Date(); view = { y: n.getFullYear(), m: n.getMonth() }; }
  const [events, tasks, members] = await Promise.all([listEvents(), listTasks(), listMembers()]);
  const memberById = Object.fromEntries(members.map((m) => [m.id, m]));
  const cells = monthGrid(view.y, view.m);

  // 날짜별 아이템 모음
  const byDate = {};
  const push = (iso, item) => { (byDate[iso] ||= []).push(item); };
  events.forEach((e) => push(e.date, { kind: "event", title: e.title, color: e.owner_id ? memberById[e.owner_id]?.color : "#64748b", raw: e }));
  tasks.filter((t) => t.due_date && t.status !== "done").forEach((t) =>
    push(t.due_date, { kind: "task", title: "⏰ " + t.title, color: t.assignee_id ? memberById[t.assignee_id]?.color : "#94a3b8" }));

  const dows = ["일", "월", "화", "수", "목", "금", "토"];
  container.innerHTML = `
    <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
      <button id="c-prev" class="btn-ghost">‹</button>
      <strong style="font-size:1.05rem;">${view.y}년 ${view.m + 1}월</strong>
      <button id="c-next" class="btn-ghost">›</button>
      <button id="c-today" class="btn-ghost" style="font-size:.8rem;">오늘</button>
    </div>
    <div class="cal-grid">${dows.map((d) => `<div style="text-align:center; font-size:.75rem; color:var(--text-dim);">${d}</div>`).join("")}</div>
    <div class="cal-grid" style="margin-top:6px;">
      ${cells.map((c) => {
        const items = byDate[c.iso] || [];
        return `<div class="cal-cell ${c.inMonth ? "" : "dim"}" data-iso="${c.iso}">
          <div style="font-size:.75rem; font-weight:600;">${c.day}</div>
          ${items.slice(0, 3).map((it) => `<span class="pill" style="background:${it.color || "#64748b"}">${escapeHtml(it.title)}</span>`).join("")}
          ${items.length > 3 ? `<span style="font-size:.62rem; color:var(--text-faint);">+${items.length - 3}</span>` : ""}
        </div>`;
      }).join("")}
    </div>`;

  container.querySelector("#c-prev").onclick = () => { view.m--; if (view.m < 0) { view.m = 11; view.y--; } onChange(); };
  container.querySelector("#c-next").onclick = () => { view.m++; if (view.m > 11) { view.m = 0; view.y++; } onChange(); };
  container.querySelector("#c-today").onclick = () => { const n = new Date(); view = { y: n.getFullYear(), m: n.getMonth() }; onChange(); };
  container.querySelectorAll(".cal-cell").forEach((el) =>
    el.onclick = () => openDay({ iso: el.dataset.iso, items: byDate[el.dataset.iso] || [], me, members, onChange }));
}

function openDay({ iso, items, me, members, onChange }) {
  const root = document.getElementById("modal-root");
  root.innerHTML = `<div class="modal-bg"><div class="modal">
    <h3 style="margin-bottom:10px;">${iso}</h3>
    <div style="margin-bottom:14px;">${items.length ? items.map((it) => `<div class="comment"><span class="swatch" style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${it.color || "#64748b"}"></span> ${escapeHtml(it.title)} ${it.kind === "event" ? `<button class="btn-ghost ev-del" data-id="${it.raw.id}" style="font-size:.7rem;color:#dc2626;">삭제</button>` : ""}</div>`).join("") : '<div style="color:var(--text-faint);font-size:.85rem;">일정 없음</div>'}</div>
    <div style="font-size:.8rem; color:var(--text-dim); margin-bottom:6px;">새 일정</div>
    <input id="e-title" placeholder="일정 제목" />
    <select id="e-owner"><option value="">담당자 미지정</option>
      ${members.map((m) => `<option value="${m.id}" ${m.id === me.id ? "selected" : ""}>${escapeHtml(m.name)}</option>`).join("")}</select>
    <textarea id="e-detail" rows="2" placeholder="메모(선택)"></textarea>
    <div style="display:flex; gap:8px; justify-content:flex-end;">
      <button id="e-cancel" class="btn-ghost">닫기</button>
      <button id="e-save" class="btn-primary">일정 추가</button>
    </div>
  </div></div>`;
  const close = () => (root.innerHTML = "");
  root.querySelector("#e-cancel").onclick = close;
  root.querySelector(".modal-bg").onclick = (e) => { if (e.target.classList.contains("modal-bg")) close(); };
  root.querySelectorAll(".ev-del").forEach((b) => b.onclick = async () => { await deleteEvent(b.dataset.id); close(); onChange(); });
  root.querySelector("#e-save").onclick = async () => {
    const title = root.querySelector("#e-title").value.trim();
    if (!title) return window.__toast("제목을 입력하세요", "error");
    await createEvent({ title, date: iso, all_day: true, owner_id: root.querySelector("#e-owner").value, detail: root.querySelector("#e-detail").value });
    close(); window.__toast("일정 추가", "success"); onChange();
  };
}
```

- [ ] **Step 2: 문법 검증**

Run: `node --check assets/team-calendar.js`
Expected: 출력 없음.

- [ ] **Step 3: 브라우저 검증**

캘린더 탭 → 이번 달 그리드, 할 일 마감(⏰)·일정이 담당자 색으로 표시, 이전/다음/오늘 이동, 날짜 클릭 → 그날 목록 + 일정 추가/삭제.

- [ ] **Step 4: Commit**

```bash
git add assets/team-calendar.js
git commit -m "feat(team): 월간 캘린더 + 일정 추가/삭제"
```

---

## Task 8: 요약바 + NEW 배지 방문기록 (team-summary.js)

**Files:**
- Create: `assets/team-summary.js`

- [ ] **Step 1: 구현**

Create `assets/team-summary.js`:

```js
import { listTasks, listEvents } from "./team-data.js";
import { isOverdue, ymd } from "./team-util.js";

const KEY = "lcic-team-lastvisit";

// 직전 방문 시각(ISO) 반환. NEW 비교에 사용.
export function getLastVisit() {
  return localStorage.getItem(KEY);
}

// 이번 렌더 시각을 새 방문기록으로 저장(다음 진입의 NEW 기준).
function stampVisit() {
  localStorage.setItem(KEY, new Date().toISOString());
}

export async function renderSummary({ me, container }) {
  const [tasks, events] = await Promise.all([listTasks(), listEvents()]);
  const today = ymd(new Date());
  const mineOpen = tasks.filter((t) => t.assignee_id === me.id && t.status !== "done").length;
  const todayEvents = events.filter((e) => e.date === today).length;
  const overdue = tasks.filter((t) => isOverdue(t.due_date, today, t.status)).length;

  container.innerHTML = `
    <span class="chip"><span class="dot"></span> 내 미완료 <strong>${mineOpen}</strong></span>
    <span class="chip"><span class="dot"></span> 오늘 일정 <strong>${todayEvents}</strong></span>
    <span class="chip ${overdue ? "alert" : ""}"><span class="dot"></span> 마감 지남 <strong>${overdue}</strong></span>`;

  // 이번 렌더 NEW 계산이 끝난 뒤 방문기록 갱신(다음 진입 기준).
  // board가 getLastVisit()을 먼저 읽으므로, 약간 지연 후 stamp.
  setTimeout(stampVisit, 1500);
}
```

NEW 배지 타이밍 주의: `renderSummary`와 `initBoard`가 `Promise.all`로 동시에 돈다. board는 `getLastVisit()`를 동기로 즉시 읽고, summary는 `setTimeout(stampVisit, 1500)`로 그 이후에 갱신하므로 같은 렌더 사이클에서는 직전 방문 기준 NEW가 정상 표시된다.

- [ ] **Step 2: 문법 검증**

Run: `node --check assets/team-summary.js`
Expected: 출력 없음.

- [ ] **Step 3: 브라우저 검증**

상단에 "내 미완료 / 오늘 일정 / 마감 지남" 칩 표시, 마감 지난 게 있으면 빨간 점. 다른 계정으로 새 할 일/코멘트 추가 후 재진입 → 해당 카드에 NEW 배지(이전 방문 이후 항목). 같은 세션 재렌더에서는 NEW 유지, 페이지 새로고침 후엔 사라짐(방문 갱신됨).

- [ ] **Step 4: Commit**

```bash
git add assets/team-summary.js
git commit -m "feat(team): 요약바 카운트 + NEW 방문기록"
```

---

## Task 9: 비노출 진입 + 배포

**Files:**
- Modify: `index.html` (선택)

- [ ] **Step 1: index.html에 비노출 진입 주석 추가 (선택)**

`index.html`의 적절한 푸터/스크립트 영역 근처에 한국팀만 알아볼 주석 링크를 둔다(메뉴 노출 없이 URL만 공유하는 정책이면 이 단계는 건너뛰고 직접 URL만 안내).

```html
<!-- 한국팀 보드(비노출): /team.html -->
```

`team.html`에는 이미 `<meta name="robots" content="noindex, nofollow">`가 있어 검색 노출이 차단된다.

- [ ] **Step 2: 전체 문법 일괄 검증**

Run: `for f in assets/team-util.js assets/team-data.js assets/team-board.js assets/team-board-detail.js assets/team-calendar.js assets/team-summary.js; do node --check "$f" && echo "OK $f"; done && node --test scripts/team-util.test.mjs`
Expected: 모든 파일 "OK", node:test 전체 PASS.

- [ ] **Step 3: 배포 (push → GitHub Pages)**

```bash
git add index.html
git commit -m "feat(team): 비노출 진입 표시"
git push origin main
```

- [ ] **Step 4: 실서비스 종단 검증**

`https://lcic-campus.com/team.html` 접속 → 로그인 → 할 일 추가/이동/코멘트, 캘린더 일정 추가, 요약 칩 정상. 두 번째 계정으로 교차 확인(서로 보임 + NEW).

---

## Self-Review (작성자 점검 결과)

**1. 스펙 커버리지**
- 공유 할일판(칸반 3열): Task 5 ✓ / 캘린더: Task 7 ✓ / 둘 다 대등(탭): Task 4 ✓
- 개인 로그인: Task 4(Supabase Auth 재사용) ✓ / 멤버 등록·색 배정: Task 2·3·4 ✓
- 코멘트: Task 6 ✓ / 담당자 1명: team_tasks.assignee_id(단일 FK) ✓
- 단일 날짜 일정: team_events.date + all_day ✓
- 페이지 내 표시(요약/NEW), 외부 알림 없음: Task 8 ✓
- 비노출 경로 + noindex: Task 4(meta)·Task 9 ✓
- RLS 로그인만: Task 1 ✓

**2. 플레이스홀더 스캔**: TBD/TODO 없음. 모든 코드 단계에 실제 코드 포함.

**3. 타입/시그니처 일관성**:
- `escapeHtml`은 team-board.js에서 export, detail/calendar에서 import(중복 정의 없음) ✓
- `getLastVisit`은 team-summary.js export, team-board.js import ✓
- data 레이어 함수명(listTasks/createTask/moveTask/updateTask/deleteTask/listComments/addComment/listEvents/createEvent/deleteEvent/myMember/registerMember/listMembers)이 UI 호출과 일치 ✓
- `initBoard/initCalendar/renderSummary`는 team.html의 호출 시그니처(`{me, container, onChange}` / summary는 `{me, container}`)와 일치 ✓

**알려진 리스크(구현 시 확인)**: shared.css의 실제 버튼/카드 유틸 클래스명(`btn-primary`/`btn-ghost`/`glass`/`container`)이 다를 수 있음 → Task 4 Step 1에서 `grep`으로 확인 후 일치시킬 것.
