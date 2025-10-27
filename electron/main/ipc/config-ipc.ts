import { ipcMain, dialog } from 'electron'
import { configManager } from '../services'

/**
 * 设置配置相关的 IPC 处理器
 */
export function setupConfigIpc(): void {
  // 导出配置（Cursor 格式）
  ipcMain.handle('config:export', async () => {
    try {
      return configManager.exportForCursor()
    } catch (error: any) {
      console.error('导出配置失败:', error)
      throw error
    }
  })

  // 导出配置到文件
  ipcMain.handle('config:exportToFile', async (event, filePath?: string) => {
    try {
      // 如果没有提供路径，打开保存对话框
      if (!filePath) {
        const result = await dialog.showSaveDialog({
          title: '导出配置',
          defaultPath: 'mcp-config.json',
          filters: [
            { name: 'JSON 文件', extensions: ['json'] },
            { name: '所有文件', extensions: ['*'] }
          ]
        })

        if (result.canceled || !result.filePath) {
          return { success: false, error: '用户取消' }
        }

        filePath = result.filePath
      }

      await configManager.exportToFile(filePath)
      return { success: true }
    } catch (error: any) {
      console.error('导出配置到文件失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 从文件导入配置
  ipcMain.handle('config:import', async (event, filePath?: string) => {
    try {
      // 如果没有提供路径，打开文件对话框
      if (!filePath) {
        const result = await dialog.showOpenDialog({
          title: '导入配置',
          filters: [
            { name: 'JSON 文件', extensions: ['json'] },
            { name: '所有文件', extensions: ['*'] }
          ],
          properties: ['openFile']
        })

        if (result.canceled || result.filePaths.length === 0) {
          return { success: false, error: '用户取消' }
        }

        filePath = result.filePaths[0]
      }

      await configManager.importFromFile(filePath)
      return { success: true }
    } catch (error: any) {
      console.error('导入配置失败:', error)
      return { success: false, error: error.message }
    }
  })

  console.log('✓ 配置 IPC 处理器设置完成')
}

