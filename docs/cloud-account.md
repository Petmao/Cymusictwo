# 云端账号体系（Supabase）

> 选型：**Supabase** —— Apache-2.0 开源，后端是标准 PostgreSQL + GoTrue(Auth) + PostgREST + Storage。
> 用它的核心理由：**"只有 SVIP 能用视频""只能读写自己的数据"这类规则写在数据库 RLS 里，客户端改代码也绕不过去**。
> 不想用托管也可以自托管（同一套 SQL 和客户端代码，只换 URL）。

---

## 1. 起一个后端（5 分钟）

### 方式 A：官方托管（最省事，免费额度够个人用）

1. 打开 <https://supabase.com> 注册 → New project，区域选 Singapore / Tokyo。
2. 项目创建完，进 **SQL Editor**，把 `supabase/migrations/20261117000000_cloud_account.sql` 全文粘进去执行。
3. 进 **Project Settings → API**，记下：
   - `Project URL`（形如 `https://xxxx.supabase.co`）
   - `anon public` key

### 方式 B：自托管（Docker）

```bash
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env        # 改 POSTGRES_PASSWORD / JWT_SECRET / ANON_KEY
docker compose up -d
# 然后把 migration 里的 SQL 在 postgres 容器里执行：
docker compose exec db psql -U postgres -d postgres -f /path/20261117000000_cloud_account.sql
```

自托管时 `Project URL` 换成 `http://<你的域名>:8000`，`anon key` 用 `.env` 里生成的 `ANON_KEY`。

---

## 2. 让 App 连上

### 本地开发

在项目根目录建 `.env`（已在 `.gitignore` 之外，不要提交）：

```bash
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

`EXPO_PUBLIC_` 前缀的值会在打包时**内联进 bundle**，不需要额外配置读取逻辑。

### CI 出包

GitHub 仓库 → Settings → Secrets and variables → Actions，加两个 secret：

| Name | Value |
|---|---|
| `SUPABASE_URL` | 上面的 Project URL |
| `SUPABASE_ANON_KEY` | 上面的 anon key |

`.github/workflows/build-ios13.yml` 已经把这两个 secret 注入成 `EXPO_PUBLIC_*` 环境变量，构建时自动内联。

> 没配也不会崩：`isCloudConfigured` 为 false，所有云函数退化成 no-op，App 仍然是纯本地播放器。

---

## 3. 数据模型

| 表 | 作用 | 关键约束 |
|---|---|---|
| `profiles` | 昵称 / 会员状态 / 积分 | `plan in ('free','svip')`；客户端改不了 `plan`、`svip_expires_at`、`points`（触发器强制回滚） |
| `favorites` | 喜欢的歌曲 | `unique(user_id, platform, song_id)`，软删除 `deleted` |
| `playlists` | 歌单 | 主键 `(user_id, id)`，`id` 与本地歌单 id 对齐 |
| `playlist_items` | 歌单曲目 | 主键 `(user_id, playlist_id, platform, song_id)`，含 `position` |
| `devices` | 授权设备 | `unique(user_id, device_key)`，`revoked_at` 软撤销 |
| `video_sources` | 视频源 | **只有 `is_svip(auth.uid())` 能 SELECT** |
| `redeem_codes` | 卡密 | 无 policy = 谁都查不到，只能通过 `redeem_code()` 函数用 |
| `sync_state` / `listen_stats` | 同步水位 / 听歌统计 | 本人可读写 |

所有表都开了 RLS，默认拒绝，策略一律是 `user_id = auth.uid()`（`profiles` 是 `id = auth.uid()`）。

---

## 4. 开通 SVIP

### 发卡密（推荐，对应 App 里「卡密兑换」）

```sql
insert into public.redeem_codes (code, days) values
  ('YS-SVIP-2026-AAAA', 365),
  ('YS-SVIP-2026-BBBB', 30);
