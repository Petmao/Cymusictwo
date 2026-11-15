import { EventEmitter, requireOptionalNativeModule } from 'expo-modules-core'

/**
 * LX / CyMusic JS 音源运行时（JavaScriptCore）。
 * 原生实现见 modules/cymusic-native/ios/CyMusicUserApiRuntime.m，
 * Expo 模块名固定为 UserApiModule。
 *
 * 注意：SDK 50 的 expo-modules-core 1.11 里，JSI 模块对象本身**没有** addListener，
 * 必须走 `new EventEmitter(module)`（expo-file-system 16 也是这么接事件的）。
 * 直接调 module.addListener 会得到 `undefined is not a function`。
 */

type ApiActionEvent = {
	generation: string
	action: string
	data?: string | Record<string, any>
	type?: string
	log?: string
}

type UserApiNativeModule = {
	__expo_module_name__?: string
	loadScript(info: Record<string, string>): string
	sendAction(action: string, info: string, generation: string): void
	destroy(): string
}

const NativeUserApi = requireOptionalNativeModule<UserApiNativeModule>('UserApiModule')

let emitter: EventEmitter | null = null
let emitterFailed = false
let loadScriptInfo: LX.UserApi.UserApiInfo | null = null
let generation: string | null = null

const getEmitter = (): EventEmitter | null => {
	if (emitter) return emitter
	if (!NativeUserApi || emitterFailed) return null
	if (typeof EventEmitter !== 'function') {
		emitterFailed = true
		return null
	}
	try {
		emitter = new EventEmitter(NativeUserApi as any)
	} catch {
		emitterFailed = true
		return null
	}
	return emitter
}

/** 运行时缺失 / 事件通道起不来时，上层可以直接给出人话提示 */
export const isUserApiRuntimeAvailable = Boolean(NativeUserApi)

export const loadScript = (
	info: LX.UserApi.UserApiInfo & { script: string; allowShowUpdateAlert?: boolean },
	_onDispose?: () => void,
): void => {
	if (!NativeUserApi) {
		throw new Error('当前版本没有内置 LX 脚本运行时，请改用「添加 API 音源」')
	}
	if (!getEmitter()) {
		throw new Error('音源运行时的事件通道没有建立起来，请重装应用后再试')
	}
	loadScriptInfo = info
	const result = NativeUserApi.loadScript({
		id: info.id ?? '',
		name: info.name ?? '',
		description: info.description ?? '',
		version: info.version ?? '',
		author: info.author ?? '',
		homepage: info.homepage ?? '',
		script: info.script,
	})
	// 正常情况下原生回一个 UUID；万一拿不到同步返回值，就退化成「不过滤世代」
	generation = typeof result === 'string' && result.length > 0 ? result : null
}

export interface SendResponseParams {
	requestKey: string
	error: string | null
	response: {
		statusCode: number
		statusMessage: string
		headers: Record<string, string>
		body: any
	} | null
}
export interface SendActions {
	request: LX.UserApi.UserApiRequestParams
	response: SendResponseParams
}
export const sendAction = <T extends keyof SendActions>(action: T, data: SendActions[T]) => {
	if (!NativeUserApi) return
	NativeUserApi.sendAction(action, JSON.stringify(data), generation ?? '')
}

export interface InitParams {
	status: boolean
	errorMessage: string
	info: LX.UserApi.UserApiInfo
}

export interface ResponseParams {
	status: boolean
	errorMessage?: string
	requestKey: string
	result: any
}
export interface UpdateInfoParams {
	name: string
	log: string
	updateUrl: string
}
export interface RequestParams {
	requestKey: string
	parentRequestKey?: string
	requestType?: 'current' | 'preload'
	url: string
	options: {
		method: string
		data?: any
		body?: any
		form?: Record<string, any>
		formData?: any
		timeout: number
		headers: any
		binary: boolean
	}
}
export type CancelRequestParams = string

export interface Actions {
	init: InitParams
	request: RequestParams
	cancelRequest: CancelRequestParams
	response: ResponseParams
	showUpdateAlert: UpdateInfoParams
	log: string
}
export type ActionsEvent = { [K in keyof Actions]: { action: K; data: Actions[K] } }[keyof Actions]

export const onScriptAction = (handler: (event: ActionsEvent) => void): (() => void) => {
	const currentEmitter = getEmitter()
	if (!currentEmitter) {
		return () => {}
	}

	const subscription = currentEmitter.addListener<ApiActionEvent>('api-action', (rawEvent) => {
		if (!rawEvent) return
		const { generation: eventGeneration, ...payload } = rawEvent
		// 换源后旧脚本的滞留事件直接丢掉（世代未知时放宽，避免整条链路哑掉）
		if (generation && eventGeneration && eventGeneration !== generation) return

		const event: { action: string; data?: any; type?: string; log?: string } = { ...payload }
		if (event.data && typeof event.data === 'string') {
			try {
				event.data = JSON.parse(event.data)
			} catch {
				// 非 JSON 的日志类事件按原文透传
			}
		}
		if (event.action == 'init') {
			if (event.data?.info) event.data.info = { ...loadScriptInfo, ...event.data.info }
			else if (event.data) event.data.info = { ...loadScriptInfo }
		} else if (event.action == 'showUpdateAlert') {
			if (!loadScriptInfo?.allowShowUpdateAlert) return
		}
		handler(event as ActionsEvent)
	})

	return () => {
		subscription.remove()
	}
}

export const destroy = () => {
	if (!NativeUserApi) return
	generation = null
	loadScriptInfo = null
	NativeUserApi.destroy()
}
