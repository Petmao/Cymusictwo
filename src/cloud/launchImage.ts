import getOrCreateMMKV from '@/store/getOrCreateMMKV'
import { DEFAULT_CLOUD_URL } from './config'
import { getCloudConfig } from './config'

/**
 * 启动图：从 https://ys.irepo.cn/img/ 里随机取一张。
 *
 * 目录不能列目录，所以按这个顺序找：
 * 1. {base}index.json —— 里面写文件名数组，最省事，也最准
 * 2. 拿不到就探 1..12 的 jpg/png，谁能 200 就用谁（结果缓存一小时，不会每次启动都探）
 *
 * 每次启动随机取一张；取不到（没网 / 空目录）就完全不显示，不挡启动。
 */
const STORE_ID = 'launchImage'
const KEY_LIST = 'img.list'
const KEY_LIST_AT = 'img.list.at'
const LIST_TTL = 60 * 60 * 1000
const PROBE_COUNT = 12

type CacheEntry = { at: number; names: string[] }

const imgBase = () => {
	let base = DEFAULT_CLOUD_URL
	try {
		const cfg = getCloudConfig()
		if (cfg?.url) base = cfg.url
	} catch {
		// 用默认
	}
	return `${base.replace(/\/+$/, '')}/img/`
}

const readCache = (): CacheEntry | null => {
	try {
		const store = getOrCreateMMKV(STORE_ID)
		const raw = store.getString(KEY_LIST)
		const at = store.getNumber(KEY_LIST_AT) ?? 0
		if (!raw) return null
		const names = JSON.parse(raw)
		if (!Array.isArray(names) || names.length === 0) return null
		return { at, names: names.filter((n) => typeof n === 'string') }
	} catch {
		return null
	}
}

const writeCache = (names: string[]) => {
	try {
		const store = getOrCreateMMKV(STORE_ID)
		store.set(KEY_LIST, JSON.stringify(names))
		store.set(KEY_LIST_AT, Date.now())
	} catch {
		// ignore
	}
}

const withTimeout = async (task: Promise<Response>, ms: number) => {
	let timer: any
	const timeout = new Promise<null>((resolve) => {
		timer = setTimeout(() => resolve(null), ms)
	})
	const result = await Promise.race([task.catch(() => null), timeout])
	clearTimeout(timer)
	return result as Response | null
}

const fromIndexJson = async (base: string): Promise<string[]> => {
	const res = await withTimeout(fetch(`${base}index.json`, { cache: 'no-store' } as any), 2500)
	if (!res || !res.ok) return []
	try {
		const data = await res.json()
		const list = Array.isArray(data) ? data : data?.images ?? data?.list ?? data?.files
		if (!Array.isArray(list)) return []
		return list
			.map((item: any) => (typeof item === 'string' ? item : item?.name ?? item?.file))
			.filter((name: any) => typeof name === 'string' && name.trim().length > 0)
	} catch {
		return []
	}
}

const fromProbe = async (base: string): Promise<string[]> => {
	const candidates: string[] = []
	for (let i = 1; i <= PROBE_COUNT; i += 1) {
		candidates.push(`${i}.jpg`, `${i}.png`)
	}
	const found: string[] = []
	await Promise.all(
		candidates.map(async (name) => {
			const res = await withTimeout(fetch(base + name, { method: 'HEAD' }), 2500)
			if (res && res.ok) found.push(name)
		}),
	)
	return found
}

const resolveList = async (): Promise<string[]> => {
	const base = imgBase()
	const cached = readCache()
	if (cached && Date.now() - cached.at < LIST_TTL) return cached.names

	const fromJson = await fromIndexJson(base)
	const names = fromJson.length ? fromJson : await fromProbe(base)

	if (names.length) writeCache(names)
	return names
}

/** 取一张启动图；拿不到返回 null */
export const resolveLaunchImage = async (): Promise<string | null> => {
	try {
		const names = await resolveList()
		if (!names.length) return null
		const pick = names[Math.floor(Math.random() * names.length)]
		if (/^https?:\/\//i.test(pick)) return pick
		return imgBase() + pick.replace(/^\/+/, '')
	} catch {
		return null
	}
}

export const clearLaunchImageCache = () => {
	try {
		const store = getOrCreateMMKV(STORE_ID)
		store.delete(KEY_LIST)
		store.delete(KEY_LIST_AT)
	} catch {
		// ignore
	}
}
