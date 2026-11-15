import { adaptLxMusicScript, isLxMusicScript } from './lxMusicSourceAdapter'

interface ModuleExports {
	id?: string
	author?: string
	name?: string
	version?: string
	srcUrl?: string
	getMusicUrl?: (
		songname: string,
		artist: string,
		songmid: string,
		quality: string,
	) => Promise<string>
	default?: ModuleExports
}

const stripBom = (text: string) => (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text)

const randomId = () =>
	`source_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`

export async function createMusicApiFromScript(rawScript: string): Promise<IMusic.MusicApi> {
	const script = stripBom(rawScript ?? '').trim()
	if (!script) {
		throw new Error('音源脚本为空')
	}

	if (isLxMusicScript(script)) {
		try {
			return await adaptLxMusicScript(script)
		} catch (lxError) {
			// 同时带 CommonJS 形态的脚本，退回普通解析再试一次
			if (!/module\s*\.\s*exports\s*\.\s*getMusicUrl/.test(script)) {
				const message = lxError instanceof Error ? lxError.message : String(lxError)
				throw new Error(`LX 音源解析失败：${message}`)
			}
		}
	}

	const module: { exports: ModuleExports } = { exports: {} }
	const require = () => ({})
	try {
		const moduleFunc = new Function('module', 'exports', 'require', script)
		moduleFunc(module, module.exports, require)
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		throw new Error(`脚本执行失败：${message}`)
	}

	// 兼容 module.exports = {...} 与 export default {...} 两种写法
	const exported: ModuleExports =
		typeof module.exports?.getMusicUrl === 'function'
			? module.exports
			: module.exports?.default && typeof module.exports.default.getMusicUrl === 'function'
				? module.exports.default
				: module.exports

	if (typeof exported?.getMusicUrl !== 'function') {
		throw new Error('脚本里没有找到 getMusicUrl，请确认为屿声音乐或 LX Music 音源')
	}

	return {
		id: exported.id || randomId(),
		platform: 'tx',
		author: exported.author || '',
		name: exported.name || '',
		version: exported.version || '',
		srcUrl: exported.srcUrl || '',
		script,
		scriptType: 'cymusic',
		isSelected: false,
		getMusicUrl: exported.getMusicUrl,
	}
}

export async function fetchScriptFromUrl(url: string): Promise<string> {
	const target = url?.trim?.()
	if (!target) {
		throw new Error('链接为空')
	}

	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), 20000)
	try {
		const response = await fetch(target, {
			signal: controller.signal,
			headers: { Accept: 'text/plain, application/javascript, */*' },
		})
		if (!response.ok) {
			throw new Error(`下载失败：HTTP ${response.status}`)
		}
		const text = stripBom(await response.text())
		if (!text.trim()) {
			throw new Error('下载到的脚本是空的')
		}
		return text
	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			throw new Error('下载超时（20 秒），换个链接试试')
		}
		throw error
	} finally {
		clearTimeout(timer)
	}
}

export function looksLikeScriptText(text?: string | null): boolean {
	if (!text) return false
	const normalized = text.trim()
	return (
		/module\s*\.\s*exports\s*\.\s*getMusicUrl/.test(normalized) ||
		isLxMusicScript(normalized)
	)
}
