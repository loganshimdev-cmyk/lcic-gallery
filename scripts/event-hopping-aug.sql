-- 🚤 8월 호핑 투어(8/8 토) 슬롯 등록 · 신청 마감 설정
-- CELS Supabase(cedienlogevuhgqmcgph) SQL Editor에 붙여넣고 한 번 실행하세요.
--
-- 테이블(event_slots / event_signups)과 트리거는 scripts/event-signups-setup.sql 로 이미 만들어져 있습니다.
-- 이 파일은 슬롯 한 줄만 넣고 갱신합니다. 테이블을 다시 만들지 않습니다.
--
-- 처음엔 수요조사(마감 없음)로 열었다가 2026-08-03 실제 신청으로 전환했습니다.
--   · 비용 ₱2,500 현장 납부 · 9시 학교 픽업
--   · 인원 제한 없음 → cap 9999
--       트리거(event_enforce_cap)가 cap 을 not null 로 요구해 무제한을 표현할 값이 없어 큰 수를 넣습니다.
--       학생 화면(status.html)과 명단 화면(events.html)은 정원·남은 자리를 표시하지 않습니다
--       (EVENTS 의 unlimited / cap:0).
--   · 마감 8/5(수) 23:59 세부시각(UTC+8) → closes_at
--       마감이 지나면 트리거가 신규 신청을 EVENT_CLOSED 로 거부하고,
--       학생 화면은 취소 버튼을 "✅ 참가 확정"으로 바꿔 잠급니다(취소·환불 불가).
-- opens_at null = 즉시 오픈.

insert into public.event_slots (event_key, slot_date, label, cap, opens_at, closes_at) values
  ('hopping_aug', '2026-08-08', '8월 8일 (토)', 9999, null, '2026-08-05 23:59:59+08')
on conflict (event_key, slot_date) do update
  set label = excluded.label, cap = excluded.cap,
      opens_at = excluded.opens_at, closes_at = excluded.closes_at;

-- ── 마감 후 취소(삭제) 차단 ──────────────────────────────────────────────
-- 기존 트리거(trg_event_cap)는 insert/update 만 막아서, 마감 뒤에도 delete 는 통과했습니다.
-- 학생 화면은 취소 버튼을 감추지만 그건 화면일 뿐이라 DB에서도 같이 막습니다.
-- event_slots 에 closes_at 이 설정된 모든 이벤트에 동일하게 적용됩니다.
create or replace function public.event_block_closed_delete()
returns trigger language plpgsql as $$
declare s record;
begin
  select * into s from public.event_slots
    where event_key = OLD.event_key and slot_date = OLD.slot_date;
  if found and s.closes_at is not null and now() >= s.closes_at then
    raise exception 'EVENT_CLOSED' using errcode = 'P0001';
  end if;
  return OLD;
end
$$;

drop trigger if exists trg_event_no_cancel on public.event_signups;
create trigger trg_event_no_cancel
  before delete on public.event_signups
  for each row execute function public.event_block_closed_delete();

-- 확인 (마감 시각이 세부 기준으로 제대로 들어갔는지)
select event_key, slot_date, label, cap,
       closes_at at time zone 'Asia/Manila' as 마감_세부시각,
       (now() >= closes_at) as 마감됨
  from public.event_slots where event_key = 'hopping_aug';

-- ── 운영 중 자주 쓰는 쿼리 ────────────────────────────────────────────────
-- 신청 인원:   select count(*) from public.event_signups where event_key = 'hopping_aug';
-- 명단 뽑기:   select name, university, created_at from public.event_signups
--                where event_key = 'hopping_aug' order by created_at;
-- 지금 즉시 닫기: update public.event_slots set closes_at = now() where event_key = 'hopping_aug';
-- 마감 연장:     update public.event_slots set closes_at = '2026-08-06 23:59:59+08'
--                  where event_key = 'hopping_aug';
--                ※ status.html·events.html 에 적힌 마감 날짜 문구도 함께 고쳐야 합니다.
--
-- 날짜가 바뀌면(예: 8/8 → 8/15) 슬롯을 새로 넣고 status.html·events.html 의 날짜도 함께 고쳐야 합니다.
--   insert into public.event_slots values ('hopping_aug', '2026-08-15', '8월 15일 (토)', 9999, null, ...);
--   delete from public.event_slots where event_key='hopping_aug' and slot_date='2026-08-08';
--   ※ 이미 신청한 학생이 있으면 event_signups.slot_date 도 함께 옮겨야 합니다.
