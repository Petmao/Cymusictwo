-- 屿声音乐 · 会员体系（在 20261117000000_cloud_account.sql 之后执行）
-- 说明：只保留一个付费层级 svip；成长值 / 等级 / 签到 / 邀请 / 卡密 全部由数据库函数改写，
-- 客户端的 guard 触发器会拦掉所有"自己改自己"的写入，只有函数里打了标记的事务能写。

-- ─────────────────────────────────────────────
-- 1. 档案扩列
-- ─────────────────────────────────────────────
alter table public.profiles
  add column if not exists growth integer not null default 0,
  add column if not exists invite_code text,
  add column if not exists invited_by uuid references auth.users (id) on delete set null,
  add column if not exists last_check_in_at date,
  add column if not exists check_in_streak integer not null default 0;

create unique index if not exists profiles_invite_code_key
  on public.profiles (invite_code)
  where invite_code is not null;

-- 8 位邀请码（大写十六进制，去掉连字符）
create or replace function public.make_invite_code()
returns text
language sql
volatile
as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$;

create or replace function public.ensure_invite_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.invite_code is null or length(new.invite_code) < 4 then
    loop
      new.invite_code := public.make_invite_code();
      exit when not exists (
        select 1 from public.profiles
        where invite_code = new.invite_code and id <> new.id
      );
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ensure_invite_code on public.profiles;
create trigger trg_ensure_invite_code
before insert or update on public.profiles
for each row execute function public.ensure_invite_code();

-- 老数据补码
do $$
declare
  r record;
begin
  for r in select id from public.profiles where invite_code is null loop
    update public.profiles set invite_code = public.make_invite_code() where id = r.id;
  end loop;
end $$;

-- ─────────────────────────────────────────────
-- 2. 等级：每 300 成长值一级，封顶 Lv.5
-- ─────────────────────────────────────────────
create or replace function public.growth_level(p_growth integer)
returns integer
language sql
immutable
as $$
  select least(5, greatest(1, (coalesce(p_growth, 0) / 300) + 1));
$$;

-- ─────────────────────────────────────────────
-- 3. 改写 guard：多锁几个字段，并给函数开一条标记通道
-- ─────────────────────────────────────────────
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and coalesce(auth.role(), '') <> 'service_role'
     and coalesce(current_setting('app.membership_write', true), '') <> 'on' then
    new.plan := old.plan;
    new.svip_expires_at := old.svip_expires_at;
    new.points := old.points;
    new.growth := old.growth;
    -- 老数据还没发码时不要把它按回 null，否则补码永远补不上
    if old.invite_code is not null then
      new.invite_code := old.invite_code;
    end if;
    new.invited_by := old.invited_by;
    new.last_check_in_at := old.last_check_in_at;
    new.check_in_streak := old.check_in_streak;
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
-- 4. 会员快照：卡面所有数字一次取全
-- ─────────────────────────────────────────────
create or replace function public.membership_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  p public.profiles;
  v_days integer;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into p from public.profiles where id = v_uid;
  if not found then
    raise exception 'PROFILE_MISSING';
  end if;

  v_days := case
    when p.plan = 'svip' and p.svip_expires_at is null then 36500
    when p.svip_expires_at is null then 0
    else greatest(0, ceil(extract(epoch from (p.svip_expires_at - now())) / 86400))::int
  end;

  return jsonb_build_object(
    'plan', p.plan,
    'svip', public.is_svip(v_uid),
    'expires_at', p.svip_expires_at,
    'days_left', v_days,
    'points', p.points,
    'growth', p.growth,
    'level', public.growth_level(p.growth),
    'next_level_growth', least(5, (p.growth / 300) + 2) * 300,
    'streak', p.check_in_streak,
    'checked_in_today', coalesce(p.last_check_in_at = current_date, false),
    'invite_code', p.invite_code
  );
end;
$$;

