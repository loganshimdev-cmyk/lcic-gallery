-- 🏝 피크데이 호핑투어 신청 (status.html 카드 · team.html "🏝 피크데이" 탭 · peakday.html)
-- CELS Supabase(cedienlogevuhgqmcgph) SQL Editor에 붙여넣고 한 번 실행하세요.
--
-- 단일 이벤트 선착순 28명. 이름/대학만 저장(로그인 게이트 뒤, 마시멜로우와 동일 구조).

create table if not exists public.peakday_signups (
  id          text primary key,       -- 학생 이메일 sha256 앞16
  name        text not null,
  university  text,
  created_at  timestamptz not null default now()
);

alter table public.peakday_signups enable row level security;

-- anon 전체 CRUD (status.html이 로그인 게이트 뒤라 허용).
drop policy if exists "anon all peakday" on public.peakday_signups;
create policy "anon all peakday" on public.peakday_signups for all using (true) with check (true);

grant select, insert, update, delete on public.peakday_signups to anon, authenticated;

-- ── 정원(28명) 서버측 원자적 잠금 ──
-- 수십 명이 같은 순간에 신청해도 정확히 28명에서 잘립니다.
-- 핵심: pg_advisory_xact_lock 으로 동시 INSERT를 직렬화 → count 확인이 원자적.
-- 이미 등록된 학생(재신청/upsert 갱신)은 새 자리를 차지하지 않으므로 통과.

create or replace function public.pkd_enforce_cap()
returns trigger
language plpgsql
as $$
declare
  cur int;
begin
  if exists (select 1 from public.peakday_signups where id = NEW.id) then
    return NEW;
  end if;

  -- 이 테이블 전용 키로 동시 삽입을 직렬화(트랜잭션 종료 시 자동 해제)
  perform pg_advisory_xact_lock(778602);

  select count(*) into cur from public.peakday_signups;
  if cur >= 28 then
    raise exception 'PEAKDAY_FULL' using errcode = 'P0001';
  end if;

  return NEW;
end
$$;

drop trigger if exists trg_pkd_cap on public.peakday_signups;
create trigger trg_pkd_cap
  before insert on public.peakday_signups
  for each row execute function public.pkd_enforce_cap();
