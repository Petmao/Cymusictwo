import { useCloud, type CloudProfile } from './store'

/** 有效 SVIP：plan=svip 且（永久 或 到期时间还没过） */
export const isSvipProfile = (profile: CloudProfile | null | undefined): boolean => {
	if (!profile || profile.plan !== 'svip') return false
	if (!profile.svip_expires_at) return true
	return new Date(profile.svip_expires_at).getTime() > Date.now()
}

export const useIsSvip = (): boolean => useCloud((state) => isSvipProfile(state.profile))

/** 到期日显示成 2027-03-12，永久返回「永久」 */
export const formatSvipExpire = (profile: CloudProfile | null | undefined): string => {
	if (!profile || profile.plan !== 'svip') return '未开通'
	if (!profile.svip_expires_at) return '永久'
	const date = new Date(profile.svip_expires_at)
	const pad = (n: number) => String(n).padStart(2, '0')
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** 还剩多少天：优先用数据库算好的值，负数按 0 处理 */
export const svipDaysLeft = (profile: CloudProfile | null | undefined): number => {
	if (!profile || profile.plan !== 'svip') return 0
	if (typeof profile.daysLeft === 'number' && profile.daysLeft >= 0) return profile.daysLeft
	if (!profile.svip_expires_at) return 36500
	const diff = new Date(profile.svip_expires_at).getTime() - Date.now()
	return Math.max(0, Math.ceil(diff / 86400000))
}

/** 每 300 成长值一级，封顶 Lv.5 —— 与数据库 growth_level() 同一套规则 */
export const GROWTH_PER_LEVEL = 300
export const MAX_LEVEL = 5

export const levelOfGrowth = (growth: number): number =>
	Math.min(MAX_LEVEL, Math.max(1, Math.floor(Math.max(0, growth) / GROWTH_PER_LEVEL) + 1))

/** 当前等级内的进度，给卡面成长条用 */
export const growthProgress = (growth: number) => {
	const safe = Math.max(0, growth)
	const level = levelOfGrowth(safe)
	const base = (level - 1) * GROWTH_PER_LEVEL
	const next = level >= MAX_LEVEL ? base : level * GROWTH_PER_LEVEL
	const current = Math.max(0, safe - base)
	const span = Math.max(1, next - base)
	return {
		level,
		current,
		next,
		remaining: Math.max(0, next - safe),
		ratio: level >= MAX_LEVEL ? 1 : Math.min(1, current / span),
	}
}
