import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { initializeServices, processManager } from './services'
import { setupIpcHandlers } from './ipc'

// 主窗口实例
let mainWindow: BrowserWindow | null = null

/**
 * 创建主窗口
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler(details => {
    require('electron').shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 加载应用
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// 应用准备就绪
app.whenReady().then(async () => {
  // 设置应用用户模型ID（Windows）
  app.setAppUserModelId('com.terrellshe.mcp-manager')

  // 初始化服务
  try {
    await initializeServices()
  } catch (error) {
    console.error('服务初始化失败:', error)
  }

  // 设置 IPC 处理器
  setupIpcHandlers()

  createWindow()

  app.on('activate', function () {
    // macOS 上点击 dock 图标时重新创建窗口
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// 所有窗口关闭时退出
app.on('window-all-closed', async () => {
  // 停止所有服务器
  await processManager.stopAll()
  
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 应用退出前清理
app.on('before-quit', async () => {
  console.log('应用退出，清理资源...')
  await processManager.stopAll()
})

// 处理未捕获的异常
process.on('uncaughtException', error => {
  console.error('未捕获的异常:', error)
})

process.on('unhandledRejection', reason => {
  console.error('未处理的 Promise 拒绝:', reason)
})

