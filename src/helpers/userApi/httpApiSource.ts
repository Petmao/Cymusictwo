import { logError, logInfo } from '@/helpers/logger'

/**
 * 「API 音源」：填一个接口地址就能取链，不依赖任何脚本运行时。
 *
 * 支持两种形态，按你填的地址自动判断：
 *
 * 1) 关键字型（例：https://api.irepo.cn/api/wxmusic?source=third&keyword=）
 *    GET {template}<urlencode("歌名 歌手")>
 *    返回一条记录，取 music_url / url / link 字段
 *
 * 2) 曲库型（例：https://api.example.com）
 *    GET {base}/url?id=<songmid>&quality=<128k|320k|flac>&name=<歌名>&artist=<歌手>
 *        ↳ 404 时回退 {base}/song/url → {base}/music/url
 *
 * 返回体支持：纯文本 URL、{url}、{music_url}、{link}、{data:{url|music_url}}、{result:{...}}
 */

const ID_PATHS = ['/url', '/song/url', '/music/url']
const CACHE_TTL_MS = 60_000

const trimSlash = (value: string) => value.replace(/\/+$/, '')

const pickUrl = (payload: unknown): string | null => {
	if (!payload) return null
	if (typeof payload === 'string') {
		const text = payload.trim()
		if (/^https?:\/\//i.test(text)) return text
		try {
			return pickUrl(JSON.parse(text))
		} catch {
			const matched = text.match(/https?:\/\/[^\s"']+/)
			return matched ? matched[0] : null
		}
	}
	if (typeof payload !== 'object') return null
	const record = payload as Record<string, any>
	const candidates = [
		record.music_url,
		record.url,
		record.link,
		record.src,
		record.data,
		record.result,
		record.data?.music_url,
		record.data?.url,
		record.data?.link,
		record.result?.music_url,
		record.result?.url,
		record.result?.link,
	]
	for (const candidate of candidates) {
		if (typeof candidate === 'string' && /^https?:\/\//i.test(candidate)) return candidate
		if (candidate && typeof candidate === 'object') {
			const nested = pickUrl(candidate)
			if (nested) return nested
		}
	}
	return null
}

const buildUrl = (
	base: string,
	path: string,
	params: Record<string, string | undefined>,
): string => {
	const query = Object.entries(params)
		.filter(([, value]) => value !== undefined && value !== null && `${value}` !== '')
		.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
		.join('&')
	return `${base}${path}${query ? `?${query}` : ''}`
}

/** 判断是不是「把关键字拼在地址后面」的接口 */
const isKeywordTemplate = (value: string) => /\{keyword\}/i.test(value) || /keyword=/i.test(value)

const fillKeywordTemplate = (template: string, keyword: string) => {
	const encoded = encodeURIComponent(keyword)
	if (/\{keyword\}/i.test(template)) return template.replace(/\{keyword\}/gi, encoded)
	if (/keyword=$/i.test(template)) return `${template}${encoded}`
	if (/keyword=/i.test(template)) return `${template}${encoded}`
	return `${template}${template.includes('?') ? '&' : '?'}keyword=${encoded}`
}

const fetchText = async (target: string, timeoutMs: number): Promise<string | null> => {
	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), timeoutMs)
	try {
		const response = await fetch(target, {
			headers: { Accept: 'application/json, text/plain, */*' },
			signal: controller.signal,
		})
		if (!response.ok) return null
		return await response.text()
	} catch {
		return null
	} finally {
		clearTimeout(timer)
	}
}

export const createHttpApiSource = (rawUrl: string, displayName?: string): IMusic.MusicApi => {
	const trimmed = rawUrl.trim()
	const keywordMode = isKeywordTemplate(trimmed)
	const base = keywordMode ? trimmed : trimSlash(trimmed)
	const name = displayName?.trim() || base.replace(/^https?:\/\//i, '').slice(0, 32)

	const cache = new Map<string, { url: string; at: number }>()

	const resolveByKeyword = async (
		songname: string,
		artist: string,
		timeoutMs: number,
	): Promise<string | null> => {
		const keyword = `${songname} ${artist}`.trim()
		const targets = [keyword, songname].filter(Boolean)
		for (const target of targets) {
			const payload = await fetchText(fillKeywordTemplate(base, target), timeoutMs)
			if (!payload) continue
			const url = pickUrl(payload)
			if (url) return url
		}
		return null
	}

	const resolveById = async (
		songname: string,
		artist: string,
		songmid: string,
		quality: string,
		timeoutMs: number,
	): Promise<string | null> => {
		for (const path of ID_PATHS) {
			const target = buildUrl(trimSlash(base), path, {
				id: songmid,
				mid: songmid,
				songmid,
				quality,
				name: songname,
				artist,
			})
			const payload = await fetchText(target, timeoutMs)
			if (!payload) continue
			const url = pickUrl(payload)
			if (url) return url
		}
		return null
	}

	const getMusicUrl = async (
		songname: string,
		artist: string,
		songmid: string,
		quality: string,
		context?: { timeoutMs?: number },
	): Promise<string> => {
		const timeoutMs = context?.timeoutMs ?? 12000
		const cacheKey = `${songname}|${artist}|${songmid}|${quality}`
		const hit = cache.get(cacheKey)
		if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
			return hit.url
		}

		let url: string | null = null
		if (keywordMode) {
			url = await resolveByKeyword(songname, artist, timeoutMs)
		}
		if (!url) {
			url = await resolveById(songname, artist, songmid, quality, timeoutMs)
		}
		if (!url) {
			url = await resolveByKeyword(songname, artist, timeoutMs)
		}

		if (!url) {
			logError('[httpApi] 取链失败:', `${songname} - ${artist}`)
			throw new Error('接口没有返回可用链接，检查地址格式或换一条音源')
		}

		logInfo(`[httpApi] 命中: ${songname} - ${artist}`)
		cache.set(cacheKey, { url, at: Date.now() })
		return url
	}

	return {
		id: `http_api_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
		platform: 'api',
		author: '',
		name,
		version: '1.0',
		srcUrl: base,
		script: keywordMode ? JSON.stringify({ keywordTemplate: base }) : '',
		scriptType: 'http-api',
		isSelected: false,
		getMusicUrl,
	} as unknown as IMusic.MusicApi
}
