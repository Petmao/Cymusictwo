import getOrCreateMMKV from '@/store/getOrCreateMMKV'
import safeParse from '@/utils/safeParse'
import { useEffect, useState } from 'react'

const DB_NAME = 'appPersistStatus'
const STORAGE_KEY = 'search.history'
const MAX_ITEMS = 30

export type SearchHistoryType = 'songs' | 'artists'

export type SearchHistoryItem = {
	keyword: string
	type: SearchHistoryType
	at: number
}

const readHistory = (): SearchHistoryItem[] => {
	try {
		const store = getOrCreateMMKV(DB_NAME)
		const raw = store.getString(STORAGE_KEY)
		if (!raw) return []
		const parsed = safeParse(raw)
		if (!Array.isArray(parsed)) return []
		return parsed.filter(
			(item): item is SearchHistoryItem =>
				!!item && typeof item.keyword === 'string' && (item.type === 'songs' || item.type === 'artists'),
		)
	} catch {
		return []
	}
}

const writeHistory = (list: SearchHistoryItem[]) => {
	const store = getOrCreateMMKV(DB_NAME)
	store.set(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_ITEMS)))
}

/** 记一条搜索历史：同关键词同类型去重，最新的排最前 */
export const addSearchHistory = (keyword: string, type: SearchHistoryType) => {
	const word = keyword.trim()
	if (!word) return
	const rest = readHistory().filter((item) => !(item.keyword === word && item.type === type))
	writeHistory([{ keyword: word, type, at: Date.now() }, ...rest])
}

export const removeSearchHistory = (keyword: string, type: SearchHistoryType) => {
	writeHistory(readHistory().filter((item) => !(item.keyword === keyword && item.type === type)))
}

export const clearSearchHistory = () => {
	writeHistory([])
}

/** 订阅式读取，页面里直接用 */
export const useSearchHistory = (): [SearchHistoryItem[], () => void] => {
	const [items, setItems] = useState<SearchHistoryItem[]>(() => readHistory())

	useEffect(() => {
		const store = getOrCreateMMKV(DB_NAME)
		const subscription = store.addOnValueChangedListener((changedKey) => {
			if (changedKey === STORAGE_KEY) {
				setItems(readHistory())
			}
		})
		setItems(readHistory())
		return () => subscription.remove()
	}, [])

	return [items, () => setItems(readHistory())]
}
