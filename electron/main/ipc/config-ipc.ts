import { ipcMain } from 'electron'

/**
 * 设置配置相关的 IPC 处理器
 */
export function setupConfigIpc() {
  // 导出 Cursor 配置
  ipcMain.handle('config:export', async () => {
    try {
      // TODO: 实现导出配置逻辑
      return {
        success: true,
        data: {
          mcpServers: {},
        },
      }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      }
    }
  })

  // 获取所有模板
  ipcMain.handle('config:getTemplates', async () => {
    try {
      // TODO: 实现获取模板逻辑
      return {
        success: true,
        data: [],
      }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      }
    }
  })
}

