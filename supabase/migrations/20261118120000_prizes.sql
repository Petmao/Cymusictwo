-- =============================================================
-- 积分兑换奖品（奖品由云端配置）
--
-- 用法：
--   psql "$DATABASE_URL" -f 20261118120000_prizes.sql
--   或者把本文件丢进 supabase/migrations/ 再 supabase db push
--
-- 上架一个奖品：
--   insert into public.prizes (id, title, description, cost, stock, sort)
--   values ('p-coffee', '星巴克中杯券', '到店出示兑换码', 300, 20, 10)
--   on conflict (id) do update set title = excluded.title, cost = excluded.cost, stock = excluded.stock;
-- =============================================================

create table if not exists public.prizes (
  id          text primary key,
  title       text not null,
  description text,
  cover       text,
  cost        integer not null check (cost >= 0),
  stock       integer not null default 0 check (stock >= 0),
  enabled     boolean not null default true,
  sort        integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists prizes_sort_idx on public.prizes (sort, created_at desc);

create table if not exists public.prize_orders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  prize_id   text not null references public.prizes (id),
  title      text not null default '',
  cost       integer not null check (cost >= 0),
  status     text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists prize_orders_user_idx on public.prize_orders (user_id, created_at desc);

alter table public.prizes       enable row level security;
alter table public.prize_orders enable row level security;

-- 奖品清单：谁都能看enabled的（登录前也能看到价格）
drop policy if exists prizes_read on public.prizes;
create policy prizes_read on public.prizes
  for select using (enabled = true);

-- 兑换记录：只能看自己的
drop policy if exists prize_orders_read on public.prize_orders;
create policy prize_orders_read on public.prize_orders
  for select using (auth.uid() = user_id);

grant select on public.prizes to anon, authenticated;
grant select on public.prize_orders to authenticated;

-- ── 兑换：扣分 + 减库存 + 落单，全在事务里 ─────────────────────
create or replace function public.redeem_prize(p_prize_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_title  text;
  v_cost   integer;
  v_stock  integer;
  v_points integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'NOT_AUTHENTICATED');
  end if;

  select title, cost, stock
    into v_title, v_cost, v_stock
    from public.prizes
   where id = p_prize_id and enabled = true
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'NOT_FOUND');
  end if;

  if v_stock <= 0 then
    return jsonb_build_object('ok', false, 'reason', 'OUT_OF_STOCK');
  end if;

  select points into v_points from public.profiles where id = v_uid for update;

  if v_points is null then
    return jsonb_build_object('ok', false, 'reason', 'NO_PROFILE');
  end if;

  if v_points < v_cost then
    return jsonb_build_object('ok', false, 'reason', 'NO_POINTS');
  end if;

  -- 会员字段有保护触发器，这里要显式放行一次
  perform set_config('app.membership_write', 'on', true);

  update public.profiles
     set points = points - v_cost,
         updated_at = now()
   where id = v_uid;

  perform set_config('app.membership_write', 'off', true);

  update public.prizes
     set stock = stock - 1
   where id = p_prize_id;

  insert into public.prize_orders (user_id, prize_id, title, cost)
  values (v_uid, p_prize_id, v_title, v_cost);

  return jsonb_build_object(
    'ok', true,
    'cost', v_cost,
    'title', v_title,
    'points', v_points - v_cost
  );
end;
$$;

revoke all on function public.redeem_prize(text) from public;
grant execute on function public.redeem_prize(text) to authenticated;

-- ── 我的兑换记录（可选，App 目前没调用，留给后台/以后用） ──────
create or replace function public.my_prize_orders()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(row_to_json(t) order by t.created_at desc), '[]'::jsonb)
  from (
    select id, prize_id, title, cost, status, created_at
      from public.prize_orders
     where user_id = auth.uid()
     limit 50
  ) t;
$$;

revoke all on function public.my_prize_orders() from public;
grant execute on function public.my_prize_orders() to authenticated;

-- ── 后台下发视频源（App 只按标题展示，不显示地址） ────────────
-- insert into public.app_config (id, cfg)
-- values ('video_sources', '{"items":[{"title":"示例","url":"https://example.com/a.mp4"}]}'::jsonb)
-- on conflict (id) do update set cfg = excluded.cfg, updated_at = now();

-- ── 示例奖品（不需要就删掉这几行） ────────────────────────────
insert into public.prizes (id, title, description, cost, stock, sort) values
  ('p-7day',   'SVIP 体验 7 天', '兑换后联系管理员开通，或等自动发放', 500,  20, 10),
  ('p-coffee', '咖啡券',        '到店出示订单号核销',                    300,  50, 20),
  ('p-theme',  '限定主题皮肤',   '后续版本上线后自动解锁',                200, 100, 30)
on conflict (id) do nothing;
