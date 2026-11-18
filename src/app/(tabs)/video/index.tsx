import { useAppTheme } from '@/hooks/useAppTheme'
import { router } from 'expo-router'
import React, { useMemo } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Text as SvgText } from 'react-native-svg'
import { GradientScreen } from '@/components/GradientScreen'
import { radius, spacing, strokeWidth } from '@/constants/tokens'
import { isSvipProfile, useCloud } from '@/cloud'
import { useAllVideoSources } from '@/hooks/useAllVideoSources'
import { Ionicons } from '@expo/vector-icons'

/**
 * 视频页只负责「看」。
 * 源的增删全部在「我的 – 设置 – 视频源」，后台也可以直接下发（app_config.video_sources）。
 */
const VideoScreen = () => {
	const { colors, gradients } = useAppTheme()
	const insets = useSafeAreaInsets()
	const { list: videos, loading } = useAllVideoSources()
	const session = useCloud((state) => state.session)
	const profile = useCloud((state) => state.profile)
	const cloudReady = useCloud((state) => state.configured)

	// 云端配好之后视频就是 SVIP 专属；没配 Supabase 时保持本地模式，本地源照常能放
	const locked = cloudReady && !isSvipProfile(profile)
	const hasVideos = videos.length > 0

	const styles = useMemo(() => createStyles(), [])

	if (locked) {
		return (
			<GradientScreen>
				<View style={styles.empty}>
					<View style={[styles.lockCircle, { backgroundColor: gradients.glow }]}>
						<Ionicons name="lock-closed" size={44} color={gradients.textGlow[0]} />
					</View>
					<Text style={styles.line1}>视频是 SVIP 专属</Text>
					<Text style={[styles.lockHint, { color: colors.textMuted }]}>
						开通后可用云端视频源，换设备也能接着看
					</Text>
					<TouchableOpacity
						activeOpacity={0.86}
						onPress={() => router.push('/(modals)/account' as never)}
					>
						<View style={styles.pillBtn}>
							<Text style={styles.pillText}>{session ? '去开通 SVIP' : '去登录'}</Text>
						</View>
					</TouchableOpacity>
				</View>
			</GradientScreen>
		)
	}

	if (loading && !hasVideos) {
		return (
			<GradientScreen>
				<View style={styles.empty}>
					<ActivityIndicator color={gradients.textGlow[0]} />
				</View>
			</GradientScreen>
		)
	}

	return (
		<GradientScreen>
			{hasVideos ? (
				<ScrollView
					contentInsetAdjustmentBehavior="automatic"
					contentContainerStyle={[
						styles.listContent,
						{ paddingTop: insets.top + spacing.lg, paddingBottom: 150 },
					]}
				>
					{videos.map((item) => (
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
									<View style={styles.titleRow}>
										<Text numberOfLines={1} style={[styles.cardTitle, { color: colors.text }]}>
											{item.title}
										</Text>
										{item.remote ? (
											<View style={[styles.tag, { backgroundColor: gradients.glow }]}>
												<Text style={styles.tagText}>云端</Text>
											</View>
										) : null}
									</View>
									<Text numberOfLines={1} style={[styles.cardUrl, { color: colors.textMuted }]}>
										{item.url}
									</Text>
								</View>
								<Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
							</View>
						</TouchableOpacity>
					))}
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

					<Text style={[styles.line1, { color: colors.text }]}>还没有视频</Text>
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
							fontSize={22}
							fontWeight="800"
							letterSpacing={0.6}
						>
							开启新视界哟
						</SvgText>
					</Svg>

					<View style={styles.rule} />

					<Text style={[styles.emptyHint, { color: colors.textMuted }]}>
						视频源在「我的 · 设置 · 视频源」里添加
					</Text>
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
		titleRow: {
			flexDirection: 'row',
			alignItems: 'center',
		},
		cardTitle: {
			fontSize: 15,
			fontWeight: '600',
			letterSpacing: -0.1,
			flexShrink: 1,
		},
		tag: {
			marginLeft: 6,
			paddingHorizontal: 6,
			paddingVertical: 1.5,
			borderRadius: radius.pill,
		},
		tagText: {
			fontSize: 9.5,
			fontWeight: '700',
			color: '#FFFFFF',
			letterSpacing: 0.2,
		},
		cardUrl: {
			fontSize: 11,
			marginTop: 3,
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
		lockCircle: {
			width: 108,
			height: 108,
			borderRadius: 54,
			alignItems: 'center',
			justifyContent: 'center',
			marginBottom: spacing.lg,
		},
		lockHint: {
			marginTop: spacing.sm,
			marginBottom: spacing.lg,
			fontSize: 13,
			textAlign: 'center',
			lineHeight: 19,
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
		emptyHint: {
			marginTop: spacing.md,
			fontSize: 12.5,
			lineHeight: 19,
			textAlign: 'center',
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
