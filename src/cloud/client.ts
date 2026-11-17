import 'react-native-url-polyfill/auto'

import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { AppState } from 'react-native'

import { recordFatal } from '@/helpers/crashLog'
import { getCloudConfig } from './config'

/**
 * Supabase 客户端（Apache-2.0 开源后端：Postgres + Auth + RLS）。
 *
 * 这里是 `let` 而不是 const：服务器地址与 anon key 允许在 App 里改，
 * 改完就地重建客户端，不用重启。引用方写 `supabase.xxx` 会拿到最新值。
 */
export let supabase: SupabaseClient | null = null

/** 最近一次建客户端用的地址，用来判断是否真的换了服务器 */
let activeUrl = ''
let autoRefreshBound = false

const bindAutoRefresh = () => {
	if (autoRefreshBound) return
	autoRefreshBound = true
	// RN 里没有页面跳转，token 刷新要靠 AppState 手动驱动
	AppState.addEventListener('change', (state) => {
		if (!supabase) return
		if (state === 'active') supabase.auth.startAutoRefresh()
		else supabase.auth.stopAutoRefresh()
	})
}

export const buildCloudClient = (url: string, anonKey: string): SupabaseClient => {
	const client = createClient(url, anonKey, {
		auth: {
			storage: AsyncStorage,
			autoRefreshToken: true,
			persistSession: true,
			detectSessionInUrl: false,
		},
	})
	supabase = client
	activeUrl = url
	bindAutoRefresh()
	return client
}

/**
 * 按当前配置（本地覆盖 / 构建期 / 默认）确保客户端存在。
 *
 * 注意：这里必须容错。createClient 一旦抛错，如果发生在模块求值阶段，
 * 整个 JS bundle 会 abort，表现就是「点图标立刻闪退」，连启动图都留不住。
 */
export const ensureCloudClient = (): SupabaseClient | null => {
	const config = getCloudConfig()
	if (!config.configured) {
		supabase = null
		activeUrl = ''
		return null
	}
	if (supabase && activeUrl === config.url) return supabase
	try {
		return buildCloudClient(config.url, config.anonKey)
	} catch (error) {
		recordFatal(error, 'cloud-client')
		supabase = null
		activeUrl = ''
		return null
	}
}

/** 换服务器 / 换 key 时调用：重建客户端并返回 */
export const reconfigureCloud = (url: string, anonKey: string): SupabaseClient => {
	// 换服务器前先把旧会话清掉，避免带着旧 token 打新库
	if (supabase && activeUrl !== url) {
		void supabase.auth.signOut().catch(() => undefined)
	}
	return buildCloudClient(url, anonKey)
}

export const requireClient = (): SupabaseClient => {
	const client = supabase ?? ensureCloudClient()
	if (!client) {
		throw new Error('云端未配置：先去「账号与云同步 → 服务器设置」填地址与 anon key')
	}
	return client
}

// 说明：这里刻意不在模块求值时建客户端。
// 建客户端一旦抛错会连带整个 bundle abort（点图标即闪退），
// 所以改为在 bootstrap / 首次使用时按需创建，错误落盘后降级。
