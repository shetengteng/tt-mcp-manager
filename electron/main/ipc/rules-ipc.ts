import { ipcMain } from 'electron'
import { RulesDatabase } from '../services/rules-database'
import { RulesManager } from '../services/rules-manager'
import { RulesImporter } from '../services/rules-importer'
import type { RuleSearchOptions, RuleInstallConfig } from '../types'

/**
 * 注册 Cursor Rules 相关的 IPC 处理器
 */
export function registerRulesIPC() {
  const database = new RulesDatabase()
  const manager = new RulesManager()
  const importer = new RulesImporter()

  /**
   * 搜索规则
   */
  ipcMain.handle('rules:search', async (_event, options: RuleSearchOptions) => {
    try {
      return database.searchRules(options)
    } catch (error: any) {
      console.error('搜索规则失败:', error)
      throw error
    }
  })

  /**
   * 根据ID获取规则
   */
  ipcMain.handle('rules:getById', async (_event, id: number) => {
    try {
      return database.getRuleById(id)
    } catch (error: any) {
      console.error('获取规则失败:', error)
      throw error
    }
  })

  /**
   * 安装规则
   */
  ipcMain.handle('rules:install', async (_event, ruleId: number, config: RuleInstallConfig) => {
    try {
      await manager.installRule(ruleId, config)
      return { success: true }
    } catch (error: any) {
      console.error('安装规则失败:', error)
      return { success: false, error: error.message }
    }
  })

  /**
   * 卸载规则
   */
  ipcMain.handle('rules:uninstall', async (_event, installId: number) => {
    try {
      await manager.uninstallRule(installId)
      return { success: true }
    } catch (error: any) {
      console.error('卸载规则失败:', error)
      return { success: false, error: error.message }
    }
  })

  /**
   * 切换规则启用状态
   */
  ipcMain.handle('rules:toggle', async (_event, installId: number, enabled: boolean) => {
    try {
      await manager.toggleRule(installId, enabled)
      return { success: true }
    } catch (error: any) {
      console.error('切换规则状态失败:', error)
      return { success: false, error: error.message }
    }
  })

  /**
   * 获取已安装的规则
   */
  ipcMain.handle('rules:getInstalled', async () => {
    try {
      return database.getInstalledRules()
    } catch (error: any) {
      console.error('获取已安装规则失败:', error)
      throw error
    }
  })

  /**
   * 导入本地规则到数据库
   */
  ipcMain.handle('rules:importLocalRules', async () => {
    try {
      return await importer.importLocalRules()
    } catch (error: any) {
      console.error('导入本地规则失败:', error)
      return { success: 0, failed: 0 }
    }
  })

  console.log('✓ Rules IPC handlers registered')
}
