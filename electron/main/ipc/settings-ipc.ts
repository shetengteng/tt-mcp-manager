import { ipcMain, dialog } from 'electron'
import { settingsManager } from '../services'
import type { AppSettings } from '../services/settings-manager'

/**
 * 设置设置相关的 IPC 处理器
 */
export function setupSettingsIpc(): void {
  // 获取设置
  ipcMain.handle('settings:get', async () => {
    try {
      return settingsManager.getSettings()
    } catch (error: any) {
      console.error('获取设置失败:', error)
      throw error
    }
  })

  // 更新设置
  ipcMain.handle('settings:update', async (_, settings: Partial<AppSettings>) => {
    try {
      await settingsManager.updateSettings(settings)
      return { success: true }
    } catch (error: any) {
      console.error('更新设置失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 重置设置
  ipcMain.handle('settings:reset', async () => {
    try {
      await settingsManager.resetSettings()
      return { success: true }
    } catch (error: any) {
      console.error('重置设置失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 选择文件夹
  ipcMain.handle('settings:selectFolder', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
        title: '选择默认安装路径',
        buttonLabel: '选择'
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true }
      }

      return { success: true, path: result.filePaths[0] }
    } catch (error: any) {
      console.error('选择文件夹失败:', error)
      return { success: false, error: error.message }
    }
  })

  console.log('✓ 设置 IPC 处理器设置完成')
}

