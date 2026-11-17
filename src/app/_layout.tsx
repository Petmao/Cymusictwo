import { useCloud } from '@/cloud'
import { playbackService } from '@/constants/playbackService'
import { AppThemeProvider, useAppTheme } from '@/hooks/useAppTheme'
import LyricManager from '@/helpers/lyricManager'
import { installFatalHandler, recordFatal } from '@/helpers/crashLog'
import { useLogTrackPlayerState } from '@/hooks/useLogTrackPlayerState'
import { useSetupTrackPlayer } from '@/hooks/useSetupTrackPlayer'
import i18n, { setI18nConfig } from '@/utils/i18n'
import { router, SplashScreen, Stack } from 'expo-router'
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent'
import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect, useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message'
import TrackPlayer from 'react-native-track-player'

// 尽量早地挂上兜底：JS 线程的致命错误先落盘再交给 RN 原处理器
installFatalHandler()

SplashScreen.preventAutoHideAsync()

TrackPlayer.registerPlaybackService(() => playbackService)
setI18nConfig()
const App = () => {
	const handleTrackPlayerLoaded = useCallback(() => {
		setTimeout(SplashScreen.hideAsync, 1500)
	}, [])

	useSetupTrackPlayer({
		onLoad: handleTrackPlayerLoaded, //播放器初始化后调用这个回调函数。这里先传过去。
	})

	useLogTrackPlayerState()

	// 云端会话恢复：没配置 Supabase 时内部直接返回，不会阻塞启动
	const bootstrapCloud = useCloud((state) => state.bootstrap)
	useEffect(() => {
		// 云端任何异常都不该把 App 带走，落盘后继续走本地功能
		bootstrapCloud().catch((error) => recordFatal(error, 'bootstrap'))
	}, [bootstrapCloud])
	// myTrackPlayer.setupTrackPlayer()

	// 兜底：播放器初始化任何环节抛错都不该把启动页永久卡住
	useEffect(() => {
		const fallback = setTimeout(() => {
			SplashScreen.hideAsync().catch(() => {})
		}, 4000)
		return () => clearTimeout(fallback)
	}, [])

	LyricManager.setup()
	const { hasShareIntent } = useShareIntentContext()

	useEffect(() => {
		if (hasShareIntent) {
			// we want to handle share intent event in a specific page
			console.log('[expo-router-index111] redirect to ShareIntent screen')
			console.log('[expo-router-index111] hasShareIntent', hasShareIntent)
			router.replace('/(modals)/cymusic')
		}
	}, [hasShareIntent])
	useEffect(() => {
		const initI18n = async () => {
			try {
				// 确保 i18n 配置已加载
				await setI18nConfig()
			} catch (error) {
				console.error('Failed to initialize i18n:', error)
			}
		}

		initI18n()
	}, [])
	return (
		<ShareIntentProvider
			options={{
				debug: true,
				resetOnBackground: false,
				onResetShareIntent: () =>
					// used when app going in background and when the reset button is pressed
					router.replace({
						pathname: '/',
					}),
			}}
		>
			<AppThemeProvider>
				<ThemedAppShell />
			</AppThemeProvider>
		</ShareIntentProvider>
	)
}

const ThemedAppShell = () => {
	const { colors, statusBarStyle } = useAppTheme()

	const toastConfig = useMemo(
		() => ({
			success: (props) => (
				<BaseToast
					{...props}
					style={{
						borderLeftColor: colors.toastAccent,
						backgroundColor: colors.toastBackground,
					}}
					contentContainerStyle={{ paddingHorizontal: 15 }}
					text1Style={{
						fontSize: 15,
						fontWeight: '400',
						color: colors.toastAccent,
					}}
					text2Style={{
						fontSize: 15,
						fontWeight: '400',
						color: colors.toastAccent,
					}}
				/>
			),
			error: (props) => (
				<ErrorToast
					{...props}
					style={{
						borderLeftColor: colors.toastAccent,
						backgroundColor: colors.toastBackground,
					}}
					contentContainerStyle={{ paddingHorizontal: 15 }}
					text1Style={{
						fontSize: 15,
						fontWeight: '400',
						color: colors.toastAccent,
					}}
					text2Style={{
						fontSize: 15,
						fontWeight: '400',
						color: colors.toastAccent,
					}}
				/>
			),
		}),
		[colors],
	)

	return (
		<SafeAreaProvider>
			<GestureHandlerRootView style={{ flex: 1 }}>
				<RootNavigation />
				<StatusBar style={statusBarStyle} />
				<Toast config={toastConfig} />
			</GestureHandlerRootView>
		</SafeAreaProvider>
	)
}

