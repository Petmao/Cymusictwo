import type { Session } from '@supabase/supabase-js'
import { create } from 'zustand'

import { isCloudConfigured } from './config'
import { supabase } from './client'

export type CloudProfile = {
	id: string
	nickname: string
	avatar_url: string | null
	plan: 'free' | 'svip'
	svip_expires_at: string | null
	points: number
	/** 成长值，签到 / 卡密 / 邀请都会加 */
	growth: number
	/** 等级：每 300 成长值一级，封顶 Lv.5 */
	level: number
	/** 会员剩余天数，-1 表示未知（未走过快照接口时） */
	daysLeft: number
	/** 连续签到天数 */
	streak: number
	/** 今天是否已签到 */
	checkedInToday: boolean
	/** 邀请码 */
	inviteCode: string | null
}

type CheckInResult = {
	ok: boolean
	reason?: string
	gained?: number
	streak?: number
	points?: number
	growth?: number
	level?: number
}

type InviteResult = {
	ok: boolean
	reason?: string
	inviter?: string
	points?: number
	growth?: number
}

type CloudState = {
	configured: boolean
	ready: boolean
	busy: boolean
	error: string | null
	session: Session | null
	profile: CloudProfile | null

	bootstrap: () => Promise<void>
	signIn: (email: string, password: string) => Promise<void>
	signUp: (email: string, password: string, nickname?: string) => Promise<{ needConfirm: boolean }>
	signOut: () => Promise<void>
	refreshProfile: () => Promise<void>
	redeemCode: (code: string) => Promise<string>
	checkIn: () => Promise<CheckInResult>
	applyInvite: (code: string) => Promise<InviteResult>
	membership: () => Promise<void>
	updateNickname: (nickname: string) => Promise<void>
	clearError: () => void
}

const levelOf = (growth: number) => Math.min(5, Math.max(1, Math.floor(growth / 300) + 1))

const mapProfile = (row: any): CloudProfile => {
	const growth = Number(row.growth ?? 0)
	return {
		id: row.id ?? '',
		nickname: row.nickname ?? '屿声用户',
		avatar_url: row.avatar_url ?? null,
		plan: row.plan === 'svip' ? 'svip' : 'free',
		svip_expires_at: row.svip_expires_at ?? row.expires_at ?? null,
		points: Number(row.points ?? 0),
		growth,
		level: Number(row.level ?? levelOf(growth)),
		daysLeft: Number(row.days_left ?? row.daysLeft ?? -1),
		streak: Number(row.streak ?? row.check_in_streak ?? 0),
		checkedInToday: Boolean(row.checked_in_today ?? row.checkedInToday ?? false),
		inviteCode: row.invite_code ?? row.inviteCode ?? null,
	}
}

/** rpc 返回 jsonb 时偶尔会被序列化成字符串，这里统一掰回对象 */
const asJson = (value: unknown): any => {
	if (typeof value === 'string') {
		try {
			return JSON.parse(value)
		} catch {
			return null
		}
	}
	return value
}

const readable = (error: unknown): string => {
	const raw = error instanceof Error ? error.message : String(error ?? '')
	if (raw.includes('Invalid login credentials')) return '邮箱或密码不对'
	if (raw.includes('User already registered')) return '这个邮箱已经注册过了'
	if (raw.includes('Password should be at least')) return '密码至少要 6 位'
	if (raw.includes('DEVICE_LIMIT')) return '授权设备已满 5 台，先去「授权设备」里撤销一台'
	if (raw.includes('CODE_INVALID')) return '卡密无效或已被使用'
	if (raw.includes('NOT_AUTHENTICATED')) return '请先登录'
	if (raw.includes('ALREADY_INVITED')) return '这台账号已经绑定过邀请人了'
	if (raw.includes('CODE_NOT_FOUND')) return '邀请码不存在'
	if (raw.includes('CODE_EMPTY')) return '邀请码不能为空'
	if (raw.includes('SELF')) return '不能填自己的邀请码'
	return raw || '操作失败'
}

