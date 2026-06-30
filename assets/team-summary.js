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
