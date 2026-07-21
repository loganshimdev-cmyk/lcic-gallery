-- ✅ 이벤트 신청자 출석체크 (events.html · 이름 클릭 → 출석 토글, 담당자 전체 공유)
-- CELS Supabase(cedienlogevuhgqmcgph) SQL Editor에 붙여넣고 한 번 실행하세요.
--
-- 1) event_signups 에 attended 컬럼 추가
-- 2) event_enforce_cap 트리거 보정:
--    기존 트리거는 UPDATE 에도 오픈/마감시각을 검사해서, 신청을 닫은 뒤(closes_at 경과)
--    출석체크(attended 갱신)가 EVENT_CLOSED 로 거부된다.
--    → 자리 이동이 없는 UPDATE(event_key·slot_date 동일)는 검사 없이 통과시킨다.

alter table public.event_signups
  add column if not exists attended boolean not null default false;

create or replace function public.event_enforce_cap()
returns trigger
language plpgsql
as $$
declare
  s   record;
  cur int;
begin
  -- 자리 이동이 없는 갱신(출석체크 등)은 정원·시각 검사 대상이 아님
  if TG_OP = 'UPDATE' and NEW.event_key = OLD.event_key and NEW.slot_date = OLD.slot_date then
    return NEW;
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
  if exists (select 1 from public.event_signups
               where event_key = NEW.event_key and id = NEW.id and slot_date = NEW.slot_date) then
    return NEW;
  end if;

  perform pg_advisory_xact_lock(hashtext(NEW.event_key || '|' || NEW.slot_date));

  select count(*) into cur from public.event_signups
    where event_key = NEW.event_key and slot_date = NEW.slot_date;
  if cur >= s.cap then
    raise exception 'EVENT_FULL' using errcode = 'P0001';
  end if;

  return NEW;
end
$$;
