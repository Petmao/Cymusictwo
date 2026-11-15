import { ThemeColors, radius, spacing, strokeWidth, typography } from '@/constants/tokens'
import { Playlist } from '@/helpers/types'
import { useThemeColors } from '@/hooks/useAppTheme'
import { useDefaultStyles } from '@/styles'
import { AntDesign } from '@expo/vector-icons'
import { useMemo } from 'react'
import { StyleSheet, Text, TouchableHighlight, TouchableHighlightProps, View } from 'react-native'
import FastImage from 'react-native-fast-image'

type PlaylistListItemProps = {
	playlist: Playlist
} & TouchableHighlightProps

export const RadioListItem = ({ playlist, ...props }: PlaylistListItemProps) => {
	const colors = useThemeColors()
	const defaultStyles = useDefaultStyles()
	const styles = useMemo(() => createStyles(colors, defaultStyles), [colors, defaultStyles])

	return (
		<TouchableHighlight activeOpacity={0.8} underlayColor={colors.surfaceMuted} {...props}>
			<View style={styles.playlistItemContainer}>
				<View>
					<FastImage
						source={{
							uri: playlist.coverImg,
							priority: FastImage.priority.normal,
						}}
						style={styles.playlistArtworkImage}
					/>
				</View>

				<View
					style={{
						flex: 1,
						flexDirection: 'row',
						justifyContent: 'space-between',
						alignItems: 'center',
					}}
				>
					<Text numberOfLines={1} style={styles.playlistNameText}>
						{playlist.title}
					</Text>

					<AntDesign name="right" size={16} color={colors.textMuted} />
				</View>
			</View>
		</TouchableHighlight>
	)
}

const createStyles = (
	colors: ThemeColors,
	defaultStyles: ReturnType<typeof useDefaultStyles>,
) =>
	StyleSheet.create({
	playlistItemContainer: {
		flexDirection: 'row',
		columnGap: spacing.md + 2,
		alignItems: 'center',
		paddingVertical: spacing.xs + 2,
	},
	playlistArtworkImage: {
		borderRadius: radius.md,
		borderCurve: 'continuous',
		borderWidth: strokeWidth,
		borderColor: colors.border,
		width: 64,
		height: 64,
	},
	playlistNameText: {
		...defaultStyles.text,
		...typography.headline,
		flex: 1,
	},
	})
