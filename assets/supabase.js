import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = "https://cedienlogevuhgqmcgph.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_K3R4FuCygdQj6t-WJEdk1A_TFKjF_eu";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "lcic-admin-auth",
    // 기본 navigatorLock 은 이전 탭/깨진 세션이 잠금을 물고 있으면 로그인이
    // 영원히 "로그인 중…"으로 멈춘다. 단일 관리자 사용이라 교차탭 잠금이
    // 필요 없으므로 통과형 lock 으로 교체해 데드락을 제거한다.
    lock: (_name, _acquireTimeout, fn) => fn(),
  },
});

export function formatDate(iso) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}
