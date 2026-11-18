import { PlayableVideo, useAllVideoSources } from '@/hooks/useAllVideoSources'
import { Ionicons } from '@expo/vector-icons'
import { AVPlaybackStatus, ResizeMode, Video } from 'expo-av'
import { router, useLocalSearchParams } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/**
 * 纯全屏视频：上滑下一条、下滑上一条、单击暂停/继续。
 *
 * 手势用捕获阶段拿：Video 是原生视图，普通 responder 会被它先吃掉。
 *
 * 「只有一个源也能上下滑」：接口型地址（不带 .mp4/.m3u8 后缀）每次请求返回的视频不同，
 * 所以滑到底时给同一地址加时间戳再要一次，等于无限流；静态直链不重复请求。
 */
const isDirectFile = (url: string) => /\.(mp4|m4v|mov|m3u8|webm)(\?|$)/i.test(url)

const withFreshParam = (url: string) => {
	if (isDirectFile(url)) return url
	const sep = url.includes('?') ? '&' : '?'
	return `${url}${sep}_t=${Date.now()}`
}

const VideoPlayerScreen = () => {
	const params = useLocalSearchParams<{ id?: string }>()
	const insets = useSafeAreaInsets()
	const { list: sources, loading } = useAllVideoSources()

	// 滑到底时「现拉一条」的条目放这里，和真实源拼成播放列表
	const [extra, setExtra] = useState<PlayableVideo[]>([])
	const feedSeq = useRef(0)

	const list = useMemo<PlayableVideo[]>(() => [...sources, ...extra], [sources, extra])

	const initialIndex = useMemo(() => {
		const index = sources.findIndex((item) => item.id === params.id)
		return index >= 0 ? index : 0
	}, [params.id, sources])

	const [index, setIndex] = useState(initialIndex)
	const [paused, setPaused] = useState(false)
	const [failed, setFailed] = useState(false)
	const videoRef = useRef<Video | null>(null)
	const offset = useRef(new Animated.Value(0)).current
	const listRef = useRef<PlayableVideo[]>(list)
	const indexRef = useRef(index)

	useEffect(() => {
		listRef.current = list
	}, [list])

	useEffect(() => {
		indexRef.current = index
	}, [index])

	const current = list[index]

	const switchTo = useCallback((delta: number) => {
		const items = listRef.current
		if (items.length === 0) return
		const next = indexRef.current + delta
		if (next >= 0 && next < items.length) {
			setFailed(false)
			setPaused(false)
			setIndex(next)
			return
		}
		// 往下滑到底：接口型地址再要一条
		if (delta > 0) {
			const base = items[items.length - 1]
			if (!base || isDirectFile(base.url)) return
			feedSeq.current += 1
			const fresh: PlayableVideo = {
				...base,
				id: `${base.id}-live-${feedSeq.current}`,
				url: withFreshParam(base.url),
			}
			listRef.current = [...items, fresh]
			setExtra((prev) => [...prev, fresh])
			setFailed(false)
			setPaused(false)
			setIndex(items.length)
		}
	}, [])

	const panResponder = useMemo(
		() =>
			PanResponder.create({
				onStartShouldSetPanResponderCapture: () => false,
				onMoveShouldSetPanResponderCapture: (_event, gesture) =>
					Math.abs(gesture.dy) > 10 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
				onPanResponderMove: (_event, gesture) => {
					offset.setValue(gesture.dy * 0.35)
				},
				onPanResponderTerminationRequest: () => false,
				onPanResponderRelease: (_event, gesture) => {
					const threshold = 50
					if (gesture.dy < -threshold) {
						Animated.timing(offset, {
							toValue: -140,
							duration: 150,
							useNativeDriver: true,
						}).start(() => {
							offset.setValue(0)
							switchTo(1)
						})
						return
					}
					if (gesture.dy > threshold) {
						Animated.timing(offset, {
							toValue: 140,
							duration: 150,
							useNativeDriver: true,
						}).start(() => {
							offset.setValue(0)
							switchTo(-1)
						})
						return
					}
					Animated.timing(offset, {
						toValue: 0,
						duration: 180,
						useNativeDriver: true,
					}).start()
				},
			}),
		[offset, switchTo],
	)

	const handlePress = useCallback(async () => {
		const video = videoRef.current
		if (!video) return
		try {
			if (paused) {
				await video.playAsync()
				setPaused(false)
			} else {
				await video.pauseAsync()
				setPaused(true)
			}
		} catch {
			// 播放器还没准备好，忽略
		}
	}, [paused])

	const handleStatus = useCallback((status: AVPlaybackStatus) => {
		if (!status.isLoaded) return
	}, [])

	useEffect(
		() => () => {
			videoRef.current?.unloadAsync().catch(() => undefined)
		},
		[],
	)

	useEffect(() => {
		// 还在拉云端源时 sources 必然是空的，这时候直接 back 会把用户弹出去
		if (loading) return
		if (!current && list.length === 0) {
			router.back()
		}
	}, [current, list.length, loading])

	return (
		<View style={styles.root}>
			<StatusBar hidden />
			<Animated.View
				style={[StyleSheet.absoluteFill, { transform: [{ translateY: offset }] }]}
				{...panResponder.panHandlers}
			>
				{current && !failed ? (
					<Video
						key={current.id}
						ref={videoRef}
						source={{ uri: current.url }}
						style={StyleSheet.absoluteFill}
						resizeMode={ResizeMode.COVER}
						shouldPlay
						isLooping
						isMuted={false}
						progressUpdateIntervalMillis={1000}
						onPlaybackStatusUpdate={handleStatus}
						onError={() => setFailed(true)}
					/>
				) : (
					<View style={styles.fallback}>
						<Ionicons name="videocam-outline" size={46} color="rgba(255,255,255,0.4)" />
						<Text style={styles.fallbackTitle} numberOfLines={1}>
							{current?.title ?? '视频'}
						</Text>
						<Text style={styles.fallbackHint}>这条地址不是可播视频</Text>
					</View>
				)}

				{/* 透明层接单击：播放/暂停 */}
				<Pressable style={StyleSheet.absoluteFill} onPress={handlePress} />

				{/* 返回：之前没有出口，进了视频就退不出去 */}
				<Pressable style={[styles.backBtn, { top: insets.top + 8 }]} onPress={() => router.back()}>
					<Ionicons name="chevron-down" size={22} color="rgba(255,255,255,0.92)" />
				</Pressable>

				{current ? (
					<View style={styles.caption} pointerEvents="none">
						<Text style={styles.captionText} numberOfLines={1}>
							{current.title}
						</Text>
						<Text style={styles.captionIndex}>
							{index + 1} / {list.length}
							{list.length > sources.length ? '+' : ''}
						</Text>
					</View>
				) : null}
			</Animated.View>
		</View>
	)
}

export default VideoPlayerScreen

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: '#000000',
	},
	fallback: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#000000',
		paddingHorizontal: 32,
	},
	fallbackTitle: {
		marginTop: 10,
		fontSize: 13,
		color: 'rgba(255,255,255,0.8)',
	},
	fallbackHint: {
		marginTop: 10,
		fontSize: 10.5,
		color: 'rgba(255,255,255,0.35)',
	},
	backBtn: {
		position: 'absolute',
		left: 14,
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'rgba(0,0,0,0.32)',
	},
	caption: {
		position: 'absolute',
		left: 18,
		right: 18,
		bottom: 34,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	captionText: {
		flex: 1,
		marginRight: 12,
		fontSize: 13,
		fontWeight: '600',
		color: 'rgba(255,255,255,0.88)',
	},
	captionIndex: {
		fontSize: 11,
		color: 'rgba(255,255,255,0.45)',
	},
})
