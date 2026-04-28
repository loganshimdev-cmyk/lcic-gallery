import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = "https://rzsmcysgijeshiiuyqjn.supabase.co";

// Supabase 대시보드 → Settings → API Keys → Publishable key 전체 값으로 교체하세요.
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_REPLACE_WITH_FULL_KEY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "lcic-admin-auth",
  },
});

export function formatDate(iso) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}
