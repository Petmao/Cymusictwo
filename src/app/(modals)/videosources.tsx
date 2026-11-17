import { GradientScreen } from '@/components/GradientScreen'
import { radius, spacing, strokeWidth, typography } from '@/constants/tokens'
import { useAppTheme } from '@/hooks/useAppTheme'
import { addVideoSource, removeVideoSource, useVideoSources } from '@/store/videoSources'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import React, { useMemo, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

const VideoSourcesScreen = () => {
	const { colors, gradients } = useAppTheme()
	const sources = useVideoSources()
	const [title, setTitle] = useState('')
	const [url, setUrl] = useState('')
	const styles = useMemo(() => createStyles(colors), [colors])

	const handleAdd = () => {
		try {
			addVideoSource({ title, url })
			setTitle('')
			setUrl('')
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			Alert.alert('添加失败', message)
		}
	}

	return (
		<GradientScreen>
			<ScrollView
				contentContainerStyle={styles.content}
				keyboardShouldPersistTaps="handled"
			>
				<View style={styles.header}>
					<TouchableOpacity onPress={() => router.back()} style={styles.back}>
						<Ionicons name="chevron-down" size={20} color={colors.text} />
					</TouchableOpacity>
					<Text style={styles.title}>视频源</Text>
					<View style={styles.back} />
				</View>

				<Text style={styles.label}>新增</Text>
				<View style={styles.card}>
					<TextInput
						value={title}
						onChangeText={setTitle}
						placeholder="标题（可留空）"
						placeholderTextColor={colors.placeholder}
						style={styles.input}
					/>
					<View style={styles.separator} />
					<TextInput
						value={url}
						onChangeText={setUrl}
						placeholder="https://... .mp4 / .m3u8"
						placeholderTextColor={colors.placeholder}
						autoCapitalize="none"
						autoCorrect={false}
						style={styles.input}
					/>
				</View>

				<TouchableOpacity activeOpacity={0.85} onPress={handleAdd} disabled={!url.trim()}>
					<View
						style={[
							styles.saveBtn,
							{ opacity: url.trim() ? 1 : 0.4, backgroundColor: gradients.accent[1] },
						]}
					>
						<Text style={styles.saveText}>保存</Text>
					</View>
				</TouchableOpacity>

				<Text style={styles.label}>已添加 · {sources.length}</Text>
				<View style={styles.card}>
					{sources.length === 0 ? (
						<Text style={styles.emptyText}>还没有视频源</Text>
					) : (
						sources.map((item, index) => (
							<View key={item.id}>
								{index > 0 ? <View style={styles.separator} /> : null}
								<View style={styles.row}>
									<View style={styles.rowText}>
										<Text numberOfLines={1} style={styles.rowTitle}>
											{item.title}
										</Text>
										<Text numberOfLines={1} style={styles.rowUrl}>
											{item.url}
										</Text>
									</View>
									<TouchableOpacity
										hitSlop={8}
										onPress={() => removeVideoSource(item.id)}
									>
										<Ionicons name="trash-outline" size={17} color={colors.textMuted} />
									</TouchableOpacity>
								</View>
							</View>
						))
					)}
				</View>

				<Text style={styles.hint}>
					只有 SVIP 能使用视频功能；地址需要是可直接播放的 mp4 / m3u8 直链，普通网页地址会显示「不可播」。
				</Text>
			</ScrollView>
		</GradientScreen>
	)
}

export default VideoSourcesScreen

const createStyles = (colors: ReturnType<typeof useAppTheme>['colors']) =>
	StyleSheet.create({
		content: {
			paddingHorizontal: spacing.lg,
			paddingTop: spacing.xl,
			paddingBottom: spacing.xxl,
		},
		header: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			marginBottom: spacing.xl,
		},
		back: {
			width: 34,
			height: 34,
			borderRadius: 17,
			alignItems: 'center',
			justifyContent: 'center',
		},
		title: {
			...typography.headline,
			color: colors.text,
			fontSize: 17,
		},
		label: {
			...typography.label,
			color: colors.textMuted,
			marginLeft: spacing.md,
			marginBottom: spacing.sm,
			marginTop: spacing.md,
		},
		card: {
			backgroundColor: colors.surfaceElevated,
			borderRadius: 18,
			borderCurve: 'continuous',
			borderWidth: strokeWidth,
			borderColor: colors.border,
			overflow: 'hidden',
		},
		input: {
			paddingHorizontal: spacing.lg,
			paddingVertical: spacing.md + 2,
			fontSize: 15,
			color: colors.text,
		},
		separator: {
			height: strokeWidth,
			backgroundColor: colors.separator,
			marginLeft: spacing.lg,
		},
		saveBtn: {
			marginTop: spacing.md,
			height: 48,
			borderRadius: radius.pill,
			alignItems: 'center',
			justifyContent: 'center',
		},
		saveText: {
			fontSize: 15,
			fontWeight: '700',
			color: '#FFFFFF',
		},
		row: {
			flexDirection: 'row',
			alignItems: 'center',
			paddingHorizontal: spacing.lg,
			paddingVertical: spacing.md,
		},
		rowText: {
			flex: 1,
			marginRight: spacing.sm,
		},
		rowTitle: {
			fontSize: 15,
			color: colors.text,
			fontWeight: '600',
		},
		rowUrl: {
			fontSize: 11,
			color: colors.textMuted,
			marginTop: 3,
		},
		emptyText: {
			paddingHorizontal: spacing.lg,
			paddingVertical: spacing.lg,
			fontSize: 13,
			color: colors.textMuted,
		},
		hint: {
			marginTop: spacing.lg,
			marginHorizontal: spacing.md,
			fontSize: 11,
			lineHeight: 17,
			color: colors.textMuted,
		},
	})
