-- 📝 EF-SET 결과지 제출 (status.html · 전체 학생 필수 · 마감 2026-07-29 수)
-- 실행 위치: CELS Supabase(cedienlogevuhgqmcgph) SQL Editor — 전체 붙여넣고 한 번 실행
--
-- 구성
--   Storage 버킷 'efset'      = 결과지 파일 (비공개 · 익명은 업로드만 가능, 열람 불가)
--                                파일명 = <학생id 16자>.<pdf|jpg|jpeg|png> (학생당 1개)
--   efset_submissions 테이블  = 제출 기록 (제출 현황 표시 + id↔이름 매핑)
--
-- 담당자 확인 방법
--   1) 대시보드 → Storage → efset : 파일 목록 (파일명은 학생 id)
--   2) 아래 "명단 뽑기" 쿼리로 이름·대학·파일명 매핑

-- ── 1) 버킷 (비공개 · 10MB 제한 · PDF/JPG/PNG만) ───────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('efset', 'efset', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = false, file_size_limit = 10485760,
      allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png'];

-- ── 2) Storage 정책: 익명은 올리기/교체/정리만, 열람(select) 불가 ───────
drop policy if exists "anon insert efset" on storage.objects;
drop policy if exists "anon update efset" on storage.objects;
drop policy if exists "anon delete efset" on storage.objects;

create policy "anon insert efset" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'efset');

create policy "anon update efset" on storage.objects
  for update to anon, authenticated
  using (bucket_id = 'efset') with check (bucket_id = 'efset');

create policy "anon delete efset" on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'efset');

-- ── 3) 제출 기록 테이블 ─────────────────────────────────────────────────
create table if not exists public.efset_submissions (
  id          text primary key,           -- 이메일 SHA-256 앞 16자 (호핑·이벤트와 동일 규칙)
  name        text not null,
  university  text,
  ext         text not null,              -- 파일 확장자 (pdf/jpg/jpeg/png)
  uploaded_at timestamptz not null default now()
);

alter table public.efset_submissions enable row level security;

drop policy if exists "anon read efset_submissions"   on public.efset_submissions;
drop policy if exists "anon insert efset_submissions" on public.efset_submissions;
drop policy if exists "anon update efset_submissions" on public.efset_submissions;

create policy "anon read efset_submissions"   on public.efset_submissions for select using (true);
create policy "anon insert efset_submissions" on public.efset_submissions for insert with check (true);
create policy "anon update efset_submissions" on public.efset_submissions for update using (true) with check (true);
-- delete 정책 없음 → 학생이 제출 기록을 지울 수 없음(교체만 가능)

grant select, insert, update on public.efset_submissions to anon, authenticated;

-- ── 확인 ────────────────────────────────────────────────────────────────
select id, name, public, file_size_limit from storage.buckets where id = 'efset';

-- 참고 · 운영 중 자주 쓰는 쿼리
--   명단 뽑기(이름·대학·파일명):
--     select name, university, id || '.' || ext as file, uploaded_at
--       from public.efset_submissions order by university, name;
--   제출 인원:  select count(*) from public.efset_submissions;
