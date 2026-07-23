-- 🥭 망고 공장 견학 추가 회차 (7/27 월) + 기존 회차(7/22·23·24) 완전 잠금
-- 실행 위치: CELS Supabase(cedienlogevuhgqmcgph) SQL Editor — 전체 붙여넣고 한 번 실행
--
-- 하는 일
--   1) 기존 mango 슬롯 3개(7/22·23·24) 마감(closes_at) → 신규 신청 차단 (EVENT_CLOSED)
--   2) 새 슬롯 7/27(월) 정원 25 · 오픈 2026-07-23(수) 오후 8시(세부 UTC+8)
--   3) 트리거 보강:
--      - 마감된 회차에서 다른 날짜로 "이동"(upsert의 update 경로) 차단 → 기존 참가자는 7/27 신청 불가
--        (신규 insert는 PK(event_key,id) 중복으로 어차피 upsert-update가 되므로 이 차단에 걸림)
--      - 마감된 회차의 "취소"(delete) 차단 → 자리 빼는 것도 불가
--      - SQL Editor(postgres) 관리자는 모든 차단을 우회 (수동 정정은 항상 가능)

-- ── 1) 기존 회차 마감 ────────────────────────────────────────────────────
update public.event_slots
   set closes_at = now()
 where event_key = 'mango'
   and slot_date in ('2026-07-22', '2026-07-23', '2026-07-24')
   and closes_at is null;

-- ── 2) 새 회차 7/27(월) · 정원 25 · 오픈 7/23(수) 오후 8시 ──────────────
insert into public.event_slots (event_key, slot_date, label, cap, opens_at, closes_at)
values ('mango', '2026-07-27', '7월 27일 (월)', 25, timestamptz '2026-07-23 20:00:00+08', null)
on conflict (event_key, slot_date) do update
  set label = excluded.label, cap = excluded.cap,
      opens_at = excluded.opens_at, closes_at = excluded.closes_at;

-- ── 3-a) 정원/오픈 트리거 보강 (기존 event_enforce_cap 교체) ────────────
create or replace function public.event_enforce_cap()
returns trigger
language plpgsql
as $$
declare
  s   record;
  os  record;
  cur int;
begin
  -- SQL Editor(postgres)에서의 수동 정정은 모든 검사를 우회
  if current_user in ('postgres', 'service_role') then
    return NEW;
  end if;

  -- 마감된 회차에서 다른 날짜로 이동 금지 (기존 망고 참가자가 7/27로 갈아타는 것 차단)
  if TG_OP = 'UPDATE' and OLD.slot_date is distinct from NEW.slot_date then
    select * into os from public.event_slots
      where event_key = OLD.event_key and slot_date = OLD.slot_date;
    if found and os.closes_at is not null and now() >= os.closes_at then
      raise exception 'EVENT_LOCKED' using errcode = 'P0001';
    end if;
  end if;

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

-- ── 3-b) 마감된 회차의 취소(delete) 차단 ────────────────────────────────
create or replace function public.event_lock_delete()
returns trigger
language plpgsql
as $$
declare
  s record;
begin
  -- SQL Editor(postgres)에서의 수동 삭제는 허용
  if current_user in ('postgres', 'service_role') then
    return OLD;
  end if;

  select * into s from public.event_slots
    where event_key = OLD.event_key and slot_date = OLD.slot_date;
  if found and s.closes_at is not null and now() >= s.closes_at then
    raise exception 'EVENT_LOCKED' using errcode = 'P0001';
  end if;

  return OLD;
end
$$;

drop trigger if exists trg_event_lock_delete on public.event_signups;
create trigger trg_event_lock_delete
  before delete on public.event_signups
  for each row execute function public.event_lock_delete();

-- ── 확인 ────────────────────────────────────────────────────────────────
select event_key, slot_date, label, cap, opens_at, closes_at
  from public.event_slots
 order by event_key, slot_date;
