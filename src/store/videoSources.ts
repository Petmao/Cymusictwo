import getOrCreateMMKV from '@/store/getOrCreateMMKV'
import { useEffect, useState } from 'react'

export type VideoSource = {
	id: string
	title: string
	url: string
	createdAt: number
}

const STORE_ID = 'appPersistStatus'
const KEY = 'video.sources'

const read = (): VideoSource[] => {
	try {
		const raw = getOrCreateMMKV(STORE_ID).getString(KEY)
		const list = raw ? (JSON.parse(raw) as VideoSource[]) : []
		return Array.isArray(list) ? list.filter((item) => item && item.url) : []
	} catch {
		return []
	}
}

const write = (list: VideoSource[]) => {
	getOrCreateMMKV(STORE_ID).set(KEY, JSON.stringify(list))
}

export const getVideoSources = read

export const addVideoSource = (input: { title?: string; url: string }) => {
	const url = input.url.trim()
	if (!/^https?:\/\//i.test(url)) {
		throw new Error('视频地址需要以 http:// 或 https:// 开头')
	}
	const list = read()
	if (list.some((item) => item.url === url)) {
		throw new Error('这条地址已经添加过了')
	}
	const next: VideoSource[] = [
		{
			id: `v-${Date.now()}`,
			title: (input.title ?? '').trim() || url.split('/').pop()?.split('?')[0] || '未命名视频',
			url,
			createdAt: Date.now(),
		},
		...list,
	]
	write(next)
	return next
}

export const removeVideoSource = (id: string) => {
	const next = read().filter((item) => item.id !== id)
	write(next)
	return next
}

/** 常见直链后缀判断：地址不像视频就不进播放器，直接给「不可播」那一屏 */
export const looksLikeVideoUrl = (url: string) => {
	const clean = url.split('?')[0].toLowerCase()
	if (/\.(mp4|m4v|mov|m3u8|webm)$/.test(clean)) return true
	return /m3u8|\.mp4|video/i.test(url)
}

export const useVideoSources = () => {
	const [list, setList] = useState<VideoSource[]>(() => read())

	useEffect(() => {
		const store = getOrCreateMMKV(STORE_ID)
		const sub = store.addOnValueChangedListener((key) => {
			if (key === KEY) setList(read())
		})
		return () => sub.remove()
	}, [])

	return list
}
