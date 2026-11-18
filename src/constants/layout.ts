import { NativeStackNavigationOptions } from '@react-navigation/native-stack'
import { ThemeColors } from './tokens'

/**
 * 统一的页面导航栏：没有大标题、没有阴影、背景色跟页面渐变顶部完全一致。
 *
 * 之前用 headerLargeTitle + colors.background，浅色主题下会在渐变页面上
 * 露出一条奶油色横条（看着像「白框」）。现在把 headerColor 传成
 * gradients.screen[0]，导航条和页面第一段渐变是同一个颜色，接缝看不出来。
 */
export const getStackScreenWithSearchBar = (
	colors: ThemeColors,
	headerColor?: string,
): NativeStackNavigationOptions => ({
	headerLargeTitle: false,
	headerLargeTitleShadowVisible: false,
	headerTitle: '',
	headerTitleStyle: {
		color: colors.text,
		fontSize: 17,
		fontWeight: '600',
	},
	headerStyle: {
		backgroundColor: headerColor ?? colors.background,
	},
	headerLargeStyle: {
		backgroundColor: headerColor ?? colors.background,
	},
	headerTintColor: colors.primary,
	headerShadowVisible: false,
	headerBackTitleVisible: false,
})
