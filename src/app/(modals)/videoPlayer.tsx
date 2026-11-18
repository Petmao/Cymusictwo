import { useAllVideoSources } from '@/hooks/useAllVideoSources'
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
 * 手势必须是「捕获阶段」拿：Video 是原生视图，普通 onMoveShouldSetPanResponder
 * 会被它先吃掉，表现就是怎么滑都不切视频。所以用 onMoveShouldSetPanResponderCapture，
 * 再用一层透明 Pressable 接单击。
 */
const VideoPlayerScreen = () => {
	const params = useLocalSearchParams<{ id?: string }>()
	const insets = useSafeAreaInsets()
	const { list: sources, loading } = useAllVideoSources()

	const initialIndex = useMemo(() => {
		const index = sources.findIndex((item) => item.id === params.id)
		return index >= 0 ? index : 0
	}, [params.id, sources])

	const [index, setIndex] = useState(initialIndex)
	const [paused, setPaused] = useState(false)
	const [failed, setFailed] = useState(false)
	const videoRef = useRef<Video | null>(null)
	const offset = useRef(new Animated.Value(0)).current
	const sourcesRef = useRef(sources)
	const indexRef = useRef(index)

	useEffect(() => {
		sourcesRef.current = sources
	}, [sources])

	useEffect(() => {
		indexRef.current = index
	}, [index])

	const switchTo = useCallback((delta: number) => {
		const total = sourcesRef.current.length
		if (total <= 1) return
		const next = (indexRef.current + delta + total) % total
		setFailed(false)
		setPaused(false)
		setIndex(next)
	}, [])

	const panResponder = useMemo(
		() =>
			PanResponder.create({
				// 捕获阶段，先于 Video 原生视图拿到手势
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

	const current = sources[index]

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
		// 还在拉云端源的时候 sources 必然是空的，这时候直接 back 会把用户弹出去
		if (loading) return
		if (!current && sources.length === 0) {
			router.back()
		}
	}, [current, sources.length, loading])

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
						{sources.length > 1 ? (
							<Text style={styles.captionIndex}>
								{index + 1} / {sources.length}
							</Text>
						) : null}
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
