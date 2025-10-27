import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { setupIpc } from './ipc'

// 主窗口实例
let mainWindow: BrowserWindow | null = null

/**
 * 创建主窗口
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 600,
    title: 'MCP Manager',
    webPreferences: {
      nodeIntegration: false, // 安全性：禁用 Node 集成
      contextIsolation: true, // 安全性：启用上下文隔离
      preload: join(__dirname, '../preload/index.js'),
    },
  })

  // 加载应用
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../../dist/index.html'))
  }

  // 窗口关闭时清理
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

/**
 * 应用初始化
 */
app.whenReady().then(async () => {
  // 设置 IPC 处理器
  setupIpc()

  // 创建窗口
  createWindow()

  // macOS 激活时创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

/**
 * 所有窗口关闭时退出应用（macOS 除外）
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

/**
 * 应用退出前清理
 */
app.on('will-quit', () => {
  // 清理逻辑（停止所有 MCP Server 等）
  console.log('Application is quitting...')
})

/**
 * 处理未捕获的异常
 */
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason)
})

