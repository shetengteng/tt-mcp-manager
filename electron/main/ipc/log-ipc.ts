import { ipcMain, BrowserWindow } from 'electron'
import { logManager } from '../services'
import type { LogQueryOptions } from '../types'

/**
 * 设置日志相关的 IPC 处理器
 */
export function setupLogIpc(): void {
  // 获取日志
  ipcMain.handle('log:get', async (_, serverId: string, options?: LogQueryOptions) => {
    try {
      return logManager.getLogs(serverId, options)
    } catch (error: any) {
      console.error(`获取日志失败 [${serverId}]:`, error)
      throw error
    }
  })

  // 清空日志
  ipcMain.handle('log:clear', async (_, serverId: string) => {
    try {
      logManager.clearLogs(serverId)
      return { success: true }
    } catch (error: any) {
      console.error(`清空日志失败 [${serverId}]:`, error)
      return { success: false, error: error.message }
    }
  })

  // 导出日志
  ipcMain.handle('log:export', async (_, serverId: string, filePath: string) => {
    try {
      await logManager.exportLogs(serverId, filePath)
      return { success: true }
    } catch (error: any) {
      console.error(`导出日志失败 [${serverId}]:`, error)
      return { success: false, error: error.message }
    }
  })

  // 搜索日志
  ipcMain.handle('log:search', async (_, serverId: string, query: string) => {
    try {
      return logManager.searchLogs(serverId, query)
    } catch (error: any) {
      console.error(`搜索日志失败 [${serverId}]:`, error)
      throw error
    }
  })

  // 监听新日志，并转发到渲染进程
  logManager.on('log:new', (logEntry) => {
    const windows = BrowserWindow.getAllWindows()
    windows.forEach(window => {
      window.webContents.send('log:new', logEntry)
    })
  })

  console.log('✓ 日志 IPC 处理器设置完成')
}

