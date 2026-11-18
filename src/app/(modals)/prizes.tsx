import {
	describeRedeemReason,
	isSvipProfile,
	listPrizes,
	Prize,
	prizeValueText,
	redeemPrize,
	useCloud,
} from '@/cloud'
import { GradientScreen } from '@/components/GradientScreen'
import { radius, spacing, strokeWidth, typography } from '@/constants/tokens'
import { useAppTheme } from '@/hooks/useAppTheme'
import { showToast } from '@/utils/utils'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
	ActivityIndicator,
	Alert,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/**
 * 积分兑换。奖品来自服务端 list_rewards()，下单走 redeem_reward(p_reward_id)。
 * 奖品内容在后台「积分商城」里增删改，App 只读不写。
 */
const PrizesScreen = () => {
	const { colors, gradients } = useAppTheme()
	const insets = useSafeAreaInsets()
	const styles = useMemo(() => createStyles(colors), [colors])

	const session = useCloud((s) => s.session)
	const profile = useCloud((s) => s.profile)
	const refreshProfile = useCloud((s) => s.refreshProfile)

	const [prizes, setPrizes] = useState<Prize[]>([])
	const [storeOpen, setStoreOpen] = useState(true)
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [busyId, setBusyId] = useState<string | null>(null)

	const points = profile?.points ?? 0
	const isSvip = isSvipProfile(profile)

	const load = useCallback(async () => {
		const store = await listPrizes()
		setPrizes(store.items)
		setStoreOpen(store.enabled)
	}, [])

	useEffect(() => {
		let alive = true
		load().finally(() => {
			if (alive) setLoading(false)
		})
		return () => {
			alive = false
		}
	}, [load])

	const handleRefresh = async () => {
		setRefreshing(true)
		await Promise.all([load(), refreshProfile().catch(() => undefined)])
		setRefreshing(false)
	}

	const handleRedeem = (prize: Prize) => {
		if (!session) {
			Alert.alert('还没登录', '登录后才能用积分兑换', [
				{ text: '稍后', style: 'cancel' },
				{ text: '去登录', onPress: () => router.push('/(modals)/account' as never) },
			])
			return
		}
		if (prize.stock === 0) {
			showToast('这件已经被兑完了')
			return
		}
		if (points < prize.cost) {
			showToast(`还差 ${prize.cost - points} 积分`)
			return
		}
		Alert.alert('确认兑换', `用 ${prize.cost} 积分兑换「${prize.name}」？`, [
			{ text: '再想想', style: 'cancel' },
			{
				text: '兑换',
				onPress: async () => {
					const key = String(prize.id)
					setBusyId(key)
					const result = await redeemPrize(prize.id)
					setBusyId(null)
					if (!result.ok) {
						Alert.alert('兑换失败', describeRedeemReason(result as { reason?: string; short?: number }))
						return
					}
					if (result.code) {
						Alert.alert('兑换成功', `你的卡密：${result.code}\n先记下来，丢了不补`)
					} else {
						showToast(`已兑换「${result.title ?? prize.name}」，剩余 ${result.points ?? 0} 积分`)
					}
					await Promise.all([load(), refreshProfile().catch(() => undefined)])
				},
			},
		])
	}

	return (
		<GradientScreen>
			<ScrollView
				contentContainerStyle={{
					paddingTop: insets.top + 10,
					paddingBottom: insets.bottom + 40,
				}}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={handleRefresh}
						tintColor={colors.textMuted}
					/>
				}
			>
				<View style={styles.header}>
					<TouchableOpacity onPress={() => router.back()} style={styles.back}>
						<Ionicons name="chevron-down" size={20} color={colors.text} />
					</TouchableOpacity>
					<Text style={styles.title}>积分兑换</Text>
					<View style={styles.back} />
				</View>

				{/* 余额条 */}
				<View style={[styles.balance, { borderColor: 'rgba(233,196,120,0.35)' }]}>
					<View style={{ flex: 1 }}>
						<Text style={styles.balanceLabel}>可用积分</Text>
						<Text style={styles.balanceValue}>{points.toLocaleString()}</Text>
					</View>
					<View style={styles.balanceRight}>
						<Text style={styles.balanceLabel}>会员状态</Text>
						<Text style={styles.balanceBadge}>{isSvip ? 'SVIP' : '未开通'}</Text>
					</View>
				</View>

				<Text style={styles.sectionLabel}>奖品</Text>

				{loading ? (
					<View style={styles.center}>
						<ActivityIndicator color={gradients.textGlow[0]} />
					</View>
				) : prizes.length === 0 ? (
					<View style={styles.emptyBox}>
						<Ionicons name="gift-outline" size={30} color={colors.textMuted} />
						<Text style={styles.emptyTitle}>
							{storeOpen ? '暂无可兑换奖品' : '积分商城暂时关闭'}
						</Text>
						<Text style={styles.emptyHint}>
							{storeOpen ? '奖品由后台配置，上架后会出现在这里' : '后台打开商城后就能看到奖品'}
						</Text>
					</View>
				) : (
					prizes.map((prize) => {
						const key = String(prize.id)
						const soldOut = prize.stock === 0
						const affordable = points >= prize.cost
						return (
							<View key={key} style={styles.card}>
								<View style={styles.cardMain}>
									<Text style={styles.cardTitle}>{prize.name}</Text>
									<Text style={styles.cardDesc} numberOfLines={2}>
										{prizeValueText(prize)}
									</Text>
									<View style={styles.metaRow}>
										<Text style={styles.cost}>{prize.cost} 积分</Text>
										<Text style={styles.stock}>
											{soldOut
												? '已兑完'
												: prize.stock < 0
													? '不限量'
													: `剩 ${prize.stock}`}
											{prize.perUserLimit > 0 ? ` · 每人限 ${prize.perUserLimit}` : ''}
										</Text>
									</View>
								</View>
								<TouchableOpacity
									activeOpacity={0.85}
									disabled={soldOut || busyId === key}
									onPress={() => handleRedeem(prize)}
								>
									<View
										style={[
											styles.redeemBtn,
											{ backgroundColor: affordable && !soldOut ? colors.primary : colors.surfaceMuted },
										]}
									>
										{busyId === key ? (
											<ActivityIndicator size="small" color="#fff" />
										) : (
											<Text
												style={[
													styles.redeemText,
													{ color: affordable && !soldOut ? '#FFFFFF' : colors.textMuted },
												]}
											>
												{soldOut ? '已兑完' : '兑换'}
											</Text>
										)}
									</View>
								</TouchableOpacity>
							</View>
						)
					})
				)}

				<Text style={styles.footnote}>
					兑换后积分立即扣除；SVIP 天数、成长值自动到账，卡密会直接显示。签到、邀请好友都能拿积分。
				</Text>
			</ScrollView>
		</GradientScreen>
	)
}

