import { getStackScreenWithSearchBar } from '@/constants/layout'
import { useAppTheme } from '@/hooks/useAppTheme'
import { useDefaultStyles } from '@/styles'
import { nowLanguage } from '@/utils/i18n'
import { Stack } from 'expo-router'
import { View } from 'react-native'

const PlaylistsScreenLayout = () => {
	const language = nowLanguage.useValue()
	const { colors, gradients } = useAppTheme()
	const defaultStyles = useDefaultStyles()

	return (
		<View style={defaultStyles.container} key={language}>
			<Stack>
				<Stack.Screen
					name="index"
					options={{
						...getStackScreenWithSearchBar(colors, gradients.screen[0]),
					}}
				/>

				<Stack.Screen
					name="[name]"
					options={{
						headerTitle: '',
						headerBackVisible: true,
						headerTransparent: false,
						headerStyle: {
							backgroundColor: gradients.screen[0],
						},
						headerTintColor: colors.primary,
					}}
				/>
			</Stack>
		</View>
	)
}

export default PlaylistsScreenLayout
