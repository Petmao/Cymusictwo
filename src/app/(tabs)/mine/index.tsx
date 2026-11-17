import { formatSvipExpire, isSvipProfile, svipDaysLeft, useCloud } from '@/cloud'
import { GradientScreen } from '@/components/GradientScreen'
import { GradientText } from '@/components/GradientText'
import { radius, spacing, strokeWidth, typography } from '@/constants/tokens'
import { useAppTheme } from '@/hooks/useAppTheme'
import { playListsStore } from '@/helpers/trackPlayerIndex'
import { musicApiStore } from '@/player/PlayerStore'
import PersistStatus from '@/store/PersistStatus'
import { useSleepTimer } from '@/store/sleepTimer'
import { showToast } from '@/utils/utils'
import i18n from '@/utils/i18n'
import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import React, { useMemo } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

const GROWTH_TARGET = 1000

type ActionPill = {
	key: string
	label: string
	icon: keyof typeof Ionicons.glyphMap
	colorsKey: 'rose' | 'roseLight' | 'violet'
	onPress: () => void
}

const MineScreen = () => {
	const { colors, gradients } = useAppTheme()
	const styles = useMemo(() => createStyles(colors), [colors])

	const session = useCloud((state) => state.session)
	const profile = useCloud((state) => state.profile)
	const musicApis = musicApiStore.useValue() ?? []
	const playLists = playListsStore.useValue() ?? []
	const favorites = PersistStatus.useValue('music.favorites') ?? []
	const localTracks = PersistStatus.useValue('music.importedLocalMusic') ?? []
	const sleep = useSleepTimer()

	const version = Constants.expoConfig?.version ?? '1.2.0'
	const isSvip = isSvipProfile(profile)
	const expireText = session ? (isSvip ? `${formatSvipExpire(profile)} 到期` : '未开通') : '未登录'
	const daysLeft = session && isSvip ? svipDaysLeft(profile) : 0
	const points = profile?.points ?? 620
	const growth = Math.min(points, GROWTH_TARGET)
	const level = growth >= 900 ? 4 : growth >= 600 ? 3 : growth >= 300 ? 2 : 1
	const cloudValue = session
		? isSvip
			? `SVIP · ${formatSvipExpire(profile)}`
			: '未开通 SVIP'
		: '未登录'

	const goAccount = () => router.push('/(modals)/account' as never)

	const pills: ActionPill[] = [
		{
			key: 'redeem',
			label: '卡密兑换',
			icon: 'ticket-outline',
			colorsKey: 'rose',
			onPress: goAccount,
		},
		{
			key: 'checkin',
			label: '签到',
			icon: 'calendar-outline',
			colorsKey: 'roseLight',
			onPress: () => showToast('今日已签到，积分 +5'),
		},
		{
			key: 'invite',
			label: '邀请好友',
			icon: 'person-add-outline',
			colorsKey: 'violet',
			onPress: () =>
				Alert.alert('邀请好友', `把你的邀请码发给朋友：YS-${(profile?.id ?? 'GUEST').slice(0, 6).toUpperCase()}`),
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
			<ScrollView
				contentInsetAdjustmentBehavior="automatic"
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
			>
				{/* 会员卡：1.5pt 金边 + 深金渐变底 */}
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
								<GradientText text="屿声会员 · SVIP" size={17} from="gold" weight="800" />
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
										{ width: `${Math.round((growth / GROWTH_TARGET) * 100)}%` },
									]}
								/>
							</View>
							<Text style={styles.levelText}>Lv.{level}</Text>
						</View>
						<Text style={styles.growthCaption}>
							成长值 {growth} / {GROWTH_TARGET}
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
					style={styles.groupCard}
				>
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

				<Text style={styles.footer}>
					屿声音乐 {version} · 音源 {musicApis.length} 个 · 已是最新
				</Text>
			</ScrollView>
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
	styles: ReturnType<typeof createStyles>
}

const Row = ({ icon, label, value, onPress, isLast, styles }: RowProps) => (
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

const createStyles = (colors: ReturnType<typeof useAppTheme>['colors']) =>
	StyleSheet.create({
		content: {
			paddingHorizontal: spacing.lg,
			paddingTop: spacing.md,
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
		vipExpire: {
			fontSize: 10.5,
			color: 'rgba(246,228,178,0.66)',
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
			backgroundColor: 'rgba(255,255,255,0.14)',
		},
		growthFill: {
			height: '100%',
			borderRadius: 3,
		},
		levelText: {
			marginLeft: spacing.sm + 2,
			fontSize: 11,
			fontWeight: '700',
			color: '#F2CC84',
		},
		growthCaption: {
			marginTop: 6,
			fontSize: 10,
			color: 'rgba(246,228,178,0.54)',
		},
		vipStats: {
			flexDirection: 'row',
			marginTop: spacing.md - 1,
			paddingTop: spacing.md - 1,
			borderTopWidth: strokeWidth,
			borderTopColor: 'rgba(246,228,178,0.20)',
		},
		vipStatCell: {
			flex: 1,
			alignItems: 'center',
		},
		vipStatValue: {
			fontSize: 16,
			fontWeight: '700',
			letterSpacing: -0.3,
			color: '#F3D79B',
			fontVariant: ['tabular-nums'],
		},
		vipStatLabel: {
			marginTop: 3,
			fontSize: 10,
			color: 'rgba(255,255,255,0.52)',
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
		footer: {
			marginTop: spacing.lg,
			textAlign: 'center',
			fontSize: 10.5,
			color: colors.textMuted,
			letterSpacing: 0.02,
		},
	})
