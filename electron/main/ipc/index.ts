import { setupServerIpc } from './server-ipc'
import { setupLogIpc } from './log-ipc'
import { setupConfigIpc } from './config-ipc'
import { setupMarketplaceIpc } from './marketplace-ipc'

/**
 * 设置所有 IPC 处理器
 */
export function setupIpc() {
  setupServerIpc()
  setupLogIpc()
  setupConfigIpc()
  setupMarketplaceIpc()
}

