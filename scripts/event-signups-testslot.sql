-- 🧪 정원 잠금 검증용 임시 슬롯 (검증 끝나면 아래 '정리' 블록 실행해서 삭제)
-- 학생 화면(status.html)에는 event_key='ZZTEST' 를 읽는 코드가 없으므로 노출되지 않습니다.
insert into public.event_slots (event_key, slot_date, label, cap, opens_at, closes_at) values
  ('ZZTEST', 'A', '테스트 슬롯 A', 25, timestamptz '2020-01-01 00:00:00+08', null),
  ('ZZTEST', 'B', '테스트 슬롯 B', 25, timestamptz '2020-01-01 00:00:00+08', null)
on conflict (event_key, slot_date) do update
  set cap = excluded.cap, opens_at = excluded.opens_at, closes_at = excluded.closes_at;


-- ── 검증이 끝난 뒤 실행할 정리 블록 (지금은 실행하지 마세요) ──
-- delete from public.event_signups where event_key = 'ZZTEST';
-- delete from public.event_slots   where event_key = 'ZZTEST';
