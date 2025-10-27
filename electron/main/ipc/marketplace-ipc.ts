import { ipcMain } from 'electron'
import { marketplaceService, configManager, processManager } from '../services'
import type { SearchOptions, MarketItem } from '../types'
import { spawn } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(require('child_process').exec)

/**
 * 设置市场相关的 IPC 处理器
 */
export function setupMarketplaceIpc(): void {
  // 搜索 MCP Servers
  ipcMain.handle('marketplace:search', async (_, options: SearchOptions) => {
    try {
      return await marketplaceService.searchServers(options)
    } catch (error: any) {
      console.error('搜索市场失败:', error)
      throw error
    }
  })

  // 获取服务器详情
  ipcMain.handle('marketplace:getDetails', async (_, repoFullName: string) => {
    try {
      return await marketplaceService.getServerDetails(repoFullName)
    } catch (error: any) {
      console.error(`获取详情失败 [${repoFullName}]:`, error)
      throw error
    }
  })

  // 获取 README
  ipcMain.handle('marketplace:getReadme', async (_, repoFullName: string) => {
    try {
      return await marketplaceService.getReadme(repoFullName)
    } catch (error: any) {
      console.error(`获取 README 失败 [${repoFullName}]:`, error)
      throw error
    }
  })

  // 安装服务器
  ipcMain.handle('marketplace:install', async (_, item: MarketItem, userConfig: any) => {
    try {
      console.log(`安装服务器: ${item.name} (${item.installType})`)

      // 根据类型安装
      if (item.installType === 'npm' && item.npmPackage) {
        await installNpmPackage(item.npmPackage)
      } else if (item.installType === 'python' && item.pythonPackage) {
        await installPythonPackage(item.pythonPackage)
      }

      // 创建服务器配置
      const config = {
        id: generateId(),
        name: userConfig.name || item.name,
        type: item.installType,
        command: getCommand(item),
        args: getArgs(item, userConfig),
        env: userConfig.env || {},
        workingDirectory: userConfig.workingDirectory,
        autoStart: false,
        autoRestart: true,
        maxRestarts: 3
      }

      await configManager.saveConfig(config)

      return { success: true, serverId: config.id }
    } catch (error: any) {
      console.error(`安装服务器失败 [${item.name}]:`, error)
      return { success: false, error: error.message }
    }
  })

  console.log('✓ 市场 IPC 处理器设置完成')
}

/**
 * 安装 npm 包
 */
async function installNpmPackage(packageName: string): Promise<void> {
  console.log(`安装 npm 包: ${packageName}`)
  const { stdout, stderr } = await execAsync(`npm install -g ${packageName}`)
  console.log(stdout)
  if (stderr) console.error(stderr)
}

/**
 * 安装 Python 包
 */
async function installPythonPackage(packageName: string): Promise<void> {
  console.log(`安装 Python 包: ${packageName}`)
  const { stdout, stderr } = await execAsync(`pip install ${packageName}`)
  console.log(stdout)
  if (stderr) console.error(stderr)
}

/**
 * 获取启动命令
 */
function getCommand(item: MarketItem): string {
  if (item.installType === 'npm') {
    return 'npx'
  } else if (item.installType === 'python') {
    return 'python'
  }
  return 'node'
}

/**
 * 获取命令参数
 */
function getArgs(item: MarketItem, userConfig: any): string[] {
  const args: string[] = []

  if (item.installType === 'npm' && item.npmPackage) {
    args.push(item.npmPackage)
  } else if (item.installType === 'python' && item.pythonPackage) {
    args.push('-m', item.pythonPackage)
  }

  // 添加用户配置的参数
  if (userConfig.args && Array.isArray(userConfig.args)) {
    args.push(...userConfig.args)
  }

  return args
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `server-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

