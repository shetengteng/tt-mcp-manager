import { ProcessManager } from './process-manager'
import { ConfigManager } from './config-manager'
import { LogManager } from './log-manager'
import { MarketplaceService } from './marketplace-service'
import { TemplateManager } from './template-manager'
import { SettingsManager } from './settings-manager'
import { MCPRegistryService } from './mcp-registry'
import { database } from './database'
import { registrySync } from './registry-sync'
import { RulesImporter } from './rules-importer'
import { RulesDatabase } from './rules-database'
import { RulesManager } from './rules-manager'

// 创建服务实例
export const processManager = new ProcessManager()
export const configManager = new ConfigManager()
export const logManager = new LogManager()
export const marketplaceService = new MarketplaceService()
export const templateManager = new TemplateManager()
export const settingsManager = new SettingsManager()
export const mcpRegistry = new MCPRegistryService()
export const rulesImporter = new RulesImporter()
export const rulesDatabase = new RulesDatabase()
export const rulesManager = new RulesManager()

// 导出数据库和同步服务
export { database, registrySync }

// 初始化所有服务
export async function initializeServices(): Promise<void> {
  console.log('初始化服务...')

  // 1. 初始化数据库
  database.init()
  console.log('✓ 数据库初始化完成')

  // 2. 初始化配置管理器
  await configManager.init()
  console.log('✓ 配置管理器初始化完成')

  // 3. 初始化日志管理器
  await logManager.init()
  console.log('✓ 日志管理器初始化完成')

  // 4. 初始化模板管理器
  await templateManager.initialize()
  console.log('✓ 模板管理器初始化完成')

  // 5. 初始化设置管理器
  await settingsManager.initialize()
  console.log('✓ 设置管理器初始化完成')

  // 6. 启动 Registry 同步服务
  registrySync.start()
  console.log('✓ Registry 同步服务已启动')

  // 7. 初始化 Cursor Rules（如果数据库为空则导入）
  try {
    const needImport = await rulesImporter.shouldReimport()
    if (needImport) {
      console.log('首次启动，开始导入 Cursor Rules 到数据库...')
      const stats = await rulesImporter.importLocalRules()
      console.log(`✓ Cursor Rules 导入完成: 成功 ${stats.success} 条，失败 ${stats.failed} 条`)
    } else {
      console.log('✓ Cursor Rules 数据库已有数据')
    }
  } catch (error) {
    console.error('✗ Cursor Rules 导入失败:', error)
  }

  // 连接进程管理器和日志管理器
  processManager.on('log:new', logEntry => {
    logManager.addLog(logEntry.serverId, logEntry.message, logEntry.level, logEntry.source)
  })

  console.log('✓ 所有服务初始化完成')
}

// 清理所有服务
export function cleanupServices(): void {
  try {
    console.log('清理服务...')

    // 停止同步服务
    registrySync.stop()
    console.log('✓ Registry 同步服务已停止')

    // 关闭数据库
    database.close()
    console.log('✓ 数据库已关闭')

    console.log('✓ 服务清理完成')
  } catch (error) {
    console.error('清理服务失败:', error)
  }
}

// 导出服务类型
export {
  ProcessManager,
  ConfigManager,
  LogManager,
  MarketplaceService,
  TemplateManager,
  SettingsManager,
  MCPRegistryService
}
