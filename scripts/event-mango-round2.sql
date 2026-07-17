-- 🥭 망고 공장 견학 2차 오픈 — 날짜별 25명 → 35명 (각 +10석), 2026-07-17(금) 20:00 오픈
-- CELS Supabase(cedienlogevuhgqmcgph) SQL Editor 에 붙여넣고 한 번 실행하세요.
--
-- 동작:
--  · cap 35 로 상향 → 1차 신청자 25명은 그대로 유지되고 10자리가 새로 생김
--  · opens_at 을 오늘 20:00 으로 되돌림 → 그 전에는 트리거가 EVENT_NOT_OPEN 으로 거부
--    (화면 버튼도 잠기지만, 서버에서 막아야 개발자도구로 미리 신청할 수 없다)
--  · 주청사(capitol)는 그대로 25명 유지 — 이번 증원 대상 아님
--
-- ※ 신청 취소(DELETE)는 트리거를 타지 않으므로 오픈 대기 중에도 가능하다(의도된 동작).

update public.event_slots
   set cap      = 35,
       opens_at = timestamptz '2026-07-17 20:00:00+08'
 where event_key = 'mango';

-- 확인용
select event_key, slot_date, label, cap, opens_at,
       (select count(*) from public.event_signups s
         where s.event_key = l.event_key and s.slot_date = l.slot_date) as 현재신청
  from public.event_slots l
 where event_key in ('mango', 'capitol')
 order by event_key, slot_date;
