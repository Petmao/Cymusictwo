import { NativeStackNavigationOptions } from '@react-navigation/native-stack'
import { ThemeColors } from './tokens'

/**
 * 统一的大标题导航栏：34pt 大标题、无阴影、无返回文字，返回按钮走强调色。
 * 大标题字距按 iOS 规范收到 0.37，比默认更紧致。
 */
export const getStackScreenWithSearchBar = (
	colors: ThemeColors,
): NativeStackNavigationOptions => ({
	headerLargeTitle: true,
	headerLargeTitleShadowVisible: false,
	headerLargeTitleStyle: {
		color: colors.text,
		fontSize: 34,
		fontWeight: '700',
		letterSpacing: 0.37,
	},
	headerTitleStyle: {
		color: colors.text,
		fontSize: 17,
		fontWeight: '600',
	},
	headerStyle: {
		backgroundColor: colors.background,
	},
	headerLargeStyle: {
		backgroundColor: colors.background,
	},
	headerTintColor: colors.primary,
	headerShadowVisible: false,
	headerBackTitleVisible: false,
})
