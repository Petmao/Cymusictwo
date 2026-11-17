import { useAppTheme } from '@/hooks/useAppTheme'
import i18n from '@/utils/i18n'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import React, { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Text as SvgText } from 'react-native-svg'
import { GradientScreen } from '@/components/GradientScreen'
import { radius, spacing, strokeWidth, typography } from '@/constants/tokens'
import { useVideoSources } from '@/store/videoSources'

const VideoScreen = () => {
	const { colors, gradients } = useAppTheme()
	const insets = useSafeAreaInsets()
	const sources = useVideoSources()

	const hasSources = sources.length > 0

	const styles = useMemo(() => createStyles(), [])

	return (
		<GradientScreen>
			{hasSources ? (
				<ScrollView
					contentInsetAdjustmentBehavior="automatic"
					contentContainerStyle={[
						styles.listContent,
						{ paddingTop: insets.top + spacing.lg, paddingBottom: 150 },
					]}
				>
					<Text style={[styles.label, { color: colors.textMuted }]}>视频</Text>
					{sources.map((item) => (
						<TouchableOpacity
							key={item.id}
							activeOpacity={0.75}
							onPress={() =>
								router.push({
									pathname: '/(modals)/videoPlayer',
									params: { id: item.id },
								})
							}
						>
							<View
								style={[
									styles.card,
									{ borderColor: colors.border, backgroundColor: colors.surfaceElevated },
								]}
							>
								<View style={styles.playDot}>
									<Ionicons name="play" size={14} color="#fff" />
								</View>
								<View style={styles.cardText}>
									<Text numberOfLines={1} style={[styles.cardTitle, { color: colors.text }]}>
										{item.title}
									</Text>
									<Text numberOfLines={1} style={[styles.cardUrl, { color: colors.textMuted }]}>
										{item.url}
									</Text>
								</View>
								<Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
							</View>
						</TouchableOpacity>
					))}

					<TouchableOpacity
						activeOpacity={0.7}
						onPress={() => router.push('/(modals)/videosources')}
					>
						<Text style={[styles.manage, { color: colors.textMuted }]}>
							{i18n.t('settings.title')} · 管理视频源
						</Text>
					</TouchableOpacity>
				</ScrollView>
			) : (
				<View style={styles.empty}>
					<Svg style={StyleSheet.absoluteFill} pointerEvents="none">
						<Defs>
							<SvgLinearGradient id="unused" x1="0" y1="0" x2="1" y2="0">
								<Stop offset="0" stopColor={gradients.glow} />
								<Stop offset="1" stopColor="transparent" />
							</SvgLinearGradient>
						</Defs>
					</Svg>

					<View style={[styles.halo, { backgroundColor: gradients.glow }]} />
					<View style={[styles.iconCircle, { backgroundColor: gradients.glow }]}>
						<Ionicons name="videocam-outline" size={54} color={gradients.textGlow[0]} />
					</View>

					<Text style={[styles.line1, { color: '#FFFFFF' }]}>请到设置里面设置视频源</Text>
					<Svg width="100%" height={40} style={styles.line2}>
						<Defs>
							<SvgLinearGradient id="veTitle" x1="0" y1="0" x2="1" y2="0">
								<Stop offset="0" stopColor={gradients.textGlow[0]} />
								<Stop offset="1" stopColor={gradients.textGlow[1]} />
							</SvgLinearGradient>
						</Defs>
						<SvgText
							x="50%"
							y={28}
							textAnchor="middle"
							fill="url(#veTitle)"
							fontSize={24}
							fontWeight="800"
							letterSpacing={1}
						>
							开启新视界哟
						</SvgText>
					</Svg>

					<View style={styles.rule} />

					<TouchableOpacity
						activeOpacity={0.8}
						onPress={() => router.push('/(modals)/videosources')}
					>
						<View style={styles.pillBtn}>
							<Text style={styles.pillText}>去设置</Text>
						</View>
					</TouchableOpacity>
				</View>
			)}
		</GradientScreen>
	)
}

export default VideoScreen

const createStyles = () =>
	StyleSheet.create({
		listContent: {
			paddingHorizontal: spacing.lg,
		},
		label: {
			...typography.label,
			marginLeft: spacing.sm,
			marginBottom: spacing.sm,
		},
		card: {
			flexDirection: 'row',
			alignItems: 'center',
			borderRadius: 18,
			borderCurve: 'continuous',
			borderWidth: strokeWidth,
			paddingVertical: spacing.md,
			paddingHorizontal: spacing.md,
			marginBottom: spacing.sm,
		},
		playDot: {
			width: 34,
			height: 34,
			borderRadius: 17,
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: 'rgba(240,104,143,0.9)',
			marginRight: spacing.md,
		},
		cardText: {
			flex: 1,
			marginRight: spacing.sm,
		},
		cardTitle: {
			fontSize: 15,
			fontWeight: '600',
			letterSpacing: -0.1,
		},
		cardUrl: {
			fontSize: 11,
			marginTop: 3,
		},
		manage: {
			textAlign: 'center',
			fontSize: 12,
			marginTop: spacing.lg,
		},
		empty: {
			flex: 1,
			alignItems: 'center',
			justifyContent: 'center',
			paddingHorizontal: spacing.xl,
		},
		halo: {
			position: 'absolute',
			width: 300,
			height: 300,
			borderRadius: 150,
			opacity: 0.16,
		},
		iconCircle: {
			width: 132,
			height: 132,
			borderRadius: 66,
			alignItems: 'center',
			justifyContent: 'center',
			marginBottom: spacing.lg,
		},
		line1: {
			fontSize: 17,
			fontWeight: '700',
			letterSpacing: -0.2,
		},
		line2: {
			marginTop: spacing.sm,
		},
		rule: {
			width: 34,
			height: 2,
			borderRadius: 1,
			marginTop: spacing.sm,
			marginBottom: spacing.sm,
			backgroundColor: 'rgba(240,106,150,0.5)',
		},
		pillBtn: {
			paddingHorizontal: 22,
			paddingVertical: 11,
			borderRadius: radius.pill,
			borderWidth: 1,
			borderColor: 'rgba(255,255,255,0.20)',
			backgroundColor: 'rgba(255,255,255,0.10)',
		},
		pillText: {
			fontSize: 13,
			fontWeight: '600',
			color: '#FFFFFF',
		},
	})
