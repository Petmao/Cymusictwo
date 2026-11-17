// 自定义入口：先装启动兜底，再交给 expo-router 注册路由。
// 顺序不能反——early 里的 handler 要能在任何路由模块求值之前就位。
import './src/boot/early'
import 'expo-router/entry'
