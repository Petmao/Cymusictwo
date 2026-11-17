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
	updateNickname: (nickname: string) => Promise<void>
	clearError: () => void
}

const mapProfile = (row: any): CloudProfile => ({
	id: row.id,
	nickname: row.nickname ?? '屿声用户',
	avatar_url: row.avatar_url ?? null,
	plan: row.plan === 'svip' ? 'svip' : 'free',
	svip_expires_at: row.svip_expires_at ?? null,
	points: Number(row.points ?? 0),
})

const readable = (error: unknown): string => {
	const raw = error instanceof Error ? error.message : String(error ?? '')
	if (raw.includes('Invalid login credentials')) return '邮箱或密码不对'
	if (raw.includes('User already registered')) return '这个邮箱已经注册过了'
	if (raw.includes('Password should be at least')) return '密码至少要 6 位'
	if (raw.includes('DEVICE_LIMIT')) return '授权设备已满 5 台，先去「授权设备」里撤销一台'
	if (raw.includes('CODE_INVALID')) return '卡密无效或已被使用'
	if (raw.includes('NOT_AUTHENTICATED')) return '请先登录'
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
		const { data, error } = await client
			.from('profiles')
			.select('id,nickname,avatar_url,plan,svip_expires_at,points')
			.eq('id', uid)
			.maybeSingle()
		if (error) {
			set({ error: readable(error) })
			return
		}
		if (data) set({ profile: mapProfile(data) })
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
