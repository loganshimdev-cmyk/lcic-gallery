-- 🎟 학생 이벤트 신청 (status.html · 선착순 정원 + 오픈시각을 서버에서 강제)
-- CELS Supabase(cedienlogevuhgqmcgph) SQL Editor에 붙여넣고 한 번 실행하세요.
--
-- 기존 hopping_registrations / marshmallow_signups 는 그대로 둡니다(건드리지 않음).
-- 이 파일은 앞으로의 이벤트를 위한 범용 테이블입니다.
--   event_slots   = 이벤트/날짜별 정원·오픈시각·마감시각 (운영자가 행만 추가하면 새 이벤트 개설)
--   event_signups = 학생 신청 (event_key + id 가 PK → 한 이벤트당 1자리, 날짜 변경은 update)
--
-- id = 이메일 SHA-256 앞 16자 (호핑·마시멜로우와 동일 규칙 → 명단 대조 가능)

create table if not exists public.event_slots (
  event_key  text not null,
  slot_date  text not null,
  label      text,
  cap        int  not null,
  opens_at   timestamptz,
  closes_at  timestamptz,
  primary key (event_key, slot_date)
);

create table if not exists public.event_signups (
  event_key  text not null,
  id         text not null,
  slot_date  text not null,
  name       text not null,
  university text,
  created_at timestamptz not null default now(),
  primary key (event_key, id)
);

create index if not exists event_signups_slot_idx on public.event_signups (event_key, slot_date);

-- 선착순 정원 + 오픈/마감 시각을 서버에서 강제.
-- 25명이 동시에 눌러도 정확히 정원에서 잘림: pg_advisory_xact_lock 으로 count 확인을 직렬화.
create or replace function public.event_enforce_cap()
returns trigger
language plpgsql
as $$
declare
  s   record;
  cur int;
begin
  select * into s from public.event_slots
    where event_key = NEW.event_key and slot_date = NEW.slot_date;
  if not found then
    raise exception 'EVENT_SLOT_UNKNOWN' using errcode = 'P0001';
  end if;

  if s.opens_at is not null and now() < s.opens_at then
    raise exception 'EVENT_NOT_OPEN' using errcode = 'P0001';
  end if;
  if s.closes_at is not null and now() >= s.closes_at then
    raise exception 'EVENT_CLOSED' using errcode = 'P0001';
  end if;

  -- 이미 같은 날짜에 잡아둔 자리를 다시 저장(재신청/upsert 갱신) → 새 자리를 차지하지 않으므로 통과.
  -- ※ upsert(insert ... on conflict do update)는 충돌을 감지하기 '전에' before insert 트리거를 먼저 태운다.
  --    이 체크가 없으면 정원이 꽉 찬 뒤 본인이 재신청할 때 EVENT_FULL 로 거부된다.
  if exists (select 1 from public.event_signups
               where event_key = NEW.event_key and id = NEW.id and slot_date = NEW.slot_date) then
    return NEW;
  end if;

  -- 이 슬롯 전용 키로 동시 삽입을 직렬화(트랜잭션 종료 시 자동 해제)
  perform pg_advisory_xact_lock(hashtext(NEW.event_key || '|' || NEW.slot_date));

  select count(*) into cur from public.event_signups
    where event_key = NEW.event_key and slot_date = NEW.slot_date;
  if cur >= s.cap then
    raise exception 'EVENT_FULL' using errcode = 'P0001';
  end if;

  return NEW;
end
$$;

drop trigger if exists trg_event_cap on public.event_signups;
create trigger trg_event_cap
  before insert or update on public.event_signups
  for each row execute function public.event_enforce_cap();

alter table public.event_slots   enable row level security;
alter table public.event_signups enable row level security;

-- event_slots: 학생은 읽기만(정원/오픈시각 조회). 정원 변경은 SQL Editor에서만.
drop policy if exists "anon read event_slots" on public.event_slots;
create policy "anon read event_slots" on public.event_slots for select using (true);

-- event_signups: 페이지가 로그인 게이트 뒤라 anon CRUD 허용(호핑·마시멜로우와 동일).
-- 정원/오픈시각은 위 트리거가 서버에서 막으므로 클라이언트를 우회해도 초과 불가.
drop policy if exists "anon read event_signups"   on public.event_signups;
drop policy if exists "anon insert event_signups" on public.event_signups;
drop policy if exists "anon update event_signups" on public.event_signups;
drop policy if exists "anon delete event_signups" on public.event_signups;

create policy "anon read event_signups"   on public.event_signups for select using (true);
create policy "anon insert event_signups" on public.event_signups for insert with check (true);
create policy "anon update event_signups" on public.event_signups for update using (true) with check (true);
create policy "anon delete event_signups" on public.event_signups for delete using (true);

grant select                         on public.event_slots   to anon, authenticated;
grant select, insert, update, delete on public.event_signups to anon, authenticated;

-- ── 이번 이벤트 슬롯 등록 ────────────────────────────────────────────────
-- 오픈: 2026-07-16(목) 오후 8시 (세부 UTC+8) · 마감: 없음(정원 찰 때까지)
insert into public.event_slots (event_key, slot_date, label, cap, opens_at, closes_at) values
  ('mango',   '2026-07-22', '7월 22일 (수)', 25, timestamptz '2026-07-16 20:00:00+08', null),
  ('mango',   '2026-07-23', '7월 23일 (목)', 25, timestamptz '2026-07-16 20:00:00+08', null),
  ('mango',   '2026-07-24', '7월 24일 (금)', 25, timestamptz '2026-07-16 20:00:00+08', null),
  ('capitol', '2026-07-21', '7월 21일 (화)', 25, timestamptz '2026-07-16 20:00:00+08', null)
on conflict (event_key, slot_date) do update
  set label = excluded.label, cap = excluded.cap,
      opens_at = excluded.opens_at, closes_at = excluded.closes_at;

-- 참고 · 운영 중 자주 쓰는 쿼리
--   정원 늘리기:   update public.event_slots set cap = 30 where event_key='mango' and slot_date='2026-07-22';
--   신청 닫기:     update public.event_slots set closes_at = now() where event_key='mango';
--   명단 뽑기:     select slot_date, name, university, created_at from public.event_signups
--                    where event_key='mango' order by slot_date, created_at;
--   날짜별 인원:   select slot_date, count(*) from public.event_signups where event_key='mango' group by 1 order by 1;
