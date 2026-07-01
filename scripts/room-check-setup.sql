-- ============================================================
-- Dorm Room Inspection (room-check.html) schema
-- Run once in the Supabase SQL Editor (project: lcic-cels).
-- Login is a custom username/password RPC (NOT Supabase Auth),
-- matching the room-check-data.js data layer.
-- ============================================================

create extension if not exists pgcrypto;

-- Rooms to inspect ---------------------------------------------------------
create table if not exists public.dorm_rooms (
  id          uuid primary key default gen_random_uuid(),
  building    text,
  cluster     text,                    -- e.g. '101' (the cluster/unit this room belongs to)
  room_number text not null,           -- individual room, e.g. '101-1' .. '101-7'
  floor       int,
  gender      text not null check (gender in ('male','female')),
  room_type   text,                    -- 'single' (개인실) | 'quad' (4인실)
  active      boolean not null default true,
  sort        int not null default 0
);
create index if not exists dorm_rooms_gender_idx on public.dorm_rooms(gender);

-- Inspector accounts (created by admin — see seed block at the bottom) ------
create table if not exists public.dorm_inspectors (
  id            uuid primary key default gen_random_uuid(),
  username      text unique not null,
  password_hash text not null,
  name          text not null,
  gender        text check (gender in ('male','female')),   -- null for admin
  role          text not null default 'inspector' check (role in ('inspector','admin')),
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Inspection records (history; UI shows the latest per room) ---------------
create table if not exists public.dorm_inspections (
  id             uuid primary key default gen_random_uuid(),
  room_id        uuid not null references public.dorm_rooms(id) on delete cascade,
  inspector_id   uuid references public.dorm_inspectors(id) on delete set null,
  inspector_name text,
  inspected_at   timestamptz not null default now(),
  has_issues     boolean not null default false,
  general_note   text,
  items          jsonb   -- [{ key, label, status:'ok'|'problem', detail }]
);
create index if not exists dorm_inspections_room_idx on public.dorm_inspections(room_id);
create index if not exists dorm_inspections_time_idx on public.dorm_inspections(inspected_at desc);

-- Login RPC: verifies the bcrypt hash, returns the inspector profile -------
create or replace function public.inspector_login(p_username text, p_password text)
returns table(id uuid, username text, name text, gender text, role text)
language sql security definer set search_path = public, extensions as $$
  select id, username, name, gender, role
  from public.dorm_inspectors
  where username = lower(trim(p_username))
    and active
    and password_hash = crypt(p_password, password_hash);
$$;

-- Change own password (verifies current password first) --------------------
create or replace function public.inspector_set_password(p_id uuid, p_old text, p_new text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare ok boolean;
begin
  select (password_hash = crypt(p_old, password_hash)) into ok
  from public.dorm_inspectors where id = p_id and active;
  if not coalesce(ok, false) then return false; end if;
  update public.dorm_inspectors set password_hash = crypt(p_new, gen_salt('bf')) where id = p_id;
  return true;
end $$;

grant execute on function public.inspector_login(text, text) to anon, authenticated;
grant execute on function public.inspector_set_password(uuid, text, text) to anon, authenticated;

-- RLS ----------------------------------------------------------------------
-- Access is via the dedicated anon client in room-check-data.js.
--  * dorm_inspectors: RLS on, NO select policy → password_hash is unreadable
--    from the client; only the SECURITY DEFINER login RPC can read it.
--  * dorm_rooms / dorm_inspections: anon may read; anon may insert inspections.
alter table public.dorm_rooms       enable row level security;
alter table public.dorm_inspectors  enable row level security;
alter table public.dorm_inspections enable row level security;

drop policy if exists dorm_rooms_read on public.dorm_rooms;
create policy dorm_rooms_read on public.dorm_rooms
  for select to anon, authenticated using (true);

drop policy if exists dorm_inspections_read on public.dorm_inspections;
create policy dorm_inspections_read on public.dorm_inspections
  for select to anon, authenticated using (true);

drop policy if exists dorm_inspections_insert on public.dorm_inspections;
create policy dorm_inspections_insert on public.dorm_inspections
  for insert to anon, authenticated with check (true);

-- ============================================================
-- SEED — fill in real data, then run this block.
-- ============================================================

-- Rooms: one row per room. gender = 'male' | 'female'.
-- insert into public.dorm_rooms (building, room_number, floor, gender, sort) values
--   ('Main', '201', 2, 'male',   1),
--   ('Main', '202', 2, 'male',   2),
--   ('Main', '301', 3, 'female', 3);

-- Accounts: change every password. gender is null for admins.
-- insert into public.dorm_inspectors (username, password_hash, name, gender, role) values
--   ('john',  crypt('CHANGE_ME', gen_salt('bf')), 'John',  'male',   'inspector'),
--   ('mia',   crypt('CHANGE_ME', gen_salt('bf')), 'Mia',   'female', 'inspector'),
--   ('admin', crypt('CHANGE_ME', gen_salt('bf')), 'Admin', null,     'admin');
