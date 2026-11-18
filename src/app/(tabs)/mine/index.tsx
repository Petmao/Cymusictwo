import { formatSvipExpire, growthProgress, isSvipProfile, svipDaysLeft, useCloud } from '@/cloud'
import { GradientScreen } from '@/components/GradientScreen'
import { radius, spacing, strokeWidth, typography } from '@/constants/tokens'
import { useAppTheme } from '@/hooks/useAppTheme'
import { playListsStore } from '@/helpers/trackPlayerIndex'
import PersistStatus from '@/store/PersistStatus'
import { useSleepTimer } from '@/store/sleepTimer'
import { showToast } from '@/utils/utils'
import i18n from '@/utils/i18n'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import React, { useMemo } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type ActionPill = {
	key: string
	label: string
	icon: keyof typeof Ionicons.glyphMap
	colorsKey: 'rose' | 'roseLight' | 'violet'
	onPress: () => void
}

const MineScreen = () => {
	const { colors, gradients, isDark } = useAppTheme()
	const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark])

	const session = useCloud((state) => state.session)
	const profile = useCloud((state) => state.profile)
	const playLists = playListsStore.useValue() ?? []
	const favorites = PersistStatus.useValue('music.favorites') ?? []
	const localTracks = PersistStatus.useValue('music.importedLocalMusic') ?? []
	const sleep = useSleepTimer()

	const isSvip = isSvipProfile(profile)
	const expireText = session ? (isSvip ? `${formatSvipExpire(profile)} 到期` : '未开通 SVIP') : '未登录'
	const daysLeft = session && isSvip ? svipDaysLeft(profile) : 0
	const points = profile?.points ?? 0
	const growth = profile?.growth ?? 0
	const growthInfo = growthProgress(growth)
	const level = growthInfo.level
	const cloudValue = session
		? isSvip
			? `SVIP · ${formatSvipExpire(profile)}`
			: '未开通 SVIP'
		: '未登录'

	const redeemCode = useCloud((state) => state.redeemCode)
	const checkIn = useCloud((state) => state.checkIn)
	const applyInvite = useCloud((state) => state.applyInvite)

	const goAccount = () => router.push('/(modals)/account' as never)

	const requireLogin = () => {
		if (session) return true
		Alert.alert('还没登录', '登录后才能用会员功能', [
			{ text: '稍后', style: 'cancel' },
			{ text: '去登录', onPress: goAccount },
		])
		return false
	}

	const handleRedeem = async () => {
		if (!requireLogin()) return
		Alert.prompt(
			'卡密兑换',
			'输入卡密，开通或续期 SVIP',
			[
				{ text: '取消', style: 'cancel' },
				{
					text: '兑换',
					onPress: async (raw) => {
						const code = raw?.trim() ?? ''
						if (!code) return
						try {
							const expire = await redeemCode(code)
							showToast(`SVIP 已开通至 ${String(expire).slice(0, 10)}`)
						} catch (error) {
							const message = error instanceof Error ? error.message : String(error)
							Alert.alert('兑换失败', message)
						}
					},
				},
			],
			'plain-text',
		)
	}

	const handleCheckIn = async () => {
		if (!requireLogin()) return
		if (profile?.checkedInToday) {
			showToast(`今天已签到，连续 ${profile.streak} 天`)
			return
		}
		try {
			const result = await checkIn()
			if (result.ok) {
				showToast(`签到 +${result.gained} 积分 · 连续 ${result.streak} 天`)
			} else if (result.reason === 'ALREADY') {
				showToast('今天已经签过了')
			} else {
				showToast('签到失败，稍后再试')
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			Alert.alert('签到失败', message)
		}
	}

	const handleInvite = () => {
		if (!requireLogin()) return
		const code = profile?.inviteCode ?? '——'
		Alert.alert('邀请好友', `你的邀请码：${code}\n好友用这个码注册后填入，双方都能拿积分和成长值。`, [
			{ text: '知道了', style: 'cancel' },
			{
				text: '填写好友邀请码',
				onPress: () =>
					Alert.prompt(
						'填写邀请码',
						'每个账号只能绑定一次',
						[
							{ text: '取消', style: 'cancel' },
							{
								text: '绑定',
								onPress: async (raw) => {
									const input = raw?.trim() ?? ''
									if (!input) return
									try {
										const result = await applyInvite(input)
										if (result.ok) {
											showToast(`已绑定 ${result.inviter ?? '好友'}，+${result.points ?? 0} 积分`)
										} else if (result.reason === 'ALREADY_INVITED') {
											showToast('这台账号已经绑定过邀请人了')
										} else if (result.reason === 'CODE_NOT_FOUND') {
											showToast('邀请码不存在')
										} else {
											showToast('绑定失败')
										}
									} catch (error) {
										const message = error instanceof Error ? error.message : String(error)
										Alert.alert('绑定失败', message)
									}
								},
							},
						],
						'plain-text',
					),
			},
		])
	}

	const pills: ActionPill[] = [
		{
			key: 'redeem',
			label: '卡密兑换',
			icon: 'ticket-outline',
			colorsKey: 'rose',
			onPress: handleRedeem,
		},
		{
			key: 'checkin',
			label: '签到',
			icon: 'calendar-outline',
			colorsKey: 'roseLight',
			onPress: handleCheckIn,
		},
		{
			key: 'invite',
			label: '邀请好友',
			icon: 'person-add-outline',
			colorsKey: 'violet',
			onPress: handleInvite,
		},
	]

	const grid = [
		{
			key: 'favorites',
			label: '收藏',
			icon: 'heart-outline' as const,
			onPress: () => router.push('/(tabs)/favorites' as never),
		},
		{
			key: 'sync',
			label: '云同步',
			icon: 'cloud-outline' as const,
			onPress: goAccount,
		},
		{
			key: 'devices',
			label: '设备',
			icon: 'phone-portrait-outline' as const,
			onPress: () => router.push('/(modals)/devices' as never),
		},
		{
			key: 'logs',
			label: '日志',
			icon: 'reorder-three-outline' as const,
			onPress: () => router.push('/(modals)/logScreen' as never),
		},
	]

	const openSleepMenu = () => {
		Alert.alert('睡眠定时', '到点自动暂停播放', [
			{ text: '关闭', onPress: () => sleep.set(null) },
			{ text: '15 分钟', onPress: () => sleep.set(15) },
			{ text: '30 分钟', onPress: () => sleep.set(30) },
			{ text: '40 分钟', onPress: () => sleep.set(40) },
			{ text: '60 分钟', onPress: () => sleep.set(60) },
			{ text: '取消', style: 'cancel' },
		])
	}

	return (
		<GradientScreen>
			<SafeAreaView style={styles.safe} edges={['top']}>
			<ScrollView
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
			>
				{/* 会员卡：1.5pt 金边 + 深金渐变底 */}
				<TouchableOpacity activeOpacity={0.92} onPress={goAccount}>
				<LinearGradient
					colors={gradients.gold}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
					style={styles.vipBorder}
				>
					<View style={styles.vipInnerWrap}>
						<LinearGradient
							colors={gradients.goldInner}
							start={{ x: 0.1, y: 0 }}
							end={{ x: 0.9, y: 1 }}
							style={StyleSheet.absoluteFill}
						/>
						<View style={styles.vipHeader}>
							<View style={styles.vipTitleWrap}>
								<Text style={styles.vipTitle} numberOfLines={1}>
									屿声会员 · SVIP
								</Text>
							</View>
							<Text style={styles.vipExpire}>{expireText}</Text>
						</View>

						<View style={styles.growthRow}>
							<View style={styles.growthTrack}>
								<LinearGradient
									colors={gradients.goldBar}
									start={{ x: 0, y: 0 }}
									end={{ x: 1, y: 0 }}
									style={[
										styles.growthFill,
										{ width: `${Math.round(growthInfo.ratio * 100)}%` },
									]}
								/>
							</View>
							<Text style={styles.levelText}>Lv.{level}</Text>
						</View>
						<Text style={styles.growthCaption}>
							{level >= 5
								? `成长值 ${growth} · 已满级`
								: `成长值 ${growth} / ${growthInfo.next} · 距 Lv.${level + 1} 还差 ${growthInfo.remaining}`}
						</Text>

						<View style={styles.vipStats}>
							{[
								{ label: '积分', value: points.toLocaleString() },
								{ label: '收藏', value: String(favorites.length) },
								{ label: '歌单', value: String(playLists.length) },
								{ label: '会员天数', value: daysLeft > 0 ? String(daysLeft) : '—' },
							].map((item) => (
								<View key={item.label} style={styles.vipStatCell}>
									<Text style={styles.vipStatValue}>{item.value}</Text>
									<Text style={styles.vipStatLabel}>{item.label}</Text>
								</View>
							))}
						</View>
					</View>
				</LinearGradient>
				</TouchableOpacity>

				{/* 三胶囊 */}
				<View style={styles.pillRow}>
					{pills.map((pill) => (
						<TouchableOpacity
							key={pill.key}
							activeOpacity={0.86}
							style={styles.pillTouch}
							onPress={pill.onPress}
						>
							<LinearGradient
								colors={gradients[pill.colorsKey]}
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 1 }}
								style={styles.pill}
							>
								<Ionicons name={pill.icon} size={13} color="#FFFFFF" />
								<Text style={styles.pillLabel} numberOfLines={1}>
									{pill.label}
								</Text>
							</LinearGradient>
						</TouchableOpacity>
					))}
				</View>

				{/* 四宫格 */}
				<LinearGradient
					colors={gradients.glass}
					start={{ x: 0.1, y: 0 }}
					end={{ x: 0.9, y: 1 }}
					style={styles.gridCard}
				>
					{grid.map((cell) => (
						<TouchableOpacity
							key={cell.key}
							activeOpacity={0.7}
							style={styles.gridCell}
							onPress={cell.onPress}
						>
							<Ionicons name={cell.icon} size={21} color="#FF7A8F" />
							<Text style={styles.gridLabel}>{cell.label}</Text>
						</TouchableOpacity>
					))}
				</LinearGradient>

				{/* 收藏（原收藏 tab 的内容） */}
				<Text style={styles.sectionTitle}>收藏</Text>
				<LinearGradient
					colors={gradients.glass}
					start={{ x: 0.1, y: 0 }}
					end={{ x: 0.9, y: 1 }}
					style={styles.groupCard}
				>
					<Row
						icon="heart"
						label="喜欢的歌曲"
						value={`${favorites.length} 首`}
						onPress={() => router.push('/(tabs)/favorites/favoriteMusic' as never)}
						styles={styles}
						chevronColor={colors.textMuted}
					/>
					<View style={styles.separator} />
					<Row
						icon="albums-outline"
						label="我的歌单"
						value={`${playLists.length} 个`}
						onPress={() => router.push('/(tabs)/favorites' as never)}
						styles={styles}
						chevronColor={colors.textMuted}
					/>
					<View style={styles.separator} />
					<Row
						icon="download"
						label="本地缓存"
						value={`${localTracks.length} 首`}
						onPress={() => router.push('/(tabs)/favorites/localMusic' as never)}
						isLast
						styles={styles}
						chevronColor={colors.textMuted}
					/>
				</LinearGradient>

				{/* 听歌画像 */}
				<LinearGradient
					colors={gradients.glass}
					start={{ x: 0.1, y: 0 }}
					end={{ x: 0.9, y: 1 }}
					style={styles.statsCard}
				>
					{[
						{ value: '3h 42m', label: '本周时长' },
						{ value: '128', label: '本周曲目' },
						{ value: '林俊杰', label: '最常听' },
					].map((item) => (
						<View key={item.label} style={styles.statCell}>
							<Text style={styles.statValue} numberOfLines={1}>
								{item.value}
							</Text>
							<Text style={styles.statLabel}>{item.label}</Text>
						</View>
					))}
				</LinearGradient>

				{/* 工具组：睡眠定时 + 设置 */}
				<LinearGradient
					colors={gradients.glass}
					start={{ x: 0.1, y: 0 }}
					end={{ x: 0.9, y: 1 }}
					style={[styles.groupCard, styles.toolCard]}
				>
					<Row
						icon="gift-outline"
						label="积分兑换"
						value={`${points} 积分`}
						onPress={() => router.push('/(modals)/prizes' as never)}
						styles={styles}
						chevronColor={colors.textMuted}
					/>
					<View style={styles.separator} />
					<Row
						icon="moon"
						label="睡眠定时"
						value={sleep.label}
						onPress={openSleepMenu}
						styles={styles}
						chevronColor={colors.textMuted}
					/>
					<View style={styles.separator} />
					<Row
						icon="settings"
						label={i18n.t('settings.title')}
						onPress={() => router.push('/(modals)/settingModal')}
						isLast
						styles={styles}
						chevronColor={colors.textMuted}
					/>
				</LinearGradient>

			</ScrollView>
			</SafeAreaView>
		</GradientScreen>
	)
}

