import { ProcessManager } from './process-manager'
import { ConfigManager } from './config-manager'
import { LogManager } from './log-manager'
import { MarketplaceService } from './marketplace-service'
import { TemplateManager } from './template-manager'

// 创建服务实例
export const processManager = new ProcessManager()
export const configManager = new ConfigManager()
export const logManager = new LogManager()
export const marketplaceService = new MarketplaceService()
export const templateManager = new TemplateManager()

// 初始化所有服务
export async function initializeServices(): Promise<void> {
  console.log('初始化服务...')
  
  // 初始化配置管理器
  await configManager.init()
  console.log('✓ 配置管理器初始化完成')
  
  // 初始化日志管理器
  await logManager.init()
  console.log('✓ 日志管理器初始化完成')
  
  // 初始化模板管理器
  await templateManager.initialize()
  console.log('✓ 模板管理器初始化完成')
  
  // 连接进程管理器和日志管理器
  processManager.on('log:new', (logEntry) => {
    logManager.addLog(
      logEntry.serverId,
      logEntry.message,
      logEntry.level,
      logEntry.source
    )
  })
  
  console.log('✓ 所有服务初始化完成')
}

// 导出服务类型
export { ProcessManager, ConfigManager, LogManager, MarketplaceService, TemplateManager }

