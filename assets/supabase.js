import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = "https://cedienlogevuhgqmcgph.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_K3R4FuCygdQj6t-WJEdk1A_TFKjF_eu";

// 인메모리 per-name 뮤텍스.
// - 기본 navigatorLock 은 이전 탭/깨진 세션이 잠금을 물면 로그인이 영원히 멈춘다.
// - 그렇다고 통과형(no-op)으로 두면 동시 토큰 갱신이 경합해 갑자기 로그아웃된다.
// 이 lock 은 navigator.locks 를 안 써서 교차탭 데드락이 없고, 페이지 안에서는
// 인증 작업을 직렬화해 갱신 경합을 막는다.
const _locks = {};
function memLock(name, _acquireTimeout, fn) {
  const prev = _locks[name] || Promise.resolve();
  let release;
  const gate = new Promise((r) => (release = r));
  _locks[name] = prev.then(() => gate);
  return prev.then(() => fn()).finally(() => release());
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "lcic-admin-auth",
    lock: memLock,
  },
});

export function formatDate(iso) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}
