import { FloatingPlayer } from '@/components/FloatingPlayer'
import { BlurTint, elevation, fontSize, radius, spacing } from '@/constants/tokens'
import { useAppTheme } from '@/hooks/useAppTheme'
import i18n from '@/utils/i18n'
import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { Tabs } from 'expo-router'
import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export const unstable_settings = {
	initialRouteName: 'search',
}

const TAB_BAR_HEIGHT = 54
const TAB_BAR_MARGIN = 12

const TabBarBackground = ({ tint }: { tint: BlurTint }) => {
	const { gradients } = useAppTheme()

	return (
		<View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
			<BlurView intensity={92} tint={tint} style={StyleSheet.absoluteFill} />
			<LinearGradient
				colors={gradients.glassTab}
				start={{ x: 0.1, y: 0 }}
				end={{ x: 0.9, y: 1 }}
				style={StyleSheet.absoluteFill}
			/>
		</View>
	)
}

const TabsNavigation = () => {
	const { bottom } = useSafeAreaInsets()
	const { blurTint, colors } = useAppTheme()

	const tabBarStyle = useMemo(
		() => ({
			position: 'absolute' as const,
			left: TAB_BAR_MARGIN,
			right: TAB_BAR_MARGIN,
			bottom: Math.max(bottom, spacing.sm) - 2,
			height: TAB_BAR_HEIGHT,
			borderRadius: radius.xl,
			borderCurve: 'continuous' as const,
			borderTopWidth: 0,
			borderWidth: StyleSheet.hairlineWidth,
			borderColor: colors.border,
			backgroundColor: 'transparent',
			paddingTop: 6,
			paddingBottom: 4,
			overflow: 'hidden' as const,
			...elevation.pill,
		}),
		[bottom, colors.border],
	)

	const floatingPlayerStyle = useMemo(
		() => ({
			position: 'absolute' as const,
			left: TAB_BAR_MARGIN - 2,
			right: TAB_BAR_MARGIN - 2,
			bottom: Math.max(bottom, spacing.sm) - 2 + TAB_BAR_HEIGHT + spacing.sm,
		}),
		[bottom],
	)

	return (
		<>
			<Tabs
				screenOptions={{
					tabBarActiveTintColor: colors.primary,
					tabBarInactiveTintColor: colors.textMuted,
					tabBarLabelStyle: {
						fontSize: fontSize.xs - 1,
						fontWeight: '600',
						letterSpacing: 0.1,
					},
					tabBarItemStyle: {
						paddingVertical: 2,
					},
					headerShown: false,
					tabBarStyle,
					tabBarBackground: () => <TabBarBackground tint={blurTint} />,
				}}
			>
				<Tabs.Screen name="index" options={{ href: null }} />
				<Tabs.Screen
					name="search"
					options={{
						title: i18n.t('appTab.search'),
						tabBarIcon: ({ color, focused }) => (
							<Ionicons name={focused ? 'search' : 'search-outline'} size={23} color={color} />
						),
					}}
				/>
				<Tabs.Screen
					name="radio"
					options={{
						title: i18n.t('appTab.radio'),
						tabBarIcon: ({ color, focused }) => (
							<Ionicons name={focused ? 'trophy' : 'trophy-outline'} size={23} color={color} />
						),
					}}
				/>
				<Tabs.Screen
					name="video"
					options={{
						title: i18n.t('appTab.video'),
						tabBarIcon: ({ color, focused }) => (
							<Ionicons
								name={focused ? 'play-circle' : 'play-circle-outline'}
								size={23}
								color={color}
							/>
						),
					}}
				/>
				{/* 收藏并入「我的」，路由保留但不在底栏出现 */}
				<Tabs.Screen name="favorites" options={{ href: null }} />
				<Tabs.Screen
					name="mine"
					options={{
						title: i18n.t('appTab.mine'),
						tabBarIcon: ({ color, focused }) => (
							<Ionicons
								name={focused ? 'person-circle' : 'person-circle-outline'}
								size={24}
								color={color}
							/>
						),
					}}
				/>
			</Tabs>

			<FloatingPlayer style={floatingPlayerStyle} />
		</>
	)
}

export default TabsNavigation
