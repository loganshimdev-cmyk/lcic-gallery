-- 동명이인 구분표 (rooms.html 학생 모임에서 이름 뒤에 붙는 꼬리표)
-- CELS Supabase(cedienlogevuhgqmcgph) SQL Editor 에 붙여넣고 한 번 실행하세요.
--
-- 규칙: 동명이인은 학교로 구분, 학교도 같으면 학과까지 표시.
--   예) 같은 이름 5명 중 3명이 한 학교 → 그 3명만 "학교 · 학과", 나머지는 학교만
--
-- 갱신: node scripts 밖의 생성기(gendir.cjs)가 _apply-export.csv 로부터 이 파일을 다시 만든다.
--       명단이 바뀌면 재생성 후 이 파일을 다시 실행하면 됨.
--
-- ⚠️ 이 표에는 이름이 들어가지 않습니다. id(이메일 SHA-256 앞 16자) + 표시 문자열뿐.
-- anon 은 읽기만 가능(쓰기 정책 없음) — 갱신은 SQL Editor 에서만.

create table if not exists public.student_dirs (
  id  text primary key,
  tag text not null
);

alter table public.student_dirs enable row level security;
drop policy if exists "anon read student_dirs" on public.student_dirs;
create policy "anon read student_dirs" on public.student_dirs for select using (true);
grant select on public.student_dirs to anon, authenticated;

-- 동명이인 15명 (이름 6종)
delete from public.student_dirs;
insert into public.student_dirs (id, tag) values
  ('2079c27350367315', '백석대'),
  ('de6e0620e3bc9b9d', '전북대'),
  ('bc3d9232c84976d5', '국민대'),
  ('31df698de1e888fe', '인제대'),
  ('ffd171f71bfd9114', '전북대 · 정치외교학과'),
  ('83380e69c89fc811', '전북대 · 화학공학과'),
  ('a13e707c80921eea', '전북대 · Electronic Engineering'),
  ('480d32540b688597', '전북대 · 생물산업기계공학과'),
  ('d76570965bc1c2a0', '전북대 · 스페인중남미학과'),
  ('ff329865b986a471', '전북대 · 산업정보시스템공학과'),
  ('43c693d0eb9deb00', '전북대 · 영어영문학과'),
  ('9361893aa88ee4da', '전북대 · 나노화학공학과'),
  ('e9c98710ef6bfb1f', '전북대 · 생물환경화학과'),
  ('0e23314f18a4a44c', '전북대 · 분자생물학과'),
  ('1dd1c8e41f7b5f9e', '전북대 · 헬스케어기기')
on conflict (id) do update set tag = excluded.tag;

select count(*) as 등록됨 from public.student_dirs;
