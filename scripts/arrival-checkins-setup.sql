-- 도착/입소 체크인 테이블 (arrivals.html · team.html "🛬 도착/입소" 탭)
-- CELS Supabase(cedienlogevuhgqmcgph) SQL Editor에 붙여넣고 한 번 실행하세요.
--
-- 개인정보 없음: id = 이메일 SHA-256 앞 16자(익명), status = 'airport'|'dorm' 뿐.
-- 이름↔id 매핑은 arrivals.html 안 암호화 blob(비번 4692)에만 존재.
-- 페이지가 비번 게이트라 anon 읽기/쓰기를 허용(행에 개인정보가 없어 안전).

create table if not exists public.arrival_checkins (
  id         text primary key,
  status     text not null check (status in ('airport', 'dorm')),
  updated_at timestamptz not null default now()
);

alter table public.arrival_checkins enable row level security;

-- 기존 정책이 있으면 갱신을 위해 제거 후 재생성
drop policy if exists "anon read arrival_checkins"   on public.arrival_checkins;
drop policy if exists "anon insert arrival_checkins" on public.arrival_checkins;
drop policy if exists "anon update arrival_checkins" on public.arrival_checkins;
drop policy if exists "anon delete arrival_checkins" on public.arrival_checkins;

create policy "anon read arrival_checkins"   on public.arrival_checkins for select using (true);
create policy "anon insert arrival_checkins" on public.arrival_checkins for insert with check (true);
create policy "anon update arrival_checkins" on public.arrival_checkins for update using (true) with check (true);
create policy "anon delete arrival_checkins" on public.arrival_checkins for delete using (true);

grant select, insert, update, delete on public.arrival_checkins to anon, authenticated;
