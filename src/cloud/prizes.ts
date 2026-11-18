import { ensureCloudClient, requireClient } from './client'

/**
 * 积分兑换奖品（服务端原有的一整套，后台「积分商城」直接维护）
 *
 *   list_rewards()             → { items, points, growth, enabled }
 *   redeem_reward(p_reward_id) → { ok:true, ... } / { ok:false, reason, need, short, points }
 *
 * 奖品内容全部由后台管理，App 只读不写，所以不需要任何本地迁移。
 */
export type PrizeType = 'svip_days' | 'growth' | 'points' | 'redeem_code' | string

export type Prize = {
	id: number | string
	name: string
	description?: string
	cost: number
	/** -1 表示不限量 */
	stock: number
	type: PrizeType
	payload: Record<string, any>
	perUserLimit: number
	redeemed: number
	/** 服务端已经算好的「能不能兑」，比前端自己判断准 */
	canRedeem: boolean
}

export type PrizeStore = {
	items: Prize[]
	points: number
	growth: number
	enabled: boolean
}

export type RedeemResult =
	| { ok: true; points?: number; code?: string; title?: string }
	| { ok: false; reason: string; need?: number; short?: number; points?: number }

const REASON_TEXT: Record<string, string> = {
	POINTS_NOT_ENOUGH: '积分不够',
	OUT_OF_STOCK: '已经兑完了',
	LIMIT_REACHED: '已经兑过了，每人限兑',
	STORE_CLOSED: '积分商城暂时关闭',
	NOT_FOUND: '奖品已下架',
	NO_PROFILE: '账号资料异常，重新登录试试',
	NOT_AUTHENTICATED: '登录后才能兑换',
}

/** 把服务端 reason 翻成人话，带差额的单独处理 */
export const describeRedeemReason = (result: { reason?: string; short?: number }) => {
	if (result.reason === 'POINTS_NOT_ENOUGH' && typeof result.short === 'number') {
		return `积分不够，还差 ${result.short} 分`
	}
	return (result.reason && REASON_TEXT[result.reason]) || '兑换失败，稍后再试'
}

/** 奖品内容的一句话说明（后台配了 description 就优先用后台的） */
export const prizeValueText = (prize: Prize) => {
	if (prize.description) return prize.description
	const payload = prize.payload ?? {}
	switch (prize.type) {
		case 'svip_days':
			return `${payload.days ?? '?'} 天 SVIP，兑换后立即生效`
		case 'growth':
			return `直接加 ${payload.amount ?? '?'} 成长值`
		case 'points':
			return `直接加 ${payload.amount ?? '?'} 积分`
		case 'redeem_code':
			return `发一张 ${payload.days ?? '?'} 天时长的卡密`
		default:
			return ''
	}
}

const normalize = (row: any): Prize => ({
	id: row.id ?? row.reward_id,
	name: String(row.name ?? row.title ?? '奖品'),
	description: row.description ? String(row.description) : undefined,
	cost: Number(row.cost ?? row.cost_points ?? 0),
	stock: Number(row.stock ?? -1),
	type: String(row.type ?? row.reward_type ?? 'unknown'),
	payload: row.payload && typeof row.payload === 'object' ? row.payload : {},
	perUserLimit: Number(row.per_user_limit ?? 0),
	redeemed: Number(row.redeemed ?? 0),
	canRedeem: Boolean(row.can_redeem),
})

export const listPrizes = async (): Promise<PrizeStore> => {
	const empty: PrizeStore = { items: [], points: 0, growth: 0, enabled: false }
	try {
		const client = ensureCloudClient()
		if (!client) return empty
		const { data, error } = await client.rpc('list_rewards')
		if (error || !data) return empty
		const payload = data as any
		const items = Array.isArray(payload.items) ? payload.items.map(normalize) : []
		return {
			items,
			points: Number(payload.points ?? 0),
			growth: Number(payload.growth ?? 0),
			enabled: Boolean(payload.enabled),
		}
	} catch {
		return empty
	}
}

export const redeemPrize = async (prizeId: number | string): Promise<RedeemResult> => {
	try {
		const client = requireClient()
		const { data, error } = await client.rpc('redeem_reward', { p_reward_id: prizeId })
		if (error) return { ok: false, reason: error.message }
		const payload = (data ?? {}) as any
		if (payload.ok) {
			// 服务端字段名可能是 code / card_code / redeem_code，逐层兜一层
			const nested = payload.reward ?? payload.result ?? {}
			const pickText = (...keys: string[]) => {
				for (const key of keys) {
					const value = payload[key] ?? nested[key]
					if (typeof value === 'string' && value.trim()) return value.trim()
				}
				return undefined
			}
			return {
				ok: true,
				points: Number(payload.points ?? payload.balance ?? 0),
				code: pickText('code', 'card_code', 'redeem_code', 'card'),
				title: pickText('name', 'title', 'reward_name'),
			}
		}
		return {
			ok: false,
			reason: String(payload.reason ?? 'UNKNOWN'),
			need: payload.need,
			short: payload.short,
			points: payload.points,
		}
	} catch (error) {
		return { ok: false, reason: error instanceof Error ? error.message : String(error) }
	}
}
