import { listEvents, listTasks, listMembers, createEvent, deleteEvent } from "./team-data.js";
import { monthGrid, ymd } from "./team-util.js";
import { escapeHtml } from "./team-board.js";

let view = null; // {y, m} m=0-based

export async function initCalendar({ me, container, onChange }) {
  if (!view) { const n = new Date(); view = { y: n.getFullYear(), m: n.getMonth() }; }
  const [events, tasks, members] = await Promise.all([listEvents(), listTasks(), listMembers()]);
  const memberById = Object.fromEntries(members.map((m) => [m.id, m]));
  const cells = monthGrid(view.y, view.m);

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
