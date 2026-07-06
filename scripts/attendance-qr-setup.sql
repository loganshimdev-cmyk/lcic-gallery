-- QR 자동출석 서버 검증용 RPC (attendance-display.html + status.html?att=)
-- CELS Supabase(cedienlogevuhgqmcgph) SQL Editor에 붙여넣고 한 번 실행하세요.
-- ※ 먼저 attendance-setup.sql(테이블)을 실행했어야 합니다.
--
-- 원리: 20초 단위 시간버킷마다 토큰 = hmac(비밀, 버킷). 비밀은 서버(함수) 안에만 존재.
--  - att_token(pw): 강당 스크린이 현재 토큰을 받아 QR로 표시 (직원 비번 필요 → 학생은 못 받음)
--  - att_checkin(id, token): 학생이 스캔한 토큰이 '지금'(현재/직전 버킷) 것인지 서버가 검증 후 출석 기록
--  → 20초 지난 QR(스크린샷 등)은 거부 = 현장에 있어야만 출석.

create extension if not exists pgcrypto with schema extensions;

-- 내부 전용: 버킷 → 토큰(hmac). anon에는 실행권한 주지 않음(비밀 노출 방지).
create or replace function public.att_hmac(p_bucket bigint)
returns text language sql security definer set search_path = extensions, public as $$
  select substr(encode(extensions.hmac(p_bucket::text, 'lcic-att-secret-9f3a7c21e6', 'sha256'), 'hex'), 1, 12)
$$;
revoke all on function public.att_hmac(bigint) from public, anon, authenticated;

-- 강당 스크린용: 현재 토큰 + 남은 초. 직원 비번(4692) 필요.
create or replace function public.att_token(p_pw text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare b bigint; e bigint;
begin
  if p_pw is distinct from '4692' then return json_build_object('ok', false); end if;
  e := floor(extract(epoch from now()))::bigint;
  b := e / 20;
  return json_build_object('ok', true, 'token', public.att_hmac(b), 'ttl', 20 - (e % 20));
end $$;
grant execute on function public.att_token(text) to anon, authenticated;

-- 학생 체크인: 토큰이 현재/직전 버킷(≈40초 이내) 것이면 출석 기록.
create or replace function public.att_checkin(p_id text, p_token text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare b bigint;
begin
  if p_id is null or length(p_id) < 6 then return json_build_object('ok', false, 'reason', 'bad_id'); end if;
  b := floor(extract(epoch from now()))::bigint / 20;
  if p_token is null or (p_token <> public.att_hmac(b) and p_token <> public.att_hmac(b - 1)) then
    return json_build_object('ok', false, 'reason', 'expired');
  end if;
  insert into public.attendance(id) values (p_id) on conflict (id) do nothing;
  return json_build_object('ok', true);
end $$;
grant execute on function public.att_checkin(text, text) to anon, authenticated;
