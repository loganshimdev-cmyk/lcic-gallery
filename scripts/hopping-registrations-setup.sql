-- 호핑 투어 실제 예약 (status.html 예약 카드 · team.html "🚤 호핑" 탭)
-- CELS Supabase(cedienlogevuhgqmcgph) SQL Editor에 붙여넣고 한 번 실행하세요.
-- ※ 기존 hopping_signups(수요조사)는 그대로 보존됩니다. 이건 별도 '예약' 테이블입니다.
--
-- id = 이메일 SHA-256 앞 16자. tour_date = 예약 날짜('2026-07-12' | '2026-07-17').
-- 이름/대학만 저장(명단 표시용), 페이지가 비번 게이트라 anon 읽기/쓰기 허용.

create table if not exists public.hopping_registrations (
  id         text primary key,
  name       text not null,
  university text,
  tour_date  text not null,
  created_at timestamptz not null default now()
);

alter table public.hopping_registrations enable row level security;

drop policy if exists "anon read hopping_reg"   on public.hopping_registrations;
drop policy if exists "anon insert hopping_reg" on public.hopping_registrations;
drop policy if exists "anon update hopping_reg" on public.hopping_registrations;
drop policy if exists "anon delete hopping_reg" on public.hopping_registrations;

create policy "anon read hopping_reg"   on public.hopping_registrations for select using (true);
create policy "anon insert hopping_reg" on public.hopping_registrations for insert with check (true);
create policy "anon update hopping_reg" on public.hopping_registrations for update using (true) with check (true);
create policy "anon delete hopping_reg" on public.hopping_registrations for delete using (true);

grant select, insert, update, delete on public.hopping_registrations to anon, authenticated;
