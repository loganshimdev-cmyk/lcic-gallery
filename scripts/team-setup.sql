-- ============================================================
-- 한국팀 보드 (team.html) 스키마
-- Supabase SQL Editor에서 1회 실행
-- ============================================================

-- 멤버(한국담당자) 프로필
create table if not exists public.team_members (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  color      text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- 할 일
create table if not exists public.team_tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  detail      text,
  assignee_id uuid references public.team_members(id) on delete set null,
  due_date    date,
  status      text not null default 'todo' check (status in ('todo','doing','done')),
  sort        integer not null default 0,
  created_by  uuid references public.team_members(id) on delete set null,
  done_at     timestamptz,
  done_by     uuid references public.team_members(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 일정 (단일 날짜)
create table if not exists public.team_events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  date        date not null,
  all_day     boolean not null default true,
  start_time  time,
  end_time    time,
  owner_id    uuid references public.team_members(id) on delete set null,
  detail      text,
  created_by  uuid references public.team_members(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- 할 일 코멘트
create table if not exists public.team_comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.team_tasks(id) on delete cascade,
  author_id  uuid references public.team_members(id) on delete set null,
  body       text not null,
  created_at timestamptz not null default now()
);

create index if not exists team_comments_task_idx on public.team_comments(task_id);
create index if not exists team_tasks_status_idx on public.team_tasks(status);
create index if not exists team_events_date_idx on public.team_events(date);

-- updated_at 자동 갱신
create or replace function public.team_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists team_tasks_touch on public.team_tasks;
create trigger team_tasks_touch
  before update on public.team_tasks
  for each row execute function public.team_touch_updated_at();

-- RLS: 로그인(authenticated)만 전부 허용, anon 차단
alter table public.team_members  enable row level security;
alter table public.team_tasks    enable row level security;
alter table public.team_events   enable row level security;
alter table public.team_comments enable row level security;

do $$
declare t text;
begin
  foreach t in array array['team_members','team_tasks','team_events','team_comments']
  loop
    execute format('drop policy if exists %I on public.%I', t||'_auth_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      t||'_auth_all', t);
  end loop;
end $$;