export default MineScreen

type RowProps = {
	icon: keyof typeof Ionicons.glyphMap
	label: string
	value?: string
	onPress?: () => void
	isLast?: boolean
	chevronColor?: string
	styles: ReturnType<typeof createStyles>
}

const Row = ({ icon, label, value, onPress, isLast, chevronColor, styles }: RowProps) => (
	<>
		<TouchableOpacity activeOpacity={0.7} onPress={onPress} disabled={!onPress}>
			<View style={styles.row}>
				<View style={styles.rowIconWrap}>
					<Ionicons name={icon} size={15} color="#FF7A8F" />
				</View>
				<Text style={styles.rowLabel}>{label}</Text>
				{value ? <Text style={styles.rowValue}>{value}</Text> : null}
				{onPress ? <Ionicons name="chevron-forward" size={16} color={chevronColor} /> : null}
			</View>
		</TouchableOpacity>
		{!isLast ? <View style={styles.separator} /> : null}
	</>
)

const createStyles = (colors: ReturnType<typeof useAppTheme>['colors'], isDark: boolean) => {
	/**
	 * 会员卡上的字色：深色主题是深金底配浅金字，浅色主题是奶油金底配深褐字。
	 * 之前不论主题都用浅金，浅色主题上等于白字压浅黄底，完全看不清。
	 */
	const goldStrong = isDark ? '#FBEBC0' : '#5A3E12'
	const goldMid = isDark ? '#F2CC84' : '#7A5518'
	const goldDim = isDark ? 'rgba(247,231,194,0.72)' : 'rgba(90,62,18,0.76)'
	const goldFaint = isDark ? 'rgba(247,231,194,0.58)' : 'rgba(90,62,18,0.62)'
	const goldTrack = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(90,62,18,0.18)'
	const goldRule = isDark ? 'rgba(246,228,178,0.22)' : 'rgba(90,62,18,0.20)'

	return StyleSheet.create({
	safe: {
		flex: 1,
	},
	content: {
		paddingHorizontal: spacing.lg,
		paddingTop: spacing.sm,
		paddingBottom: 150,
	},
		vipBorder: {
			borderRadius: 22,
			padding: 1.5,
			...{
				shadowColor: '#000000',
				shadowOpacity: 0.35,
				shadowRadius: 22,
				shadowOffset: { width: 0, height: 12 },
				elevation: 14,
			},
		},
		vipInnerWrap: {
			borderRadius: 20.5,
			borderCurve: 'continuous',
			overflow: 'hidden',
			paddingHorizontal: spacing.lg,
			paddingTop: spacing.lg - 2,
			paddingBottom: spacing.md,
		},
		vipHeader: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
		},
		vipTitleWrap: {
			flex: 1,
			marginRight: spacing.sm,
		},
	vipTitle: {
		fontSize: 17,
		fontWeight: '800',
		letterSpacing: -0.2,
		color: goldStrong,
	},
	vipExpire: {
		fontSize: 11,
		fontWeight: '600',
		color: goldDim,
		letterSpacing: 0.1,
	},
	growthRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: spacing.sm,
	},
	growthTrack: {
		flex: 1,
		height: 6,
		borderRadius: 3,
		overflow: 'hidden',
		backgroundColor: goldTrack,
	},
	growthFill: {
		height: '100%',
		borderRadius: 3,
	},
	levelText: {
		marginLeft: spacing.sm + 2,
		fontSize: 11,
		fontWeight: '700',
		color: goldMid,
	},
	growthCaption: {
		marginTop: 6,
		fontSize: 10.5,
		fontWeight: '500',
		color: goldFaint,
	},
	vipStats: {
		flexDirection: 'row',
		marginTop: spacing.md - 1,
		paddingTop: spacing.md - 1,
		borderTopWidth: strokeWidth,
		borderTopColor: goldRule,
	},
	vipStatCell: {
		flex: 1,
		alignItems: 'center',
	},
	vipStatValue: {
		fontSize: 16,
		fontWeight: '800',
		letterSpacing: -0.3,
		color: goldStrong,
		fontVariant: ['tabular-nums'],
	},
	vipStatLabel: {
		marginTop: 3,
		fontSize: 10,
		fontWeight: '500',
		color: goldDim,
	},
		pillRow: {
			flexDirection: 'row',
			marginTop: spacing.md + 2,
			columnGap: spacing.sm,
		},
		pillTouch: {
			flex: 1,
		},
		pill: {
			height: 52,
			borderRadius: 16,
			borderCurve: 'continuous',
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			paddingHorizontal: spacing.sm,
		},
		pillLabel: {
			marginLeft: 6,
			fontSize: 12,
			fontWeight: '600',
			color: '#FFFFFF',
		},
		gridCard: {
			flexDirection: 'row',
			marginTop: spacing.md + 2,
			borderRadius: 18,
			borderCurve: 'continuous',
			paddingVertical: spacing.md,
		},
		gridCell: {
			flex: 1,
			alignItems: 'center',
		},
		gridLabel: {
			marginTop: 6,
			fontSize: 10.5,
			color: colors.textMuted,
		},
		sectionTitle: {
			...typography.label,
			color: colors.textMuted,
			marginTop: spacing.xl,
			marginBottom: spacing.sm,
			marginLeft: spacing.md,
		},
		groupCard: {
			borderRadius: 18,
			borderCurve: 'continuous',
			overflow: 'hidden',
		},
		statsCard: {
			flexDirection: 'row',
			marginTop: spacing.md + 2,
			borderRadius: 18,
			borderCurve: 'continuous',
			paddingVertical: spacing.md,
		},
		statCell: {
			flex: 1,
			alignItems: 'center',
			paddingHorizontal: spacing.xs,
		},
		statValue: {
			fontSize: 17,
			fontWeight: '700',
			letterSpacing: -0.3,
			color: colors.text,
			fontVariant: ['tabular-nums'],
		},
		statLabel: {
			marginTop: 4,
			fontSize: 10,
			color: colors.textMuted,
		},
		row: {
			flexDirection: 'row',
			alignItems: 'center',
			paddingVertical: spacing.md + 2,
			paddingHorizontal: spacing.lg,
			minHeight: 56,
		},
		rowIconWrap: {
			width: 28,
			height: 28,
			borderRadius: radius.xs + 2,
			borderCurve: 'continuous',
			alignItems: 'center',
			justifyContent: 'center',
			marginRight: spacing.md,
			backgroundColor: 'rgba(255,122,143,0.12)',
		},
		rowLabel: {
			flex: 1,
			fontSize: 15,
			letterSpacing: -0.1,
			color: colors.text,
		},
		rowValue: {
			fontSize: 13,
			color: colors.textMuted,
			marginRight: spacing.xs,
		},
		rowChevron: {
			color: colors.textMuted,
		},
		separator: {
			height: strokeWidth,
			backgroundColor: colors.separator,
			marginLeft: spacing.lg + 28 + spacing.md,
		},
		/** 睡眠定时 / 设置这一组，和上面的听歌画像拉开距离 */
		toolCard: {
			marginTop: spacing.md + 2,
		},
	})
}
