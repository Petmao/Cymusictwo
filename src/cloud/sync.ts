import PersistStatus from '@/store/PersistStatus'

import { requireClient } from './client'

/**
 * 云同步：喜欢的歌曲 + 歌单 + 歌单曲目。
 *
 * 合并策略（没有本地时间戳，所以只做"并集 + 云端墓碑"）：
 *  1. 先把本地全量 upsert 到云端（updated_at 由数据库 now() 覆盖）
 *  2. 再把云端非删除行拉回来，与本地做并集
 *  3. 云端 deleted = true 的行，在本地移除
 * 这样换设备登录后能拿到全部歌单，而不会把新设备上的内容冲掉。
 */

type AnyItem = Record<string, any>

const CHUNK = 400

const chunk = <T,>(arr: T[], size: number): T[][] => {
	const out: T[][] = []
	for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
	return out
}

const songKey = (item: AnyItem) => `${item.platform ?? 'tx'}:${String(item.id ?? '')}`

const toFavoriteRow = (item: AnyItem, userId: string) => ({
	user_id: userId,
	song_id: String(item.id ?? ''),
	platform: String(item.platform ?? 'tx'),
	title: String(item.title ?? ''),
	artist: String(item.artist ?? ''),
	album: item.album ?? null,
	artwork: item.artwork ?? null,
	duration: typeof item.duration === 'number' ? Math.round(item.duration) : null,
	deleted: false,
})

const rowToItem = (row: AnyItem) => ({
	id: row.song_id,
	platform: row.platform ?? 'tx',
	title: row.title ?? '',
	artist: row.artist ?? '',
	album: row.album ?? undefined,
	artwork: row.artwork ?? undefined,
	duration: row.duration ?? 0,
	url: 'Unknown',
})

const getLocalFavorites = (): AnyItem[] => (PersistStatus.get('music.favorites') as AnyItem[]) ?? []
const getLocalPlaylists = (): AnyItem[] => (PersistStatus.get('music.playLists') as AnyItem[]) ?? []

const pushFavorites = async (userId: string) => {
	const client = requireClient()
	const local = getLocalFavorites()
	if (!local.length) return 0
	const rows = local.filter((item) => item?.id).map((item) => toFavoriteRow(item, userId))
	for (const part of chunk(rows, CHUNK)) {
		const { error } = await client
			.from('favorites')
			.upsert(part, { onConflict: 'user_id,platform,song_id' })
		if (error) throw new Error(error.message)
	}
	return rows.length
}

const pushPlaylists = async (userId: string) => {
	const client = requireClient()
	const playlists = getLocalPlaylists()
	if (!playlists.length) return { playlists: 0, items: 0 }

	const playlistRows = playlists.map((pl) => ({
		user_id: userId,
		id: String(pl.id),
		name: String(pl.name ?? pl.title ?? '未命名歌单'),
		cover_url: pl.artwork ?? null,
		deleted: false,
	}))
	const { error: plError } = await client
		.from('playlists')
		.upsert(playlistRows, { onConflict: 'user_id,id' })
	if (plError) throw new Error(plError.message)

	const itemRows: AnyItem[] = []
	for (const pl of playlists) {
		const songs = Array.isArray(pl.songs) ? pl.songs : []
		songs.forEach((song: AnyItem, index: number) => {
			if (!song?.id) return
			itemRows.push({
				user_id: userId,
				playlist_id: String(pl.id),
				song_id: String(song.id),
				platform: String(song.platform ?? 'tx'),
				title: String(song.title ?? ''),
				artist: String(song.artist ?? ''),
				album: song.album ?? null,
				artwork: song.artwork ?? null,
				duration: typeof song.duration === 'number' ? Math.round(song.duration) : null,
				position: index,
				deleted: false,
			})
		})
	}

	for (const part of chunk(itemRows, CHUNK)) {
		const { error } = await client
			.from('playlist_items')
			.upsert(part, { onConflict: 'user_id,playlist_id,platform,song_id' })
		if (error) throw new Error(error.message)
	}

	return { playlists: playlistRows.length, items: itemRows.length }
}

