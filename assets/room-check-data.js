import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase.js?v=4";

// Dedicated anon client (no session persistence) so every request runs as the
// pure `anon` role. The shared assets/supabase.js client may still hold an old
// admin JWT (authenticated), which would miss the anon RLS policies on dorm_*.
const db = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Simple username/password login (NOT Supabase Auth). The logged-in inspector
// { id, username, name, gender, role } is kept in localStorage.
const SESSION_KEY = "lcic-dorm-inspector";

// Fixed, ordered checklist. Each item defaults to "ok"; the inspector taps to
// flag "problem" and can add a detail note. Adjust labels here only.
// Rooms/clusters have no plumbing or toilet, so those items are omitted.
export const CHECK_ITEMS = [
  { key: "aircon",      label: "Air conditioner (cooling / noise / power)" },
  { key: "electrical",  label: "Electrical, outlets & lights" },
  { key: "furniture",   label: "Furniture & fixtures (bed, desk, closet, door, window)" },
  { key: "cleanliness", label: "Cleanliness" },
  { key: "other",       label: "Other" },
];

// ---- session ----------------------------------------------------------------

export function myInspector() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
  catch { return null; }
}

export async function login(username, password) {
  const { data, error } = await db.rpc("inspector_login", {
    p_username: username.trim().toLowerCase(),
    p_password: password,
  });
  if (error) throw error;
  const me = Array.isArray(data) ? data[0] : data;
  if (!me) throw new Error("Incorrect username or password.");
  localStorage.setItem(SESSION_KEY, JSON.stringify(me));
  return me;
}

export function logout() { localStorage.removeItem(SESSION_KEY); }

export async function changePassword(oldPw, newPw) {
  const me = myInspector();
  if (!me) throw new Error("Please sign in first.");
  const { data, error } = await db.rpc("inspector_set_password", {
    p_id: me.id, p_old: oldPw, p_new: newPw,
  });
  if (error) throw error;
  if (!data) throw new Error("Current password is incorrect.");
  return true;
}

// ---- rooms ------------------------------------------------------------------

// Rooms visible to the current user. Inspectors see only the clusters assigned
// to them (dorm_rooms.assigned_username); admins (role 'admin') see every room.
export async function listRooms(me) {
  let q = db.from("dorm_rooms").select("*").eq("active", true);
  if (me && me.role !== "admin") q = q.eq("assigned_username", me.username);
  const { data, error } = await q
    .order("building", { ascending: true })
    .order("sort", { ascending: true })
    .order("room_number", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// ---- inspections ------------------------------------------------------------

// All inspection records (history), newest first.
export async function listInspections() {
  const { data, error } = await db
    .from("dorm_inspections").select("*")
    .order("inspected_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Map of room_id -> latest inspection, derived from the newest-first list.
export function latestByRoom(inspections) {
  const map = new Map();
  for (const rec of inspections) {
    if (!map.has(rec.room_id)) map.set(rec.room_id, rec);
  }
  return map;
}

// Save one inspection. `items` is the full CHECK_ITEMS-shaped array with
// { key, label, status, detail }. has_issues is derived from the items.
export async function saveInspection({ room_id, items, general_note }) {
  const me = myInspector();
  if (!me) throw new Error("Please sign in first.");
  const has_issues = items.some((it) => it.status === "problem");
  const { error } = await db.from("dorm_inspections").insert({
    room_id,
    inspector_id: me.id,
    inspector_name: me.name,
    items,
    general_note: general_note || null,
    has_issues,
  });
  if (error) throw error;
  return has_issues;
}
