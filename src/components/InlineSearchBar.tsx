import { useAppTheme } from '@/hooks/useAppTheme'
import { Ionicons } from '@expo/vector-icons'
import { debounce } from 'lodash'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native'

/**
 * 页面内自绘的搜索框。
 *
 * 为什么不用原生 headerSearchBarOptions：那个搜索条挂在原生导航栏里，
 * useHeaderHeight() 拿到的只是导航栏本体高度，不含搜索条，内容就会钻到搜索条底下。
 * 自己画一个，高度和位置完全可控，颜色也能和页面渐变对齐。
 */
type Props = {
	placeholder: string
	/** 防抖后的关键词（默认 400ms） */
	onChange: (keyword: string) => void
	onFocus?: () => void
	onCancel?: () => void
	debounceMs?: number
	initialValue?: string
	autoFocus?: boolean
}

export const InlineSearchBar = ({
	placeholder,
	onChange,
	onFocus,
	onCancel,
	debounceMs = 400,
	initialValue = '',
	autoFocus = false,
}: Props) => {
	const { colors, isDark } = useAppTheme()
	const [text, setText] = useState(initialValue)
	const inputRef = useRef<TextInput | null>(null)

	const emit = useMemo(
		() => debounce((value: string) => onChange(value.trim()), debounceMs),
		[onChange, debounceMs],
	)

	useEffect(() => () => emit.cancel(), [emit])

	const handleChange = (value: string) => {
		setText(value)
		emit(value)
	}

	const handleClear = () => {
		emit.cancel()
		setText('')
		onChange('')
		onCancel?.()
	}

	return (
		<View
			style={[
				styles.wrap,
				{
					backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.72)',
				},
			]}
		>
			<Ionicons name="search" size={16} color={colors.textMuted} style={styles.icon} />
			<TextInput
				ref={inputRef}
				value={text}
				onChangeText={handleChange}
				onFocus={onFocus}
				placeholder={placeholder}
				placeholderTextColor={colors.textMuted}
				style={[styles.input, { color: colors.text }]}
				returnKeyType="search"
				autoCapitalize="none"
				autoCorrect={false}
				autoFocus={autoFocus}
				clearButtonMode="never"
			/>
			{text.length > 0 ? (
				<TouchableOpacity hitSlop={8} onPress={handleClear} style={styles.clear}>
					<Ionicons name="close-circle" size={16} color={colors.textMuted} />
				</TouchableOpacity>
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	wrap: {
		height: 38,
		borderRadius: 12,
		borderCurve: 'continuous',
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 10,
	},
	icon: {
		marginRight: 6,
	},
	input: {
		flex: 1,
		height: 38,
		fontSize: 15,
		padding: 0,
	},
	clear: {
		marginLeft: 6,
	},
})
