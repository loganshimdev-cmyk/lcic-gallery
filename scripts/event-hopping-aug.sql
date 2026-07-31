-- 🚤 8월 호핑 투어 수요조사 슬롯 등록
-- CELS Supabase(cedienlogevuhgqmcgph) SQL Editor에 붙여넣고 한 번 실행하세요.
--
-- 테이블(event_slots / event_signups)과 트리거는 scripts/event-signups-setup.sql 로 이미 만들어져 있습니다.
-- 이 파일은 슬롯 한 줄만 추가합니다. 테이블을 다시 만들지 않습니다.
--
-- cap 9999 = 사실상 인원 제한 없음.
--   트리거(event_enforce_cap)가 cap 을 not null 로 요구하므로 무제한을 표현할 값이 없어 큰 수를 넣습니다.
--   학생 화면(status.html)과 명단 화면(events.html)은 이 이벤트를 '수요조사'로 보고
--   정원·남은 자리를 표시하지 않습니다(EVENTS 의 unlimited / cap:0).
-- opens_at null = 즉시 오픈 · closes_at null = 마감 없음.

insert into public.event_slots (event_key, slot_date, label, cap, opens_at, closes_at) values
  ('hopping_aug', '2026-08-08', '8월 8일 (토)', 9999, null, null)
on conflict (event_key, slot_date) do update
  set label = excluded.label, cap = excluded.cap,
      opens_at = excluded.opens_at, closes_at = excluded.closes_at;

-- ── 운영 중 자주 쓰는 쿼리 ────────────────────────────────────────────────
-- 신청 인원:   select count(*) from public.event_signups where event_key = 'hopping_aug';
-- 명단 뽑기:   select name, university, created_at from public.event_signups
--                where event_key = 'hopping_aug' order by created_at;
-- 수요조사 닫기: update public.event_slots set closes_at = now() where event_key = 'hopping_aug';
--
-- 날짜가 바뀌면(예: 8/8 → 8/15) 슬롯을 새로 넣고 status.html·events.html 의 날짜도 함께 고쳐야 합니다.
--   insert into public.event_slots values ('hopping_aug', '2026-08-15', '8월 15일 (토)', 9999, null, null);
--   delete from public.event_slots where event_key='hopping_aug' and slot_date='2026-08-08';
--   ※ 이미 신청한 학생이 있으면 event_signups.slot_date 도 함께 옮겨야 합니다.
