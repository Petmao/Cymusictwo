import { logError, logInfo } from '@/helpers/logger'

/**
 * 「API 音源」：只需要一个接口基地址即可取链，不依赖任何脚本运行时。
 *
 * 约定的接口（都能用查询参数覆盖，返回 JSON 或纯文本都可以）：
 *   GET {base}/url?id=<songmid>&quality=<128k|320k|flac>&name=<歌名>&artist=<歌手>
 *   GET {base}/song/url?id=...          （/url 404 时自动回退）
 *   GET {base}/music/url?id=...         （再回退一层）
 *
 * 返回体支持这些形态，任意一种都能取到链接：
 *   "https://cdn/xxx.mp3"
 *   { "url": "https://..." }
 *   { "data": "https://..." }  /  { "data": { "url": "..." } }
 *   { "result": "..." }        /  { "result": { "url": "..." } }
 *   { "link": "..." }
 */

const URL_PATHS = ['/url', '/song/url', '/music/url']

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
		record.url,
		record.link,
		record.src,
		record.data,
		record.result,
		record.data?.url,
		record.data?.link,
		record.result?.url,
		record.result?.link,
	]
	for (const candidate of candidates) {
		if (typeof candidate === 'string' && /^https?:\/\//i.test(candidate)) return candidate
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

export const createHttpApiSource = (baseUrl: string, displayName?: string): IMusic.MusicApi => {
	const base = trimSlash(baseUrl.trim())
	const name = displayName?.trim() || base.replace(/^https?:\/\//i, '').slice(0, 32)

	const getMusicUrl = async (
		songname: string,
		artist: string,
		songmid: string,
		quality: string,
		context?: { timeoutMs?: number },
	): Promise<string> => {
		const timeoutMs = context?.timeoutMs ?? 12000
		let lastError = ''

		for (const path of URL_PATHS) {
			const target = buildUrl(base, path, {
				id: songmid,
				mid: songmid,
				songmid,
				quality,
				name: songname,
				artist,
			})
			const controller = new AbortController()
			const timer = setTimeout(() => controller.abort(), timeoutMs)
			try {
				const response = await fetch(target, {
					headers: { Accept: 'application/json, text/plain, */*' },
					signal: controller.signal,
				})
				if (!response.ok) {
					lastError = `HTTP ${response.status} @${path}`
					continue
				}
				const text = await response.text()
				const url = pickUrl(text)
				if (url) {
					logInfo(`[httpApi] ${path} 命中: ${url}`)
					return url
				}
				lastError = `${path} 返回里没有可用链接`
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error)
				lastError = `${path} 请求失败: ${message}`
			} finally {
				clearTimeout(timer)
			}
		}

		logError('[httpApi] 取链失败:', lastError)
		throw new Error(lastError || 'API 音源没有返回可用链接')
	}

	return {
		id: `http_api_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
		platform: 'api',
		author: '',
		name,
		version: '1.0',
		srcUrl: base,
		script: '',
		scriptType: 'http-api',
		isSelected: false,
		getMusicUrl,
	} as unknown as IMusic.MusicApi
}
