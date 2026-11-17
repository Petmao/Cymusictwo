import getOrCreateMMKV from '@/store/getOrCreateMMKV'

/**
 * 云端配置。
 *
 * 优先级：App 内「服务器设置」里存的 > 构建期注入的 EXPO_PUBLIC_* > 默认地址。
 * 默认地址就是自建服务端 `https://ys.irepo.cn`；anon key 必须与服务器上的 JWT_SECRET 同源，
 * 所以 key 允许在 App 里手动粘一次，存在本地 MMKV，换 key 不用重编包。
 */

const STORE_ID = 'appPersistStatus'
const URL_KEY = 'cloud.url'
const KEY_KEY = 'cloud.anonKey'

export const DEFAULT_CLOUD_URL = 'https://ys.irepo.cn'

/**
 * 默认 anon key（公开密钥，配 RLS 使用；service_role 绝不进包）。
 * 它由服务器上的 JWT_SECRET 签出，换密钥时改这一行或走 App 内「服务器设置」。
 */
export const DEFAULT_CLOUD_ANON_KEY =
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1c2hlbmciLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc5NDkzMDExNCwiZXhwIjoyMTEwMjkwMTE0fQ.v5Y5gDyF1atSi02wyM42_syg4LlVmaR5EuVxbujLDFY'

const read = (key: string): string => {
	try {
		return getOrCreateMMKV(STORE_ID).getString(key) ?? ''
	} catch {
		return ''
	}
}

const write = (key: string, value: string) => {
	try {
		const store = getOrCreateMMKV(STORE_ID)
		if (value) store.set(key, value)
		else store.delete(key)
	} catch {
		// MMKV 还没就绪时静默跳过
	}
}

const normalizeUrl = (value: string) => value.trim().replace(/\/+$/, '')

export type CloudConfig = {
	url: string
	anonKey: string
	configured: boolean
	/** 配置来源，设置页要显示「用的是什么」 */
	source: 'local' | 'build' | 'default'
}

export const getCloudConfig = (): CloudConfig => {
	const storedUrl = read(URL_KEY)
	const storedKey = read(KEY_KEY)
	const envUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
	const envKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

	const url = normalizeUrl(storedUrl || envUrl || DEFAULT_CLOUD_URL)
	const anonKey = (storedKey || envKey || DEFAULT_CLOUD_ANON_KEY).trim()
	const source: CloudConfig['source'] = storedUrl || storedKey ? 'local' : envKey ? 'build' : 'default'

	return {
		url,
		anonKey,
		configured: url.startsWith('http') && anonKey.length > 20,
		source,
	}
}

export const saveCloudConfig = (url: string, anonKey: string) => {
	write(URL_KEY, normalizeUrl(url))
	write(KEY_KEY, anonKey.trim())
}

export const clearCloudConfig = () => {
	write(URL_KEY, '')
	write(KEY_KEY, '')
}

/** 构建期常量，只用于展示与默认值；运行时判断走 getCloudConfig() */
export const CLOUD_URL = getCloudConfig().url
export const CLOUD_ANON_KEY = getCloudConfig().anonKey
export const isCloudConfigured = getCloudConfig().configured

/** 云同步协议版本，将来改表结构时用来做迁移判断 */
export const CLOUD_SCHEMA_VERSION = 1

/** 最多同时在线设备数，与数据库 register_device 里的上限保持一致 */
export const MAX_DEVICES = 5
