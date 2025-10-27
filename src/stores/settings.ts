import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 设置接口
 */
export interface AppSettings {
  // 常规设置
  autoStart: boolean
  minimizeToTray: boolean
  keepBackground: boolean
  
  // 安装设置
  defaultInstallPath: string
  
  // API 设置
  githubToken: string
}

/**
 * 默认设置
 */
const defaultSettings: AppSettings = {
  autoStart: false,
  minimizeToTray: true,
  keepBackground: true,
  defaultInstallPath: '~/mcp-servers',
  githubToken: ''
}

/**
 * 设置状态管理
 */
export const useSettingsStore = defineStore('settings', () => {
  // 状态
  const settings = ref<AppSettings>({ ...defaultSettings })
  const loading = ref(false)

  // 操作
  async function loadSettings() {
    loading.value = true
    try {
      const result = await window.electronAPI.settings.get()
      if (result) {
        settings.value = { ...defaultSettings, ...result }
      }
    } catch (error) {
      console.error('加载设置失败:', error)
    } finally {
      loading.value = false
    }
  }

  async function updateSettings(updates: Partial<AppSettings>) {
    try {
      settings.value = { ...settings.value, ...updates }
      // 转换为普通对象，避免响应式代理无法通过 IPC 传递
      const plainSettings = JSON.parse(JSON.stringify(settings.value))
      const result = await window.electronAPI.settings.update(plainSettings)
      if (!result.success) {
        throw new Error('保存设置失败')
      }
    } catch (error) {
      console.error('更新设置失败:', error)
      throw error
    }
  }

  function resetSettings() {
    settings.value = { ...defaultSettings }
  }

  return {
    // 状态
    settings,
    loading,
    // 操作
    loadSettings,
    updateSettings,
    resetSettings
  }
})

