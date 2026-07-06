-- 학생 모임(방) 기능 (rooms.html · team.html "🏀 학생 모임" 탭)
-- CELS Supabase(cedienlogevuhgqmcgph) SQL Editor에 붙여넣고 한 번 실행하세요.
--
-- 학생이 방을 만들고(농구·그랩 카풀·쇼핑 등 자유) 서로 참여. 이름만 저장(로그인 게이트 뒤, 호핑 수준).

create table if not exists public.rooms (
  id          text primary key,
  host_id     text not null,          -- 주최자 이메일 sha256 앞16
  host_name   text not null,
  title       text not null,          -- "농구하자", "그랩 같이 타실 분" 등 자유
  place       text,                   -- 장소(자유 입력)
  event_date  text,                   -- YYYY-MM-DD
  event_time  text,                   -- HH:MM
  capacity    int,                    -- null/0 = 인원 제한 없음
  note        text,                   -- 한줄 설명(선택)
  status      text not null default 'open',   -- open | closed | cancelled
  created_at  timestamptz not null default now()
);

create table if not exists public.room_joins (
  room_id    text not null references public.rooms(id) on delete cascade,
  student_id text not null,           -- 참여 학생 이메일 sha256 앞16
  name       text not null,
  joined_at  timestamptz not null default now(),
  primary key (room_id, student_id)
);

alter table public.rooms       enable row level security;
alter table public.room_joins  enable row level security;

-- anon 전체 CRUD (페이지가 로그인 게이트 뒤라 허용). 주최자 전용 동작은 클라이언트에서 제한.
drop policy if exists "anon all rooms"       on public.rooms;
drop policy if exists "anon all room_joins"  on public.room_joins;
create policy "anon all rooms"      on public.rooms      for all using (true) with check (true);
create policy "anon all room_joins" on public.room_joins for all using (true) with check (true);

grant select, insert, update, delete on public.rooms      to anon, authenticated;
grant select, insert, update, delete on public.room_joins to anon, authenticated;
