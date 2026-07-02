import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase.js?v=4";

// 간편 로그인 전용 클라이언트: 세션 저장 안 함 → 항상 순수 anon 역할로 요청.
// (공유 supabase.js 클라이언트는 예전 admin 세션 JWT를 들고 있어 authenticated 로
//  요청이 나가고, team_* 정책은 anon 대상이라 RLS에 막힘.)
const db = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// 간편 로그인(아이디/비번) — Supabase Auth 미사용.
// 세션은 localStorage에 보관(로그인한 멤버 {id,name,color,username}).
const SESSION_KEY = "lcic-team-member";

// 현재 로그인 멤버(localStorage). 없으면 null.
export function myMember() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
  catch { return null; }
}

// 호환용 별칭(기존 코드가 currentUser를 부를 수 있음).
export function currentUser() { return myMember(); }

// 아이디/비번 로그인. 성공 시 멤버 저장 후 반환, 실패 시 throw.
export async function login(username, password) {
  const { data, error } = await db.rpc("team_login", {
    p_username: username.trim().toLowerCase(),
    p_password: password,
  });
  if (error) throw error;
  const member = Array.isArray(data) ? data[0] : data;
  if (!member) throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
  localStorage.setItem(SESSION_KEY, JSON.stringify(member));
  return member;
}

export function logout() { localStorage.removeItem(SESSION_KEY); }

// 비밀번호 변경(현재 비번 확인). 성공 true.
export async function changePassword(oldPw, newPw) {
  const me = myMember();
  if (!me) throw new Error("로그인이 필요합니다.");
  const { data, error } = await db.rpc("team_set_password", {
    p_id: me.id, p_old: oldPw, p_new: newPw,
  });
  if (error) throw error;
  if (!data) throw new Error("현재 비밀번호가 올바르지 않습니다.");
  return true;
}

export async function listMembers() {
  const { data, error } = await db
    .from("team_members").select("id,name,color,username,active,created_at").order("created_at");
  if (error) throw error;
  return data ?? [];
}

// 첫 로그인 시 한글 이름 등록(현재 멤버의 name 갱신).
export async function registerMember(name) {
  const me = myMember();
  if (!me) throw new Error("로그인이 필요합니다.");
  const { data, error } = await db
    .from("team_members").update({ name: name.trim() }).eq("id", me.id)
    .select("id,name,color,username").single();
  if (error) throw error;
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  return data;
}

export async function listTasks() {
  const { data, error } = await db.from("team_tasks").select("*");
  if (error) throw error;
  return data ?? [];
}

export async function createTask({ title, detail, assignee_id, due_date, due_time }) {
  const me = await myMember();
  const { error } = await db.from("team_tasks").insert({
    title, detail: detail || null, assignee_id: assignee_id || null,
    due_date: due_date || null, due_time: due_time || null,
    status: "todo", created_by: me?.id ?? null,
  });
  if (error) throw error;
}

export async function updateTask(id, patch) {
  const { error } = await db.from("team_tasks").update(patch).eq("id", id);
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
  const { error } = await db.from("team_tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function listComments(taskId) {
  const { data, error } = await db
    .from("team_comments").select("*").eq("task_id", taskId).order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function updateComment(id, body) {
  const { error } = await db.from("team_comments").update({ body: body.trim() }).eq("id", id);
  if (error) throw error;
}

// 할 일별 댓글 수 { task_id: count }
export async function commentCounts() {
  const { data, error } = await db.from("team_comments").select("task_id");
  if (error) throw error;
  const map = {};
  for (const c of data ?? []) map[c.task_id] = (map[c.task_id] || 0) + 1;
  return map;
}

export async function addComment(taskId, body) {
  const me = await myMember();
  const { error } = await db.from("team_comments")
    .insert({ task_id: taskId, author_id: me?.id ?? null, body: body.trim() });
  if (error) throw error;
}

export async function listEvents() {
  const { data, error } = await db.from("team_events").select("*");
  if (error) throw error;
  return data ?? [];
}

export async function createEvent({ title, date, all_day, start_time, end_time, owner_id, detail }) {
  const me = await myMember();
  const { error } = await db.from("team_events").insert({
    title, date, all_day: all_day ?? true,
    start_time: all_day ? null : (start_time || null),
    end_time: all_day ? null : (end_time || null),
    owner_id: owner_id || null, detail: detail || null, created_by: me?.id ?? null,
  });
  if (error) throw error;
}

export async function deleteEvent(id) {
  const { error } = await db.from("team_events").delete().eq("id", id);
  if (error) throw error;
}
