/**
 * 云端配置。
 *
 * 走 Expo 的 EXPO_PUBLIC_ 前缀注入（构建期内联，运行时读不到也没关系）。
 * 在 .env / CI Secrets 里给这两个值就会自动启用；缺一个就整体降级成"本地模式"，
 * 所有云函数变成 no-op，不会崩。
 */
export const CLOUD_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
export const CLOUD_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const isCloudConfigured = CLOUD_URL.startsWith('http') && CLOUD_ANON_KEY.length > 20

/** 云同步协议版本，将来改表结构时用来做迁移判断 */
export const CLOUD_SCHEMA_VERSION = 1

/** 最多同时在线设备数，与数据库 register_device 里的上限保持一致 */
export const MAX_DEVICES = 5
