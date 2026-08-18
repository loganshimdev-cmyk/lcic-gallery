-- 🥭 망고 공장 8월 회차 — 명단 수정 2차 (날짜 변경 8명)
-- 상태: 2026-08-18 REST(service_role)로 이미 실행 완료. 이 파일은 기록·재현용이다.
--
-- 배경 (2026-08-18, 담당자 접수분)
--   1) 함채린·김가현·김시율·전채은·김현중(모두 구미대) → 8/19(수) 에서 8/18(화) 로 변경
--   2) 박래은·김윤지·성희찬(모두 전북대)             → 8/18(화) 에서 8/19(수) 로 변경
--      ※ 2)는 event-mango-0818-move.sql 에 적혀 있었으나 실제로는 실행되지 않았다.
--        (2026-08-18 조회 시 3명 모두 8/18 에 그대로 있었음) 이번에 함께 반영했다.
--
-- 인원 변화: 8/18  19 → 21명 · 8/19  22 → 20명 (총 41명 그대로, cap 25 이내)
--
-- ⚠️ 두 슬롯 모두 8/13(목) 23:59 로 마감돼 학생 화면·anon 키로는 변경이 막힌다
--    (event_enforce_cap 트리거가 EVENT_LOCKED). current_user 가 postgres/service_role 이면
--    통과하므로 SQL Editor 또는 service_role 키로 실행해야 한다.
--
-- 동명이인 사고를 막기 위해 이름이 아니라 id(이메일 sha256 앞 16자)로 지정한다.
--   ※ 8/18 의 "김시윤"(전북대, d2ec400f03bd3027)과 "김시율"(구미대, e32f4566006764ea)은 다른 사람이다.

-- ── 수정 전 확인 (8/18 = 19명 · 8/19 = 22명) ────────────────────────────
select slot_date, count(*) as 인원
  from public.event_signups
 where event_key = 'mango' and slot_date >= '2026-08-01'
 group by slot_date order by slot_date;

-- ── 1) 수 → 화 5명 ──────────────────────────────────────────────────────
--    함채린 1173404f9f7678dd · 김가현 428972c0cea290d2 · 김시율 e32f4566006764ea
--    전채은 943f75f3c09c7794 · 김현중 0d4cd858cb6f81ac
update public.event_signups
   set slot_date = '2026-08-18'
 where event_key = 'mango'
   and slot_date = '2026-08-19'
   and id in ('1173404f9f7678dd', '428972c0cea290d2', 'e32f4566006764ea',
              '943f75f3c09c7794', '0d4cd858cb6f81ac');
-- 기대: UPDATE 5

-- ── 2) 화 → 수 3명 ──────────────────────────────────────────────────────
--    성희찬 66e8b0064316bdcf · 박래은 5609e9e75ef30a3b · 김윤지 fd68bbcf481d858e
update public.event_signups
   set slot_date = '2026-08-19'
 where event_key = 'mango'
   and slot_date = '2026-08-18'
   and id in ('66e8b0064316bdcf', '5609e9e75ef30a3b', 'fd68bbcf481d858e');
-- 기대: UPDATE 3

-- ── 수정 후 확인 (8/18 = 21명 · 8/19 = 20명 · 총 41명) ──────────────────
select slot_date, count(*) as 인원
  from public.event_signups
 where event_key = 'mango' and slot_date >= '2026-08-01'
 group by slot_date order by slot_date;

select slot_date, name, university
  from public.event_signups
 where event_key = 'mango' and slot_date >= '2026-08-01'
 order by slot_date, name;

-- ── 미처리 사항 ─────────────────────────────────────────────────────────
-- event-mango-0818-move.sql 의 "황준상(백석문화대) 참가 취소"도 실행된 적이 없어
-- 2026-08-18 현재 8/18 명단에 그대로 남아 있다. 취소가 맞다면 아래를 실행할 것.
--   delete from public.event_signups where event_key='mango' and id='9be1bef63045a7c3';
