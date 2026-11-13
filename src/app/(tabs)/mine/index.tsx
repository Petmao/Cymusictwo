import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const C = {
	pink: '#FF5F9E',
	pinkLight: '#FF8FBF',
	pinkDeep: '#FF2F7E',
	gold: '#F0CD8D',
	goldDeep: '#D5A45C',
	mint: '#43E0D0',
	textSub: 'rgba(255,255,255,0.55)',
	textFaint: 'rgba(255,255,255,0.35)',
	line: 'rgba(255,255,255,0.10)',
	surface: 'rgba(255,255,255,0.055)',
}

/** 六位 ID：昵称哈希取模，同账号恒定 */
const hashUid = (name: string) => {
	let h = 5381
	for (let i = 0; i < name.length; i++) {
		h = ((h << 5) + h + name.charCodeAt(i)) >>> 0
	}
	return String(100000 + (h % 900000))
}

/** ---- 金色文字（纯色近似渐变） ---- */
const GoldText = ({ children, size, weight }: { children: React.ReactNode; size: number; weight: '400' | '700' | '900' }) => (
	<Text style={{ fontSize: size, fontWeight: weight, color: C.gold }}>{children}</Text>
)

/** ---- 1. 用户区 ---- */
const MineHeader = ({ nickname, points, loaded }: { nickname: string; points: number | null; loaded: boolean }) => (
	<View style={styles.headerRow}>
		<View style={styles.avatarWrap}>
			<LinearGradient
				colors={[C.pink, C.pinkDeep]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={styles.avatar}
			/>
			<View style={styles.avatarRing} />
			<Text style={styles.avatarText}>{nickname.slice(0, 1)}</Text>
		</View>

		<View style={styles.headerText}>
			<Text style={styles.nickName} numberOfLines={1}>
				{nickname}
			</Text>
			<Text style={styles.uidText}>ID {hashUid(nickname)}</Text>
		</View>

		<View style={styles.pointsBox}>
			<Text style={styles.pointsNum}>{loaded && points !== null ? String(points) : '--'}</Text>
			<Text style={styles.pointsLabel}>积分</Text>
		</View>
	</View>
)

/** ---- 2. 金边会员卡 ---- */
const MineMemberCard = ({ onRedeem }: { onRedeem: () => void }) => (
	<View style={styles.card}>
		<LinearGradient
			colors={['#2A1C10', '#160A0E', '#25160C']}
			start={{ x: 0, y: 0 }}
			end={{ x: 1, y: 1 }}
			style={StyleSheet.absoluteFill}
		/>
		<LinearGradient
			colors={['rgba(240,205,141,0.18)', 'rgba(240,205,141,0)']}
			start={{ x: 0.9, y: 0.05 }}
			end={{ x: 0.4, y: 0.6 }}
			style={StyleSheet.absoluteFill}
		/>

		<View style={styles.cardRow}>
			<View style={styles.cardLeft}>
				<GoldText size={11} weight='900'>ISLE 会员</GoldText>
				<View style={{ height: 5 }} />
				<GoldText size={18} weight='900'>尊享无损 · 无限下载</GoldText>
				<View style={{ height: 2 }} />
				<Text style={styles.cardSub}>未开通 · 兑换卡密即可开通</Text>
			</View>

			<TouchableOpacity activeOpacity={0.7} onPress={onRedeem} style={styles.redeemBtn}>
				<LinearGradient
					colors={['#F7E3B5', '#D69E52']}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 0 }}
					style={StyleSheet.absoluteFill}
				/>
				<Text style={styles.redeemText}>卡密兑换</Text>
		</TouchableOpacity>
		</View>

		<View style={styles.benefitRow}>
			{['无损 FLAC', '无限下载', '5 台设备'].map((t) => (
				<View key={t} style={styles.benefit}>
					<Ionicons name='checkmark' size={8} color={C.gold} />
					<Text style={styles.benefitText}>{t}</Text>
			</View>
			))}
		</View>

		<LinearGradient
			colors={['rgba(240,205,141,0.95)', 'rgba(240,205,141,0.28)', 'rgba(213,164,92,0.85)']}
			start={{ x: 0, y: 0 }}
			end={{ x: 1, y: 1 }}
			style={[StyleSheet.absoluteFill, styles.cardBorder]}
		/>
		<View style={[StyleSheet.absoluteFill, styles.cardGlow]} />
	</View>
)

