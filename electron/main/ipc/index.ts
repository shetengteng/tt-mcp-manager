import { setupServerIpc } from './server-ipc'
import { setupLogIpc } from './log-ipc'
import { setupMarketplaceIpc } from './marketplace-ipc'
import { setupConfigIpc } from './config-ipc'
import { setupTemplateIpc } from './template-ipc'

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
  
  console.log('✓ 所有 IPC 处理器设置完成')
}

