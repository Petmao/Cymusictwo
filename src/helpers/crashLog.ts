import getOrCreateMMKV from '@/store/getOrCreateMMKV'

/**
 * 启动期诊断记录。
 *
 * 两个去处：
 * 1. MMKV —— App 能起来时，「设置 → 应用日志」直接看；
 * 2. Documents/boot.log —— App 直接崩掉时，用系统「文件」App
 *    （我的 iPhone → 屿声音乐）也能把原文导出来。
 *
 * 所有写入都是尽力而为，自身绝不能再抛错。
 */
const STORE_ID = 'crashLog'
const KEY = 'fatal.entries'
const LIMIT = 8

export type FatalEntry = {
	at: string
	where: string
	message: string
	stack?: string
}

const readAll = (): FatalEntry[] => {
	try {
		const raw = getOrCreateMMKV(STORE_ID).getString(KEY)
		if (!raw) return []
		const parsed = JSON.parse(raw)
		return Array.isArray(parsed) ? parsed : []
	} catch {
		return []
	}
}

const serialize = (error: unknown): { message: string; stack?: string } => {
	if (error instanceof Error) {
		return { message: error.message || String(error), stack: error.stack }
	}
	try {
		return { message: typeof error === 'string' ? error : JSON.stringify(error) }
	} catch {
		return { message: String(error) }
	}
}

// ---------- 文件镜像 ----------

let fileLines: string[] = []
let fileSeq = 0

/**
 * expo-file-system 用懒加载拿。
 * 万一原生模块没链上，这里返回 null，只是没有文件镜像，
 * 不能因为诊断工具自身把启动带崩。
 */
let fsModule: any = undefined
const fs = (): any => {
	if (fsModule !== undefined) return fsModule
	try {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		fsModule = require('expo-file-system')
	} catch {
		fsModule = null
	}
	return fsModule
}

const fileTarget = (): string | null => {
	try {
		const dir = fs()?.documentDirectory
		return dir ? `${dir}boot.log` : null
	} catch {
		return null
	}
}

const flushFile = (extra?: string) => {
	try {
		const target = fileTarget()
		if (!target) return
		const api = fs()
		if (!api?.writeAsStringAsync) return
		if (extra) fileLines.push(extra)
		if (fileLines.length > 400) fileLines = fileLines.slice(-400)
		const body = fileLines.join('\n')
		// 不 await：崩在下一行也要尽量把内容交给原生
		void api.writeAsStringAsync(target, body).catch(() => undefined)
	} catch {
		// ignore
	}
}

/** 启动轨迹：记录走到了哪一步，崩溃后能看出死在哪 */
export const breadcrumb = (stage: string) => {
	try {
		// 每次冷启动从 entry 开始写，先清掉上一轮的内容
		if (stage === 'entry') fileLines = []
		fileSeq += 1
		flushFile(`${new Date().toISOString()} #${fileSeq} ${stage}`)
	} catch {
		// ignore
	}
}

export const recordFatal = (error: unknown, where = 'boot') => {
	try {
		const { message, stack } = serialize(error)
		const entry: FatalEntry = {
			at: new Date().toISOString(),
			where,
			message: message.slice(0, 2000),
			stack: stack?.slice(0, 6000),
		}
		const next = [...readAll(), entry].slice(-LIMIT)
		getOrCreateMMKV(STORE_ID).set(KEY, JSON.stringify(next))
		flushFile(`!! FATAL [${where}] ${entry.message}\n${entry.stack ?? ''}`)
	} catch {
		// ignore
	}
}

export const getFatalLog = readAll

export const clearFatalLog = () => {
	try {
		getOrCreateMMKV(STORE_ID).delete(KEY)
	} catch {
		// ignore
	}
	try {
		const target = fileTarget()
		const api = fs()
		if (target && api?.deleteAsync) void api.deleteAsync(target, { idempotent: true }).catch(() => undefined)
	} catch {
		// ignore
	}
}

/** 装全局兜底：先落盘，再交回 RN 原处理器 */
export const installFatalHandler = () => {
	const g = global as any
	const utils = g.ErrorUtils
	if (!utils?.setGlobalHandler) return
	const previous = utils.getGlobalHandler?.()
	utils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
		recordFatal(error, isFatal ? 'js-fatal' : 'js-error')
		if (previous) previous(error, isFatal)
	})
}
