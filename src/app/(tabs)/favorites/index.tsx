import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useMemo, useState } from 'react'
import {
	Image,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native'
import localImage from '@/assets/local.png'
import { Playlist } from '@/helpers/types'
import myTrackPlayer, { playListsStore } from '@/helpers/trackPlayerIndex'

const C = {
	pink: '#FF5F9E',
	pinkLight: '#FF8FBF',
	pinkDeep: '#FF2F7E',
	lilac: '#C4A6FF',
	mint: '#43E0D0',
	textSub: 'rgba(255,255,255,0.55)',
	line: 'rgba(255,255,255,0.10)',
	surfaceHi: 'rgba(255,255,255,0.075)',
}

const FIXED = {
	favorites: { c1: C.pink, c2: C.pinkDeep },
	local: { c1: C.lilac, c2: C.mint },
}

const FavoritesScreen = () => {
	const router = useRouter()
	const storedPlayLists = (playListsStore.useValue() || []) as Playlist[]
	const [search, setSearch] = useState('')

	const favoriteItem = {
		name: 'Favorites',
		id: 'favorites',
		tracks: [],
		title: '喜欢的歌曲',
		coverImg: 'https://y.qq.com/mediastyle/global/img/cover_like.png?max_age=2592000',
		description: '喜欢的歌曲',
	}
	const localItem = {
		name: 'Local',
		id: 'local',
		tracks: [],
		title: '本地/缓存歌曲',
		coverImg: Image.resolveAssetSource(localImage).uri,
		description: '本地/缓存歌曲',
	}

	const playLists = useMemo(
		() => [favoriteItem, localItem, ...storedPlayLists],
		[storedPlayLists],
	)

	const filtered = useMemo(() => {
		if (!search) return playLists as Playlist[]
		return playLists.filter((p) =>
			((p.title ?? p.name) || '').toLowerCase().includes(search.toLowerCase()),
		) as Playlist[]
	}, [playLists, search])

	const handlePress = (playlist: Playlist) => {
		if (playlist.name === 'Favorites') {
			router.push('/(tabs)/favorites/favoriteMusic' as never)
		} else if (playlist.name === 'Local') {
			router.push('/(tabs)/favorites/localMusic' as never)
		} else {
			router.push(`/(tabs)/favorites/${playlist.id}` as never)
		}
	}

	return (
		<SafeAreaView style={styles.safe} edges={['top']}>
			<LinearGradient colors={['#1B0A17', '#0A0509']} style={StyleSheet.absoluteFill} />
			<LinearGradient
				colors={['rgba(255,95,158,0.26)', 'rgba(255,95,158,0)']}
				start={{ x: 1, y: 0 }}
				end={{ x: 0.3, y: 0.5 }}
				style={StyleSheet.absoluteFill}
		/>
			<LinearGradient
				colors={['rgba(120,60,255,0.12)', 'rgba(120,60,255,0)']}
				start={{ x: 0, y: 0 }}
				end={{ x: 0.5, y: 0.4 }}
				style={StyleSheet.absoluteFill}
		/>

		<ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
			<View style={styles.topBar}>
				<TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.iconBtn}>
					<Ionicons name='chevron-back' size={20} color='rgba(255,255,255,0.7)' />
				</TouchableOpacity>
				<Text style={styles.topTitle}>收藏与歌单</Text>
				<View style={styles.iconBtn} />
			</View>

			<View style={styles.searchBox}>
				<Ionicons name='search' size={13} color='rgba(255,255,255,0.4)' />
				<TextInput
					style={styles.searchInput}
					placeholder='搜索歌单'
					placeholderTextColor='rgba(255,255,255,0.35)'
					value={search}
					onChangeText={setSearch}
				/>
			</View>

			<View style={styles.grid}>
				{filtered.map((p) => {
					const fixed = FIXED[p.id as keyof typeof FIXED]
					return (
						<TouchableOpacity key={p.id} activeOpacity={0.75} style={styles.cell} onPress={() => handlePress(p)}>
							<View style={styles.coverWrap}>
								{fixed ? (
									<LinearGradient
										colors={[fixed.c1, fixed.c2]}
										start={{ x: 0, y: 0 }}
										end={{ x: 1, y: 1 }}
										style={StyleSheet.absoluteFill}
									/>
								) : (
									<Image source={{ uri: p.coverImg ?? p.artwork }} style={StyleSheet.absoluteFill} contentFit='cover' />
								)}
								<View style={styles.countBadge}>
									<Text style={styles.countText}>{(p.songs?.length ?? 0)} 首</Text>
								</View>
							</View>
							<Text style={styles.cellTitle} numberOfLines={1}>{p.title ?? p.name}</Text>
							<Text style={styles.cellSub} numberOfLines={1}>{p.description ?? '自定义歌单'}</Text>
						</TouchableOpacity>
					)
				})}
			</View>

			{filtered.length === 0 && (
				<View style={styles.empty}>
					<Ionicons name='musical-notes' size={34} color='rgba(255,255,255,0.2)' />
					<Text style={styles.emptyText}>没有匹配的歌单</Text>
				</View>
			)}
		</ScrollView>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	safe: { flex: 1 },
	scroll: { paddingHorizontal: 16, paddingBottom: 32 },
	topBar: { flexDirection: 'row', alignItems: 'center', height: 45, marginBottom: 8 },
	iconBtn: {
		width: 36, height: 36, borderRadius: 18,
		justifyContent: 'center', alignItems: 'center',
		backgroundColor: 'rgba(255,255,255,0.06)',
	},
	topTitle: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
	searchBox: {
		flexDirection: 'row', alignItems: 'center', gap: 9,
		borderRadius: 13, paddingHorizontal: 13, height: 40,
		backgroundColor: C.surfaceHi, borderWidth: 1, borderColor: C.line,
		marginBottom: 14,
	},
	searchInput: { flex: 1, fontSize: 13, color: '#FFFFFF', padding: 0 },
	grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
	cell: { width: '47.5%' },
	coverWrap: {
		aspectRatio: 1, borderRadius: 14, overflow: 'hidden',
		backgroundColor: 'rgba(255,255,255,0.05)',
	},
	countBadge: {
		position: 'absolute', right: 5, bottom: 5,
		borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3,
		backgroundColor: 'rgba(0,0,0,0.42)',
	},
	countText: { fontSize: 9, fontWeight: '700', color: '#FFFFFF' },
	cellTitle: { marginTop: 7, fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
	cellSub: { marginTop: 2, fontSize: 9, color: C.textSub },
	empty: { alignItems: 'center', marginTop: 60, gap: 10 },
	emptyText: { fontSize: 12, color: C.textSub },
})

export default FavoritesScreen