/** ---- 3. 导入歌单 ---- */
type Platform = { key: string; title: string; icon: keyof typeof Ionicons.glyphMap; c1: string; c2: string }
const PLATFORMS: Platform[] = [
	{ key: 'netease', title: '网易云', icon: 'cloud', c1: '#E62933', c2: '#FF734D' },
	{ key: 'qq', title: 'QQ', icon: 'musical-notes', c1: '#30B859', c2: '#1F85F2' },
	{ key: 'kugou', title: '酷狗', icon: 'pulse', c1: '#218CFF', c2: '#5CD9FF' },
	{ key: 'soda', title: '汽水', icon: 'musical-note', c1: '#FAB81E', c2: '#F27319' },
]

const ImportGrid = ({ onPick }: { onPick: (p: Platform) => void }) => (
	<View>
		<Text style={styles.sectionLabel}>导入歌单</Text>
		<View style={styles.grid}>
			{PLATFORMS.map((p) => (
				<TouchableOpacity key={p.key} activeOpacity={0.75} style={styles.gridCell} onPress={() => onPick(p)}>
					<LinearGradient
					colors={[p.c1, p.c2]}
						start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
						style={StyleSheet.absoluteFill}
					/>
					<Ionicons name={p.icon} size={17} color='#FFFFFF' />
					<View style={{ height: 7 }} />
					<Text style={styles.gridText} numberOfLines={1}>{p.title}</Text>
			</TouchableOpacity>
			))}
		</View>
	</View>
)

/** ---- 4. 六个分区行 ---- */
type Section = { title: string; detail: string; icon: keyof typeof Ionicons.glyphMap; tint: string; route: string | null }
const SECTIONS: Section[] = [
	{ title: '收藏与歌单', detail: '收藏的歌曲 · 我的歌单', icon: 'heart', tint: C.pink, route: '/(tabs)/favorites' },
	{ title: '签到积分', detail: '每日签到 · 兑换会员', icon: 'gift', tint: C.gold, route: null },
	{ title: '邀请好友', detail: '每人 +200 积分', icon: 'people', tint: C.mint, route: null },
	{ title: '云同步', detail: '歌单与进度', icon: 'cloud-upload', tint: '#7DA6FF', route: null },
	{ title: '设备管理', detail: '已绑定设备 · 解绑', icon: 'phone-portrait', tint: '#C4A6FF', route: null },
	{ title: '设置中心', detail: '音源 · 播放 · 退出登录', icon: 'settings', tint: '#C9A6FF', route: '/(modals)/settingModal' },
]

const SectionList = ({ router }: { router: ReturnType<typeof useRouter> }) => (
	<View style={styles.sectionCard}>
		{SECTIONS.map((s, i) => (
			<React.Fragment key={s.title}>
				{i > 0 && <View style={[styles.divider, { marginLeft: 56 }]} />}
				<TouchableOpacity
					activeOpacity={0.65}
					style={styles.sectionRow}
					onPress={() => {
						if (s.route) router.push(s.route as never)
					}}
				>
					<View style={[styles.iconBox, { backgroundColor: s.tint + '24' }]}>
						<Ionicons name={s.icon} size={16} color={s.tint} />
					</View>
					<View style={styles.sectionText}>
						<Text style={styles.sectionTitle}>{s.title}</Text>
						<Text style={styles.sectionDetail} numberOfLines={1}>{s.detail}</Text>
					</View>
					<Ionicons name='chevron-forward' size={16} color='rgba(255,255,255,0.28)' />
				</TouchableOpacity>
			</React.Fragment>
		))}
	</View>
)

