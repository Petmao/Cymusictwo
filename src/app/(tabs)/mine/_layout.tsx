import { useDefaultStyles } from '@/styles'
import { nowLanguage } from '@/utils/i18n'
import { Stack } from 'expo-router'
import { View } from 'react-native'

/**
 * 「我的」不要导航栏大标题，整页直接从渐变顶上开始。
 * 顶部安全区由页面自己的 SafeAreaView 处理。
 */
const MineScreenLayout = () => {
	const language = nowLanguage.useValue()
	const defaultStyles = useDefaultStyles()

	return (
		<View style={defaultStyles.container} key={language}>
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Screen name="index" />
			</Stack>
		</View>
	)
}

export default MineScreenLayout
