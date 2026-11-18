import { GradientScreen } from '@/components/GradientScreen'
import { SearchList } from '@/components/SearchList'
import { ThemeColors, radius, spacing, typography } from '@/constants/tokens'
import { useAppTheme, useThemeColors } from '@/hooks/useAppTheme'
import searchAll from '@/helpers/searchAll'
import { useNavigationSearch } from '@/hooks/useNavigationSearch'
import {
	addSearchHistory,
	clearSearchHistory,
	removeSearchHistory,
	useSearchHistory,
} from '@/store/searchHistory'
import i18n from '@/utils/i18n'
import { Ionicons } from '@expo/vector-icons'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	Animated,
	Dimensions,
	FlatList,
	Platform,
	Pressable,
	SafeAreaView,
	StyleSheet,
	Text,
	View,
} from 'react-native'
import { Track } from 'react-native-track-player'

type SearchType = 'songs' | 'artists'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const SEGMENT_WIDTH = (SCREEN_WIDTH - 32 - 4) / 2 // 32 for padding, 4 for container padding
const SEARCH_OFFSET = Platform.select({
	ios: SCREEN_HEIGHT * 0.11, // 约11%的屏幕高度
	android: 0,
})

/** 结果缓存：同一个关键词回来时先给旧结果，再去刷新，避免"回来一片空白" */
const resultsCache = new Map<string, { data: Track[]; hasMore: boolean }>()
const CACHE_LIMIT = 24
const cacheKeyOf = (type: SearchType, query: string) => `${type}:${query}`

/** 上次搜了什么：从播放页回来时用它恢复现场 */
let lastSearchSession: { keyword: string; type: SearchType } | null = null

