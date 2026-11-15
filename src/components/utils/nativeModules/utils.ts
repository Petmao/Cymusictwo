import { AppState, NativeEventEmitter, NativeModules } from 'react-native'

/**
 * 1.2.0 基线里并没有随包提供 UtilsModule 原生模块，
 * 这里统一做空实现兜底，避免 NativeModules 取到 undefined 时在模块加载阶段就崩掉。
 */
const NativeUtils = (NativeModules as any).UtilsModule as any

const fallback = {
	exitApp: () => {},
	screenkeepAwake: () => {},
	screenUnkeepAwake: () => {},
	getDeviceName: async () => 'iPhone',
	isNotificationsEnabled: async () => false,
	openNotificationPermissionActivity: async () => true,
	shareText: async () => {},
	getSystemLocales: async () => 'en',
	getWindowSize: async () => ({ width: 375, height: 812 }),
	listenWindowSizeChanged: () => {},
	isIgnoringBatteryOptimization: async () => true,
	requestIgnoreBatteryOptimization: async () => false,
}

const UtilsModule = new Proxy(fallback as Record<string, any>, {
	get(target, prop: string) {
		if (NativeUtils && typeof NativeUtils[prop] === 'function') {
			return NativeUtils[prop].bind(NativeUtils)
		}
		if (prop in target) {
			return target[prop]
		}
		return () => undefined
	},
})

export const exitApp = () => UtilsModule.exitApp?.()

// export const installApk = (filePath: string, fileProviderAuthority: string) => UtilsModule.installApk(filePath, fileProviderAuthority)
//

export const screenkeepAwake = () => {
	if (global.lx?.isScreenKeepAwake) return
	global.lx.isScreenKeepAwake = true
	UtilsModule.screenkeepAwake()
}
export const screenUnkeepAwake = () => {
	// console.log('screenUnkeepAwake')
	if (!global.lx?.isScreenKeepAwake) return
	global.lx.isScreenKeepAwake = false
	UtilsModule.screenUnkeepAwake()
}

export const getDeviceName = async (): Promise<string> => {
	return UtilsModule.getDeviceName().then((deviceName: string) => deviceName || 'Unknown')
}

export const isNotificationsEnabled = UtilsModule.isNotificationsEnabled as () => Promise<boolean>

export const requestNotificationPermission = async () =>
	new Promise<boolean>((resolve) => {
		let subscription = AppState.addEventListener('change', (state) => {
			if (state != 'active') return
			subscription.remove()
			setTimeout(() => {
				void isNotificationsEnabled().then(resolve)
			}, 1000)
		})
		UtilsModule.openNotificationPermissionActivity().then((result: boolean) => {
			if (result) return
			subscription.remove()
			resolve(false)
		})
	})

export const shareText = async (shareTitle: string, title: string, text: string): Promise<void> => {
	UtilsModule.shareText(shareTitle, title, text)
}

export const getSystemLocales = async (): Promise<string> => {
	return UtilsModule.getSystemLocales()
}

export const onScreenStateChange = (handler: (state: 'ON' | 'OFF') => void): () => void => {
	if (!NativeUtils) return () => {}
	// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
	const eventEmitter = new NativeEventEmitter(NativeUtils)
	const eventListener = eventEmitter.addListener('screen-state', (event) => {
		handler(event.state as 'ON' | 'OFF')
	})

	return () => {
		eventListener.remove()
	}
}

export const getWindowSize = async (): Promise<{ width: number; height: number }> => {
	return UtilsModule.getWindowSize()
}

export const onWindowSizeChange = (
	handler: (size: { width: number; height: number }) => void,
): () => void => {
	if (!NativeUtils) return () => {}
	UtilsModule.listenWindowSizeChanged()
	// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
	const eventEmitter = new NativeEventEmitter(NativeUtils)
	const eventListener = eventEmitter.addListener('screen-size-changed', (event) => {
		handler(event as { width: number; height: number })
	})

	return () => {
		eventListener.remove()
	}
}

export const isIgnoringBatteryOptimization = async (): Promise<boolean> => {
	return UtilsModule.isIgnoringBatteryOptimization()
}

export const requestIgnoreBatteryOptimization = async () =>
	new Promise<boolean>((resolve) => {
		let subscription = AppState.addEventListener('change', (state) => {
			if (state != 'active') return
			subscription.remove()
			setTimeout(() => {
				void isIgnoringBatteryOptimization().then(resolve)
			}, 1000)
		})
		UtilsModule.requestIgnoreBatteryOptimization().then((result: boolean) => {
			if (result) return
			subscription.remove()
			resolve(false)
		})
	})
