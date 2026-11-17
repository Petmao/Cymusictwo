import { useAppTheme, useThemeColors } from '@/hooks/useAppTheme'
import myTrackPlayer, { trackSkipLoadingStore } from '@/helpers/trackPlayerIndex'
import { FontAwesome6 } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import React from 'react'
import { ActivityIndicator, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native'
import TrackPlayer, { useIsPlaying } from 'react-native-track-player'

type PlayerControlsProps = {
	style?: ViewStyle
}

type PlayerButtonProps = {
	style?: ViewStyle
	iconSize?: number
	disabled?: boolean
}

export const PlayerControls = React.memo(({ style }: PlayerControlsProps) => {
	return (
		<View style={[styles.container, style]}>
			<View style={styles.row}>
				<SkipToPreviousButton />
				<PlayPauseButton />
				<SkipToNextButton />
			</View>
		</View>
	)
})

export const PlayPauseButton = React.memo(({ style, iconSize = 48 }: PlayerButtonProps) => {
	const { playing } = useIsPlaying()
	const colors = useThemeColors()
	const { gradients } = useAppTheme()
	// 播放页那颗主按钮走渐变圆，迷你条上的小键保持无底
	const isHero = iconSize >= 40
	const boxSize = Math.round(iconSize * 1.62)

	if (isHero) {
		return (
			<View style={style}>
				<TouchableOpacity
					activeOpacity={0.85}
					onPress={playing ? TrackPlayer.pause : TrackPlayer.play}
				>
					<LinearGradient
						colors={gradients.accent}
						start={{ x: 0.1, y: 0 }}
						end={{ x: 0.9, y: 1 }}
						style={{
							width: boxSize,
							height: boxSize,
							borderRadius: boxSize / 2,
							alignItems: 'center',
							justifyContent: 'center',
							shadowColor: gradients.accent[1],
							shadowOpacity: 0.55,
							shadowRadius: 18,
							shadowOffset: { width: 0, height: 8 },
						}}
					>
						<FontAwesome6
							name={playing ? 'pause' : 'play'}
							size={Math.round(iconSize * 0.62)}
							color="#FFFFFF"
						/>
					</LinearGradient>
				</TouchableOpacity>
			</View>
		)
	}

	return (
		<View style={[{ height: iconSize }, style]}>
			<TouchableOpacity
				activeOpacity={0.85}
				onPress={playing ? TrackPlayer.pause : TrackPlayer.play}
			>
				<FontAwesome6 name={playing ? 'pause' : 'play'} size={iconSize} color={colors.text} />
			</TouchableOpacity>
		</View>
	)
})

export const SkipToNextButton = React.memo(({ iconSize = 30, disabled = false }: PlayerButtonProps) => {
	const colors = useThemeColors()
	const trackSkipLoading = trackSkipLoadingStore.useValue()
	const isLoading = trackSkipLoading === 'next'
	const isDisabled = disabled || trackSkipLoading !== null

	return (
		<TouchableOpacity activeOpacity={0.7} disabled={isDisabled} onPress={myTrackPlayer.skipToNext}>
			<View style={styles.iconContainer}>
				{isLoading ? (
					<ActivityIndicator size="small" color={colors.text} />
				) : (
					<FontAwesome6 name="forward" size={iconSize} color={colors.text} />
				)}
			</View>
		</TouchableOpacity>
	)
})

export const SkipToPreviousButton = React.memo(({ iconSize = 30 }: PlayerButtonProps) => {
	const colors = useThemeColors()
	const trackSkipLoading = trackSkipLoadingStore.useValue()
	const isLoading = trackSkipLoading === 'previous'
	const isDisabled = trackSkipLoading !== null

	return (
		<TouchableOpacity
			activeOpacity={0.7}
			disabled={isDisabled}
			onPress={myTrackPlayer.skipToPrevious}
		>
			<View style={styles.iconContainer}>
				{isLoading ? (
					<ActivityIndicator size="small" color={colors.text} />
				) : (
					<FontAwesome6 name={'backward'} size={iconSize} color={colors.text} />
				)}
			</View>
		</TouchableOpacity>
	)
})

const styles = StyleSheet.create({
	container: {
		width: '100%',
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-evenly',
		alignItems: 'center',
	},
	iconContainer: {
		minWidth: 32,
		minHeight: 32,
		alignItems: 'center',
		justifyContent: 'center',
	},
})
