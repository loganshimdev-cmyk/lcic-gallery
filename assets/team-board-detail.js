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
    try { await moveTask(taskId, b.dataset.s); close(); onChange(); }
    catch (err) { window.__toast(err.message || "상태 변경 실패", "error"); }
  });

  root.querySelector("#d-save").onclick = async () => {
    try {
      await updateTask(taskId, {
        title: root.querySelector("#d-title").value.trim(),
        detail: root.querySelector("#d-detail").value.trim() || null,
        assignee_id: root.querySelector("#d-assignee").value || null,
        due_date: root.querySelector("#d-due").value || null,
      });
      close(); window.__toast("저장했어요", "success"); onChange();
    } catch (err) { window.__toast(err.message || "저장 실패", "error"); }
  };

  root.querySelector("#d-delete").onclick = async () => {
    if (!confirm("이 할 일을 삭제할까요?")) return;
    try { await deleteTask(taskId); close(); window.__toast("삭제했어요"); onChange(); }
    catch (err) { window.__toast(err.message || "삭제 실패", "error"); }
  };

  root.querySelector("#d-add-comment").onclick = async () => {
    const body = root.querySelector("#d-comment").value.trim();
    if (!body) return;
    try {
      await addComment(taskId, body);
      openTaskDetail({ taskId, me, members, onChange }); // 다시 그려 코멘트 갱신
    } catch (err) { window.__toast(err.message || "코멘트 등록 실패", "error"); }
  };
}

function commentHtml(c, memberById) {
  const who = c.author_id ? (memberById[c.author_id]?.name || "?") : "?";
  const when = (c.created_at || "").slice(5, 16).replace("T", " ");
  return `<div class="comment"><span class="who">${escapeHtml(who)}</span> · <span style="color:var(--text-faint);font-size:.72rem;">${when}</span><div>${escapeHtml(c.body)}</div></div>`;
}
