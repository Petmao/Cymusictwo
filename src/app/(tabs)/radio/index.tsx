import { GradientScreen } from '@/components/GradientScreen'
import { RadioList } from '@/components/RadioList'
import { screenPadding } from '@/constants/tokens'
import { playlistNameFilter } from '@/helpers/filter'
import { Playlist } from '@/helpers/types'
import { useNavigationSearch } from '@/hooks/useNavigationSearch'
import { usePlaylists } from '@/store/library'
import i18n from '@/utils/i18n'
import { useHeaderHeight } from '@react-navigation/elements'
import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { ScrollView } from 'react-native'

const RadiolistsScreen = () => {
	const router = useRouter()
	const headerHeight = useHeaderHeight()

	const search = useNavigationSearch({
		searchBarOptions: {
			placeholder: i18n.t('find.inRadio'),
			cancelButtonText: i18n.t('find.cancel'),
		},
	})

	const { playlists } = usePlaylists()
	const filteredPlayLists = useMemo(() => {
		if (!search) return playlists
		return playlists.filter(playlistNameFilter(search))
	}, [search, playlists])

	const handlePlaylistPress = (playlist: Playlist) => {
		router.push(`/(tabs)/radio/${playlist.title}`)
	}

	return (
		<GradientScreen>
			{/* 导航条透明，顶部留白自己补，否则第一张卡会钻到搜索框底下 */}
			<ScrollView
				contentInsetAdjustmentBehavior="never"
				contentContainerStyle={{
					paddingTop: headerHeight,
					paddingHorizontal: screenPadding.horizontal,
					paddingBottom: 160,
				}}
			>
				<RadioList
					scrollEnabled={false}
					playlists={filteredPlayLists}
					onPlaylistPress={handlePlaylistPress}
				/>
			</ScrollView>
		</GradientScreen>
	)
}

export default RadiolistsScreen
