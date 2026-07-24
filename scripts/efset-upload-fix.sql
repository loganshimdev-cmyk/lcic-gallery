-- 📝 EF-SET 결과지 제출 — 보완 패치 v2 (efset-upload-setup.sql 실행 후 한 번 실행)
-- 실행 위치: CELS Supabase(cedienlogevuhgqmcgph) SQL Editor
--
-- 배경: 버킷을 비공개(익명 열람 불가)로 두면 Storage 의 '교체(upsert)·삭제'가
--       SELECT 정책 없이는 동작하지 않는다. 그래서 클라이언트를
--       "업로드마다 새 경로(<학생id>/<타임스탬프>.<확장자>)에 저장" 방식으로 변경했고,
--       최신 파일 경로는 efset_submissions.path 컬럼이 정답이다.
--       (재업로드 시 이전 파일은 버킷에 남지만, 담당자는 path 의 최신 파일만 보면 됨)
--
-- ※ v1에 있던 storage.objects 직접 delete 는 Supabase가 금지(protect_delete)라 제거했다.
--    검증용 zztest 파일 3개는 대시보드 → Storage → efset 에서 직접 삭제해 주세요:
--      zztest_efset.pdf · zztest_efset/1000000001.pdf · zztest_efset/1000000002.pdf
--    (지우지 않아도 동작에는 영향 없음)

-- 1) 최신 파일 경로 컬럼
alter table public.efset_submissions add column if not exists path text;

-- 2) 동작하지 않는(그리고 이제 불필요한) 익명 교체·삭제 정책 제거 → 익명은 '업로드만' 가능
drop policy if exists "anon update efset" on storage.objects;
drop policy if exists "anon delete efset" on storage.objects;

-- 3) 테스트 마커 행 정리 (있다면)
delete from public.efset_submissions where id like 'zztest%';

-- ── 확인 ────────────────────────────────────────────────────────────────
select column_name from information_schema.columns
 where table_schema = 'public' and table_name = 'efset_submissions' order by ordinal_position;

-- 참고 · 담당자 명단 뽑기(이름·대학·최신 파일 경로):
--   select name, university, path, uploaded_at
--     from public.efset_submissions order by university, name;
