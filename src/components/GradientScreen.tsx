import { useAppTheme } from '@/hooks/useAppTheme'
import { LinearGradient } from 'expo-linear-gradient'
import React, { ReactNode } from 'react'
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'

type Props = {
	children?: ReactNode
	style?: StyleProp<ViewStyle>
	/** 关掉右上/左下的光晕，只要纯渐变底 */
	glow?: boolean
	/** 底部留白，给悬浮 TabBar 与迷你播放器让位 */
	bottomInset?: number
}

/**
 * 页面骨架：纵向四段渐变 + 两团径向光晕。
 * 渐变负责“暖”，光晕负责“有光源”，两层叠起来才不会像色卡。
 */
export const GradientScreen = ({ children, style, glow = true, bottomInset }: Props) => {
	const { gradients } = useAppTheme()

	return (
		<View style={[styles.root, style]}>
			<LinearGradient
				colors={gradients.screen}
				locations={gradients.screenStops}
				start={{ x: 0.1, y: 0 }}
				end={{ x: 0.4, y: 1 }}
				style={StyleSheet.absoluteFill}
			/>
			{glow ? (
				<Svg style={StyleSheet.absoluteFill} pointerEvents="none">
					<Defs>
						<RadialGradient id="glowA" cx="10%" cy="-2%" rx="62%" ry="42%">
							<Stop offset="0" stopColor={gradients.glow} stopOpacity={0.95} />
							<Stop offset="1" stopColor={gradients.glow} stopOpacity={0} />
						</RadialGradient>
						<RadialGradient id="glowB" cx="92%" cy="10%" rx="56%" ry="44%">
							<Stop offset="0" stopColor={gradients.accent[2]} stopOpacity={0.55} />
							<Stop offset="1" stopColor={gradients.accent[2]} stopOpacity={0} />
						</RadialGradient>
					</Defs>
					<Rect x="0" y="0" width="100%" height="100%" fill="url(#glowA)" />
					<Rect x="0" y="0" width="100%" height="100%" fill="url(#glowB)" />
				</Svg>
			) : null}
			<View style={[styles.inner, bottomInset ? { paddingBottom: bottomInset } : null]}>
				{children}
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		overflow: 'hidden',
	},
	inner: {
		flex: 1,
	},
})