const SearchlistsScreen = () => {
	const colors = useThemeColors()
	const { gradients, isDark } = useAppTheme()
	const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark])
	// const router = useRouter()
	const [searchResults, setSearchResults] = useState<Track[]>([])
	const [page, setPage] = useState(1)
	const [isLoading, setIsLoading] = useState(false)
	const [hasMore, setHasMore] = useState(true)
	const searchRequestRef = useRef(0)
	const [searchType, setSearchType] = useState<SearchType>(lastSearchSession?.type ?? 'songs')
	// 点历史记录时用它顶替输入框内容，输入框本身不用回填
	const [pickedKeyword, setPickedKeyword] = useState<string | null>(lastSearchSession?.keyword ?? null)
	const [history] = useSearchHistory()
	const slideAnim = useRef(
		new Animated.Value(lastSearchSession?.type === 'artists' ? SEGMENT_WIDTH : 0),
	).current
	const contentOffsetAnim = useRef(new Animated.Value(0)).current

	const handleSearchFocus = useCallback(() => {
		Animated.spring(contentOffsetAnim, {
			toValue: -SEARCH_OFFSET,
			useNativeDriver: true,
			tension: 100,
			friction: 10,
		}).start()
	}, [contentOffsetAnim])

	const handleSearchCancel = useCallback(() => {
		// 取消搜索要连"历史/会话带进来的关键词"一起清，否则仍停在结果页
		setPickedKeyword(null)
		Animated.spring(contentOffsetAnim, {
			toValue: 0,
			useNativeDriver: true,
			tension: 100,
			friction: 10,
		}).start()
	}, [contentOffsetAnim])

	// 一定要 memo：对象字面量会让原生搜索框每次渲染都被重配，输入就没反应了
	const searchBarOptions = useMemo(
		() => ({
			placeholder: i18n.t('find.inSearch'),
			cancelButtonText: i18n.t('find.cancel'),
		}),
		[],
	)

	const search = useNavigationSearch({
		searchBarOptions,
		onFocus: handleSearchFocus,
		onCancel: handleSearchCancel,
	})

	// 用户真开始打字了，就放弃历史/会话带来的关键词（挂载时 search 为空，不会误清）
	useEffect(() => {
		if (!search) return
		setPickedKeyword(null)
	}, [search])

	const effectiveSearch = (pickedKeyword ?? search ?? '').trim()

	const applyResults = useCallback(
		(query: string, type: SearchType, data: Track[], moreResults: boolean, currentPage: number) => {
			setHasMore(moreResults)
			setSearchResults((prevResults) => (currentPage === 1 ? data : [...prevResults, ...data]))
			setPage(currentPage)
			lastSearchSession = { keyword: query, type }

			if (currentPage === 1) {
				const key = cacheKeyOf(type, query)
				resultsCache.set(key, { data, hasMore: moreResults })
				if (resultsCache.size > CACHE_LIMIT) {
					const oldest = resultsCache.keys().next()
					if (!oldest.done) resultsCache.delete(oldest.value)
				}
				if (data.length > 0) addSearchHistory(query, type)
			}
		},
		[],
	)

	const fetchSearchResults = useCallback(
		async (currentPage: number) => {
			if (!effectiveSearch) {
				return
			}

			const requestId = ++searchRequestRef.current
			setIsLoading(true)

			const run = () => searchAll(effectiveSearch, currentPage, searchType)

			try {
				let result
				try {
					result = await run()
				} catch (firstError) {
					// 这个接口偶尔抽风（限流 / 空 body），静默重试一次再放弃
					console.warn('search failed once, retrying:', firstError)
					result = await run()
				}

				if (requestId === searchRequestRef.current) {
					applyResults(
						effectiveSearch,
						searchType,
						result.data,
						result.hasMore,
						currentPage,
					)
				}
			} catch (error) {
				console.error('Error fetching search results:', error)
				// 刷新失败就把上一次的结果留住，别把列表清空
				if (requestId === searchRequestRef.current && currentPage === 1) {
					const cached = resultsCache.get(cacheKeyOf(searchType, effectiveSearch))
					if (cached) {
						setSearchResults(cached.data)
						setHasMore(cached.hasMore)
					}
				}
			} finally {
				if (requestId === searchRequestRef.current) {
					setIsLoading(false)
				}
			}
		},
		[effectiveSearch, searchType, applyResults],
	)

	useEffect(() => {
		setPage(1)
		setHasMore(true)
		searchRequestRef.current++

		if (!effectiveSearch) {
			setIsLoading(false)
			setHasMore(false)
			setSearchResults([])
			return () => {
				searchRequestRef.current++
			}
		}

		const cached = resultsCache.get(cacheKeyOf(searchType, effectiveSearch))
		setSearchResults(cached?.data ?? [])
		if (cached) setHasMore(cached.hasMore)

		fetchSearchResults(1)

		return () => {
			searchRequestRef.current++
		}
	}, [effectiveSearch, searchType, fetchSearchResults])

	const handleLoadMore = useCallback(() => {
		if (!isLoading && hasMore && effectiveSearch) {
			fetchSearchResults(page + 1)
		}
	}, [isLoading, hasMore, page, fetchSearchResults, effectiveSearch])

	const moveSegment = useCallback(
		(type: SearchType) => {
			Animated.spring(slideAnim, {
				toValue: type === 'songs' ? 0 : SEGMENT_WIDTH,
				useNativeDriver: true,
				tension: 100,
				friction: 10,
			}).start()
		},
		[slideAnim],
	)

	const handleSearchTypeChange = (type: SearchType) => {
		moveSegment(type)
		setSearchType(type)
	}

	const handlePickHistory = (keyword: string, type: SearchType) => {
		moveSegment(type)
		setSearchType(type)
		setPickedKeyword(keyword)
	}

	return (
		<GradientScreen>
			<SafeAreaView style={styles.safeArea}>
			<Animated.View
				style={[
					styles.contentContainer,
					{
						transform: [{ translateY: contentOffsetAnim }],
					},
				]}
			>
				<View style={styles.segmentedControlContainer}>
					<View style={styles.segmentedControl}>
						<Animated.View
							style={[
								styles.activeSegment,
								{
									position: 'absolute',
									width: SEGMENT_WIDTH,
									transform: [{ translateX: slideAnim }],
								},
							]}
						/>
						<Pressable
							style={[styles.segment, { borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }]}
							onPress={() => handleSearchTypeChange('songs')}
						>
							<Text
								style={[styles.segmentText, searchType === 'songs' && styles.activeSegmentText]}
							>
								{i18n.t('find.songs')}
							</Text>
						</Pressable>
						<Pressable
							style={[styles.segment, { borderTopRightRadius: 8, borderBottomRightRadius: 8 }]}
							onPress={() => handleSearchTypeChange('artists')}
						>
							<Text
								style={[styles.segmentText, searchType === 'artists' && styles.activeSegmentText]}
							>
								{i18n.t('find.artists')}
							</Text>
						</Pressable>
					</View>
				</View>

				{effectiveSearch ? (
					<SearchList
						tracks={searchResults}
						id={'search'}
						onLoadMore={handleLoadMore}
						hasMore={hasMore}
						isLoading={isLoading}
					/>
				) : (
					<View style={styles.historyContainer}>
						{history.length > 0 && (
							<View style={styles.historyHeader}>
								<Text style={styles.historyTitle}>{i18n.t('find.historyTitle')}</Text>
								<Pressable
									hitSlop={8}
									onPress={() => clearSearchHistory()}
									style={styles.historyClearButton}
								>
									<Ionicons name="trash-outline" size={14} color={colors.textMuted} />
									<Text style={styles.historyClearText}>{i18n.t('find.clearHistory')}</Text>
								</Pressable>
							</View>
						)}
						<FlatList
							data={history}
							keyExtractor={(item) => `${item.type}:${item.keyword}`}
							keyboardShouldPersistTaps="handled"
							contentContainerStyle={styles.historyList}
							renderItem={({ item }) => (
								<Pressable
									onPress={() => handlePickHistory(item.keyword, item.type)}
									onLongPress={() => removeSearchHistory(item.keyword, item.type)}
									style={({ pressed }) => [
										styles.historyRow,
										pressed && { backgroundColor: colors.surfaceElevated },
									]}
								>
									<Ionicons
										name="time-outline"
										size={16}
										color={colors.textMuted}
										style={styles.historyIcon}
									/>
									<Text numberOfLines={1} style={styles.historyKeyword}>
										{item.keyword}
									</Text>
									<Text style={styles.historyType}>
										{item.type === 'songs' ? i18n.t('find.songs') : i18n.t('find.artists')}
									</Text>
								</Pressable>
							)}
						/>
					</View>
				)}
			</Animated.View>
			</SafeAreaView>
		</GradientScreen>
	)
}

