import { useVideoSources } from '@/store/videoSources'
import { Ionicons } from '@expo/vector-icons'
import { AVPlaybackStatus, ResizeMode, Video } from 'expo-av'
import { router, useLocalSearchParams } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native'

/**
 * 纯全屏视频：没有任何浮层。
 * 上滑下一条、下滑上一条、单击暂停/继续，位移带 0.35 阻尼，松手回弹。
 */
const VideoPlayerScreen = () => {
	const params = useLocalSearchParams<{ id?: string }>()
	const sources = useVideoSources()

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

	const switchTo = useCallback(
		(delta: number) => {
			const total = sourcesRef.current.length
			if (total <= 1) return
			const next = (indexRef.current + delta + total) % total
			setFailed(false)
			setPaused(false)
			setIndex(next)
		},
		[],
	)

	const panResponder = useMemo(
		() =>
			PanResponder.create({
				onMoveShouldSetPanResponder: (_event, gesture) =>
					Math.abs(gesture.dy) > 12 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
				onPanResponderMove: (_event, gesture) => {
					offset.setValue(gesture.dy * 0.35)
				},
				onPanResponderRelease: (_event, gesture) => {
					if (gesture.dy < -60) {
						Animated.timing(offset, {
							toValue: -120,
							duration: 160,
							useNativeDriver: true,
						}).start(() => {
							offset.setValue(0)
							switchTo(1)
						})
						return
					}
					if (gesture.dy > 60) {
						Animated.timing(offset, {
							toValue: 120,
							duration: 160,
							useNativeDriver: true,
						}).start(() => {
							offset.setValue(0)
							switchTo(-1)
						})
						return
					}
					Animated.timing(offset, {
						toValue: 0,
						duration: 200,
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
		if (paused) {
			await video.playAsync()
			setPaused(false)
		} else {
			await video.pauseAsync()
			setPaused(true)
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
		if (!current && sources.length === 0) {
			router.back()
		}
	}, [current, sources.length])

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
						onPress={handlePress}
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
})
