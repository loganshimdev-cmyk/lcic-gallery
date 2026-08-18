-- 🥭 망고 공장 8월 회차 — 명단 수정 (날짜 변경 3명 + 취소 1명)
-- ⚠️ 이 파일은 실행되지 않았다. 2026-08-18 조회 시 3명 모두 8/18 에 그대로 있었고 황준상도 남아 있었다.
--    날짜 변경 3명은 event-mango-0818-move2.sql 에서 반영했다. 황준상 취소는 아직 미처리.
-- 실행 위치: CELS Supabase(cedienlogevuhgqmcgph) SQL Editor — 전체 붙여넣고 한 번 실행
--
-- 배경 (2026-08-17, 마감 후 담당자 접수분)
--   1) 박래은 · 김윤지 · 성희찬 → 8/18(화) 에서 8/19(수) 로 변경
--   2) 황준상(백석문화대) → 참가 취소
--
-- 인원 변화: 8/18  19 → 15명 · 8/19  22 → 25명 (총 41 → 40명)
--            8/19 는 cap 25 로 정확히 마감. 수요일로 더 옮기려면 cap 을 먼저 늘려야 한다(맨 아래 참고).
--
-- ⚠️ 학생 화면·API로는 둘 다 불가능하다. 두 슬롯 모두 8/13(목) 23:59 로 마감돼 있어
--    · 날짜 변경 → event_enforce_cap 이 EVENT_LOCKED
--    · 취소(delete) → event_lock_delete 가 EVENT_LOCKED
--    두 트리거 모두 current_user 가 postgres/service_role 이면 통과시키므로 SQL Editor 에서 실행해야 한다.
--
-- id 는 이메일 sha256 앞 16자라 고정이다. 동명이인 사고를 막기 위해 이름이 아니라 id 로 지정한다
-- (2026-08-17 조회값).
--   성희찬 66e8b0064316bdcf · 박래은 5609e9e75ef30a3b · 김윤지 fd68bbcf481d858e · 황준상 9be1bef63045a7c3
--
-- 두 문장 모두 여러 번 실행해도 안전하다(이미 반영됐으면 0 rows).

-- ── 수정 전 확인 (8/18 = 19명 · 8/19 = 22명) ────────────────────────────
select slot_date, count(*) as 인원
  from public.event_signups
 where event_key = 'mango' and slot_date >= '2026-08-01'
 group by slot_date order by slot_date;

-- ── 1) 날짜 변경 3명: 8/18 → 8/19 ───────────────────────────────────────
update public.event_signups
   set slot_date = '2026-08-19'
 where event_key = 'mango'
   and slot_date = '2026-08-18'
   and id in ('66e8b0064316bdcf', '5609e9e75ef30a3b', 'fd68bbcf481d858e');
-- 기대: UPDATE 3

-- ── 2) 취소 1명: 황준상 ─────────────────────────────────────────────────
delete from public.event_signups
 where event_key = 'mango'
   and id = '9be1bef63045a7c3';
-- 기대: DELETE 1

-- ── 수정 후 확인 (8/18 = 15명 · 8/19 = 25명 · 총 40명) ──────────────────
select slot_date, count(*) as 인원
  from public.event_signups
 where event_key = 'mango' and slot_date >= '2026-08-01'
 group by slot_date order by slot_date;

select slot_date, name, university
  from public.event_signups
 where event_key = 'mango'
   and id in ('66e8b0064316bdcf', '5609e9e75ef30a3b', 'fd68bbcf481d858e', '9be1bef63045a7c3')
 order by slot_date, name;
-- 기대: 3행(모두 2026-08-19). 황준상은 삭제됐으므로 나오지 않는다.

-- ── 참고 ────────────────────────────────────────────────────────────────
-- 되돌리기(날짜):   update public.event_signups set slot_date = '2026-08-18'
--                     where event_key='mango' and id in ('66e8b0064316bdcf','5609e9e75ef30a3b','fd68bbcf481d858e');
-- 되돌리기(취소):   취소는 행을 지우므로 복구할 수 없다. 다시 넣어야 한다 —
--                   insert into public.event_signups (event_key, id, name, university, slot_date)
--                     values ('mango', '9be1bef63045a7c3', '황준상', '백석문화대학교', '2026-08-18');
-- 정원 늘리기:      update public.event_slots set cap = 28
--                     where event_key='mango' and slot_date='2026-08-19';
-- 명단 뽑기:        select slot_date, name, university from public.event_signups
--                     where event_key='mango' and slot_date >= '2026-08-01' order by slot_date, name;
