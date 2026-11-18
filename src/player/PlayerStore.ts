import { MusicRepeatMode } from '@/helpers/types'
import getOrCreateMMKV from '@/store/getOrCreateMMKV'
import PersistStatus from '@/store/PersistStatus'
import { GlobalState } from '@/utils/stateMapper'

/** 当前播放 */
export const currentMusicStore = new GlobalState<IMusic.IMusicItem | null>(null)
/** 歌单 */
export const playListsStore = new GlobalState<IMusic.PlayList[] | []>(null)
/** 播放模式 */
export const repeatModeStore = new GlobalState<MusicRepeatMode>(MusicRepeatMode.QUEUE)
/** 音质 */
export const qualityStore = new GlobalState<IMusic.IQualityKey>('128k')
/** 音源 */
export const musicApiStore = new GlobalState<IMusic.MusicApi[] | []>(null)
/** 当前音源 */
export const musicApiSelectedStore = new GlobalState<IMusic.MusicApi>(null)
/** 音源状态 */
export const nowApiState = new GlobalState<string>('正常')
/** 是否自动缓存本地 */
export const autoCacheLocalStore = new GlobalState<boolean>(true)
/** 是否显示已缓存图标 */
export const isCachedIconVisibleStore = new GlobalState<boolean>(true)
/** 首页加载歌曲数量 */
export const songsNumsToLoadStore = new GlobalState<number>(100)
/** 已导入的本地音乐 */
export const importedLocalMusicStore = new GlobalState<IMusic.IMusicItem[] | []>(null)
/** 当前歌词 */
export const nowLyricState = new GlobalState<string>(null)
/** 切歌中的按钮方向 */
export const trackSkipLoadingStore = new GlobalState<'next' | 'previous' | null>(null)
/** 当前曲目音源解析中 */
export const trackSourceLoadingStore = new GlobalState<string | null>(null)

/**
 * 歌单内存态跟着磁盘走。
 *
 * 云同步拉取是直接 PersistStatus.set('music.playLists', …) 写 MMKV 的，
 * 而 playListsStore 只是个内存对象，不监听磁盘，所以拉下来的歌单
 * 要等重启才出现。这里补一个监听：谁写盘都回灌到内存。
 */
try {
	getOrCreateMMKV('appPersistStatus').addOnValueChangedListener((changedKey) => {
		if (changedKey !== 'music.playLists') return
		const next = PersistStatus.get('music.playLists') ?? []
		playListsStore.setValue(next as any)
	})
} catch {
	// 监听装不上不影响主流程
}