```

App 里「我的 → 账号与云同步 → 输入卡密兑换」，会调 `redeem_code()`：
校验 → 标记已用 → `plan = 'svip'` → 到期时间按"取当前与旧到期时间的较大值 + N 天"顺延（续费不会缩短）。

### 手动开通（测试用）

```sql
update public.profiles
   set plan = 'svip', svip_expires_at = now() + interval '365 days'
 where id = '<user-uuid>';
```

---

## 5. 设备管理

- 客户端首次启动生成一个稳定 `device_key`，存在 MMKV 的 `appPersistStatus / cloud.deviceKey`。
- 登录后自动调 `register_device()`，同时当心跳用（更新 `last_seen_at`）。
- 超过 **5 台**活跃设备会抛 `DEVICE_LIMIT`，App 提示"授权设备已满，先去撤销一台"。
- App 内「账号与云同步 → 授权设备」可看列表（本机有标记）并撤销，撤销后那台设备要重新登录才能同步。

---

## 6. 云同步语义

「一键同步」= 推本地 → 拉云端 → 并集合并写回本地：

1. 本地收藏 / 歌单 / 歌单曲目全量 `upsert` 到云端（`onConflict` 命中唯一键）；
2. 拉回云端所有行；
3. 云端 `deleted = true` 的行在本地移除，其余按 `platform:song_id` 去重后并入本地。

没有本地时间戳，所以**不做"本地删了就同步删云端"**（避免新设备上空的收藏把云端清空）。
需要双向删除时，下一步给 UI 加"删除收藏"时写墓碑（`deleted = true`），协议已预留字段。

---

## 7. 视频功能只给 SVIP

两处一起生效，客户端改代码也绕不过数据库：

1. 数据层：`video_sources` 的 SELECT policy 里有 `public.is_svip(auth.uid())`，非会员查表直接返回空集。
2. UI 层：进视频 tab 前判断 `useIsSvip()`，false 就渲染空态（引导去开通），不发请求。

```tsx
import { useIsSvip } from '@/cloud'

const isSvip = useIsSvip()
if (!isSvip) return <VideoPaywall onPress={() => router.push('/(modals)/account')} />
```

将来做服务端抽直链的 `/api/videos` 也用同一个 `is_svip()` 判断——把 `Authorization: Bearer <supabase access_token>` 透传给 Edge Function 即可。

---

## 8. App 侧代码位置

```
src/cloud/
  config.ts   环境变量、是否启用、设备上限
  client.ts   supabase 客户端（AsyncStorage 持久化 + AppState 自动刷新）
  store.ts    会话 / 档案 / 登录注册 / 卡密兑换（zustand）
  device.ts   设备 id、设备信息、注册、列表、撤销
  sync.ts     收藏 / 歌单 / 曲目 的推拉与合并
  svip.ts     is_svipProfile / useIsSvip / 到期格式化
  index.ts    统一出口

