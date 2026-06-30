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
  while (cells.length % 7 !== 0) cells.pop();
  return cells;
}
