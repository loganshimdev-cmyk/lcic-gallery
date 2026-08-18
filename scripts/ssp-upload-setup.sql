-- 📄 SSP 사본 제출 (status.html · 백석대학교 7월 학생 전용)
-- 실행 위치: CELS Supabase(cedienlogevuhgqmcgph) SQL Editor — 전체 붙여넣고 한 번 실행
--
-- 구성 (efset-upload-setup.sql 과 같은 구조 · 같은 안전장치)
--   Storage 버킷 'ssp'       = SSP 사본 파일 (비공개 · 익명은 업로드만, 열람·수정·삭제 불가)
--                               경로 = <학생id 16자>/<타임스탬프>.<pdf|jpg|jpeg|png>
--                               ※ 비공개 버킷은 SELECT 정책 없이는 교체·삭제가 안 되므로
--                                 재업로드는 항상 새 경로에 저장. 최신 파일 = ssp_submissions.path
--   ssp_submissions 테이블   = 제출 기록 (제출 현황 + id↔이름·최신 파일 경로 매핑)
--
-- 담당자 확인 방법
--   1) 아래 "명단 뽑기" 쿼리로 이름·최신 파일 경로 확인
--   2) 대시보드 → Storage → ssp 에서 해당 경로 파일 다운로드

-- ── 1) 버킷 (비공개 · 10MB 제한 · PDF/JPG/PNG만) ───────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ssp', 'ssp', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = false, file_size_limit = 10485760,
      allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png'];

-- ── 2) Storage 정책: 익명은 '업로드만' 가능, 열람·수정·삭제 불가 ────────
--     (열람 정책을 열면 학생 여권·허가서가 익명에게 노출된다. 절대 추가하지 말 것.)
drop policy if exists "anon insert ssp" on storage.objects;

create policy "anon insert ssp" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'ssp');

-- ── 3) 제출 기록 테이블 ─────────────────────────────────────────────────
create table if not exists public.ssp_submissions (
  id          text primary key,           -- 이메일 SHA-256 앞 16자 (efset·호핑과 동일 규칙)
  name        text not null,
  university  text,
  cohort      text not null,              -- 차수 구분 (예: baekseok-2026-07) — 제출 현황을 차수별로 센다
  ext         text not null,              -- 파일 확장자 (pdf/jpg/jpeg/png)
  path        text,                       -- 최신 파일 경로 (ssp 버킷 내)
  uploaded_at timestamptz not null default now()
);
alter table public.ssp_submissions add column if not exists cohort text;
alter table public.ssp_submissions add column if not exists path   text;

create index if not exists ssp_submissions_cohort_idx on public.ssp_submissions (cohort);

alter table public.ssp_submissions enable row level security;

drop policy if exists "anon read ssp_submissions"   on public.ssp_submissions;
drop policy if exists "anon insert ssp_submissions" on public.ssp_submissions;
drop policy if exists "anon update ssp_submissions" on public.ssp_submissions;

create policy "anon read ssp_submissions"   on public.ssp_submissions for select using (true);
create policy "anon insert ssp_submissions" on public.ssp_submissions for insert with check (true);
create policy "anon update ssp_submissions" on public.ssp_submissions for update using (true) with check (true);
-- delete 정책 없음 → 학생이 제출 기록을 지울 수 없음(교체만 가능)

grant select, insert, update on public.ssp_submissions to anon, authenticated;

-- ── 확인 ────────────────────────────────────────────────────────────────
select id, name, public, file_size_limit from storage.buckets where id = 'ssp';
select column_name from information_schema.columns
 where table_schema = 'public' and table_name = 'ssp_submissions' order by ordinal_position;

-- 참고 · 운영 중 자주 쓰는 쿼리
--   명단 뽑기(이름·최신 파일 경로):
--     select name, path, uploaded_at
--       from public.ssp_submissions where cohort = 'baekseok-2026-07' order by name;
--   제출 인원:
--     select count(*) from public.ssp_submissions where cohort = 'baekseok-2026-07';
--   미제출자 찾기: 위 명단을 백석대 7월 36명 명단과 대조 (status.html 대상 = 36명)
