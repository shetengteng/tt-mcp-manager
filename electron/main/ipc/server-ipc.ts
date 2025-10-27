import { ipcMain } from 'electron'
import { processManager, configManager } from '../services'
import type { ServerConfig } from '../types'

/**
 * 设置服务器相关的 IPC 处理器
 */
export function setupServerIpc(): void {
  // 获取所有服务器
  ipcMain.handle('server:getAll', async () => {
    try {
      return configManager.getAllConfigs()
    } catch (error: any) {
      console.error('获取服务器列表失败:', error)
      throw error
    }
  })

  // 获取单个服务器
  ipcMain.handle('server:get', async (_, serverId: string) => {
    try {
      return configManager.getConfig(serverId)
    } catch (error: any) {
      console.error(`获取服务器失败 [${serverId}]:`, error)
      throw error
    }
  })

  // 创建服务器
  ipcMain.handle('server:create', async (_, config: ServerConfig) => {
    try {
      await configManager.saveConfig(config)
      return config
    } catch (error: any) {
      console.error('创建服务器失败:', error)
      throw error
    }
  })

  // 更新服务器
  ipcMain.handle('server:update', async (_, serverId: string, updates: Partial<ServerConfig>) => {
    try {
      return await configManager.updateConfig(serverId, updates)
    } catch (error: any) {
      console.error(`更新服务器失败 [${serverId}]:`, error)
      throw error
    }
  })

  // 删除服务器
  ipcMain.handle('server:delete', async (_, serverId: string) => {
    try {
      // 如果服务器正在运行，先停止
      if (processManager.isRunning(serverId)) {
        await processManager.stopServer(serverId)
      }
      
      await configManager.deleteConfig(serverId)
      return { success: true }
    } catch (error: any) {
      console.error(`删除服务器失败 [${serverId}]:`, error)
      throw error
    }
  })

  // 启动服务器
  ipcMain.handle('server:start', async (_, serverId: string) => {
    try {
      const config = configManager.getConfig(serverId)
      if (!config) {
        throw new Error(`服务器配置不存在: ${serverId}`)
      }

      await processManager.startServer(config)
      return { success: true }
    } catch (error: any) {
      console.error(`启动服务器失败 [${serverId}]:`, error)
      return { success: false, error: error.message }
    }
  })

  // 停止服务器
  ipcMain.handle('server:stop', async (_, serverId: string) => {
    try {
      await processManager.stopServer(serverId)
      return { success: true }
    } catch (error: any) {
      console.error(`停止服务器失败 [${serverId}]:`, error)
      return { success: false, error: error.message }
    }
  })

  // 重启服务器
  ipcMain.handle('server:restart', async (_, serverId: string) => {
    try {
      await processManager.restartServer(serverId)
      return { success: true }
    } catch (error: any) {
      console.error(`重启服务器失败 [${serverId}]:`, error)
      return { success: false, error: error.message }
    }
  })

  // 获取服务器状态
  ipcMain.handle('server:getStatus', async (_, serverId: string) => {
    try {
      return processManager.getServerStatus(serverId)
    } catch (error: any) {
      console.error(`获取服务器状态失败 [${serverId}]:`, error)
      throw error
    }
  })

  console.log('✓ 服务器 IPC 处理器设置完成')
}

