import { ThemeColors, radius, spacing, strokeWidth, typography } from '@/constants/tokens'
import { Playlist } from '@/helpers/types'
import { useThemeColors } from '@/hooks/useAppTheme'
import { useDefaultStyles } from '@/styles'
import { Ionicons } from '@expo/vector-icons'
import { useMemo } from 'react'
import { StyleSheet, Text, TouchableHighlight, TouchableHighlightProps, View } from 'react-native'
import FastImage from 'react-native-fast-image'

type PlaylistListItemProps = {
	playlist: Playlist
} & TouchableHighlightProps

export const PlaylistListItem = ({ playlist, ...props }: PlaylistListItemProps) => {
	const colors = useThemeColors()
	const defaultStyles = useDefaultStyles()
	const styles = useMemo(() => createStyles(colors, defaultStyles), [colors, defaultStyles])

	const songCount = playlist.songs?.length ?? 0
	const subtitle = songCount > 0 ? `${songCount}` : playlist.description || ''

	return (
		<TouchableHighlight activeOpacity={0.8} underlayColor={colors.surfaceMuted} {...props}>
			<View style={styles.playlistItemContainer}>
				<View style={styles.artworkWrap}>
					<FastImage
						source={{
							uri: playlist.coverImg ? playlist.coverImg : playlist.artwork,
							priority: FastImage.priority.normal,
						}}
						style={styles.playlistArtworkImage}
					/>
				</View>

				<View style={styles.textColumn}>
					<Text numberOfLines={1} style={styles.playlistNameText}>
						{playlist.title}
					</Text>
					{subtitle ? (
						<Text numberOfLines={1} style={styles.playlistMetaText}>
							{subtitle}
						</Text>
					) : null}
				</View>

				<Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
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
	artworkWrap: {
		borderRadius: radius.md,
		borderCurve: 'continuous',
		borderWidth: strokeWidth,
		borderColor: colors.border,
		overflow: 'hidden',
	},
	playlistArtworkImage: {
		width: 64,
		height: 64,
	},
	textColumn: {
		flex: 1,
		justifyContent: 'center',
	},
	playlistNameText: {
		...defaultStyles.text,
		...typography.headline,
	},
	playlistMetaText: {
		...typography.caption,
		color: colors.textMuted,
		marginTop: spacing.xxs + 1,
	},
	})
