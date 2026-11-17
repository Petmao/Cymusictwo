import getOrCreateMMKV from '@/store/getOrCreateMMKV'

/**
 * 启动期致命错误的落盘记录。
 *
 * JS 线程在渲染前抛错时，release 包会直接 abort，用户只看到「点图标就退」。
 * 这里把最后几条错误同步写进 MMKV，下次启动可以在「设置 → 应用日志」里看到，
 * 不至于只能靠猜。
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

/** 记录一条致命错误。自身绝不能再抛错，否则就死循环了。 */
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
	} catch {
		// 落盘失败就只能放弃
	}
}

export const getFatalLog = readAll

export const clearFatalLog = () => {
	try {
		getOrCreateMMKV(STORE_ID).delete(KEY)
	} catch {
		// ignore
	}
}

/** 装一个全局兜底：先落盘，再交回 RN 原来的处理器 */
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
