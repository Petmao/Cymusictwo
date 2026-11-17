import type { TextStyle } from 'react-native'

export type ThemeMode = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'
export type BlurTint = 'light' | 'dark'

export type ThemeColors = {
	primary: string
	background: string
	surface: string
	surfaceElevated: string
	surfaceMuted: string
	card: string
	text: string
	textMuted: string
	icon: string
	border: string
	separator: string
	placeholder: string
	maximumTrackTintColor: string
	minimumTrackTintColor: string
	loading: string
	overlay: string
	overlayStrong: string
	overlaySoft: string
	shadow: string
	dismissBar: string
	artworkPlaceholder: string
	toastBackground: string
	toastAccent: string
	success: string
	error: string
	blurTint: BlurTint
}

export const lightColors: ThemeColors = {
	primary: '#D94468',
	background: '#F8EEE6',
	surface: '#FFFFFF',
	surfaceElevated: '#FFFFFF',
	surfaceMuted: '#F2E7DE',
	card: '#FFFFFF',
	text: '#221B1E',
	textMuted: '#6E6469',
	icon: '#221B1E',
	border: 'rgba(52,28,46,0.10)',
	separator: 'rgba(52,28,46,0.07)',
	placeholder: '#A2939A',
	maximumTrackTintColor: 'rgba(52,28,46,0.12)',
	minimumTrackTintColor: 'rgba(52,28,46,0.55)',
	loading: 'rgba(52,28,46,0.45)',
	overlay: 'rgba(20,10,18,0.42)',
	overlayStrong: 'rgba(255,255,255,0.92)',
	overlaySoft: 'rgba(52,28,46,0.08)',
	shadow: '#341C40',
	dismissBar: 'rgba(52,28,46,0.32)',
	artworkPlaceholder: '#E7D8CD',
	toastBackground: 'rgb(255,238,232)',
	toastAccent: 'rgb(217,68,104)',
	success: '#3F9E7C',
	error: '#D94468',
	blurTint: 'light',
}

export const darkColors: ThemeColors = {
	primary: '#F0688F',
	background: '#07060C',
	surface: '#12101A',
	surfaceElevated: '#16131F',
	surfaceMuted: '#1B1725',
	card: '#16131F',
	text: '#F6F3F1',
	textMuted: '#9E9BA5',
	icon: '#F6F3F1',
	border: 'rgba(255,255,255,0.10)',
	separator: 'rgba(255,255,255,0.07)',
	placeholder: '#6B6874',
	maximumTrackTintColor: 'rgba(255,255,255,0.16)',
	minimumTrackTintColor: 'rgba(255,255,255,0.62)',
	loading: 'rgba(255,255,255,0.55)',
	overlay: 'rgba(4,3,8,0.62)',
	overlayStrong: 'rgba(4,3,8,0.86)',
	overlaySoft: 'rgba(255,255,255,0.10)',
	shadow: '#000000',
	dismissBar: 'rgba(255,255,255,0.62)',
	artworkPlaceholder: '#241C2E',
	toastBackground: 'rgba(32,24,40,0.96)',
	toastAccent: '#F0688F',
	success: '#6BCFA8',
	error: '#FF7A8F',
	blurTint: 'dark',
}

export type ThemeGradients = {
	/** 页面底色（四段纵向） */
	screen: [string, string, string, string]
	/** 页面底色的落点 */
	screenStops: [number, number, number, number]
	/** 主色渐变：按钮、进度条、开关 */
	accent: [string, string, string]
	/** 玻璃卡前景渐变（压在 BlurView 之上） */
	glass: [string, string]
	/** 导航条 / 迷你条玻璃 */
	glassTab: [string, string]
	/** 会员卡金边 */
	gold: [string, string, string, string]
	/** 会员卡内层深金底 */
	goldInner: [string, string, string]
	/** 成长值进度条 */
	goldBar: [string, string, string]
	/** 玫瑰实心胶囊 */
	rose: [string, string, string]
	/** 浅玫瑰胶囊 */
	roseLight: [string, string, string]
	/** 紫玫瑰胶囊 */
	violet: [string, string, string]
	/** 渐变字：粉 → 淡紫 */
	textGlow: [string, string]
	/** 空态光晕 */
	glow: string
}