const RootNavigation = () => {
	const { colors } = useAppTheme()

	return (
		//每个 Stack.Screen 组件定义了一个可导航的屏幕
		<Stack>
			<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
			<Stack.Screen
				name="player"
				options={{
					presentation: 'card',
					gestureEnabled: true,
					gestureDirection: 'vertical',
					animationDuration: 400,
					headerShown: false,
				}}
			/>
			<Stack.Screen
				name="(modals)/playList"
				options={{
					presentation: 'modal',
					gestureEnabled: true,
					gestureDirection: 'vertical',
					animationDuration: 400,
					headerShown: false,
				}}
			/>
			<Stack.Screen
				name="(modals)/addToPlaylist"
				options={{
					presentation: 'modal',
					headerStyle: {
						backgroundColor: colors.background,
					},
					headerTitle: i18n.t('addToPlaylist.title'),
					headerTitleStyle: {
						color: colors.text,
					},
				}}
			/>
			<Stack.Screen
				name="(modals)/settingModal"
				options={{
					presentation: 'modal',
					headerShown: false,
					gestureEnabled: true,
					gestureDirection: 'vertical',
				}}
			/>
			<Stack.Screen
				name="(modals)/importPlayList"
				options={{
					presentation: 'modal',
					headerShown: false,
					gestureEnabled: true,
					gestureDirection: 'vertical',
				}}
			/>
			<Stack.Screen
				name="(modals)/[name]"
				options={{
					presentation: 'modal',
					headerShown: false,
					gestureEnabled: true,
					gestureDirection: 'vertical',
				}}
			/>
			<Stack.Screen
				name="(modals)/account"
				options={{
					presentation: 'modal',
					headerShown: false,
					gestureEnabled: true,
					gestureDirection: 'vertical',
				}}
			/>
			<Stack.Screen
				name="(modals)/devices"
				options={{
					presentation: 'modal',
					headerShown: false,
					gestureEnabled: true,
					gestureDirection: 'vertical',
				}}
			/>
			<Stack.Screen
				name="(modals)/videosources"
				options={{
					presentation: 'modal',
					headerShown: false,
					gestureEnabled: true,
					gestureDirection: 'vertical',
				}}
			/>
			<Stack.Screen
				name="(modals)/videoPlayer"
				options={{
					presentation: 'fullScreenModal',
					headerShown: false,
					gestureEnabled: false,
					animation: 'fade',
					contentStyle: { backgroundColor: '#000000' },
				}}
			/>
			<Stack.Screen
				name="(modals)/logScreen"
				options={{
					presentation: 'modal',
					headerShown: true,
					gestureEnabled: true,
					gestureDirection: 'vertical',
					headerTitle: '应用日志',
					headerStyle: {
						backgroundColor: colors.background,
					},
					headerTitleStyle: {
						color: colors.text,
					},
				}}
			/>
		</Stack>
	)
}

export default App

/**
 * 路由级错误边界。
 *
 * release 包里没有红屏，渲染期抛异常会直接 abort（用户看到的就是闪退）。
 * 交出这个边界后，异常会变成一张可读的错误页，并且已经落盘到本地日志。
 */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
	useEffect(() => {
		recordFatal(error, 'render')
	}, [error])

	return (
		<View style={styles.boundary}>
			<Text style={styles.boundaryTitle}>页面出了点问题</Text>
			<Text style={styles.boundaryHint}>已记录到「设置 → 应用日志」，重启后可以查看</Text>
			<ScrollView style={styles.boundaryBox} contentContainerStyle={{ padding: 12 }}>
				<Text style={styles.boundaryText}>{error?.message || String(error)}</Text>
			</ScrollView>
			<Pressable
				onPress={() => {
					retry().catch(() => {})
				}}
				style={styles.boundaryButton}
			>
				<Text style={styles.boundaryButtonText}>重试</Text>
			</Pressable>
		</View>
	)
}

const styles = StyleSheet.create({
	boundary: {
		flex: 1,
		backgroundColor: '#07060C',
		paddingHorizontal: 24,
		paddingTop: 96,
	},
	boundaryTitle: {
		color: '#F6F3F1',
		fontSize: 22,
		fontWeight: '600',
	},
	boundaryHint: {
		color: '#8A8496',
		fontSize: 13,
		marginTop: 8,
		marginBottom: 20,
	},
	boundaryBox: {
		flex: 1,
		backgroundColor: '#12101A',
		borderRadius: 12,
	},
	boundaryText: {
		color: '#C9C3D4',
		fontSize: 12,
		lineHeight: 18,
	},
	boundaryButton: {
		marginTop: 20,
		alignSelf: 'flex-start',
		paddingHorizontal: 22,
		paddingVertical: 12,
		borderRadius: 999,
		backgroundColor: '#F0688F',
	},
	boundaryButtonText: {
		color: '#FFFFFF',
		fontSize: 15,
		fontWeight: '600',
	},
})
