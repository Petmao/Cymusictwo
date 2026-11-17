-- 屿声音乐 · 云端账号体系（Supabase / PostgreSQL）
-- 只保留一个付费层级：svip。所有"仅 SVIP"的能力都在数据库层用 RLS + 函数锁死。
-- 执行方式：Supabase 控制台 SQL Editor 粘贴执行，或 `supabase db push`。

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────
-- 1. 用户档案（与 auth.users 一对一）
-- ─────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null default '屿声用户',
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'svip')),
  svip_expires_at timestamptz,
  points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 是否有效 SVIP：plan=svip 且（永久 或 未过期）
create or replace function public.is_svip(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid
      and p.plan = 'svip'
      and (p.svip_expires_at is null or p.svip_expires_at > now())
  );
$$;

-- 注册即建档
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nickname', '屿声用户'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 防止客户端自己把自己改成 SVIP / 改积分
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and coalesce(auth.role(), '') <> 'service_role' then
    new.plan := old.plan;
    new.svip_expires_at := old.svip_expires_at;
    new.points := old.points;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_guard_profile on public.profiles;
create trigger trg_guard_profile
before update on public.profiles
for each row execute function public.guard_profile_update();

-- ─────────────────────────────────────────────
-- 2. 喜欢的歌曲
-- ─────────────────────────────────────────────
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  song_id text not null,
  platform text not null default 'tx',
  title text not null default '',
  artist text not null default '',
  album text,
  artwork text,
  duration integer,
  deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, platform, song_id)
);

-- ─────────────────────────────────────────────
-- 3. 歌单 + 歌单曲目
-- ─────────────────────────────────────────────
create table if not exists public.playlists (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,                       -- 与本地歌单 id 对齐，便于双向合并
  name text not null default '未命名歌单',
  cover_url text,
  deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.playlist_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  playlist_id text not null,
  song_id text not null,
  platform text not null default 'tx',
  title text not null default '',
  artist text not null default '',
  album text,
  artwork text,
  duration integer,
  position numeric not null default 0,
  deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, playlist_id, platform, song_id)
);

-- ─────────────────────────────────────────────
-- 4. 授权设备
-- ─────────────────────────────────────────────
create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  device_key text not null,               -- 客户端生成并持久化的稳定 id
  name text,
  model text,
  os text,
  app_version text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (user_id, device_key)
);

create or replace function public.register_device(
  p_device_key text,
  p_name text,
  p_model text,
  p_os text,
  p_app_version text
)
returns public.devices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_active int;
  v_row public.devices;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select count(*) into v_active
  from public.devices
  where user_id = v_uid and revoked_at is null and device_key <> p_device_key;

  if v_active >= 5 then
    raise exception 'DEVICE_LIMIT';
  end if;

  insert into public.devices (user_id, device_key, name, model, os, app_version, last_seen_at)
  values (v_uid, p_device_key, p_name, p_model, p_os, p_app_version, now())
  on conflict (user_id, device_key) do update
    set name = excluded.name,
        model = excluded.model,
        os = excluded.os,
        app_version = excluded.app_version,
        last_seen_at = now(),
        revoked_at = null
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.revoke_device(p_device_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.devices
     set revoked_at = now()
   where user_id = auth.uid() and device_key = p_device_key;
end;
$$;

-- ─────────────────────────────────────────────
-- 5. SVIP 视频源（只有 SVIP 能读）
-- ─────────────────────────────────────────────
create table if not exists public.video_sources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete cascade,  -- null = 官方源
  title text not null default '',
  url text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 6. 卡密兑换（开通 / 续费 SVIP）
-- ─────────────────────────────────────────────
create table if not exists public.redeem_codes (
  code text primary key,
  days integer not null default 30,
  used_by uuid references auth.users (id),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.redeem_code(p_code text)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_days int;
  v_expire timestamptz;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select days into v_days
  from public.redeem_codes
  where code = p_code and used_at is null
  for update;

  if v_days is null then
    raise exception 'CODE_INVALID';
  end if;

  update public.redeem_codes
     set used_by = v_uid, used_at = now()
   where code = p_code;

  update public.profiles
     set plan = 'svip',
         svip_expires_at = greatest(coalesce(svip_expires_at, now()), now()) + (v_days || ' days')::interval
   where id = v_uid
  returning svip_expires_at into v_expire;

  return v_expire;
end;
$$;

-- ─────────────────────────────────────────────
-- 7. 同步水位
-- ─────────────────────────────────────────────
create table if not exists public.sync_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_pull_at timestamptz,
  last_push_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 8. 统计（我的页 听歌画像，可选）
-- ─────────────────────────────────────────────
create table if not exists public.listen_stats (
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  seconds integer not null default 0,
  track_count integer not null default 0,
  top_artist text,
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

-- ─────────────────────────────────────────────
-- 9. RLS：所有表默认拒绝，只放行本人 / SVIP
-- ─────────────────────────────────────────────
alter table public.profiles       enable row level security;
alter table public.favorites      enable row level security;
alter table public.playlists      enable row level security;
alter table public.playlist_items enable row level security;
alter table public.devices        enable row level security;
alter table public.video_sources  enable row level security;
alter table public.redeem_codes   enable row level security;
alter table public.sync_state     enable row level security;
alter table public.listen_stats   enable row level security;

-- profiles
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- favorites
drop policy if exists favorites_owner on public.favorites;
create policy favorites_owner on public.favorites
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- playlists
drop policy if exists playlists_owner on public.playlists;
create policy playlists_owner on public.playlists
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- playlist_items
drop policy if exists playlist_items_owner on public.playlist_items;
create policy playlist_items_owner on public.playlist_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- devices：只能看/删自己的，写入走 register_device 函数
drop policy if exists devices_select_own on public.devices;
create policy devices_select_own on public.devices
  for select using (user_id = auth.uid());

-- video_sources：只有 SVIP 能读启用中的源
drop policy if exists video_sources_svip_read on public.video_sources;
create policy video_sources_svip_read on public.video_sources
  for select using (
    enabled = true
    and public.is_svip(auth.uid())
    and (owner_id is null or owner_id = auth.uid())
  );

drop policy if exists video_sources_owner_write on public.video_sources;
create policy video_sources_owner_write on public.video_sources
  for insert with check (owner_id = auth.uid() and public.is_svip(auth.uid()));

-- sync_state
drop policy if exists sync_state_owner on public.sync_state;
create policy sync_state_owner on public.sync_state
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- listen_stats
drop policy if exists listen_stats_owner on public.listen_stats;
create policy listen_stats_owner on public.listen_stats
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- redeem_codes：任何人都不能直接查（只能通过 redeem_code 函数）
-- 不建 policy = 完全拒绝，符合预期。

-- ─────────────────────────────────────────────
-- 10. 索引
-- ─────────────────────────────────────────────
create index if not exists idx_favorites_user_updated on public.favorites (user_id, updated_at desc);
create index if not exists idx_playlists_user_updated on public.playlists (user_id, updated_at desc);
create index if not exists idx_playlist_items_user_pl on public.playlist_items (user_id, playlist_id);
create index if not exists idx_devices_user on public.devices (user_id, last_seen_at desc);