export const useCloud = create<CloudState>((set, get) => ({
	configured: isCloudConfigured,
	ready: false,
	busy: false,
	error: null,
	session: null,
	profile: null,

	bootstrap: async () => {
		if (!supabase) {
			set({ ready: true })
			return
		}
		try {
			const { data } = await supabase.auth.getSession()
			set({ session: data.session ?? null })
			if (data.session?.user) {
				await get().refreshProfile()
			}
			supabase.auth.onAuthStateChange((_event, session) => {
				set({ session })
				if (session?.user) {
					void get().refreshProfile()
				} else {
					set({ profile: null })
				}
			})
		} catch (error) {
			set({ error: readable(error) })
		} finally {
			set({ ready: true })
		}
	},

	signIn: async (email, password) => {
		const client = supabase
		if (!client) throw new Error('云端未配置')
		set({ busy: true, error: null })
		try {
			const { error } = await client.auth.signInWithPassword({
				email: email.trim(),
				password,
			})
			if (error) throw error
			await get().refreshProfile()
		} catch (error) {
			set({ error: readable(error) })
			throw error
		} finally {
			set({ busy: false })
		}
	},

	signUp: async (email, password, nickname) => {
		const client = supabase
		if (!client) throw new Error('云端未配置')
		set({ busy: true, error: null })
		try {
			const { data, error } = await client.auth.signUp({
				email: email.trim(),
				password,
				options: { data: { nickname: nickname?.trim() || '屿声用户' } },
			})
			if (error) throw error
			const needConfirm = !data.session
			if (data.session) await get().refreshProfile()
			return { needConfirm }
		} catch (error) {
			set({ error: readable(error) })
			throw error
		} finally {
			set({ busy: false })
		}
	},

	signOut: async () => {
		await supabase?.auth.signOut()
		set({ session: null, profile: null })
	},

	refreshProfile: async () => {
		const client = supabase
		const uid = get().session?.user?.id
		if (!client || !uid) return

		// 优先走会员快照函数：等级 / 剩余天数 / 今日签到 都由数据库算，客户端不重算
		const snapshot = await client.rpc('membership_snapshot')
		if (!snapshot.error && snapshot.data) {
			const row = asJson(snapshot.data)
			if (row && row.plan) {
				set({ profile: mapProfile({ id: uid, ...row }) })
				return
			}
		}

		// 迁移没执行时退回读表，界面不会因为缺函数整块空掉
		let query = await client
			.from('profiles')
			.select('id,nickname,avatar_url,plan,svip_expires_at,points,growth,invite_code,check_in_streak,last_check_in_at')
			.eq('id', uid)
			.maybeSingle()

		// 连扩展列都没有（只跑过第一份迁移）时，再退一档拿基础列
		if (query.error && /column .* does not exist|42703/.test(query.error.message)) {
			query = await client
				.from('profiles')
				.select('id,nickname,avatar_url,plan,svip_expires_at,points')
				.eq('id', uid)
				.maybeSingle()
		}

		const { data, error } = query
		if (error) {
			set({ error: readable(error) })
			return
		}
		if (data) {
			const checkedInToday =
				typeof (data as any).last_check_in_at === 'string'
					? (data as any).last_check_in_at.slice(0, 10) === new Date().toISOString().slice(0, 10)
					: false
			set({ profile: mapProfile({ ...data, checked_in_today: checkedInToday }) })
		}
	},

	membership: async () => {
		await get().refreshProfile()
	},

	checkIn: async () => {
		const client = supabase
		if (!client) throw new Error('云端未配置')
		set({ busy: true, error: null })
		try {
			const { data, error } = await client.rpc('daily_check_in')
			if (error) throw error
			const result = asJson(data) as CheckInResult
			await get().refreshProfile()
			return result ?? { ok: false, reason: 'UNKNOWN' }
		} catch (error) {
			set({ error: readable(error) })
			throw error
		} finally {
			set({ busy: false })
		}
	},

	applyInvite: async (code) => {
		const client = supabase
		if (!client) throw new Error('云端未配置')
		set({ busy: true, error: null })
		try {
			const { data, error } = await client.rpc('apply_invite', { p_code: code })
			if (error) throw error
			const result = asJson(data) as InviteResult
			await get().refreshProfile()
			return result ?? { ok: false, reason: 'UNKNOWN' }
		} catch (error) {
			set({ error: readable(error) })
			throw error
		} finally {
			set({ busy: false })
		}
	},

	redeemCode: async (code) => {
		const client = supabase
		if (!client) throw new Error('云端未配置')
		set({ busy: true, error: null })
		try {
			const { data, error } = await client.rpc('redeem_code', { p_code: code.trim() })
			if (error) throw error
			await get().refreshProfile()
			return String(data ?? '')
		} catch (error) {
			set({ error: readable(error) })
			throw error
		} finally {
			set({ busy: false })
		}
	},

	updateNickname: async (nickname) => {
		const client = supabase
		const uid = get().session?.user?.id
		if (!client || !uid) return
		const { error } = await client.from('profiles').update({ nickname }).eq('id', uid)
		if (error) {
			set({ error: readable(error) })
			return
		}
		await get().refreshProfile()
	},

	clearError: () => set({ error: null }),
}))
