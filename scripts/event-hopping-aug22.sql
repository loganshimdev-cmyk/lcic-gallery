-- 🚤 호핑 투어 대체 회차 (8/22 토) 슬롯 등록 — 기상 악화로 취소된 8/8 회차의 재신청
-- 실행 위치: CELS Supabase(cedienlogevuhgqmcgph) SQL Editor — 전체 붙여넣고 한 번 실행
-- 실행 시점: status.html 을 푸시하기 "전"에 먼저 실행할 것.
--   status.html 의 EV_OPEN_FALLBACK 이 이미 지난 시각(8/11)이라, 슬롯이 없으면
--   버튼은 열린 것처럼 보이지만 누르면 EVENT_SLOT_UNKNOWN 이 난다.
--
-- 배경 (2026-08-17)
--   · 8/8(토) 회차는 기상 악화로 취소(2026-08-06). 당시 신청자 36명(전북대 27·백석문화대 5·구미대 4).
--   · 비용은 당일 현장 납부였으므로 환불 절차 없음.
--   · 대체 회차 8/22(토) — 코스·비용·집합 조건은 8/8 회차와 동일.
--
-- ⚠️ event_key 를 hopping_aug 가 아니라 hopping_aug22 로 새로 뗐다. 이유:
--   1) event_signups 의 PK 는 (event_key, id) 라, 같은 키를 쓰면 8/8 신청자 36명이 upsert
--      대상이 되어 학생 화면 버튼이 "신청하기" 대신 "이 날짜로 변경"으로 나온다.
--   2) 기록을 위해 8/8 슬롯을 마감(closes_at)하면 event_enforce_cap 트리거가 마감된 슬롯에서의
--      slot_date 변경을 EVENT_LOCKED 로 막아, 정작 재신청이 필요한 36명이 신청을 못 한다.
--   → 키를 나누면 8/8 명단은 hopping_aug 에 기록으로 남고, 8/22 는 0명에서 깨끗하게 다시 받는다.
--
-- 테이블(event_slots / event_signups)·트리거·RLS 정책은 이미 만들어져 있다.
--   · 정책은 테이블 단위(event_key 무관)라 새 키에 추가 작업이 없다 — scripts/event-signups-setup.sql
--   · 트리거 최신본 — scripts/event-mango-0727.sql (event_enforce_cap · event_lock_delete)

-- ── 1) 취소된 8/8 회차 잠그기 ───────────────────────────────────────────
-- 명단은 그대로 남기고 신규 신청·취소만 막는다(취소된 회차에 뒤늦게 신청하는 일 방지).
update public.event_slots
   set closes_at = now()
 where event_key = 'hopping_aug'
   and slot_date = '2026-08-08'
   and closes_at is null;

-- ── 2) 새 회차 8/22(토) ─────────────────────────────────────────────────
--   cap 9999  = 인원 제한 없음. 트리거가 cap 을 not null 로 요구해 무제한을 표현할 값이 없어 큰 수를 넣는다.
--               학생 화면(status.html)·명단 화면(events.html)은 정원·남은 자리를 표시하지 않는다.
--   opens_at null = 즉시 오픈 (선착순이 아니므로 오픈 시각을 예약하지 않는다)
--   closes_at 8/19(수) 23:59:59 세부시각(UTC+8) — 이후 신규 신청·취소 모두 잠김(취소·환불 불가)
insert into public.event_slots (event_key, slot_date, label, cap, opens_at, closes_at)
values ('hopping_aug22', '2026-08-22', '8월 22일 (토)', 9999,
        null, timestamptz '2026-08-19 23:59:59+08')
on conflict (event_key, slot_date) do update
  set label     = excluded.label,
      cap       = excluded.cap,
      opens_at  = excluded.opens_at,
      closes_at = excluded.closes_at;

-- ── 확인 ────────────────────────────────────────────────────────────────
select event_key, slot_date, label, cap,
       opens_at,
       closes_at at time zone 'Asia/Manila' as 마감_세부시각,
       (closes_at is not null and now() >= closes_at) as 마감됨,
       (select count(*) from public.event_signups s
         where s.event_key = l.event_key and s.slot_date = l.slot_date) as 현재신청
  from public.event_slots l
 where event_key in ('hopping_aug', 'hopping_aug22')
 order by event_key, slot_date;

-- ── 운영 중 자주 쓰는 쿼리 ────────────────────────────────────────────────
-- 신청 인원:   select count(*) from public.event_signups where event_key = 'hopping_aug22';
-- 명단 뽑기:   select name, university, created_at from public.event_signups
--                where event_key = 'hopping_aug22' order by created_at;
-- 8/8 대비 누가 아직 재신청 안 했나:
--   select a.name, a.university from public.event_signups a
--    where a.event_key = 'hopping_aug'
--      and not exists (select 1 from public.event_signups b
--                       where b.event_key = 'hopping_aug22' and b.id = a.id)
--    order by a.university, a.name;
-- 마감 연장:   update public.event_slots set closes_at = timestamptz '2026-08-20 23:59:59+08'
--                where event_key = 'hopping_aug22';
--              ※ status.html·events.html 에 적힌 마감 날짜 문구도 함께 고쳐야 한다.
-- 지금 즉시 닫기: update public.event_slots set closes_at = now() where event_key = 'hopping_aug22';
