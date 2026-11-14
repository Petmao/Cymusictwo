// src/app/(modals)/settingModal.tsx —— 屿声排版重做（legacy-120）
// 功能逻辑与上游 1.2.0 完全一致：音质菜单、检查更新、清空缓存、清空待播清单、导入音源入口。
import React, { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { colors } from '@/constants/tokens'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MenuView } from '@react-native-menu/menu'
import Constants from 'expo-constants'
import myTrackPlayer, { useCurrentQuality } from '@/helpers/trackPlayerIndex'

const QUALITY_OPTIONS = ['128k', '320k', 'flac']
const CURRENT_VERSION = Constants.expoConfig?.version ?? '未知版本'

// eslint-disable-next-line react/prop-types
const MusicQualityMenu = ({ currentQuality, onSelectQuality }) => {
  return (
    <MenuView
      onPressAction={({ nativeEvent: { event } }) => {
        if (QUALITY_OPTIONS.includes(event)) onSelectQuality(event)
      }}
      actions={QUALITY_OPTIONS.map((quality) => ({
        id: quality,
        title: quality,
        state: currentQuality === quality ? 'on' : 'off',
      }))}
    >
      <TouchableOpacity style={styles.menuTrigger}>
        <Text style={styles.menuTriggerValue}>{currentQuality}</Text>
      </TouchableOpacity>
    </MenuView>
  )
}

const SettingModal = () => {
  const router = useRouter()
  const [currentQuality, setCurrentQuality] = useCurrentQuality()
  const [isQualitySelectorVisible, setIsQualitySelectorVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const DismissPlayerSymbol = () => {
    const { top } = useSafeAreaInsets()
    return (
      <View style={[styles.dismissSymbol, { top: top - 25 }]}>
        <View style={styles.dismissBar} />
      </View>
    )
  }

  const checkForUpdates = async () => {
    setIsLoading(true)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('请求超时')), 10000),
    )
    try {
      const result = await Promise.race([
        fetch('https://api.github.com/repos/gyc-12/music-player-master/releases/latest'),
        timeoutPromise,
      ])
      if (!(result instanceof Response)) throw new Error('非预期的结果类型')
      if (!result.ok) throw new Error(`HTTP error! status: ${result.status}`)
      const data = await result.json()
      const latestVersion = data.tag_name

      if (latestVersion !== CURRENT_VERSION) {
        Alert.alert(
          '新版本可用',
          `发现新版本 ${latestVersion}，请更新。`,
          [
            { text: '确定', onPress: () => Linking.openURL(data.html_url) },
            { text: '取消', onPress: () => {}, style: 'cancel' },
          ],
        )
      } else {
        Alert.alert('已是最新版本', '当前已是最新版本。')
      }
    } catch (error) {
      console.error('检查更新失败', error)
      Alert.alert('检查更新失败', '无法检查更新，请稍后再试。')
    } finally {
      setIsLoading(false)
    }
  }

  const settingsData = [
    {
      title: '应用信息',
      data: [
        { id: '1', title: 'CyMusic', type: 'link', icon: require('@/assets/144.png') },
        { id: '2', title: '版本号', type: 'value', value: CURRENT_VERSION },
        { id: '3', title: '检查更新', type: 'value' },
        { id: '5', title: '项目链接', type: 'value', value: '' },
        { id: '9', title: '清空缓存', type: 'value', value: '' },
      ],
    },
    {
      title: '音频设置',
      data: [{ id: '6', title: '清空待播清单', type: 'link' }],
    },
    {
      title: '自定义音源',
      data: [
        { id: '7', title: '音源状态', type: 'value', value: '正常' },
        { id: '8', title: '导入音源', type: 'link' },
      ],
    },
    {
      title: '音质选择',
      data: [{ id: '10', title: '当前音质', type: 'value' }],
    },
  ]

  const renderItem = (item, index, sectionData) => (
    <View key={item.id}>
      <TouchableOpacity
        key={item.id}
        style={[
          styles.item,
          index === 0 && styles.firstItem,
          index === sectionData.length - 1 && styles.lastItem,
        ]}
        onPress={() => {
          if (item.title === '项目链接') {
            Linking.openURL('https://github.com/gyc-12/music-player-master').catch((err) =>
              console.error("Couldn't load page", err),
            )
          } else if (item.title === '当前音质') {
            setIsQualitySelectorVisible(true)
          } else if (item.type === 'link') {
            if (item.title === '清空待播清单') {
              Alert.alert('清空待播清单', '确定要清空待播清单吗？', [
                { text: '取消', style: 'cancel' },
                { text: '确定', onPress: () => myTrackPlayer.clearToBePlayed() },
              ])
            } else if (item.title === '导入音源') {
              Alert.alert('提示', '音源导入待实现', [{ text: '确定' }])
            } else if (item.title === '清空缓存') {
              // 上游未实现 clearCache，保留空实现
            }
          } else if (item.title === '检查更新') {
            checkForUpdates()
          }
        }}
      >
        {item.icon && <Image source={item.icon} style={styles.icon} />}
        <View style={styles.itemContent}>
          <Text style={styles.itemText}>{item.title}</Text>
          {item.type === 'value' && <Text style={styles.itemValue}>{item.value}</Text>}
          {item.title === '当前音质' && (
            <MusicQualityMenu currentQuality={currentQuality} onSelectQuality={setCurrentQuality} />
          )}
          {(item.type === 'link' || item.title === '项目链接') && !item.icon && (
            <Text style={styles.arrowRight}>{'>'}</Text>
          )}
        </View>
      </TouchableOpacity>
      {index !== sectionData.length - 1 && <View style={styles.separator} />}
    </View>
  )

  const GlobalLoading = () => (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size='large' color={colors.primary} />
    </View>
  )

  return (
    <View style={styles.container}>
      <DismissPlayerSymbol />
      <Text style={styles.header}>设置</Text>
      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 32 }}>
        {settingsData.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>{section.data.map(renderItem)}</View>
          </View>
        ))}
      </ScrollView>
      {isLoading && <GlobalLoading />}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0509',
  },
  dismissSymbol: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    zIndex: 1,
  },
  dismissBar: {
    width: 40,
    height: 5,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    opacity: 0.55,
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 10,
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.5)',
    marginLeft: 20,
    marginBottom: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    minHeight: 46,
  },
  firstItem: { borderBottomWidth: 0 },
  lastItem: { borderBottomWidth: 0 },
  separator: {
    marginLeft: 16,
    marginRight: 16,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  sectionContent: {
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderRadius: 18,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  icon: {
    width: 30,
    height: 30,
    marginRight: 12,
    borderRadius: 8,
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  itemValue: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
  },
  arrowRight: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.35)',
  },
  menuTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 72,
  },
  menuTriggerValue: {
    fontSize: 14,
    color: '#FF8FBF',
    textAlign: 'right',
  },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
})

export default SettingModal
