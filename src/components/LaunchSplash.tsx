import { resolveLaunchImage } from '@/cloud/launchImage'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Animated, ImageBackground, StyleSheet, View } from 'react-native'

/**
 * 启动图浮层。
 *
 * 每次冷启动从服务器 /img/ 里随机挑一张，压在最上层淡入，然后淡出。
 * 拿不到图 / 网络慢（超过 1.6s）就整个不显示，绝不拖启动。
 */
const RESOLVE_DEADLINE = 1600
const SHOW_DURATION = 1500

export const LaunchSplash = () => {
	const [uri, setUri] = useState<string | null>(null)
	const [mounted, setMounted] = useState(false)
	const opacity = useRef(new Animated.Value(0)).current
	const hidden = useRef(false)

	const hide = useCallback(() => {
		if (hidden.current) return
		hidden.current = true
		Animated.timing(opacity, {
			toValue: 0,
			duration: 280,
			useNativeDriver: true,
		}).start(() => setMounted(false))
	}, [opacity])

	useEffect(() => {
		let alive = true
		const startedAt = Date.now()

		resolveLaunchImage()
			.then((url) => {
				if (!alive || !url) return
				if (Date.now() - startedAt > RESOLVE_DEADLINE) return
				setUri(url)
				setMounted(true)
				Animated.timing(opacity, {
					toValue: 1,
					duration: 240,
					useNativeDriver: true,
				}).start()
				setTimeout(() => {
					if (alive) hide()
				}, SHOW_DURATION)
			})
			.catch(() => undefined)

		// 兜底：无论什么情况，3.5s 后一定撤掉，不能挡住主界面
		const guard = setTimeout(() => {
			if (alive) hide()
		}, 3500)

		return () => {
			alive = false
			clearTimeout(guard)
		}
	}, [hide, opacity])

	if (!mounted || !uri) return null

	return (
		<Animated.View style={[StyleSheet.absoluteFill, styles.layer, { opacity }]} pointerEvents="none">
			<View style={StyleSheet.absoluteFill}>
				<ImageBackground
					source={{ uri }}
					style={StyleSheet.absoluteFill}
					resizeMode="cover"
				/>
			</View>
		</Animated.View>
	)
}

const styles = StyleSheet.create({
	layer: {
		zIndex: 999,
		backgroundColor: '#07060C',
	},
})
