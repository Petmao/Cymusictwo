import Constants from 'expo-constants'
import { Platform, Vibration } from 'react-native'

import getOrCreateMMKV from '@/store/getOrCreateMMKV'

import { MAX_DEVICES } from './config'
import { requireClient } from './client'

const DB = 'appPersistStatus'
const KEY_DEVICE_ID = 'cloud.deviceKey'

export type CloudDevice = {
	id: string
	device_key: string
	name: string | null
	model: string | null
	os: string | null
	app_version: string | null
	created_at: string
	last_seen_at: string
	revoked_at: string | null
}

const randomKey = () => {
	const bytes = []
	for (let i = 0; i < 16; i++) bytes.push(Math.floor(Math.random() * 256))
	return bytes.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** 客户端稳定设备 id：存本地，卸载重装才会变 */
export const getDeviceKey = (): string => {
	const store = getOrCreateMMKV(DB)
	const existing = store.getString(KEY_DEVICE_ID)
	if (existing) return existing
	const created = `d_${Date.now().toString(36)}_${randomKey()}`
	store.set(KEY_DEVICE_ID, created)
	return created
}

export const getDeviceInfo = () => {
	const version = Constants.expoConfig?.version ?? '1.0.0'
	const name =
		Constants.deviceName ||
		(Platform.OS === 'ios' ? 'iPhone' : 'Android') ||
		'未知设备'
	let model = name
	if (Platform.OS === 'ios') {
		// RN 没暴露机型代号，这里用设备名 + 系统版本近似
		model = name
	} else {
		const anyPlatform = Platform as any
		model = anyPlatform.constants?.Model ?? anyPlatform.constants?.Brand ?? name
	}
	return {
		name,
		model,
		os: `${Platform.OS === 'ios' ? 'iOS' : 'Android'} ${String(Platform.Version)}`,
		appVersion: version,
	}
}

/** 登录后 / 开 App 时登记一次，顺带做心跳 */
export const registerCurrentDevice = async (): Promise<CloudDevice | null> => {
	const client = requireClient()
	const info = getDeviceInfo()
	const { data, error } = await client.rpc('register_device', {
		p_device_key: getDeviceKey(),
		p_name: info.name,
		p_model: info.model,
		p_os: info.os,
		p_app_version: info.appVersion,
	})
	if (error) throw new Error(error.message)
	return (data as CloudDevice) ?? null
}

export const listDevices = async (): Promise<CloudDevice[]> => {
	const client = requireClient()
	const { data, error } = await client
		.from('devices')
		.select('*')
		.order('last_seen_at', { ascending: false })
	if (error) throw new Error(error.message)
	return (data ?? []) as CloudDevice[]
}

export const revokeDevice = async (deviceKey: string) => {
	const client = requireClient()
	const { error } = await client.rpc('revoke_device', { p_device_key: deviceKey })
	if (error) throw new Error(error.message)
}

export const maxDevices = MAX_DEVICES

/** 撤销当前设备时给一下震动反馈，避免误触后毫无感觉 */
export const tapFeedback = () => {
	try {
		Vibration.vibrate(8)
	} catch {
		// 忽略
	}
}
