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

/** 还剩多少天，负数按 0 处理 */
export const svipDaysLeft = (profile: CloudProfile | null | undefined): number => {
	if (!profile || profile.plan !== 'svip') return 0
	if (!profile.svip_expires_at) return 36500
	const diff = new Date(profile.svip_expires_at).getTime() - Date.now()
	return Math.max(0, Math.ceil(diff / 86400000))
}
