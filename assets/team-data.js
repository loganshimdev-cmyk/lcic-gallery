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
