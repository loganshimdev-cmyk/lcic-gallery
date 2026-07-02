import { listTasks, listMembers, createTask, moveTask, commentCounts } from "./team-data.js";
import { bucketTasks, isOverdue, ymd, isNew } from "./team-util.js";
import { openTaskDetail } from "./team-board-detail.js";
import { getLastVisit } from "./team-summary.js";

const COLS = [["todo", "할 일"], ["doing", "진행중"], ["done", "완료"]];
let state = { mineOnly: false, hideDone: false };

export async function initBoard({ me, container, onChange }) {
  const [tasks, members, counts] = await Promise.all([listTasks(), listMembers(), commentCounts()]);
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
          ${buckets[key].map((t) => cardHtml(t, memberById, today, lastVisit, counts)).join("")}
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

function cardHtml(t, memberById, today, lastVisit, counts = {}) {
  const m = t.assignee_id ? memberById[t.assignee_id] : null;
  const overdue = isOverdue(t.due_date, today, t.status);
  const fresh = isNew(t.updated_at || t.created_at, lastVisit);
  const cc = counts[t.id] || 0;
  return `<div class="card" data-id="${t.id}">
    <div style="font-weight:600; font-size:.9rem;">${escapeHtml(t.title)}${fresh ? '<span class="new-badge">NEW</span>' : ""}</div>
    <div class="meta">
      ${m ? `<span class="badge"><span class="swatch" style="background:${m.color}"></span>${escapeHtml(memberLabel(m))}</span>` : `<span class="badge" style="color:var(--text-faint)">미지정</span>`}
      ${t.due_date ? `<span class="${overdue ? "overdue" : ""}">예정 ${md(t.due_date)}${t.due_time ? " " + t.due_time.slice(0, 5) : ""}</span>` : ""}
      ${cc ? `<span style="color:var(--accent); font-weight:600;">댓글 ${cc}</span>` : ""}
      <span style="color:var(--text-faint)">${md(t.created_at)} 기록</span>
    </div>
  </div>`;
}

// ISO/날짜문자열 → "M/D"
function md(iso) {
  if (!iso) return "";
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${+m}/${+d}`;
}

function openAddTask({ me, members, onChange }) {
  const root = document.getElementById("modal-root");
  root.innerHTML = `<div class="modal-bg"><div class="modal">
    <h3 style="margin-bottom:14px;">새 할 일</h3>
    <input id="t-title" placeholder="제목" />
    <textarea id="t-detail" rows="2" placeholder="설명(선택)"></textarea>
    <select id="t-assignee"><option value="">담당자 미지정</option>
      ${members.map((m) => `<option value="${m.id}" ${m.id === me.id ? "selected" : ""}>${escapeHtml(memberLabel(m))}</option>`).join("")}</select>
    <div style="display:flex; gap:10px;">
      <div style="flex:1;"><label style="display:block;font-size:.75rem;color:var(--text-dim);margin-bottom:5px;">예정일</label><input id="t-due" type="date" value="${ymd(new Date())}" /></div>
      <div style="flex:1;"><label style="display:block;font-size:.75rem;color:var(--text-dim);margin-bottom:5px;">시간(선택)</label><input id="t-time" type="time" lang="en-GB" /></div>
    </div>
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
        due_time: root.querySelector("#t-time").value,
      });
      close(); window.__toast("추가했어요", "success"); onChange();
    } catch (err) { window.__toast(err.message, "error"); }
  };
}

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// 멤버 표시명: 이름 미등록이면 아이디로.
export function memberLabel(m) {
  return m ? (m.name || m.username || "(이름없음)") : "";
}
