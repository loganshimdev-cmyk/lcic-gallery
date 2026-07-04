-- 호핑 투어 수요조사 (status.html 학생 신청 · team.html "🚤 호핑 수요조사" 탭)
-- CELS Supabase(cedienlogevuhgqmcgph) SQL Editor에 붙여넣고 한 번 실행하세요.
--
-- id = 이메일 SHA-256 앞 16자(학생별 고정 키, 중복 신청 방지용).
-- name·university = 직원 화면(team.html)에 신청자 명단을 이름으로 보여주기 위해 저장.
-- 페이지가 비번 게이트라 anon 읽기/쓰기를 허용(호핑 참가 희망 여부라 민감도 낮음).

create table if not exists public.hopping_signups (
  id         text primary key,
  name       text not null,
  university text,
  created_at timestamptz not null default now()
);

alter table public.hopping_signups enable row level security;

-- 기존 정책이 있으면 갱신을 위해 제거 후 재생성
drop policy if exists "anon read hopping_signups"   on public.hopping_signups;
drop policy if exists "anon insert hopping_signups" on public.hopping_signups;
drop policy if exists "anon update hopping_signups" on public.hopping_signups;
drop policy if exists "anon delete hopping_signups" on public.hopping_signups;

create policy "anon read hopping_signups"   on public.hopping_signups for select using (true);
create policy "anon insert hopping_signups" on public.hopping_signups for insert with check (true);
create policy "anon update hopping_signups" on public.hopping_signups for update using (true) with check (true);
create policy "anon delete hopping_signups" on public.hopping_signups for delete using (true);

grant select, insert, update, delete on public.hopping_signups to anon, authenticated;
