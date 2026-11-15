import appIcon from '@/assets/1024.png'
import { ThemeColors, elevation, radius, spacing, strokeWidth, typography } from '@/constants/tokens'
import { useThemeColors } from '@/hooks/useAppTheme'
import { musicApiStore } from '@/player/PlayerStore'
import { useDefaultStyles } from '@/styles'
import i18n from '@/utils/i18n'
import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { router } from 'expo-router'
import { useMemo } from 'react'
import {
	Image,
	ScrollView,
	StyleSheet,
	Text,
	TouchableHighlight,
	View,
} from 'react-native'

type RowProps = {
	icon: keyof typeof Ionicons.glyphMap
	label: string
	value?: string
	onPress?: () => void
	isLast?: boolean
	styles: ReturnType<typeof createStyles>
	colors: ThemeColors
}

const Row = ({ icon, label, value, onPress, isLast, styles, colors }: RowProps) => (
	<>
		<TouchableHighlight
			underlayColor={colors.surfaceMuted}
			onPress={onPress}
			disabled={!onPress}
			activeOpacity={0.7}
		>
			<View style={styles.row}>
				<View style={styles.rowIconWrap}>
					<Ionicons name={icon} size={16} color={colors.primary} />
				</View>
				<Text style={styles.rowLabel}>{label}</Text>
				{value ? <Text style={styles.rowValue}>{value}</Text> : null}
				{onPress ? (
					<Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
				) : null}
			</View>
		</TouchableHighlight>
		{!isLast ? <View style={styles.separator} /> : null}
	</>
)

const MineScreen = () => {
	const colors = useThemeColors()
	const defaultStyles = useDefaultStyles()
	const styles = useMemo(() => createStyles(colors, defaultStyles), [colors, defaultStyles])
	const musicApis = musicApiStore.useValue() ?? []
	const version = Constants.expoConfig?.version ?? '1.2.0'

	return (
		<View style={defaultStyles.container}>
			<ScrollView
				contentInsetAdjustmentBehavior="automatic"
				contentContainerStyle={styles.content}
			>
				<View style={styles.profileCard}>
					<View style={styles.avatarWrap}>
						<Image source={appIcon} style={styles.avatar} resizeMode="cover" />
					</View>
					<View style={styles.profileText}>
						<Text style={styles.profileName}>CyMusic</Text>
						<Text style={styles.profileMeta}>
							{i18n.t('mine.sources', { count: musicApis.length })}
						</Text>
					</View>
				</View>

				<Text style={styles.sectionTitle}>{i18n.t('mine.general')}</Text>
				<View style={styles.sectionCard}>
					<Row
						icon="settings-outline"
						label={i18n.t('settings.title')}
						onPress={() => router.push('/(modals)/settingModal')}
						isLast
						styles={styles}
						colors={colors}
					/>
				</View>

				<Text style={styles.sectionTitle}>{i18n.t('mine.about')}</Text>
				<View style={styles.sectionCard}>
					<Row
						icon="information-circle-outline"
						label={i18n.t('mine.version')}
						value={version}
						isLast
						styles={styles}
						colors={colors}
					/>
				</View>
			</ScrollView>
		</View>
	)
}

export default MineScreen

const createStyles = (
	colors: ThemeColors,
	defaultStyles: ReturnType<typeof useDefaultStyles>,
) =>
	StyleSheet.create({
	content: {
		paddingHorizontal: spacing.xl,
		paddingTop: spacing.sm,
		paddingBottom: 148,
	},
	profileCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.surfaceElevated,
		borderRadius: radius.xl,
		borderCurve: 'continuous',
		borderWidth: strokeWidth,
		borderColor: colors.border,
		padding: spacing.lg,
		...elevation.card,
	},
	avatarWrap: {
		borderRadius: radius.lg,
		borderCurve: 'continuous',
		overflow: 'hidden',
		borderWidth: strokeWidth,
		borderColor: colors.border,
	},
	avatar: {
		width: 68,
		height: 68,
	},
	profileText: {
		flex: 1,
		marginLeft: spacing.lg,
	},
	profileName: {
		...defaultStyles.text,
		...typography.title,
	},
	profileMeta: {
		...typography.caption,
		color: colors.textMuted,
		marginTop: spacing.xxs + 1,
	},
	sectionTitle: {
		...typography.label,
		color: colors.textMuted,
		marginTop: spacing.xl,
		marginBottom: spacing.sm,
		marginLeft: spacing.md,
	},
	sectionCard: {
		backgroundColor: colors.surfaceElevated,
		borderRadius: radius.md + 2,
		borderCurve: 'continuous',
		borderWidth: strokeWidth,
		borderColor: colors.border,
		overflow: 'hidden',
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: spacing.md + 2,
		paddingHorizontal: spacing.lg,
	},
	rowIconWrap: {
		width: 28,
		height: 28,
		borderRadius: radius.xs + 2,
		borderCurve: 'continuous',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.surfaceMuted,
		marginRight: spacing.md,
	},
	rowLabel: {
		flex: 1,
		fontSize: 16,
		letterSpacing: -0.1,
		color: colors.text,
	},
	rowValue: {
		fontSize: 15,
		color: colors.textMuted,
		marginRight: spacing.xs,
	},
	separator: {
		height: strokeWidth,
		backgroundColor: colors.separator,
		marginLeft: spacing.lg,
	},
	})
