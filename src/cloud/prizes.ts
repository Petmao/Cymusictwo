import { ensureCloudClient, requireClient } from './client'

/**
 * 积分兑换奖品。
 *
 * 奖品清单放在服务端 prizes 表（enabled = true 才下发），兑换走 redeem_prize RPC，
 * 扣分与减库存在数据库里做，客户端只负责展示和提交请求。
 *
 * 表还没建 / 没开权限时返回空列表，页面显示「暂无可兑换奖品」，不影响启动。
 */
export type Prize = {
	id: string
	title: string
	description?: string
	cost: number
	stock: number
	cover?: string
}

export type RedeemResult =
	| { ok: true; cost: number; title: string; points: number }
	| { ok: false; reason: string }

const REASON_TEXT: Record<string, string> = {
	NOT_AUTHENTICATED: '登录后才能兑换',
	NO_AUTH: '登录后才能兑换',
	NOT_FOUND: '奖品不存在或已下架',
	OUT_OF_STOCK: '已经被兑完了',
	NO_POINTS: '积分不够',
	DISABLED: '奖品已下架',
}

export const describeRedeemReason = (reason?: string) =>
	(reason && REASON_TEXT[reason]) || '兑换失败，稍后再试'

export const listPrizes = async (): Promise<Prize[]> => {
	try {
		const client = ensureCloudClient()
		if (!client) return []
		const { data, error } = await client
			.from('prizes')
			.select('id,title,description,cost,stock,cover,enabled,sort')
			.eq('enabled', true)
			.order('sort', { ascending: true })
		if (error || !Array.isArray(data)) return []
		return data.map((row: any) => ({
			id: String(row.id),
			title: String(row.title ?? '奖品'),
			description: row.description ? String(row.description) : undefined,
			cost: Number(row.cost ?? 0),
			stock: Number(row.stock ?? 0),
			cover: row.cover ? String(row.cover) : undefined,
		}))
	} catch {
		return []
	}
}

export const redeemPrize = async (prizeId: string): Promise<RedeemResult> => {
	try {
		const client = requireClient()
		const { data, error } = await client.rpc('redeem_prize', { p_prize_id: prizeId })
		if (error) return { ok: false, reason: error.message }
		const payload = data as any
		if (payload && payload.ok) {
			return {
				ok: true,
				cost: Number(payload.cost ?? 0),
				title: String(payload.title ?? ''),
				points: Number(payload.points ?? 0),
			}
		}
		return { ok: false, reason: String(payload?.reason ?? 'UNKNOWN') }
	} catch (error) {
		return { ok: false, reason: error instanceof Error ? error.message : String(error) }
	}
}
