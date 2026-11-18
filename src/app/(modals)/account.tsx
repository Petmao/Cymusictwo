import { ThemeColors, radius, spacing, typography } from '@/constants/tokens'
import { useThemeColors } from '@/hooks/useAppTheme'
import {
	formatSvipExpire,
	isSvipProfile,
	svipDaysLeft,
	useCloud,
} from '@/cloud'
import { registerCurrentDevice } from '@/cloud/device'
import { syncNow } from '@/cloud/sync'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import {
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const AccountScreen = () => {
	const colors = useThemeColors()
	const styles = useMemo(() => createStyles(colors), [colors])
	const insets = useSafeAreaInsets()

	const session = useCloud((s) => s.session)
	const profile = useCloud((s) => s.profile)
	const busy = useCloud((s) => s.busy)
	const error = useCloud((s) => s.error)
	const signIn = useCloud((s) => s.signIn)
	const signUp = useCloud((s) => s.signUp)
	const signOut = useCloud((s) => s.signOut)
	const redeemCode = useCloud((s) => s.redeemCode)
	const clearError = useCloud((s) => s.clearError)

	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [code, setCode] = useState('')
	const [syncing, setSyncing] = useState(false)
	const [syncTip, setSyncTip] = useState<string | null>(null)

	const loggedIn = Boolean(session?.user)
	const isSvip = isSvipProfile(profile)

	// 登录后自动登记设备（同时作为心跳）
	useEffect(() => {
		if (!loggedIn) return
		registerCurrentDevice().catch((err) => {
			console.warn('[cloud] register device failed:', err)
		})
	}, [loggedIn])

	const handleSync = async () => {
		if (!session?.user) return
		setSyncing(true)
		setSyncTip(null)
		try {
			const result = await syncNow(session.user.id)
			setSyncTip(
				`已同步：收藏 ${result.favorites.total} 首（新增 ${result.favorites.added}）· 歌单 ${result.playlists.total} 个（新增 ${result.playlists.addedPlaylists}）`,
			)
		} catch (err) {
			setSyncTip(err instanceof Error ? err.message : String(err))
		} finally {
			setSyncing(false)
		}
	}

	const handleRedeem = async () => {
		if (!code.trim()) return
		try {
			const expire = await redeemCode(code)
			setCode('')
			Alert.alert('已开通 SVIP', expire ? `到期时间：${new Date(expire).toLocaleDateString()}` : '开通成功')
		} catch {
			// store 里已经写好 error
		}
	}

	const handleSignIn = () => {
		clearError()
		signIn(email, password).catch(() => undefined)
	}

	const handleSignUp = () => {
		clearError()
		signUp(email, password)
			.then(({ needConfirm }) => {
				if (needConfirm) {
					Alert.alert('注册成功', '确认邮件已发出，点邮件里的链接后再回来登录')
				} else {
					Alert.alert('注册成功', '账号已创建，直接登录即可')
				}
			})
			.catch(() => undefined)
	}

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}
		>
			<ScrollView
				contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }}
				keyboardShouldPersistTaps="handled"
			>
				<View style={styles.header}>
					<Pressable hitSlop={12} onPress={() => router.back()}>
						<Ionicons name="chevron-back" size={22} color={colors.primary} />
					</Pressable>
					<Text style={styles.title}>账号与云同步</Text>
					<View style={{ width: 22 }} />
				</View>

				{!loggedIn ? (
					<>
						<View style={styles.card}>
							<Text style={styles.label}>邮箱</Text>
							<TextInput
								value={email}
								onChangeText={setEmail}
								style={styles.input}
								placeholder="you@example.com"
								placeholderTextColor={colors.placeholder}
								autoCapitalize="none"
								keyboardType="email-address"
								autoCorrect={false}
							/>
							<Text style={[styles.label, { marginTop: 12 }]}>密码</Text>
							<TextInput
								value={password}
								onChangeText={setPassword}
								style={styles.input}
								placeholder="至少 6 位"
								placeholderTextColor={colors.placeholder}
								secureTextEntry
								autoCapitalize="none"
							/>
							{error ? <Text style={styles.error}>{error}</Text> : null}
							<Pressable
								style={[styles.primaryButton, busy && { opacity: 0.6 }]}
								disabled={busy}
								onPress={handleSignIn}
							>
								{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>登录</Text>}
							</Pressable>
							<Pressable
								style={[styles.ghostButton, busy && { opacity: 0.6 }]}
								disabled={busy}
								onPress={handleSignUp}
							>
								<Text style={styles.ghostText}>注册新账号</Text>
							</Pressable>
						</View>
						<Text style={styles.footnote}>
							登录后可以把自己的收藏和歌单同步到云端，换设备登录直接拉回来。
						</Text>
					</>
				) : (
					<>
						<View style={styles.card}>
							<View style={styles.profileRow}>
								<View style={styles.avatar}>
									<Text style={styles.avatarText}>
										{(profile?.nickname ?? '屿').slice(0, 1)}
									</Text>
								</View>
								<View style={{ flex: 1 }}>
									<Text style={styles.nickname}>{profile?.nickname ?? '屿声用户'}</Text>
									<Text style={styles.email}>{session?.user.email}</Text>
								</View>
								<View style={[styles.badge, !isSvip && styles.badgeOff]}>
									<Text style={[styles.badgeText, !isSvip && styles.badgeTextOff]}>
										{isSvip ? 'SVIP' : '普通'}
									</Text>
								</View>
							</View>
						</View>

						<View style={styles.svipCard}>
							<Text style={styles.svipTitle}>屿声会员 · SVIP</Text>
							<Text style={styles.svipLine}>
								{isSvip
									? `有效期至 ${formatSvipExpire(profile)} · 剩 ${svipDaysLeft(profile)} 天`
									: '未开通 · 视频功能需要 SVIP'}
							</Text>
							{profile ? (
								<View style={styles.memberStats}>
									<View style={styles.memberCell}>
										<Text style={styles.memberValue}>Lv.{profile.level}</Text>
										<Text style={styles.memberLabel}>等级</Text>
									</View>
									<View style={styles.memberCell}>
										<Text style={styles.memberValue}>{profile.growth}</Text>
										<Text style={styles.memberLabel}>成长值</Text>
									</View>
									<View style={styles.memberCell}>
										<Text style={styles.memberValue}>
											{profile.checkedInToday ? '已签' : '未签'}
										</Text>
										<Text style={styles.memberLabel}>今日</Text>
									</View>
									<View style={styles.memberCell}>
										<Text style={styles.memberValue}>{profile.streak}</Text>
										<Text style={styles.memberLabel}>连续签到</Text>
									</View>
								</View>
							) : null}

							{profile?.inviteCode ? (
								<Text style={[styles.svipLine, { marginTop: 8 }]}>
									邀请码 {profile.inviteCode} · 好友填码双方各得积分
								</Text>
							) : null}

							<View style={styles.redeemRow}>
								<TextInput
									value={code}
									onChangeText={setCode}
									style={[styles.input, { flex: 1 }]}
									placeholder="输入卡密兑换 SVIP"
									placeholderTextColor={colors.placeholder}
									autoCapitalize="characters"
								/>
								<Pressable style={styles.smallButton} onPress={handleRedeem}>
									<Text style={styles.smallButtonText}>兑换</Text>
								</Pressable>
							</View>
						</View>

						<View style={styles.card}>
							<Pressable style={styles.actionRow} onPress={handleSync} disabled={syncing}>
								<Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
								<Text style={styles.actionText}>一键同步到云端</Text>
								{syncing ? <ActivityIndicator size="small" /> : <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
							</Pressable>
							{syncTip ? <Text style={styles.syncTip}>{syncTip}</Text> : null}

							<View style={styles.divider} />

							<Pressable style={styles.actionRow} onPress={() => router.push('/(modals)/devices' as never)}>
								<Ionicons name="phone-portrait-outline" size={18} color={colors.primary} />
								<Text style={styles.actionText}>授权设备</Text>
								<Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
							</Pressable>
						</View>

						<Pressable
							style={styles.signOut}
							onPress={() => {
								Alert.alert('退出登录', '退出后本地数据保留，云端不受影响', [
									{ text: '取消', style: 'cancel' },
									{ text: '退出', style: 'destructive', onPress: () => void signOut() },
								])
							}}
						>
							<Text style={styles.signOutText}>退出登录</Text>
						</Pressable>
					</>
				)}
			</ScrollView>
		</KeyboardAvoidingView>
	)
}

