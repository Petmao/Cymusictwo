import { Redirect } from 'expo-router'

export default function Unmatched() {
	// 打开不存在的路径时落到第一个 tab，不能重定向到 "/"，否则会和 (tabs)/index 互相打转
	return <Redirect href="/(tabs)/search" />
}
