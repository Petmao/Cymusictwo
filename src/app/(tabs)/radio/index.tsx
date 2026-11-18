import { GradientScreen } from '@/components/GradientScreen'
import { InlineSearchBar } from '@/components/InlineSearchBar'
import { RadioList } from '@/components/RadioList'
import { screenPadding, spacing } from '@/constants/tokens'
import { playlistNameFilter } from '@/helpers/filter'
import { Playlist } from '@/helpers/types'
import { usePlaylists } from '@/store/library'
import i18n from '@/utils/i18n'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const RadiolistsScreen = () => {
	const router = useRouter()
	const [search, setSearch] = useState('')

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
			<SafeAreaView style={{ flex: 1 }} edges={['top']}>
				{/* 自绘搜索框：位置写在页面里，不会再被原生导航栏顶下去 */}
				<View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4 }}>
					<InlineSearchBar placeholder={i18n.t('find.inRadio')} onChange={setSearch} />
				</View>
				<ScrollView
					contentInsetAdjustmentBehavior="never"
					contentContainerStyle={{
						paddingHorizontal: screenPadding.horizontal,
						paddingBottom: 160,
						paddingTop: spacing.xs,
					}}
				>
					<RadioList
						scrollEnabled={false}
						playlists={filteredPlayLists}
						onPlaylistPress={handlePlaylistPress}
					/>
				</ScrollView>
			</SafeAreaView>
		</GradientScreen>
	)
}

export default RadiolistsScreen