const createStyles = (colors: ThemeColors, isDark: boolean) =>
	StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: 'transparent',
	},
	safeArea: {
		flex: 1,
		backgroundColor: 'transparent',
	},
	contentContainer: {
		flex: 1,
		backgroundColor: 'transparent',
		paddingTop: 8,
	},
	segmentedControlContainer: {
		paddingHorizontal: 16,
		marginTop: 0,
		paddingBottom: 4,
	},
	segmentedControl: {
		flexDirection: 'row',
		backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.62)',
		borderRadius: 8,
		padding: 2,
		position: 'relative',
	},
	segment: {
		flex: 1,
		paddingVertical: 6,
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 1,
	},
	activeSegment: {
		backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : '#FFFFFF',
		borderRadius: 6,
		shadowColor: colors.shadow,
		shadowOffset: {
			width: 0,
			height: 1,
		},
		shadowOpacity: 0.15,
		shadowRadius: 2,
		elevation: 2,
		position: 'absolute',
		top: 2,
		bottom: 2,
		zIndex: 0,
	},
	segmentText: {
		fontSize: 15,
		color: colors.textMuted,
	},
	activeSegmentText: {
		color: colors.primary,
		fontWeight: '500',
	},
	historyContainer: {
		flex: 1,
		paddingTop: spacing.lg,
	},
	historyHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: spacing.xl,
		paddingBottom: spacing.sm,
	},
	historyTitle: {
		...typography.label,
		color: colors.textMuted,
	},
	historyClearButton: {
		flexDirection: 'row',
		alignItems: 'center',
		columnGap: 4,
	},
	historyClearText: {
		fontSize: 12,
		color: colors.textMuted,
	},
	historyList: {
		paddingHorizontal: spacing.lg,
		paddingBottom: 140,
	},
	historyRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: spacing.md,
		paddingHorizontal: spacing.sm,
		borderRadius: radius.sm,
	},
	historyIcon: {
		marginRight: spacing.sm,
	},
	historyKeyword: {
		flex: 1,
		fontSize: 15,
		letterSpacing: -0.1,
		color: colors.text,
	},
	historyType: {
		marginLeft: spacing.sm,
		fontSize: 12,
		color: colors.textMuted,
	},
	})

export default SearchlistsScreen