src/app/(modals)/account.tsx   登录注册、SVIP 状态、卡密、一键同步、设备入口、退出
src/app/(modals)/devices.tsx   授权设备列表与撤销
```

入口已经接在「我的 → 通用 → 账号与云同步」，根布局 `_layout.tsx` 启动时会 `bootstrap()` 恢复会话。

---

## 9. 常见问题

| 现象 | 原因 |
|---|---|
| 登录报 `Invalid login credentials` | 邮箱未注册，或密码错（Supabase 不区分提示） |
| 注册后没登录 | 项目默认开启邮箱确认；要么去邮箱点链接，要么在 Auth → Providers 关掉 "Confirm email" |
| `DEVICE_LIMIT` | 活跃设备 5 台已满，去授权设备页撤销 |
| 视频页空但已开 SVIP | 检查 `video_sources` 是否有 `enabled = true` 的行，且 `owner_id is null` 或等于自己 |
| 同步后歌单变多 | 正常：并集合并，两台设备各自的歌单都会保留 |

---

## 10. 会员体系（20261117203000_membership.sql）

第二份迁移在上面那套账号表上补齐「会员」：成长值、等级、签到、邀请、卡密续期、视频卡点。
执行顺序：先跑 `20261117000000_cloud_account.sql`，再跑 `20261117203000_membership.sql`。

### 数据与规则

| 项 | 规则 |
|---|---|
| 付费层级 | 只有 `svip`，没有其它档位；`plan` 字段 check 约束已经锁死 |
| 成长值 | 签到 +10（连续第 n 天再 +2(n-1)，封顶 +20）；卡密 +天数；邀请 +20（被邀请）/ +50（邀请人） |
| 等级 | 每 300 成长值一级，封顶 Lv.5，函数 `growth_level()` |
| 签到 | `daily_check_in()`：按 `last_check_in_at` 判当天只能一次，连续天数自动累加 |
| 邀请 | 每人 8 位邀请码（`invite_code`，触发器自动生成）；`apply_invite()` 每个账号只能绑一次，不能填自己 |
| 卡密 | `redeem_code()` 续期逻辑不变（取「原到期」与「现在」的较大者 + N 天），额外把成长值 +N |
| 客户端改不动 | `guard_profile_update` 现在会把 `plan / svip_expires_at / points / growth / invite_code / invited_by / last_check_in_at / check_in_streak` 全部还原，只有函数里 `set_config('app.membership_write','on')` 的事务能写 |

### 客户端接口

```ts
const { profile, checkIn, applyInvite, redeemCode } = useCloud()
profile.level        // 等级（数据库算）
profile.growth       // 成长值
profile.daysLeft     // 会员剩余天数
profile.streak       // 连续签到
profile.checkedInToday
profile.inviteCode

await checkIn()                 // → { ok, gained, streak }
await applyInvite('ABCD1234')   // → { ok, inviter, points }
await redeemCode('YS-SVIP-…')   // → 新的到期时间
```

`refreshProfile()` 会先调 `membership_snapshot()` 取整包快照；函数不存在或扩展列没加时自动降级读表，界面不会白。

### 视频卡点

- 数据层：`video_sources` 的 SELECT / INSERT 策略都要求 `public.is_svip(auth.uid())`
- UI 层：`src/app/(tabs)/video/index.tsx` 在 `isCloudConfigured && !isSvip` 时显示「视频是 SVIP 专属」页，按钮跳账号页
- 没配 Supabase 时（本地模式）不拦，本地导入的视频源照常能放

### 发卡密

```sql
insert into public.redeem_codes (code, days) values ('YS-SVIP-2027-AAAA', 365);
insert into public.redeem_codes (code, days) values ('YS-SVIP-30-BBBB', 30);
```

兑换成功后：`plan = svip`、到期日顺延、成长值 +天数，卡面成长条会实时变长。

### 失败码

| 返回 | 含义 |
|---|---|
| `ALREADY` | 今天已签到 |
| `ALREADY_INVITED` | 这个账号已经绑定过邀请人 |
| `CODE_NOT_FOUND` | 邀请码不存在 |
| `SELF` | 填了自己的邀请码 |
| `CODE_INVALID` | 卡密无效或已用 |
| `NOT_AUTHENTICATED` | 没登录 |

---

## 11. 自建服务器与 App 的对接方式

默认服务器地址写死在 `src/cloud/config.ts` 的 `DEFAULT_CLOUD_URL`，当前是 `https://ys.irepo.cn`。

配置优先级（高 → 低）：

1. App 内「我的 → 账号与云同步 → 服务器」里填的地址与 anon key（存 MMKV `cloud.url` / `cloud.anonKey`）
2. 构建期注入的 `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`
3. `DEFAULT_CLOUD_URL`

换服务器或换 key 都不用重编包：账号页底部「服务器」→ 改地址 / 粘 key → 保存并连接，客户端当场重建（`reconfigureCloud`），旧服务器会话会被登出。

`anon key` 与服务器 `.env` 里的 `JWT_SECRET` 必须同源，否则 PostgREST 一律 401。服务器上跑：

```bash
node scripts/gen-keys.mjs   # 打印 ANON_KEY 与 SERVICE_ROLE_KEY
```

`ANON_KEY` 给 App，`SERVICE_ROLE_KEY` 只留在服务器，不进包。
