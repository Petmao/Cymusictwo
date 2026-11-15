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
	primary: '#fc3c44',
	background: '#ffffff',
	surface: '#f5f5f7',
	surfaceElevated: '#ffffff',
	surfaceMuted: '#eef1f5',
	card: '#ffffff',
	text: '#111827',
	textMuted: '#6b7280',
	icon: '#111827',
	border: 'rgba(17,24,39,0.12)',
	separator: 'rgba(17,24,39,0.08)',
	placeholder: '#9ca3af',
	maximumTrackTintColor: 'rgba(17,24,39,0.12)',
	minimumTrackTintColor: 'rgba(17,24,39,0.55)',
	loading: 'rgba(17,24,39,0.45)',
	overlay: 'rgba(0,0,0,0.45)',
	overlayStrong: 'rgba(255,255,255,0.92)',
	overlaySoft: 'rgba(17,24,39,0.08)',
	shadow: '#000000',
	dismissBar: 'rgba(17,24,39,0.35)',
	artworkPlaceholder: '#d1d5db',
	toastBackground: 'rgb(251,231,227)',
	toastAccent: 'rgb(252,87,59)',
	success: '#34c759',
	error: '#ff3b30',
	blurTint: 'light',
}

export const darkColors: ThemeColors = {
	primary: '#fc3c44',
	background: '#000000',
	surface: '#121212',
	surfaceElevated: 'rgb(32,32,32)',
	surfaceMuted: '#1c1c1f',
	card: '#202020',
	text: '#ffffff',
	textMuted: '#9ca3af',
	icon: '#ffffff',
	border: 'rgba(255,255,255,0.12)',
	separator: 'rgba(255,255,255,0.12)',
	placeholder: '#999999',
	maximumTrackTintColor: 'rgba(255,255,255,0.4)',
	minimumTrackTintColor: 'rgba(255,255,255,0.6)',
	loading: 'rgba(255,255,255,0.6)',
	overlay: 'rgba(0,0,0,0.5)',
	overlayStrong: 'rgba(0,0,0,0.82)',
	overlaySoft: 'rgba(255,255,255,0.1)',
	shadow: '#000000',
	dismissBar: 'rgba(255,255,255,0.7)',
	artworkPlaceholder: '#808080',
	toastBackground: 'rgb(251,231,227)',
	toastAccent: 'rgb(252,87,59)',
	success: '#34c759',
	error: '#ff3b30',
	blurTint: 'dark',
}

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
} as const

/** 层级阴影：卡片一档，浮层一档 */
export const elevation = {
	card: {
		shadowColor: '#000000',
		shadowOpacity: 0.12,
		shadowRadius: 16,
		shadowOffset: { width: 0, height: 8 },
		elevation: 6,
	},
	pill: {
		shadowColor: '#000000',
		shadowOpacity: 0.18,
		shadowRadius: 24,
		shadowOffset: { width: 0, height: 10 },
		elevation: 10,
	},
} as const