/** ---- 页面 ---- */
const MinePage = () => {
	const router = useRouter()
	const [points, setPoints] = useState<number | null>(null)
	const [pointsLoaded, setPointsLoaded] = useState(false)

	// 会员体系接口暂缺：先给占位昵称，接口就绪后替换
	const nickname = '未登录'

	useEffect(() => {
		// TODO: 会员体系 /checkin/status 接口就绪后接上
		const timer = setTimeout(() => setPointsLoaded(true), 300)
		return () => clearTimeout(timer)
	}, [])

	return (
		<SafeAreaView style={styles.safe} edges={['top']}>
			<LinearGradient
				colors={['#1B0A17', '#0A0509']}
				style={StyleSheet.absoluteFill}
			/>
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

			<ScrollView
				contentContainerStyle={styles.scrollContent}
			showsVerticalScrollIndicator={false}
		>
			<MineHeader nickname={nickname} points={points} loaded={pointsLoaded} />
			<View style={{ height: 12 }} />
			<MineMemberCard
				onRedeem={() => {
					// TODO: 接入卡密兑换页
				}}
			/>
			<View style={{ height: 12 }} />
			<ImportGrid
				onPick={(p) => {
					// 复用现有导入弹窗（当前只支持 QQ，后续按 p.key 分流）
					router.push('/(modals)/importPlayList' as never)
				}}
			/>
			<View style={{ height: 12 }} />
			<SectionList router={router} />
		</ScrollView>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	safe: { flex: 1 },
	scrollContent: {
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 26,
	},

	/* 用户区 */
	headerRow: { flexDirection: 'row', alignItems: 'center' },
	avatarWrap: { width: 58, height: 58, justifyContent: 'center', alignItems: 'center' },
	avatar: { width: 58, height: 58, borderRadius: 29 },
	avatarRing: {
		position: 'absolute',
		width: 58, height: 58, borderRadius: 29,
		borderWidth: 2, borderColor: 'rgba(255,95,158,0.6)',
	},
	avatarText: { fontSize: 22, fontWeight: '900', color: '#FFFFFF' },
	headerText: { flex: 1, marginLeft: 13 },
	nickName: { fontSize: 17, fontWeight: '900', color: '#FFFFFF' },
	uidText: { fontSize: 11, color: C.textSub, marginTop: 4 },
	pointsBox: { alignItems: 'flex-end' },
	pointsNum: { fontSize: 19, fontWeight: '900', color: C.pinkLight },
	pointsLabel: { fontSize: 9.5, color: C.textFaint, marginTop: 2 },

	/* 会员卡 */
	card: {
		borderRadius: 20,
		padding: 16,
		overflow: 'hidden',
		backgroundColor: '#1A1008',
	},
	cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
	cardLeft: { flex: 1 },
	cardSub: { fontSize: 10, color: 'rgba(240,205,141,0.68)', marginTop: 2 },
	redeemBtn: {
		borderRadius: 999,
		paddingHorizontal: 13,
		paddingVertical: 7,
		overflow: 'hidden',
		justifyContent: 'center',
		alignItems: 'center',
	},
	redeemText: { fontSize: 11.5, fontWeight: '700', color: '#3A2612' },
	benefitRow: { flexDirection: 'row', marginTop: 14 },
	benefit: { flexDirection: 'row', alignItems: 'center', marginRight: 16, gap: 5 },
	benefitText: { fontSize: 10.5, fontWeight: '600', color: 'rgba(240,205,141,0.9)' },
	cardBorder: { borderRadius: 20, borderWidth: 1.2, borderColor: 'transparent' },
	cardGlow: {
		borderRadius: 20,
		borderWidth: 7,
		borderColor: 'rgba(240,205,141,0.45)',
		opacity: 0.55,
	},

	/* 导入歌单 */
	sectionLabel: {
		fontSize: 11, fontWeight: '700', letterSpacing: 1,
		color: 'rgba(255,255,255,0.5)', marginBottom: 8,
	},
	grid: { flexDirection: 'row', gap: 8 },
	gridCell: {
		flex: 1,
		borderRadius: 16,
		paddingVertical: 14,
		alignItems: 'center',
		overflow: 'hidden',
	},
	gridText: { fontSize: 9.5, fontWeight: '600', color: 'rgba(255,255,255,0.95)' },

	/* 分区行 */
	sectionCard: {
		borderRadius: 18,
		backgroundColor: C.surface,
		borderWidth: 1,
		borderColor: C.line,
		overflow: 'hidden',
	},
	sectionRow: {
		flexDirection: 'row', alignItems: 'center',
		paddingHorizontal: 14, paddingVertical: 12,
	},
	iconBox: {
		width: 32, height: 32, borderRadius: 10,
		justifyContent: 'center', alignItems: 'center',
	},
	sectionText: { flex: 1, marginLeft: 12 },
	sectionTitle: { fontSize: 13.5, fontWeight: '600', color: '#FFFFFF' },
	sectionDetail: { fontSize: 10.5, color: C.textSub, marginTop: 3 },
	divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
})

export default MinePage
