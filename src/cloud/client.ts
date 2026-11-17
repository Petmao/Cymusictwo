import 'react-native-url-polyfill/auto'

import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { AppState } from 'react-native'

import { CLOUD_ANON_KEY, CLOUD_URL, isCloudConfigured } from './config'

/**
 * Supabase 客户端（Apache-2.0 开源后端：Postgres + Auth + RLS）。
 * 没有配置环境变量时返回 null，调用方一律先判空。
 */
export const supabase: SupabaseClient | null = isCloudConfigured
	? createClient(CLOUD_URL, CLOUD_ANON_KEY, {
			auth: {
				storage: AsyncStorage,
				autoRefreshToken: true,
				persistSession: true,
				detectSessionInUrl: false,
			},
		})
	: null

/** RN 里没有页面跳转，token 刷新要靠 AppState 手动驱动 */
if (supabase) {
	AppState.addEventListener('change', (state) => {
		if (state === 'active') {
			supabase.auth.startAutoRefresh()
		} else {
			supabase.auth.stopAutoRefresh()
		}
	})
}

export const requireClient = (): SupabaseClient => {
	if (!supabase) {
		throw new Error('云端未配置：缺少 EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY')
	}
	return supabase
}