export const darkGradients: ThemeGradients = {
	screen: ['#07060C', '#100B1B', '#0B0813', '#07060C'],
	screenStops: [0, 0.42, 0.74, 1],
	accent: ['#FF7A59', '#E0455E', '#A855F7'],
	glass: ['rgba(255,255,255,0.085)', 'rgba(255,255,255,0.028)'],
	glassTab: ['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.05)'],
	gold: ['#F9E2AC', '#D8A94E', '#8E6A22', '#FBEBC0'],
	goldInner: ['#2C2112', '#1B1409', '#241A0C'],
	goldBar: ['#C9962F', '#F2CC84', '#FFE7B8'],
	rose: ['#E8577C', '#D33F63', 'rgba(211,63,99,0.55)'],
	roseLight: ['#F3A7BD', '#DE7C99', 'rgba(222,124,153,0.80)'],
	violet: ['#8B5CF6', '#C2457F', 'rgba(194,69,127,0.75)'],
	textGlow: ['#FFA9C4', '#B9A2FF'],
	glow: 'rgba(240,106,150,0.34)',
}

export const lightGradients: ThemeGradients = {
	screen: ['#FCE7D8', '#F6E4EF', '#E4EFEA', '#EDE7F8'],
	screenStops: [0, 0.36, 0.7, 1],
	accent: ['#FF8A63', '#D94F6A', '#7C6BF0'],
	glass: ['rgba(255,255,255,0.96)', 'rgba(255,255,255,0.86)'],
	glassTab: ['rgba(255,255,255,0.94)', 'rgba(255,255,255,0.72)'],
	gold: ['#C79A3A', '#E8C276', '#A87B22', '#F7E3B0'],
	goldInner: ['#FBF1DA', '#F3E2B8', '#EBD5A2'],
	goldBar: ['#B8862A', '#DDB662', '#F3D79B'],
	rose: ['#D94468', '#BE3253', 'rgba(190,50,83,0.62)'],
	roseLight: ['#E889A0', '#D2657F', 'rgba(210,101,127,0.82)'],
	violet: ['#7A4FE0', '#B23A72', 'rgba(178,58,114,0.78)'],
	textGlow: ['#E8678F', '#7C6BF0'],
	glow: 'rgba(240,106,150,0.26)',
}

export const getThemeGradients = (theme: ResolvedTheme): ThemeGradients =>
	theme === 'light' ? lightGradients : darkGradients

export const getThemeColors = (theme: ResolvedTheme): ThemeColors =>
	theme === 'light' ? lightColors : darkColors

let runtimeColors: ThemeColors = darkColors

export const setRuntimeColors = (nextColors: ThemeColors) => {
	runtimeColors = nextColors
}

export const getRuntimeColors = () => runtimeColors

export const colors = new Proxy({} as ThemeColors, {
	get: (_target, prop: string) => runtimeColors[prop as keyof ThemeColors],
}) as ThemeColors

export const fontSize = {
	xs: 12,
	sm: 16,
	base: 20,
	lg: 24,
}

export const screenPadding = {
	horizontal: 24,
}

/** 统一圆角阶梯，iOS 上配合 borderCurve: 'continuous' 使用 */
export const radius = {
	xs: 6,
	sm: 10,
	md: 14,
	lg: 20,
	xl: 26,
	pill: 999,
} as const

/** 统一间距阶梯，替换散落的魔法数 */
export const spacing = {
	xxs: 2,
	xs: 4,
	sm: 8,
	md: 12,
	lg: 16,
	xl: 24,
	xxl: 32,
} as const

/** 字阶：标题、正文、说明各一档，字距统一收紧 */
export const typography = {
	display: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.6 },
	title: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.4 },
	headline: { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.2 },
	body: { fontSize: 15, fontWeight: '400' as const, letterSpacing: -0.1 },
	caption: { fontSize: 13, fontWeight: '400' as const, letterSpacing: 0 },
	micro: { fontSize: 11, fontWeight: '500' as const, letterSpacing: 0.1 },
	/** 分组标题：小、加粗、微开字距 */
	label: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.6 },
	/** 时间码：等宽数字，避免跳动 */
	mono: {
		fontSize: 12,
		fontWeight: '500' as const,
		letterSpacing: 0.4,
		fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
	},
} as const

/** 层级阴影：卡片一档，封面一档，浮层一档 */
export const elevation = {
	card: {
		shadowColor: '#000000',
		shadowOpacity: 0.12,
		shadowRadius: 16,
		shadowOffset: { width: 0, height: 8 },
		elevation: 6,
	},
	artwork: {
		shadowColor: '#000000',
		shadowOpacity: 0.36,
		shadowRadius: 26,
		shadowOffset: { width: 0, height: 14 },
		elevation: 18,
	},
	pill: {
		shadowColor: '#000000',
		shadowOpacity: 0.18,
		shadowRadius: 24,
		shadowOffset: { width: 0, height: 10 },
		elevation: 10,
	},
} as const

/** 统一描边粗细，避免各处 hairline 不一致 */
export const strokeWidth = 0.5
