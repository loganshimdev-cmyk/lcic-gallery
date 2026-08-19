-- 📝 EF-SET 결과지 제출 (status.html · 전체 학생 필수 · 마감 2026-07-29 수)
-- 실행 위치: CELS Supabase(cedienlogevuhgqmcgph) SQL Editor — 전체 붙여넣고 한 번 실행
--
-- 구성
--   Storage 버킷 'efset'      = 결과지 파일 (비공개 · 익명은 업로드만 가능, 열람·수정·삭제 불가)
--                                경로 = <학생id 16자>/<타임스탬프>-<1|2>.<pdf|jpg|jpeg|png>
--                                ※ 비공개 버킷은 SELECT 정책 없이는 교체·삭제가 안 되므로
--                                  재업로드는 항상 새 경로에 저장. 최신 파일 = efset_submissions.path
--                                ※ 2026-08-19 부터 한 번에 2장까지 올릴 수 있다(총점 화면 + 4영역 화면).
--                                  2장이면 path 에 쉼표로 이어 붙는다 — "id/175...-1.png,id/175...-2.png"
--                                  → 스키마 변경 없음. 담당자는 path 를 쉼표로 나눠서 보면 된다.
--   efset_submissions 테이블  = 제출 기록 (제출 현황 표시 + id↔이름·최신 파일 경로 매핑)
--
-- 담당자 확인 방법
--   1) 아래 "명단 뽑기" 쿼리로 이름·대학·최신 파일 경로 확인
--   2) 대시보드 → Storage → efset 에서 해당 경로 파일 다운로드

-- ── 1) 버킷 (비공개 · 10MB 제한 · PDF/JPG/PNG만) ───────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('efset', 'efset', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = false, file_size_limit = 10485760,
      allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png'];

-- ── 2) Storage 정책: 익명은 '업로드만' 가능, 열람·수정·삭제 불가 ────────
drop policy if exists "anon insert efset" on storage.objects;
drop policy if exists "anon update efset" on storage.objects;
drop policy if exists "anon delete efset" on storage.objects;

create policy "anon insert efset" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'efset');

-- ── 3) 제출 기록 테이블 ─────────────────────────────────────────────────
create table if not exists public.efset_submissions (
  id          text primary key,           -- 이메일 SHA-256 앞 16자 (호핑·이벤트와 동일 규칙)
  name        text not null,
  university  text,
  ext         text not null,              -- 파일 확장자 (pdf/jpg/jpeg/png)
  path        text,                       -- 최신 파일 경로 (efset 버킷 내)
  uploaded_at timestamptz not null default now()
);
alter table public.efset_submissions add column if not exists path text;

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
--   명단 뽑기(이름·대학·최신 파일 경로 · 장수):
--     select name, university, path,
--            array_length(string_to_array(path, ','), 1) as 장수, uploaded_at
--       from public.efset_submissions order by university, name;
--   파일 한 장을 한 줄로 펼쳐 보기(2장 올린 학생 확인용):
--     select name, university, unnest(string_to_array(path, ',')) as file, uploaded_at
--       from public.efset_submissions order by university, name;
--   제출 인원:  select count(*) from public.efset_submissions;
