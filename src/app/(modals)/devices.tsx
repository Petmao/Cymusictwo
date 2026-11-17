import { ThemeColors, radius, spacing, typography } from '@/constants/tokens'
import { useThemeColors } from '@/hooks/useAppTheme'
import { getDeviceKey, listDevices, revokeDevice, type CloudDevice } from '@/cloud'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
	ActivityIndicator,
	Alert,
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const formatTime = (iso: string | null) => {
	if (!iso) return '—'
	const date = new Date(iso)
	const pad = (n: number) => String(n).padStart(2, '0')
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const DevicesScreen = () => {
	const colors = useThemeColors()
	const styles = useMemo(() => createStyles(colors), [colors])
	const insets = useSafeAreaInsets()

	const [devices, setDevices] = useState<CloudDevice[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const currentKey = useMemo(() => getDeviceKey(), [])

	const load = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			setDevices(await listDevices())
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err))
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		void load()
	}, [load])

	const handleRevoke = (device: CloudDevice) => {
		Alert.alert('撤销授权', `撤销后「${device.name ?? device.model ?? '这台设备'}」需要重新登录才能同步`, [
			{ text: '取消', style: 'cancel' },
			{
				text: '撤销',
				style: 'destructive',
				onPress: async () => {
					try {
						await revokeDevice(device.device_key)
						await load()
					} catch (err) {
						Alert.alert('撤销失败', err instanceof Error ? err.message : String(err))
					}
				},
			},
		])
	}

	return (
		<View style={styles.container}>
			<View style={[styles.header, { paddingTop: insets.top + 12 }]}>
				<Pressable hitSlop={12} onPress={() => router.back()}>
					<Ionicons name="chevron-back" size={22} color={colors.primary} />
				</Pressable>
				<Text style={styles.title}>授权设备</Text>
				<View style={{ width: 22 }} />
			</View>

			<ScrollView
				contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
				refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.textMuted} />}
			>
				<Text style={styles.hint}>最多同时保留 5 台，超出时先在旧设备上撤销。</Text>

				{error ? <Text style={styles.error}>{error}</Text> : null}

				{devices.length === 0 && !loading ? (
					<Text style={styles.empty}>还没有登记过设备</Text>
				) : null}

				{devices.map((device) => {
					const isCurrent = device.device_key === currentKey
					const revoked = Boolean(device.revoked_at)
					return (
						<View key={device.id} style={[styles.row, revoked && { opacity: 0.45 }]}>
							<View style={styles.iconWrap}>
								<Ionicons
									name={device.os?.startsWith('iOS') ? 'phone-portrait-outline' : 'tablet-portrait-outline'}
									size={18}
									color={colors.primary}
								/>
							</View>
							<View style={{ flex: 1 }}>
								<View style={styles.nameRow}>
									<Text style={styles.name}>{device.name ?? device.model ?? '未知设备'}</Text>
									{isCurrent ? <Text style={styles.badge}>本机</Text> : null}
									{revoked ? <Text style={[styles.badge, styles.badgeOff]}>已撤销</Text> : null}
								</View>
								<Text style={styles.meta}>
									{device.os ?? ''} · v{device.app_version ?? '—'}
								</Text>
								<Text style={styles.meta}>最近活跃 {formatTime(device.last_seen_at)}</Text>
							</View>
							{!revoked ? (
								<Pressable hitSlop={8} onPress={() => handleRevoke(device)}>
									<Text style={styles.revoke}>撤销</Text>
								</Pressable>
							) : null}
						</View>
					)
				})}

				{loading && devices.length === 0 ? <ActivityIndicator style={{ marginTop: 24 }} /> : null}
			</ScrollView>
		</View>
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
		hint: {
			marginHorizontal: spacing.xl,
			marginBottom: spacing.sm,
			color: colors.textMuted,
			fontSize: 12.5,
			lineHeight: 18,
		},
		error: { marginHorizontal: spacing.xl, color: colors.error, fontSize: 13 },
		empty: { marginTop: spacing.xl, textAlign: 'center', color: colors.textMuted, fontSize: 13.5 },
		row: {
			marginHorizontal: spacing.lg,
			marginTop: spacing.sm,
			padding: spacing.md,
			borderRadius: radius.md,
			backgroundColor: colors.surfaceElevated,
			borderWidth: StyleSheet.hairlineWidth,
			borderColor: colors.border,
			flexDirection: 'row',
			alignItems: 'center',
			gap: spacing.md,
		},
		iconWrap: {
			width: 34,
			height: 34,
			borderRadius: 11,
			backgroundColor: colors.surfaceMuted,
			alignItems: 'center',
			justifyContent: 'center',
		},
		nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
		name: { color: colors.text, fontSize: 15, fontWeight: '600' },
		badge: {
			fontSize: 10,
			color: colors.primary,
			borderWidth: StyleSheet.hairlineWidth,
			borderColor: colors.primary,
			borderRadius: 6,
			paddingHorizontal: 5,
			paddingVertical: 1,
			overflow: 'hidden',
		},
		badgeOff: { color: colors.textMuted, borderColor: colors.border },
		meta: { color: colors.textMuted, fontSize: 11.5, marginTop: 3 },
		revoke: { color: '#F2678C', fontSize: 13 },
	})

export default DevicesScreen
