import myTrackPlayer from '@/helpers/trackPlayerIndex'
import { useCallback, useEffect, useState } from 'react'
import { showToast } from '@/utils/utils'

type SleepState = {
	minutes: number | null
	endsAt: number | null
}

let state: SleepState = { minutes: null, endsAt: null }
let timer: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<(next: SleepState) => void>()

const emit = () => {
	listeners.forEach((listener) => listener({ ...state }))
}

export const setSleepTimer = (minutes: number | null) => {
	if (timer) {
		clearTimeout(timer)
		timer = null
	}

	if (!minutes) {
		state = { minutes: null, endsAt: null }
		emit()
		return
	}

	const endsAt = Date.now() + minutes * 60 * 1000
	state = { minutes, endsAt }
	timer = setTimeout(() => {
		myTrackPlayer.pause().catch(() => undefined)
		state = { minutes: null, endsAt: null }
		timer = null
		emit()
		showToast('睡眠定时已结束，播放已暂停')
	}, minutes * 60 * 1000)
	emit()
}

export const getSleepLabel = (input: SleepState = state) => {
	if (!input.minutes || !input.endsAt) return '未开启'
	const left = Math.max(0, Math.round((input.endsAt - Date.now()) / 60000))
	if (left <= 1) return '不到 1 分钟'
	return `${left} 分钟`
}

export const useSleepTimer = () => {
	const [current, setCurrent] = useState<SleepState>({ ...state })

	useEffect(() => {
		const listener = (next: SleepState) => setCurrent(next)
		listeners.add(listener)
		return () => {
			listeners.delete(listener)
		}
	}, [])

	const set = useCallback((minutes: number | null) => setSleepTimer(minutes), [])

	return { ...current, label: getSleepLabel(current), set }
}
