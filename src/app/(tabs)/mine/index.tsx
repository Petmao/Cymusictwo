import { pickRandomQuote } from '@/constants/quotes'
import { ThemeColors, radius, spacing, strokeWidth, typography } from '@/constants/tokens'
import { useThemeColors } from '@/hooks/useAppTheme'
import { musicApiStore } from '@/player/PlayerStore'
import { useDefaultStyles } from '@/styles'
import i18n from '@/utils/i18n'
import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { router } from 'expo-router'
import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, TouchableHighlight, View } from 'react-native'

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
	// 每次进页面换一句，进一次烦一次
	const quote = useMemo(() => pickRandomQuote(), [])

	return (
		<View style={defaultStyles.container}>
			<ScrollView
				contentInsetAdjustmentBehavior="automatic"
				contentContainerStyle={styles.content}
			>
				<View style={styles.quoteCard}>
					<Text style={styles.quoteZh}>{quote.zh}</Text>
					<Text style={styles.quoteEn}>{quote.en}</Text>
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

				<Text style={styles.sectionTitle}>{i18n.t('mine.appInfo')}</Text>
				<View style={styles.sectionCard}>
					<Row
						icon="albums-outline"
						label={i18n.t('mine.sourcesLabel')}
						value={i18n.t('mine.sources', { count: musicApis.length })}
						styles={styles}
						colors={colors}
					/>
					<Row
						icon="document-text-outline"
						label={i18n.t('mine.logs')}
						onPress={() => router.push('/(modals)/logScreen')}
						styles={styles}
						colors={colors}
					/>
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
		paddingTop: spacing.md,
		paddingBottom: 148,
	},
	quoteCard: {
		backgroundColor: colors.surfaceElevated,
		borderRadius: radius.xl,
		borderCurve: 'continuous',
		borderWidth: strokeWidth,
		borderColor: colors.border,
		paddingVertical: spacing.xl,
		paddingHorizontal: spacing.lg,
	},
	quoteZh: {
		...defaultStyles.text,
		...typography.title,
		lineHeight: 32,
	},
	quoteEn: {
		...typography.body,
		color: colors.textMuted,
		marginTop: spacing.sm,
		lineHeight: 22,
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
