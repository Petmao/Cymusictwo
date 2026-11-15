import { PlayPauseButton, SkipToNextButton } from '@/components/PlayerControls'
import myTrackPlayer, { trackSourceLoadingStore } from '@/helpers/trackPlayerIndex'
import { unknownTrackImageUri } from '@/constants/images'
import { ThemeColors, elevation, radius, spacing, typography } from '@/constants/tokens'
import { useAppTheme, useThemeColors } from '@/hooks/useAppTheme'
import { useLastActiveTrack } from '@/hooks/useLastActiveTrack'
import { useDefaultStyles } from '@/styles'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import {
	ActivityIndicator,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	ViewProps,
} from 'react-native'
import FastImage from 'react-native-fast-image'
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated'
import { useActiveTrack, useProgress } from 'react-native-track-player'
import { MovingText } from './MovingText'

const AnimatedFastImage = Animated.createAnimatedComponent(FastImage)

const ProgressIndicator = React.memo(() => {
	const colors = useThemeColors()
	const { position, duration } = useProgress(1000)
	const progress = duration > 0 ? position / duration : 0
	return (
		<View style={progressStyles.track}>
			<View
				style={[
					progressStyles.fill,
					{ width: `${Math.min(Math.max(progress, 0), 1) * 100}%`, backgroundColor: colors.primary },
				]}
			/>
		</View>
	)
})

export const FloatingPlayer = React.memo(({ style }: ViewProps) => {
	const { blurTint } = useAppTheme()
	const colors = useThemeColors()
	const defaultStyles = useDefaultStyles()
	const styles = useMemo(() => createStyles(colors, defaultStyles), [colors, defaultStyles])
	const router = useRouter()
	const currentMusic = myTrackPlayer.useCurrentMusic()
	const activeTrack = useActiveTrack()
	const lastActiveTrack = useLastActiveTrack()
	const isTrackSourceLoading = trackSourceLoadingStore.useValue() !== null
	const displayedTrack = currentMusic ?? activeTrack ?? lastActiveTrack

	const artworkOpacity = useSharedValue(1)
	const prevArtworkRef = useRef(displayedTrack?.artwork)

	useEffect(() => {
		if (displayedTrack?.artwork && displayedTrack.artwork !== prevArtworkRef.current) {
			artworkOpacity.value = 0
			artworkOpacity.value = withTiming(1, { duration: 400 })
			prevArtworkRef.current = displayedTrack.artwork
		}
	}, [displayedTrack?.artwork])

	const artworkAnimatedStyle = useAnimatedStyle(() => ({
		opacity: artworkOpacity.value,
	}))

	const handlePress = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
		router.navigate('/player')
	}, [router])

	if (!displayedTrack) return null

	return (
		<TouchableOpacity onPress={handlePress} activeOpacity={0.92} style={[styles.container, style]}>
			<BlurView intensity={88} tint={blurTint} style={styles.blurContainer}>
				<AnimatedFastImage
					source={{
						uri: displayedTrack.artwork ?? unknownTrackImageUri,
					}}
					style={[styles.trackArtworkImage, artworkAnimatedStyle]}
				/>

				<View style={styles.trackTitleContainer}>
					<MovingText
						style={styles.trackTitle}
						text={displayedTrack.title ?? ''}
						animationThreshold={18}
					/>
					<Text numberOfLines={1} style={styles.trackArtist}>
						{displayedTrack.artist ?? ''}
					</Text>
				</View>

				<View style={styles.trackControlsContainer}>
					{isTrackSourceLoading ? (
						<View style={styles.loadingIndicatorContainer}>
							<ActivityIndicator size="small" color={colors.text} />
						</View>
					) : (
						<PlayPauseButton iconSize={26} />
					)}
					<SkipToNextButton iconSize={22} disabled={isTrackSourceLoading} />
				</View>

				{!isTrackSourceLoading && <ProgressIndicator />}
			</BlurView>
		</TouchableOpacity>
	)
})

const progressStyles = StyleSheet.create({
	track: {
		position: 'absolute',
		bottom: spacing.xs + 2,
		left: spacing.md + 2,
		right: spacing.md + 2,
		height: 2,
		borderRadius: radius.pill,
		backgroundColor: 'rgba(128,128,128,0.22)',
		overflow: 'hidden',
	},
	fill: {
		height: '100%',
		borderRadius: radius.pill,
	},
})

const createStyles = (
	colors: ThemeColors,
	defaultStyles?: ReturnType<typeof useDefaultStyles>,
) =>
	StyleSheet.create({
		container: {
			borderRadius: radius.xl,
			borderCurve: 'continuous',
			borderWidth: StyleSheet.hairlineWidth,
			borderColor: colors.border,
			overflow: 'hidden',
			...elevation.pill,
		},
		blurContainer: {
			flexDirection: 'row',
			alignItems: 'center',
			paddingLeft: spacing.sm + 2,
			paddingRight: spacing.sm,
			paddingTop: spacing.sm + 2,
			paddingBottom: spacing.sm + 6,
		},
		trackArtworkImage: {
			width: 44,
			height: 44,
			borderRadius: radius.md - 2,
			borderCurve: 'continuous',
		},
		trackTitleContainer: {
			flex: 1,
			overflow: 'hidden',
			marginLeft: spacing.md,
			justifyContent: 'center',
		},
		trackTitle: {
			...(defaultStyles?.text ?? {}),
			...typography.headline,
		},
		trackArtist: {
			...typography.caption,
			color: colors.textMuted,
			marginTop: spacing.xxs + 1,
			paddingRight: spacing.sm,
		},
		trackControlsContainer: {
			flexDirection: 'row',
			alignItems: 'center',
			columnGap: spacing.lg + 2,
			paddingLeft: spacing.md,
			paddingRight: spacing.xs,
		},
		loadingIndicatorContainer: {
			minWidth: 26,
			minHeight: 26,
			alignItems: 'center',
			justifyContent: 'center',
		},
	})