export default PrizesScreen

const createStyles = (colors: ReturnType<typeof useAppTheme>['colors']) =>
	StyleSheet.create({
		header: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			paddingHorizontal: spacing.lg,
			paddingBottom: spacing.md,
		},
		back: {
			width: 34,
			height: 34,
			borderRadius: 17,
			alignItems: 'center',
			justifyContent: 'center',
		},
		title: {
			...typography.headline,
			color: colors.text,
			fontSize: 17,
		},
		balance: {
			marginHorizontal: spacing.lg,
			padding: spacing.lg,
			borderRadius: 18,
			borderWidth: 1,
			flexDirection: 'row',
			alignItems: 'center',
			backgroundColor: 'rgba(255,255,255,0.06)',
		},
		balanceLabel: {
			...typography.label,
			color: colors.textMuted,
		},
		balanceValue: {
			marginTop: 4,
			fontSize: 26,
			fontWeight: '800',
			color: colors.text,
			fontVariant: ['tabular-nums'],
		},
		balanceRight: {
			alignItems: 'flex-end',
		},
		balanceBadge: {
			marginTop: 4,
			fontSize: 13,
			fontWeight: '700',
			color: '#F2CC84',
		},
		sectionLabel: {
			...typography.label,
			color: colors.textMuted,
			marginTop: spacing.xl,
			marginBottom: spacing.sm,
			marginLeft: spacing.xl,
		},
		center: {
			paddingVertical: spacing.xxl,
			alignItems: 'center',
		},
		emptyBox: {
			marginHorizontal: spacing.lg,
			paddingVertical: spacing.xxl,
			borderRadius: 18,
			borderWidth: strokeWidth,
			borderColor: colors.border,
			alignItems: 'center',
		},
		emptyTitle: {
			marginTop: 10,
			fontSize: 15,
			fontWeight: '600',
			color: colors.text,
		},
		emptyHint: {
			marginTop: 6,
			fontSize: 12,
			color: colors.textMuted,
		},
		card: {
			marginHorizontal: spacing.lg,
			marginBottom: spacing.sm,
			padding: spacing.md + 2,
			borderRadius: 18,
			borderWidth: strokeWidth,
			borderColor: colors.border,
			backgroundColor: colors.surfaceElevated,
			flexDirection: 'row',
			alignItems: 'center',
		},
		cardMain: {
			flex: 1,
			marginRight: spacing.md,
		},
		cardTitle: {
			fontSize: 15,
			fontWeight: '600',
			color: colors.text,
		},
		cardDesc: {
			marginTop: 4,
			fontSize: 12,
			lineHeight: 17,
			color: colors.textMuted,
		},
		metaRow: {
			flexDirection: 'row',
			alignItems: 'center',
			marginTop: 8,
			gap: 10,
		},
		cost: {
			fontSize: 13,
			fontWeight: '700',
			color: '#D9A64B',
		},
		stock: {
			fontSize: 11.5,
			color: colors.textMuted,
		},
		redeemBtn: {
			minWidth: 72,
			height: 34,
			paddingHorizontal: 14,
			borderRadius: radius.pill,
			alignItems: 'center',
			justifyContent: 'center',
		},
		redeemText: {
			fontSize: 13,
			fontWeight: '700',
		},
		footnote: {
			marginTop: spacing.lg,
			marginHorizontal: spacing.xl,
			fontSize: 11.5,
			lineHeight: 18,
			color: colors.textMuted,
		},
	})
