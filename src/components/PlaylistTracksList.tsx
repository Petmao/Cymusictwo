import { ThemeColors, elevation, radius, spacing, strokeWidth, typography } from '@/constants/tokens'
import { generateTracksListId } from '@/helpers/miscellaneous'
import { Playlist } from '@/helpers/types'
import { useThemeColors } from '@/hooks/useAppTheme'
import { useDefaultStyles } from '@/styles'
import i18n from '@/utils/i18n'
import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import FastImage from 'react-native-fast-image'
import { Track } from 'react-native-track-player'
import { QueueControls } from './QueueControls'
import { TracksList } from './TracksList'

type PlaylistTracksListProps = {
	playlist: Playlist
	tracks: Track[]
	allowDelete?: boolean
	onDeleteTrack?: (trackId: string) => void
	showImportMenu?: boolean
	onImportTrack?: () => void
	isMultiSelectMode?: boolean
	selectedTracks?: Set<string>
	toggleMultiSelectMode?: () => void
	onToggleSelection?: (trackId: string) => void
	onSelectAll?: () => void
	deleteSelectedTracks?: () => void
	exportSelectedTracks?: () => void
}

export const PlaylistTracksList = ({
	playlist,
	tracks,
	allowDelete = false,
	onDeleteTrack,
	showImportMenu = false,
	onImportTrack,
	isMultiSelectMode = false,
	selectedTracks = new Set(),
	onToggleSelection,
	toggleMultiSelectMode,
	onSelectAll,
	deleteSelectedTracks,
	exportSelectedTracks,
}: PlaylistTracksListProps) => {
	const colors = useThemeColors()
	const defaultStyles = useDefaultStyles()
	const styles = useMemo(() => createStyles(colors, defaultStyles), [colors, defaultStyles])

	return (
		<TracksList
			id={generateTracksListId(playlist.title)}
			scrollEnabled={false}
			hideQueueControls={true}
			ListHeaderComponentStyle={styles.playlistHeaderContainer}
			ListHeaderComponent={
				<View>
					<View style={styles.heroCard}>
						<View style={styles.heroArtworkWrap}>
							<FastImage
								source={{
									uri: playlist.coverImg || playlist.artwork,
									priority: FastImage.priority.high,
								}}
								style={styles.heroArtwork}
							/>
						</View>

						<View style={styles.heroText}>
							<Text numberOfLines={1} style={styles.heroTitle}>
								{playlist.title}
							</Text>
							<Text numberOfLines={1} style={styles.heroMeta}>
								{i18n.t('common.songsCount', { count: tracks.length })}
							</Text>
						</View>
					</View>

					<QueueControls
						style={{ paddingTop: spacing.lg }}
						tracks={tracks}
						showImportMenu={showImportMenu}
						onImportTrack={onImportTrack}
						isMultiSelectMode={isMultiSelectMode}
						onSelectAll={onSelectAll}
						isAllSelected={selectedTracks.size === tracks.length}
						deleteSelectedTracks={deleteSelectedTracks}
						exportSelectedTracks={exportSelectedTracks}
					/>
				</View>
			}
			tracks={tracks}
			allowDelete={allowDelete}
			onDeleteTrack={onDeleteTrack}
			isMultiSelectMode={isMultiSelectMode}
			selectedTracks={selectedTracks}
			onToggleSelection={onToggleSelection}
			toggleMultiSelectMode={toggleMultiSelectMode}
		/>
	)
}

const createStyles = (
	colors: ThemeColors,
	defaultStyles: ReturnType<typeof useDefaultStyles>,
) =>
	StyleSheet.create({
	playlistHeaderContainer: {
		flex: 1,
		marginBottom: spacing.xl,
	},
	heroCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.surfaceElevated,
		borderRadius: radius.lg,
		borderCurve: 'continuous',
		borderWidth: strokeWidth,
		borderColor: colors.border,
		padding: spacing.sm + 2,
		marginTop: spacing.sm,
		...elevation.card,
	},
	heroArtworkWrap: {
		borderRadius: radius.md,
		borderCurve: 'continuous',
		overflow: 'hidden',
		borderWidth: strokeWidth,
		borderColor: colors.border,
	},
	heroArtwork: {
		width: 56,
		height: 56,
	},
	heroText: {
		flex: 1,
		marginLeft: spacing.md,
	},
	heroTitle: {
		...defaultStyles.text,
		...typography.headline,
	},
	heroMeta: {
		...typography.caption,
		color: colors.textMuted,
		marginTop: spacing.xxs + 1,
	},
	})
