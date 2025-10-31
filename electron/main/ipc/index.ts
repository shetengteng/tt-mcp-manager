import { setupServerIpc } from './server-ipc'
import { setupLogIpc } from './log-ipc'
import { setupMarketplaceIpc } from './marketplace-ipc'
import { setupConfigIpc } from './config-ipc'
import { setupTemplateIpc } from './template-ipc'
import { setupSettingsIpc } from './settings-ipc'
import { registerRulesIPC } from './rules-ipc'

/**
 * 设置所有 IPC 处理器
 */
export function setupIpcHandlers(): void {
  console.log('设置 IPC 处理器...')

  setupServerIpc()
  setupLogIpc()
  setupMarketplaceIpc()
  setupConfigIpc()
  setupTemplateIpc()
  setupSettingsIpc()
  registerRulesIPC()

  console.log('✓ 所有 IPC 处理器设置完成')
}
