-- 🥭 7D 망고 공장 견학 — 8월 회차 (8/18 화 · 8/19 수) 오픈
-- 실행 위치: CELS Supabase(cedienlogevuhgqmcgph) SQL Editor — 전체 붙여넣고 한 번 실행
--
-- 대상: 8월 입국 학생(전북대·구미대·백석문화대 · stay 08/02~08/29)
--       ※ 인제대(7/5 입국)는 status.html 의 EVENTS.only 조건으로 카드 자체가 안 보인다.
--
-- 하는 일
--   1) 남아 있던 7월 회차(7/27) 마감 → 7월 참가자가 8월 회차로 "이동"하는 것을 서버에서 차단
--      (event_enforce_cap 트리거가 마감된 슬롯에서의 slot_date 변경을 EVENT_LOCKED 로 막는다)
--   2) 새 슬롯 8/18(화)·8/19(수) — 날짜별 정원 25명
--      · opens_at  2026-08-11(화) 20:00 (세부 UTC+8)  → 그 전 신청은 EVENT_NOT_OPEN
--      · closes_at 2026-08-13(목) 23:59:59            → 그 후 신청·변경·취소 모두 잠김
--
-- ※ 트리거(event_enforce_cap · event_lock_delete)는 event-mango-0727.sql 에서 이미 만들었다.
--   여기서는 슬롯만 다룬다.

-- ── 1) 7월 회차 마감 ────────────────────────────────────────────────────
update public.event_slots
   set closes_at = now()
 where event_key = 'mango'
   and slot_date = '2026-07-27'
   and closes_at is null;

-- ── 2) 8월 회차 2개 ─────────────────────────────────────────────────────
insert into public.event_slots (event_key, slot_date, label, cap, opens_at, closes_at)
values
  ('mango', '2026-08-18', '8월 18일 (화)', 25,
   timestamptz '2026-08-11 20:00:00+08', timestamptz '2026-08-13 23:59:59+08'),
  ('mango', '2026-08-19', '8월 19일 (수)', 25,
   timestamptz '2026-08-11 20:00:00+08', timestamptz '2026-08-13 23:59:59+08')
on conflict (event_key, slot_date) do update
  set label    = excluded.label,
      cap      = excluded.cap,
      opens_at = excluded.opens_at,
      closes_at = excluded.closes_at;

-- ── 확인 ────────────────────────────────────────────────────────────────
select event_key, slot_date, label, cap, opens_at, closes_at,
       (select count(*) from public.event_signups s
         where s.event_key = l.event_key and s.slot_date = l.slot_date) as 현재신청
  from public.event_slots l
 where event_key = 'mango'
 order by slot_date;

-- 참고 · 운영 중 자주 쓰는 쿼리
--   신청 명단:  select slot_date, name, university, created_at
--                 from public.event_signups where event_key = 'mango'
--                  and slot_date >= '2026-08-01' order by slot_date, created_at;
--   정원 늘리기: update public.event_slots set cap = 30
--                 where event_key = 'mango' and slot_date in ('2026-08-18','2026-08-19');
--   마감 연장:   update public.event_slots set closes_at = timestamptz '2026-08-15 23:59:59+08'
--                 where event_key = 'mango' and slot_date >= '2026-08-01';
