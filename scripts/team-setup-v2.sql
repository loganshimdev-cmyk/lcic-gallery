-- ============================================================
-- 한국팀 보드 v2 — 간편 로그인(아이디/비번) 전환
-- Supabase Auth 미사용. team_members에 username/password 추가.
-- 기존 team-setup.sql 실행 후, SQL Editor에서 이 파일을 1회 실행.
-- ============================================================

-- 1) team_members를 auth.users에서 분리하고 계정 칼럼 추가
alter table public.team_members alter column id set default gen_random_uuid();
alter table public.team_members drop constraint if exists team_members_id_fkey;
alter table public.team_members add column if not exists username text;
alter table public.team_members add column if not exists password text;
alter table public.team_members alter column name drop not null; -- 첫 로그인 시 이름 등록
create unique index if not exists team_members_username_key on public.team_members(lower(username));

-- 2) 로그인 함수: 비번 일치 시 멤버 반환(비번 칼럼은 노출 안 함). SECURITY DEFINER.
create or replace function public.team_login(p_username text, p_password text)
returns table(id uuid, name text, color text, username text)
language sql security definer set search_path = public as $$
  select m.id, m.name, m.color, m.username
  from public.team_members m
  where lower(m.username) = lower(p_username)
    and m.password = p_password
    and m.active;
$$;

-- 3) 비밀번호 변경 함수(현재 비번 확인 후 교체). SECURITY DEFINER.
create or replace function public.team_set_password(p_id uuid, p_old text, p_new text)
returns boolean language plpgsql security definer set search_path = public as $$
declare changed boolean;
begin
  update public.team_members set password = p_new
   where id = p_id and password = p_old
  returning true into changed;
  return coalesce(changed, false);
end $$;

grant execute on function public.team_login(text, text) to anon;
grant execute on function public.team_set_password(uuid, text, text) to anon;

-- 4) RLS 정책: authenticated → anon 으로 교체(간편 로그인 모델)
do $$
declare t text;
begin
  foreach t in array array['team_members','team_tasks','team_events','team_comments']
  loop
    execute format('drop policy if exists %I on public.%I', t||'_auth_all', t);
    execute format('drop policy if exists %I on public.%I', t||'_anon_all', t);
    execute format('create policy %I on public.%I for all to anon using (true) with check (true)', t||'_anon_all', t);
  end loop;
end $$;

-- 5) 테이블 권한: team_members의 password 칼럼은 anon이 SELECT 불가(나머지 칼럼만 허용).
revoke select on public.team_members from anon;
grant select (id, name, color, username, active, created_at) on public.team_members to anon;
grant insert, update, delete on public.team_members to anon;
grant select, insert, update, delete on public.team_tasks    to anon;
grant select, insert, update, delete on public.team_events   to anon;
grant select, insert, update, delete on public.team_comments to anon;
