// helpers/searchAll.ts

import { searchArtist, searchMusic } from '@/helpers/userApi/xiaoqiu'
import { Track } from 'react-native-track-player'

const PAGE_SIZE = 20

type SearchType = 'songs' | 'artists'

const searchAll = async (
	searchText: string,
	page: number = 1,
	type: SearchType = 'songs',
): Promise<{ data: Track[]; hasMore: boolean }> => {
	const keyword = String(searchText ?? '').trim()
	if (!keyword) {
		return { data: [], hasMore: false }
	}

	console.log('search text+++', keyword, 'page:', page, 'type:', type)

	let result
	if (type === 'songs') {
		console.log('search song')
		result = await searchMusic(keyword, page, PAGE_SIZE)
	} else {
		console.log('search artist')
		result = await searchArtist(keyword, page)
		// console.log('search result', result)
		// Transform artist results to Track format
		result.data = result.data.map((artist) => ({
			id: artist.id,
			title: artist.name,
			artist: artist.name,
			artwork: artist.avatar,
			isArtist: true,
		})) as Track[]
	}

	const hasMore = result.data.length === PAGE_SIZE

	return {
		data: result.data as Track[],
		hasMore,
	}
}

export default searchAll