const createStyles = (colors: ThemeColors) =>
	StyleSheet.create({
		container: { flex: 1, backgroundColor: colors.background },
		header: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			paddingHorizontal: spacing.lg,
			paddingBottom: spacing.md,
		},
		title: { ...typography.title, color: colors.text },
		card: {
			marginHorizontal: spacing.lg,
			marginTop: spacing.md,
			padding: spacing.lg,
			borderRadius: radius.lg,
			backgroundColor: colors.surfaceElevated,
			borderWidth: StyleSheet.hairlineWidth,
			borderColor: colors.border,
		},
		label: { ...typography.label, color: colors.textMuted },
		input: {
			marginTop: spacing.sm,
			height: 44,
			borderRadius: radius.sm,
			paddingHorizontal: spacing.md,
			backgroundColor: colors.surfaceMuted,
			color: colors.text,
			fontSize: 15,
		},
		rowButtons: { flexDirection: 'row', gap: 10, marginTop: spacing.lg },
		/** 登录：整行主按钮 */
		primaryButton: {
			height: 48,
			borderRadius: radius.pill,
			backgroundColor: colors.primary,
			alignItems: 'center',
			justifyContent: 'center',
			marginTop: spacing.lg,
		},
		primaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
		primaryButtonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
		/** 注册：整行描边按钮，和登录上下分开，不再挤在同一行 */
		ghostButton: {
			height: 48,
			borderRadius: radius.pill,
			alignItems: 'center',
			justifyContent: 'center',
			marginTop: spacing.sm + 2,
			borderWidth: 1,
			borderColor: colors.border,
			backgroundColor: colors.surfaceMuted,
		},
		ghostText: { color: colors.text, fontSize: 15, fontWeight: '600' },
		error: { marginTop: spacing.md, color: colors.error, fontSize: 13 },
		hint: { color: colors.textMuted, fontSize: 14, lineHeight: 22 },
		footnote: {
			marginHorizontal: spacing.xl,
			marginTop: spacing.lg,
			color: colors.textMuted,
			fontSize: 12.5,
			lineHeight: 20,
		},
		profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
		avatar: {
			width: 46,
			height: 46,
			borderRadius: 23,
			backgroundColor: colors.surfaceMuted,
			alignItems: 'center',
			justifyContent: 'center',
		},
		avatarText: { color: colors.primary, fontSize: 18, fontWeight: '700' },
		nickname: { color: colors.text, fontSize: 16, fontWeight: '600' },
		email: { color: colors.textMuted, fontSize: 12.5, marginTop: 3 },
		badge: {
			paddingHorizontal: 10,
			paddingVertical: 4,
			borderRadius: 999,
			backgroundColor: 'rgba(242,204,132,0.16)',
		},
		badgeOff: { backgroundColor: colors.surfaceMuted },
		badgeText: { color: '#F2CC84', fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
		badgeTextOff: { color: colors.textMuted },
		svipCard: {
			marginHorizontal: spacing.lg,
			marginTop: spacing.md,
			padding: spacing.lg,
			borderRadius: radius.lg,
			backgroundColor: colors.surfaceElevated,
			borderWidth: 1,
			borderColor: 'rgba(233,196,120,0.35)',
		},
		svipTitle: { color: '#F2CC84', fontSize: 16, fontWeight: '700' },
		svipLine: { color: colors.textMuted, fontSize: 12.5, marginTop: 6 },
		redeemRow: { flexDirection: 'row', gap: 8, marginTop: spacing.md, alignItems: 'center' },
		memberStats: {
			flexDirection: 'row',
			marginTop: spacing.md,
			paddingTop: spacing.sm + 2,
			borderTopWidth: StyleSheet.hairlineWidth,
			borderTopColor: colors.separator,
		},
		memberCell: { flex: 1, alignItems: 'center' },
		memberValue: { fontSize: 15, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
		memberLabel: { marginTop: 3, fontSize: 10, color: colors.textMuted },
		smallButton: {
			height: 44,
			paddingHorizontal: spacing.lg,
			borderRadius: radius.sm,
			backgroundColor: colors.primary,
			alignItems: 'center',
			justifyContent: 'center',
		},
		smallButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
		actionRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: spacing.md,
			paddingVertical: spacing.sm,
		},
		actionText: { flex: 1, color: colors.text, fontSize: 15 },
		errorText: { marginTop: 10, marginHorizontal: 16, fontSize: 12, color: colors.error },
		syncTip: { color: colors.textMuted, fontSize: 12, marginTop: 6, lineHeight: 18 },
		divider: {
			height: StyleSheet.hairlineWidth,
			backgroundColor: colors.separator,
			marginVertical: spacing.sm,
		},
		signOut: {
			marginHorizontal: spacing.lg,
			marginTop: spacing.xl,
			height: 48,
			borderRadius: radius.md,
			borderWidth: 1,
			borderColor: 'rgba(242,103,140,0.5)',
			alignItems: 'center',
			justifyContent: 'center',
		},
		signOutText: { color: '#F2678C', fontSize: 14.5, fontWeight: '600' },
	})

export default AccountScreen
