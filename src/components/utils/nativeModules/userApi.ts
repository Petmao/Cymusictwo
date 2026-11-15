import { requireOptionalNativeModule } from 'expo'

/**
 * LX / CyMusic JS 音源运行时（JavaScriptCore）。
 * 原生实现见 modules/cymusic-native/ios/CyMusicUserApiRuntime.m，
 * Expo 模块名固定为 UserApiModule。
 */

type ApiActionEvent = {
	generation: string
	action: string
	data?: string
	type?: string
	log?: string
}

type UserApiNativeModule = {
	loadScript(info: Record<string, string>): string
	sendAction(action: string, info: string, generation: string): void
	destroy(): string
	addListener(
		event: 'api-action',
		listener: (event: ApiActionEvent) => void,
	): { remove(): void }
}

const NativeUserApi = requireOptionalNativeModule<UserApiNativeModule>('UserApiModule')

/** 运行时缺失时（比如不支持的构建）上层可以直接给出提示 */
export const isUserApiRuntimeAvailable = Boolean(NativeUserApi)

let loadScriptInfo: LX.UserApi.UserApiInfo | null = null
let generation: string | null = null

export const loadScript = (
	info: LX.UserApi.UserApiInfo & { script: string; allowShowUpdateAlert?: boolean },
	_onDispose?: () => void,
): void => {
	if (!NativeUserApi) {
		throw new Error('当前版本没有内置 LX 脚本运行时')
	}
	loadScriptInfo = info
	generation = NativeUserApi.loadScript({
		id: info.id ?? '',
		name: info.name ?? '',
		description: info.description ?? '',
		version: info.version ?? '',
		author: info.author ?? '',
		homepage: info.homepage ?? '',
		script: info.script,
	})
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
	if (!NativeUserApi || !generation) return
	NativeUserApi.sendAction(action, JSON.stringify(data), generation)
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
	if (!NativeUserApi) {
		return () => {}
	}
	const subscription = NativeUserApi.addListener('api-action', (rawEvent) => {
		const { generation: eventGeneration, ...payload } = rawEvent
		// 换源后旧脚本的滞留事件直接丢掉
		if (!generation || eventGeneration !== generation) return
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
