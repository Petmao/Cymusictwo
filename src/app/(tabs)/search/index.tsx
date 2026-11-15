import { SearchList } from '@/components/SearchList'
import { ThemeColors, radius, spacing, typography } from '@/constants/tokens'
import { useThemeColors } from '@/hooks/useAppTheme'
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
import debounce from 'lodash/debounce'
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

const SearchlistsScreen = () => {
	const colors = useThemeColors()
	const styles = useMemo(() => createStyles(colors), [colors])
	// const router = useRouter()
	const [searchResults, setSearchResults] = useState<Track[]>([])
	const [page, setPage] = useState(1)
	const [isLoading, setIsLoading] = useState(false)
	const [hasMore, setHasMore] = useState(true)
	const searchRequestRef = useRef(0)
	const [searchType, setSearchType] = useState<SearchType>('songs')
	// 点历史记录时用它顶替输入框内容，输入框本身不用回填
	const [pickedKeyword, setPickedKeyword] = useState<string | null>(null)
	const [history] = useSearchHistory()
	const slideAnim = useRef(new Animated.Value(0)).current
	const contentOffsetAnim = useRef(new Animated.Value(0)).current
	const search = useNavigationSearch({
		searchBarOptions: {
			placeholder: i18n.t('find.inSearch'),
			cancelButtonText: i18n.t('find.cancel'),
		},
		onFocus: () => {
			Animated.spring(contentOffsetAnim, {
				toValue: -SEARCH_OFFSET,
				useNativeDriver: true,
				tension: 100,
				friction: 10,
			}).start()
		},
		onCancel: () => {
			Animated.spring(contentOffsetAnim, {
				toValue: 0,
				useNativeDriver: true,
				tension: 100,
				friction: 10,
			}).start()
		},
	})

	// 输入框一变，就放弃历史记录带来的关键词
	useEffect(() => {
		setPickedKeyword(null)
	}, [search])

	const effectiveSearch = (pickedKeyword ?? search ?? '').trim()

	const fetchSearchResults = useCallback(
		async (currentPage: number) => {
			if (!effectiveSearch) {
				return
			}

			const requestId = ++searchRequestRef.current
			setIsLoading(true)

			try {
				const { data, hasMore: moreResults } = await searchAll(
					effectiveSearch,
					currentPage,
					searchType,
				)

				if (requestId === searchRequestRef.current) {
					setHasMore(moreResults)
					setSearchResults((prevResults) => {
						const newResults = currentPage === 1 ? data : [...prevResults, ...data]

						return newResults
					})

					setPage(currentPage)

					if (currentPage === 1 && data.length > 0) {
						addSearchHistory(effectiveSearch, searchType)
					}
				}
			} catch (error) {
				console.error('Error fetching search results:', error)
			} finally {
				if (requestId === searchRequestRef.current) {
					setIsLoading(false)
				}
			}
		},
		[effectiveSearch, searchType],
	)
	const debouncedFetchSearchResults = useRef(
		debounce((currentPage: number) => {
			fetchSearchResults(currentPage)
		}, 300),
	).current

	useEffect(() => {
		debouncedFetchSearchResults.cancel()
	}, [effectiveSearch])

	useEffect(() => {
		setPage(1)
		setHasMore(true)
		setSearchResults([])
		searchRequestRef.current++

		if (!effectiveSearch) {
			setIsLoading(false)
			setHasMore(false)
			setSearchResults([])
		} else {
			fetchSearchResults(1)
		}

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
	)
}

const createStyles = (colors: ThemeColors) =>
	StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.background,
	},
	safeArea: {
		flex: 1,
		backgroundColor: colors.background,
	},
	contentContainer: {
		flex: 1,
		backgroundColor: colors.background,
		paddingTop: 8,
	},
	segmentedControlContainer: {
		paddingHorizontal: 16,
		marginTop: 0,
		paddingBottom: 4,
	},
	segmentedControl: {
		flexDirection: 'row',
		backgroundColor: colors.background,
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
		backgroundColor: colors.surfaceElevated,
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
