import { breadcrumb, installFatalHandler } from '@/helpers/crashLog'

/**
 * 入口前置模块：必须比 expo-router/entry 先求值。
 *
 * ES 的 import 是提升的，写在 _layout 里已经太晚——被它 import 的模块
 * 一旦在求值阶段抛错，整个 bundle 会直接 abort，连兜底都装不上。
 */
breadcrumb('entry')
installFatalHandler()
breadcrumb('handler-ready')
