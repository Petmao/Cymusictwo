import { unknownTrackImageUri } from '@/constants/images'
import { ThemeColors, screenPadding } from '@/constants/tokens'
import myTrackPlayer from '@/helpers/trackPlayerIndex'
import { useThemeColors } from '@/hooks/useAppTheme'
import { useDefaultStyles, useUtilsStyles } from '@/styles'
import { isSameMediaItem } from '@/utils/mediaItem'

import { getSingerMidBySingerName } from '@/helpers/userApi/getMusicSource'
import { FlashList } from '@shopify/flash-list'
import { router } from 'expo-router'
import React, { memo, useCallback, useMemo } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import FastImage from 'react-native-fast-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Track, useIsPlaying } from 'react-native-track-player'
import TracksListItem from './TracksListItem'

export type SearchListProps = {
	id: string
	tracks: Track[]
	hideQueueControls?: boolean
	onLoadMore: () => void
	hasMore: boolean
	isLoading: boolean
}

const ItemDivider = memo(() => {
	const utilsStyles = useUtilsStyles()
	return <View style={{ ...utilsStyles.itemSeparator, marginVertical: 6, marginLeft: 64 }} />
})

// 空结果不再提示文字：没搜到就留白，把位置让给搜索结果页自己的历史记录
const EmptyComponent = memo(() => null)

const FooterComponent = memo(({ isLoading }: { isLoading: boolean; hasMore: boolean }) => {

	if (isLoading) {
		return (
			<View style={{ paddingVertical: 20 }}>
				<ActivityIndicator size="large" />
			</View>
		)
	}
	// 没有更多结果时不再显示任何文字
	return null
})

const createStyles = (colors: ThemeColors) =>
	StyleSheet.create({
	artistItem: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	artistAvatar: {
		width: 50,
		height: 50,
		borderRadius: 5,
		marginRight: 13,
	},
	artistName: {
		fontSize: 16,
		color: colors.text,
	},
	})

export const SearchList: React.FC<SearchListProps> = ({
	tracks,
	onLoadMore,
	hasMore,
	isLoading,
}) => {
	const colors = useThemeColors()
	const defaultStyles = useDefaultStyles()
	const styles = useMemo(() => createStyles(colors), [colors])
	const currentMusic = myTrackPlayer.useCurrentMusic()
	const { playing } = useIsPlaying()

	const handleTrackSelect = useCallback(async (selectedTrack: Track) => {
		if (selectedTrack.isArtist) {
			if (!selectedTrack.artist.includes('未知')) {
				getSingerMidBySingerName(selectedTrack.artist).then((singerMid) => {
					if (singerMid) {
						router.navigate(`/(modals)/${singerMid}`)
					}
				})
			}
			return
		}
		await myTrackPlayer.play(selectedTrack as IMusic.IMusicItem)
	}, [])

	const renderItem = useCallback(
		({ item: track }: { item: Track }) => {
			if (track.isArtist) {
				return (
					<TouchableOpacity style={styles.artistItem} onPress={() => handleTrackSelect(track)}>
						<FastImage
							source={{ uri: track.artwork || unknownTrackImageUri }}
							style={styles.artistAvatar}
						/>
						<Text style={styles.artistName}>{track.title}</Text>
					</TouchableOpacity>
				)
			}
			const isActiveTrack = isSameMediaItem(
				track as IMusic.IMusicItem,
				currentMusic as IMusic.IMusicItem | null | undefined,
			)
			return (
				<TracksListItem
					track={track}
					onTrackSelect={handleTrackSelect}
					isActiveTrack={isActiveTrack}
					isPlaying={isActiveTrack && !!playing}
				/>
			)
		},
		[handleTrackSelect, currentMusic, playing, styles.artistAvatar, styles.artistItem, styles.artistName],
	)

	const keyExtractor = useCallback((item: Track, index: number) => `${item.id}-${index}`, [])

	const handleEndReached = useCallback(() => {
		if (hasMore && !isLoading && tracks.length >= 20) {
			onLoadMore()
		}
	}, [hasMore, isLoading, tracks.length, onLoadMore])
	const insets = useSafeAreaInsets()

	const footerComponent = useMemo(
		() => <FooterComponent isLoading={isLoading} hasMore={hasMore} />,
		[isLoading, hasMore],
	)
	const listExtraData = useMemo(
		() => ({
			currentTrackId: currentMusic?.id ?? null,
			currentTrackPlatform: currentMusic?.platform ?? null,
			playing,
		}),
		[currentMusic?.id, currentMusic?.platform, playing],
	)

	return (
		<View style={[defaultStyles.container]}>
			<FlashList
				data={tracks}
				extraData={listExtraData}
				contentContainerStyle={{
					paddingTop: 60,
					paddingBottom: 128 + insets.bottom,
					paddingHorizontal: screenPadding.horizontal,
				}}
				ItemSeparatorComponent={ItemDivider}
				ListEmptyComponent={!isLoading ? EmptyComponent : null}
				renderItem={renderItem}
				keyExtractor={keyExtractor}
				onEndReached={handleEndReached}
				onEndReachedThreshold={0.1}
				ListFooterComponent={footerComponent}
				estimatedItemSize={68}
				keyboardDismissMode="on-drag"
				keyboardShouldPersistTaps="handled"
			/>
		</View>
	)
}

export default memo(SearchList)
