-- 🍭 마시멜로우 챌린지 정원(50명) 서버측 원자적 잠금
-- CELS Supabase(cedienlogevuhgqmcgph) SQL Editor에 붙여넣고 한 번 실행하세요.
-- marshmallow-signups-setup.sql 을 먼저 실행한 뒤 이 파일을 실행합니다.
--
-- 100명이 같은 순간에 신청해도 정확히 50명에서 잘립니다.
-- 핵심: pg_advisory_xact_lock 으로 동시 INSERT를 직렬화 → count 확인이 원자적.
-- 이미 등록된 학생(재신청/갱신)은 새 자리를 차지하지 않으므로 통과.

create or replace function public.msm_enforce_cap()
returns trigger
language plpgsql
as $$
declare
  cur int;
  cap constant int := 50;   -- ⚠️ status.html 의 MSM_CAP 과 동일해야 함
begin
  -- 이미 존재하는 id(같은 학생의 재신청/upsert 갱신)는 자리 차지 안 함 → 통과
  if exists (select 1 from public.marshmallow_signups where id = NEW.id) then
    return NEW;
  end if;

  -- 이 테이블 전용 키로 동시 삽입을 직렬화(트랜잭션 종료 시 자동 해제)
  perform pg_advisory_xact_lock(778601);

  select count(*) into cur from public.marshmallow_signups;
  if cur >= cap then
    raise exception 'MARSHMALLOW_FULL' using errcode = 'P0001';
  end if;

  return NEW;
end
$$;

drop trigger if exists trg_msm_cap on public.marshmallow_signups;
create trigger trg_msm_cap
  before insert on public.marshmallow_signups
  for each row execute function public.msm_enforce_cap();
