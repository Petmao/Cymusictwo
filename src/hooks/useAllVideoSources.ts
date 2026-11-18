import { fetchRemoteVideoSources, RemoteVideoSource } from '@/cloud/remoteConfig'
import { getVideoSources, useVideoSources, VideoSource } from '@/store/videoSources'
import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState } from 'react-native'

export type PlayableVideo = VideoSource & { remote?: boolean }

/**
 * 可播放列表 = 后台下发的源 + 用户自己在「我的 – 设置 – 视频源」里加的源。
 *
 * 三个刷新时机，保证后台改完不用重启 App：
 * 1. 页面获得焦点（从设置页加完源回来立刻能看到）
 * 2. 回到前台（AppState 变 active）
 * 3. 首次挂载
 * 本地源直接从 MMKV 重读，避免监听器被别的写入路径绕过。
 */
export const useAllVideoSources = () => {
	const watched = useVideoSources()
	const [local, setLocal] = useState<VideoSource[]>(() => getVideoSources())
	const [remote, setRemote] = useState<RemoteVideoSource[]>([])
	const [loading, setLoading] = useState(true)
	const mounted = useRef(true)

	useEffect(() => {
		mounted.current = true
		return () => {
			mounted.current = false
		}
	}, [])

	// MMKV 监听到的变化
	useEffect(() => {
		setLocal(watched)
	}, [watched])

	const pullRemote = useCallback((force: boolean) => {
		fetchRemoteVideoSources(force)
			.then((items) => {
				if (mounted.current) setRemote(items)
			})
			.catch(() => undefined)
			.finally(() => {
				if (mounted.current) setLoading(false)
			})
	}, [])

	const refresh = useCallback(() => {
		setLocal(getVideoSources())
		pullRemote(true)
	}, [pullRemote])

	// 页面获得焦点时刷新
	useFocusEffect(
		useCallback(() => {
			setLocal(getVideoSources())
			pullRemote(false)
		}, [pullRemote]),
	)

	// 回到前台时强制刷新（后台改配置后立刻生效）
	useEffect(() => {
		const sub = AppState.addEventListener('change', (state) => {
			if (state === 'active') refresh()
		})
		return () => sub.remove()
	}, [refresh])

	const list = useMemo<PlayableVideo[]>(() => {
		const seen = new Set<string>()
		const merged: PlayableVideo[] = []
		remote.forEach((item) => {
			if (!item.url || seen.has(item.url)) return
			seen.add(item.url)
			merged.push({ id: item.id, title: item.title, url: item.url, createdAt: 0, remote: true })
		})
		local.forEach((item) => {
			if (seen.has(item.url)) return
			seen.add(item.url)
			merged.push({ ...item, remote: false })
		})
		return merged
	}, [local, remote])

	return { list, loading, refresh }
}
