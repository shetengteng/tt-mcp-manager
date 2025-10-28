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
      console.log('[IPC] 接收到启动请求:', serverId)
      const config = configManager.getConfig(serverId)
      if (!config) {
        throw new Error(`服务器配置不存在: ${serverId}`)
      }
      console.log('[IPC] 找到配置:', JSON.stringify(config, null, 2))

      // 确保工作目录存在
      if (config.workingDirectory) {
        const fs = require('fs').promises
        const path = require('path')
        const os = require('os')
        const workDir = config.workingDirectory.replace(/^~/, os.homedir())
        try {
          await fs.access(workDir)
          console.log('[IPC] 工作目录存在:', workDir)
        } catch {
          console.log('[IPC] 创建工作目录:', workDir)
          await fs.mkdir(workDir, { recursive: true })
        }
      }

      await processManager.startServer(config)
      console.log('[IPC] 启动成功')
      return { success: true }
    } catch (error: any) {
      console.error(`[IPC] 启动服务器失败 [${serverId}]:`, error)
      return { success: false, error: error.message }
    }
  })

  // 停止服务器
  ipcMain.handle('server:stop', async (_, serverId: string) => {
    try {
      console.log('[IPC] 接收到停止请求:', serverId)
      await processManager.stopServer(serverId)
      console.log('[IPC] 停止操作完成:', serverId)
      return { success: true }
    } catch (error: any) {
      console.error(`[IPC] 停止服务器失败 [${serverId}]:`, error)
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
      const status = processManager.getServerStatus(serverId)
      console.log(`[IPC] 获取状态 [${serverId}]:`, status)
      return status
    } catch (error: any) {
      console.error(`获取服务器状态失败 [${serverId}]:`, error)
      throw error
    }
  })

  // 测试服务器
  ipcMain.handle('server:test', async (_, serverId: string) => {
    try {
      console.log('[IPC] 接收到测试请求:', serverId)
      const result = await processManager.testServer(serverId)
      console.log('[IPC] 测试结果:', result)
      return result
    } catch (error: any) {
      console.error(`[IPC] 测试服务器失败 [${serverId}]:`, error)
      return {
        success: false,
        error: error.message
      }
    }
  })

  console.log('✓ 服务器 IPC 处理器设置完成')
}

