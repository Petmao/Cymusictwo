import { useAppTheme, useThemeColors } from '@/hooks/useAppTheme'
import { nowLanguage } from '@/utils/i18n'
import { useNavigation } from 'expo-router'
import { debounce } from 'lodash'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { SearchBarProps } from 'react-native-screens'

/**
 * 原生导航栏搜索框。
 *
 * 坑点：searchBarOptions 传对象字面量时每次渲染都是新引用，如果把它放进 useLayoutEffect
 * 的依赖里，就会变成「每次渲染都重新 setOptions」——原生搜索框被反复重配，
 * 典型表现是输入没反应、搜索框内容被重置、从播放页回来再也搜不出东西。
 * 所以这里用「序列化后的 key」作为依赖，回调走 ref，注册只做一次。
 */
export const useNavigationSearch = ({
	searchBarOptions,
	onFocus,
	onBlur,
	onCancel,
}: {
	searchBarOptions?: SearchBarProps
	onFocus?: () => void
	onBlur?: () => void
	onCancel?: () => void
}) => {
	const [search, setSearch] = useState('')
	const navigation = useNavigation()
	const language = nowLanguage.useValue()
	const colors = useThemeColors()
	const { isDark } = useAppTheme()
	/** 搜索条完全透明：底下就是页面渐变，颜色天生一致 */
	const barColor = 'transparent'
	/** 输入框本体：浅色主题半透明白玻璃，深色半透明白 */
	const fieldColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.72)'

	const defaultSearchOptions = useMemo<SearchBarProps>(
		() => ({
			tintColor: colors.primary,
			barTintColor: barColor,
			backgroundColor: fieldColor,
			textColor: colors.text,
			hintTextColor: colors.textMuted,
			hideWhenScrolling: false,
		}),
		[colors.primary, colors.text, colors.textMuted, barColor, fieldColor],
	)

	// 回调放 ref，避免调用方每次渲染换函数导致重复注册
	const handlersRef = useRef({ onFocus, onBlur, onCancel })
	useEffect(() => {
		handlersRef.current = { onFocus, onBlur, onCancel }
	}, [onFocus, onBlur, onCancel])

	const debouncedSetSearch = useMemo(
		() =>
			debounce((text: string) => {
				setSearch(text ?? '')
			}, 400),
		[],
	)

	useEffect(() => () => debouncedSetSearch.cancel(), [debouncedSetSearch])

	const handleOnChangeText: SearchBarProps['onChangeText'] = useCallback(
		({ nativeEvent: { text } }: { nativeEvent: { text: string } }) => {
			debouncedSetSearch(text)
		},
		[debouncedSetSearch],
	)

	const handleFocus = useCallback(() => {
		handlersRef.current.onFocus?.()
	}, [])

	const handleBlur = useCallback(() => {
		handlersRef.current.onBlur?.()
	}, [])

	const handleCancel = useCallback(() => {
		// 取消时立刻清空，避免等待 400ms 防抖导致界面停在旧结果上
		debouncedSetSearch.cancel()
		setSearch('')
		handlersRef.current.onCancel?.()
	}, [debouncedSetSearch])

	// 只关心「影响原生搜索框外观/占位」的字段，函数与引用变化不算
	const optionsKey = useMemo(
		() =>
			JSON.stringify({
				placeholder: searchBarOptions?.placeholder ?? '',
				cancelButtonText: searchBarOptions?.cancelButtonText ?? '',
				hideWhenScrolling: searchBarOptions?.hideWhenScrolling ?? false,
				language,
			}),
		[
			searchBarOptions?.placeholder,
			searchBarOptions?.cancelButtonText,
			searchBarOptions?.hideWhenScrolling,
			language,
		],
	)

	useLayoutEffect(() => {
		navigation.setOptions({
			headerSearchBarOptions: {
				...defaultSearchOptions,
				...searchBarOptions,
				placeholder: searchBarOptions?.placeholder,
				cancelButtonText: searchBarOptions?.cancelButtonText,
				onChangeText: handleOnChangeText,
				onFocus: handleFocus,
				onBlur: handleBlur,
				onCancelButtonPress: handleCancel,
			},
		})
		// optionsKey 里已经包含所有会影响原生控件的字面量，避免对象引用触发重配
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [optionsKey, defaultSearchOptions, navigation, handleOnChangeText, handleFocus, handleBlur, handleCancel])

	return search
}
