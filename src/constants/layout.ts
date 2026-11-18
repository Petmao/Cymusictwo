import { NativeStackNavigationOptions } from '@react-navigation/native-stack'
import { ThemeColors } from './tokens'

/**
 * 统一的页面导航栏：没有大标题、没有阴影、完全透明。
 *
 * 透明是为了让页面渐变一路铺到状态栏下面——搜索框那一条也吃同一张渐变，
 * 不会再出现「导航条一个颜色、页面另一个颜色」的拼接感。
 * 内容顶部留白由页面自己用 useHeaderHeight() 补（见 search / radio）。
 */
export const getStackScreenWithSearchBar = (
	colors: ThemeColors,
	_headerColor?: string,
): NativeStackNavigationOptions => ({
	headerLargeTitle: false,
	headerLargeTitleShadowVisible: false,
	headerTitle: '',
	headerTransparent: true,
	headerTitleStyle: {
		color: colors.text,
		fontSize: 17,
		fontWeight: '600',
	},
	headerStyle: {
		backgroundColor: 'transparent',
	},
	headerLargeStyle: {
		backgroundColor: 'transparent',
	},
	headerTintColor: colors.primary,
	headerShadowVisible: false,
	headerBackTitleVisible: false,
})
