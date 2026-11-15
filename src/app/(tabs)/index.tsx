import { Redirect } from 'expo-router'

// (tabs) 的默认入口：直接落到「搜索」tab，避免 / 没有 index 路由时被 [...unmatched] 兜住形成重定向死循环
export default function TabsIndex() {
	return <Redirect href="/(tabs)/search" />
}
