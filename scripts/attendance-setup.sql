-- 현장 출석 체크 (attendance.html · team.html "✅ 오리엔테이션 출석" 탭)
-- CELS Supabase(cedienlogevuhgqmcgph) SQL Editor에 붙여넣고 한 번 실행하세요.
--
-- 개인정보 없음: id = 이메일 SHA-256 앞 16자(익명). 행이 있으면 '출석', 없으면 '미출석'.
-- 이름↔id 매핑은 attendance.html 안 암호화 blob(비번 4692)에만 존재.
-- 페이지가 비번 게이트라 anon 읽기/쓰기를 허용(행에 개인정보가 없어 안전).

create table if not exists public.attendance (
  id         text primary key,
  updated_at timestamptz not null default now()
);

alter table public.attendance enable row level security;

drop policy if exists "anon read attendance"   on public.attendance;
drop policy if exists "anon insert attendance" on public.attendance;
drop policy if exists "anon delete attendance" on public.attendance;

create policy "anon read attendance"   on public.attendance for select using (true);
create policy "anon insert attendance" on public.attendance for insert with check (true);
create policy "anon delete attendance" on public.attendance for delete using (true);

grant select, insert, delete on public.attendance to anon, authenticated;