const pullFavorites = async (userId: string) => {
	const client = requireClient()
	const { data, error } = await client
		.from('favorites')
		.select('song_id,platform,title,artist,album,artwork,duration,deleted')
		.eq('user_id', userId)
	if (error) throw new Error(error.message)

	const cloud = (data ?? []) as AnyItem[]
	const deletedKeys = new Set(cloud.filter((r) => r.deleted).map((r) => songKey({ id: r.song_id, platform: r.platform })))
	const local = getLocalFavorites().filter((item) => !deletedKeys.has(songKey(item)))
	const seen = new Set(local.map(songKey))
	let added = 0
	for (const row of cloud) {
		if (row.deleted) continue
		const item = rowToItem(row)
		const key = songKey(item)
		if (seen.has(key)) continue
		seen.add(key)
		local.unshift(item)
		added++
	}
	PersistStatus.set('music.favorites', local as any)
	return { total: local.length, added }
}

const pullPlaylists = async (userId: string) => {
	const client = requireClient()
	const [{ data: plData, error: plError }, { data: itemData, error: itemError }] = await Promise.all([
		client.from('playlists').select('id,name,cover_url,deleted').eq('user_id', userId),
		client
			.from('playlist_items')
			.select('playlist_id,song_id,platform,title,artist,album,artwork,duration,position,deleted')
			.eq('user_id', userId)
			.order('position', { ascending: true }),
	])
	if (plError) throw new Error(plError.message)
	if (itemError) throw new Error(itemError.message)

	const cloudPlaylists = (plData ?? []) as AnyItem[]
	const cloudItems = (itemData ?? []) as AnyItem[]
	const deletedPlaylistIds = new Set(cloudPlaylists.filter((p) => p.deleted).map((p) => String(p.id)))

	const local = getLocalPlaylists().filter((pl) => !deletedPlaylistIds.has(String(pl.id)))
	const byId = new Map<string, AnyItem>(local.map((pl) => [String(pl.id), pl]))
	let addedPlaylists = 0
	let addedItems = 0

	for (const row of cloudPlaylists) {
		if (row.deleted) continue
		const id = String(row.id)
		let target = byId.get(id)
		if (!target) {
			target = {
				id,
				platform: 'tx',
				artist: '',
				title: row.name ?? '未命名歌单',
				name: row.name ?? '未命名歌单',
				artwork: row.cover_url ?? undefined,
				songs: [],
			}
			byId.set(id, target)
			local.push(target)
			addedPlaylists++
		} else if (!target.name && row.name) {
			target.name = row.name
			target.title = row.name
		}
	}

	const deletedItemKeys = new Set(
		cloudItems.filter((r) => r.deleted).map((r) => `${r.playlist_id}:${songKey({ id: r.song_id, platform: r.platform })}`),
	)

	for (const row of cloudItems) {
		if (row.deleted) continue
		const target = byId.get(String(row.playlist_id))
		if (!target) continue
		const songs: AnyItem[] = Array.isArray(target.songs) ? target.songs : (target.songs = [])
		target.songs = songs.filter(
			(song) => !deletedItemKeys.has(`${row.playlist_id}:${songKey(song)}`),
		)
		const exists = target.songs.some((song) => songKey(song) === songKey({ id: row.song_id, platform: row.platform }))
		if (!exists) {
			target.songs.push(rowToItem(row))
			addedItems++
		}
	}

	PersistStatus.set('music.playLists', local as any)
	return { total: local.length, addedPlaylists, addedItems }
}

export type SyncResult = {
	favorites: { total: number; added: number }
	playlists: { total: number; addedPlaylists: number; addedItems: number }
	pushedFavorites: number
	pushedPlaylists: { playlists: number; items: number }
}

/** 一键同步：推本地 → 拉云端 → 合并写回本地 */
export const syncNow = async (userId: string): Promise<SyncResult> => {
	const pushedFavorites = await pushFavorites(userId)
	const pushedPlaylists = await pushPlaylists(userId)
	const favorites = await pullFavorites(userId)
	const playlists = await pullPlaylists(userId)

	try {
		requireClient()
			.from('sync_state')
			.upsert(
				{ user_id: userId, last_pull_at: new Date().toISOString(), last_push_at: new Date().toISOString() },
				{ onConflict: 'user_id' },
			)
			.then(() => undefined)
	} catch {
		// 水位写失败不影响主流程
	}

	return { favorites, playlists, pushedFavorites, pushedPlaylists }
}

/** 只拉不推：换设备登录后想先看看云端有什么 */
export const pullOnly = async (userId: string) => {
	const favorites = await pullFavorites(userId)
	const playlists = await pullPlaylists(userId)
	return { favorites, playlists }
}
