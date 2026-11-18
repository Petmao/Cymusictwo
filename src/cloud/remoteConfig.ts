import { ensureCloudClient } from './client'

/**
 * 后台下发的视频源。
 *
 * 存在 app_config 表里，约定 id = 'video_sources'，cfg 可以是
 *   [{ "title": "xxx", "url": "https://...mp4" }]
 * 或者
 *   { "items": [ ...同上 ] }
 * 两种写法都兼容，写得不对就当没有，绝不影响本地源。
 *
 * 读不到（没网 / RLS 拦住 / 表是空的）就返回空数组，页面只显示本地源。
 */
export type RemoteVideoSource = {
	id: string
	title: string
	url: string
	/** 后台下发的标记，页面上会打「云端」角标，且不允许在本地删除 */
	remote: true
}

const CACHE_TTL = 5 * 60 * 1000
let cache: { at: number; items: RemoteVideoSource[] } | null = null

const pickArray = (cfg: unknown): any[] => {
	if (Array.isArray(cfg)) return cfg
	if (cfg && typeof cfg === 'object') {
		const obj = cfg as Record<string, unknown>
		for (const key of ['items', 'sources', 'list', 'videos']) {
			const value = obj[key]
			if (Array.isArray(value)) return value
		}
	}
	return []
}

const normalize = (cfg: unknown): RemoteVideoSource[] => {
	const rows = pickArray(cfg)
	const out: RemoteVideoSource[] = []
	rows.forEach((row, index) => {
		if (!row) return
		if (typeof row === 'string') {
			const url = row.trim()
			if (!/^https?:\/\//i.test(url)) return
			out.push({ id: `r-${index}`, title: url.split('/').pop() ?? '视频', url, remote: true })
			return
		}
		const url = String((row as any).url ?? '').trim()
		if (!/^https?:\/\//i.test(url)) return
		const title = String((row as any).title ?? (row as any).name ?? '').trim()
		out.push({
			id: `r-${index}`,
			title: title || url.split('/').pop()?.split('?')[0] || '视频',
			url,
			remote: true,
		})
	})
	return out
}

export const fetchRemoteVideoSources = async (force = false): Promise<RemoteVideoSource[]> => {
	if (!force && cache && Date.now() - cache.at < CACHE_TTL) return cache.items
	try {
		const client = ensureCloudClient()
		if (!client) return []
		const { data, error } = await client
			.from('app_config')
			.select('cfg')
			.eq('id', 'video_sources')
			.limit(1)
		if (error) return []
		const items = normalize((data?.[0] as any)?.cfg)
		cache = { at: Date.now(), items }
		return items
	} catch {
		return []
	}
}

export const clearRemoteVideoSourceCache = () => {
	cache = null
}