-- ─────────────────────────────────────────────
-- 5. 每日签到：连续签到第 n 天多给 2(n-1) 分，封顶 +20
-- ─────────────────────────────────────────────
create or replace function public.daily_check_in()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  p public.profiles;
  v_streak integer;
  v_gain integer;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into p from public.profiles where id = v_uid for update;
  if not found then
    raise exception 'PROFILE_MISSING';
  end if;

  if p.last_check_in_at = current_date then
    return jsonb_build_object(
      'ok', false,
      'reason', 'ALREADY',
      'streak', p.check_in_streak,
      'points', p.points,
      'growth', p.growth
    );
  end if;

  v_streak := case
    when p.last_check_in_at = current_date - 1 then p.check_in_streak + 1
    else 1
  end;
  v_gain := 10 + least(20, (v_streak - 1) * 2);

  perform set_config('app.membership_write', 'on', true);
  update public.profiles
     set points = points + v_gain,
         growth = growth + v_gain,
         last_check_in_at = current_date,
         check_in_streak = v_streak
   where id = v_uid;

  return jsonb_build_object(
    'ok', true,
    'gained', v_gain,
    'streak', v_streak,
    'points', p.points + v_gain,
    'growth', p.growth + v_gain,
    'level', public.growth_level(p.growth + v_gain)
  );
end;
$$;

-- ─────────────────────────────────────────────
-- 6. 邀请码：被邀请方 +50 分/+20 成长，邀请人 +100 分/+50 成长，各一次
-- ─────────────────────────────────────────────
create or replace function public.apply_invite(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  p public.profiles;
  inviter public.profiles;
  v_code text := upper(trim(coalesce(p_code, '')));
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if v_code = '' then
    return jsonb_build_object('ok', false, 'reason', 'CODE_EMPTY');
  end if;

  select * into p from public.profiles where id = v_uid for update;
  if not found then
    raise exception 'PROFILE_MISSING';
  end if;
  if p.invited_by is not null then
    return jsonb_build_object('ok', false, 'reason', 'ALREADY_INVITED');
  end if;
  if p.invite_code = v_code then
    return jsonb_build_object('ok', false, 'reason', 'SELF');
  end if;

  select * into inviter from public.profiles where invite_code = v_code limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'CODE_NOT_FOUND');
  end if;

  perform set_config('app.membership_write', 'on', true);
  update public.profiles
     set points = points + 50,
         growth = growth + 20,
         invited_by = inviter.id
   where id = v_uid;
  update public.profiles
     set points = points + 100,
         growth = growth + 50
   where id = inviter.id;

  return jsonb_build_object(
    'ok', true,
    'inviter', inviter.nickname,
    'points', p.points + 50,
    'growth', p.growth + 20
  );
end;
$$;

-- ─────────────────────────────────────────────
-- 7. 卡密：原来的函数补上成长值，并允许写档案
-- ─────────────────────────────────────────────
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
  where code = trim(p_code) and used_at is null
  for update;

  if v_days is null then
    raise exception 'CODE_INVALID';
  end if;

  update public.redeem_codes
     set used_by = v_uid, used_at = now()
   where code = trim(p_code);

  perform set_config('app.membership_write', 'on', true);
  update public.profiles
     set plan = 'svip',
         svip_expires_at = greatest(coalesce(svip_expires_at, now()), now()) + (v_days || ' days')::interval,
         growth = growth + v_days
   where id = v_uid
  returning svip_expires_at into v_expire;

  return v_expire;
end;
$$;

-- ─────────────────────────────────────────────
-- 8. 权限：只给登录用户
-- ─────────────────────────────────────────────
revoke all on function public.membership_snapshot() from public;
revoke all on function public.daily_check_in() from public;
revoke all on function public.apply_invite(text) from public;
revoke all on function public.redeem_code(text) from public;

grant execute on function public.membership_snapshot() to authenticated;
grant execute on function public.daily_check_in() to authenticated;
grant execute on function public.apply_invite(text) to authenticated;
grant execute on function public.redeem_code(text) to authenticated;
