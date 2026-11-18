import { fetchRemoteVideoSources, RemoteVideoSource } from '@/cloud/remoteConfig'
import { useVideoSources, VideoSource } from '@/store/videoSources'
import { useEffect, useMemo, useState } from 'react'

export type PlayableVideo = VideoSource & { remote?: boolean }

/**
 * 可播放列表 = 后台下发的源 + 用户自己在「我的 – 设置 – 视频源」里加的源。
 * 后台源排在前面，本地源在后；同一个 url 只留一条（后台优先）。
 */
export const useAllVideoSources = () => {
	const local = useVideoSources()
	const [remote, setRemote] = useState<RemoteVideoSource[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		let alive = true
		fetchRemoteVideoSources()
			.then((items) => {
				if (alive) setRemote(items)
			})
			.catch(() => undefined)
			.finally(() => {
				if (alive) setLoading(false)
			})
		return () => {
			alive = false
		}
	}, [])

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

	return { list, loading }
}
