-- 🍭 마시멜로우 챌린지 신청 (status.html 카드 · team.html "🍭 마시멜로우" 탭)
-- CELS Supabase(cedienlogevuhgqmcgph) SQL Editor에 붙여넣고 한 번 실행하세요.
--
-- 단일 이벤트(7/14 화 오후 4시, 어학관 2층) 선착순 50명. 이름만 저장(로그인 게이트 뒤, 호핑 수준).

create table if not exists public.marshmallow_signups (
  id          text primary key,       -- 학생 이메일 sha256 앞16
  name        text not null,
  university  text,
  created_at  timestamptz not null default now()
);

alter table public.marshmallow_signups enable row level security;

-- anon 전체 CRUD (status.html이 로그인 게이트 뒤라 허용).
drop policy if exists "anon all marshmallow" on public.marshmallow_signups;
create policy "anon all marshmallow" on public.marshmallow_signups for all using (true) with check (true);

grant select, insert, update, delete on public.marshmallow_signups to anon, authenticated;
