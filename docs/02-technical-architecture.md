# 技术架构文档

## 🏗️ 系统架构

### 整体架构图

```
┌────────────────────────────────────────────────────────┐
│                   前端层 (Renderer)                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Vue 3 Composition API + TypeScript               │  │
│  │  - Pinia (状态管理)                               │  │
│  │  - Vue Router (路由)                              │  │
│  │  - ShadCN-Vue (UI 组件库)                         │  │
│  │  - TailwindCSS (样式)                             │  │
│  └──────────────────────────────────────────────────┘  │
└──────────────────────┬─────────────────────────────────┘
                       │ IPC 通信 (contextBridge)
┌──────────────────────▼─────────────────────────────────┐
│               Electron 主进程层                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  核心服务模块 (TypeScript)                        │  │
│  │  ┌──────────────┐  ┌─────────────────┐          │  │
│  │  │进程管理器    │  │  配置管理器     │          │  │
│  │  │ProcessMgr    │  │  ConfigMgr      │          │  │
│  │  │- spawn()     │  │  - 读写JSON     │          │  │
│  │  │- 监控状态    │  │  - 配置验证     │          │  │
│  │  │- 自动重启    │  │  - 模板管理     │          │  │
│  │  └──────────────┘  └─────────────────┘          │  │
│  │  ┌──────────────┐  ┌─────────────────┐          │  │
│  │  │日志管理器    │  │  市场服务       │          │  │
│  │  │LogMgr        │  │  MarketplaceSvc │          │  │
│  │  │- 日志收集    │  │  - GitHub API   │          │  │
│  │  │- 日志存储    │  │  - npm API      │          │  │
│  │  │- 实时推送    │  │  - 缓存管理     │          │  │
│  │  └──────────────┘  └─────────────────┘          │  │
│  │  ┌─────────────────────────────────┐            │  │
│  │  │  API 服务器 (可选)              │            │  │
│  │  │  - Express (RESTful API)        │            │  │
│  │  │  - Socket.io (WebSocket)        │            │  │
│  │  └─────────────────────────────────┘            │  │
│  └──────────────────────────────────────────────────┘  │
└──────────────────────┬─────────────────────────────────┘
                       │
┌──────────────────────▼─────────────────────────────────┐
│                   数据持久层                            │
│  - 配置文件 (JSON) - ~/.mcp-manager/config.json       │
│  - 日志文件 - ~/.mcp-manager/logs/                     │
│  - 模板库 - app/templates/                             │
│  - 缓存 - ~/.mcp-manager/cache/                        │
└──────────────────────┬─────────────────────────────────┘
                       │
┌──────────────────────▼─────────────────────────────────┐
│              外部 MCP Server 进程                       │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐              │
│  │ MCP1 │  │ MCP2 │  │ MCP3 │  │ MCP4 │              │
│  │(npm) │  │(py)  │  │(git) │  │(npm) │              │
│  └──────┘  └──────┘  └──────┘  └──────┘              │
└────────────────────────────────────────────────────────┘
```

## 💻 技术栈详解

### 前端技术栈

#### 1. 核心框架
```typescript
{
  "vue": "^3.4.0",              // Vue 3 组合式 API
  "vue-router": "^4.2.0",       // 路由管理
  "pinia": "^2.1.0",            // 状态管理
  "typescript": "^5.3.0"        // 类型系统
}
```

#### 2. UI 组件库
```typescript
{
  "shadcn-vue": "latest",       // UI 组件（基于 Radix-Vue）
  "tailwindcss": "^3.4.0",      // 样式框架
  "lucide-vue-next": "^0.300.0" // 图标库
}
```

#### 3. 工具库
```typescript
{
  "axios": "^1.6.0",            // HTTP 客户端
  "date-fns": "^3.0.0",         // 日期处理
  "lodash-es": "^4.17.21"       // 工具函数
}
```

### 桌面端技术栈

#### 1. Electron 生态
```typescript
{
  "electron": "^28.0.0",        // Electron 框架
  "electron-vite": "^2.0.0",    // 构建工具
  "electron-builder": "^24.9.0" // 打包工具
}
```

#### 2. Node.js 核心模块
- `child_process` - 进程管理
- `fs/promises` - 文件操作
- `path` - 路径处理
- `events` - 事件系统

#### 3. 服务端框架（可选）
```typescript
{
  "express": "^4.18.0",         // HTTP 服务器
  "socket.io": "^4.6.0",        // WebSocket
  "cors": "^2.8.5"              // 跨域支持
}
```

### 开发工具

#### 1. 代码质量
```typescript
{
  "eslint": "^8.56.0",          // 代码检查
  "prettier": "^3.1.0",         // 代码格式化
  "@typescript-eslint/parser": "^6.19.0"
}
```

#### 2. 构建工具
```typescript
{
  "vite": "^5.0.0",             // 前端构建
  "electron-vite": "^2.0.0",    // Electron 构建
  "postcss": "^8.4.33",         // CSS 处理
  "autoprefixer": "^10.4.16"    // CSS 前缀
}
```

## 🔌 模块设计

### 1. 进程管理器 (ProcessManager)

```typescript
// electron/main/services/process-manager.ts

class ProcessManager {
  // 存储所有运行中的进程
  private processes: Map<string, MCPServerProcess>
  
  // 启动 MCP Server
  async startServer(config: ServerConfig): Promise<void>
  
  // 停止 MCP Server
  async stopServer(serverId: string): Promise<void>
  
  // 重启 MCP Server
  async restartServer(serverId: string): Promise<void>
  
  // 获取服务器状态
  getServerStatus(serverId: string): ServerStatus
  
  // 向服务器发送消息（通过 stdin）
  sendMessage(serverId: string, message: any): void
  
  // 监听服务器输出（从 stdout）
  private handleServerOutput(serverId: string, data: Buffer): void
  
  // 监听服务器错误（从 stderr）
  private handleServerError(serverId: string, data: Buffer): void
  
  // 处理进程退出
  private handleProcessExit(serverId: string, code: number): void
}

interface MCPServerProcess {
  id: string
  config: ServerConfig
  process: ChildProcess
  status: 'running' | 'stopped' | 'error'
  startTime: Date
  restartCount: number
}
```

### 2. 配置管理器 (ConfigManager)

```typescript
// electron/main/services/config-manager.ts

class ConfigManager {
  private configPath: string
  private servers: Map<string, ServerConfig>
  
  // 加载所有服务器配置
  async loadConfigs(): Promise<ServerConfig[]>
  
  // 保存服务器配置
  async saveConfig(config: ServerConfig): Promise<void>
  
  // 删除服务器配置
  async deleteConfig(serverId: string): Promise<void>
  
  // 验证配置
  validateConfig(config: ServerConfig): ValidationResult
  
  // 导出配置（Cursor 格式）
  exportForCursor(): CursorConfig
  
  // 加载模板
  loadTemplate(templateId: string): TemplateConfig
  
  // 获取所有模板
  getAllTemplates(): TemplateConfig[]
}

interface ServerConfig {
  id: string
  name: string
  type: 'npm' | 'python' | 'git'
  command: string
  args: string[]
  env: Record<string, string>
  workingDirectory?: string
  autoStart: boolean
  autoRestart: boolean
  maxRestarts: number
}
```

### 3. 日志管理器 (LogManager)

```typescript
// electron/main/services/log-manager.ts

class LogManager {
  private logs: Map<string, LogEntry[]>
  private maxLogSize: number = 10000
  
  // 添加日志
  addLog(serverId: string, message: string, level: LogLevel): void
  
  // 获取日志
  getLogs(serverId: string, options?: LogQueryOptions): LogEntry[]
  
  // 清空日志
  clearLogs(serverId: string): void
  
  // 导出日志到文件
  async exportLogs(serverId: string, filePath: string): Promise<void>
  
  // 搜索日志
  searchLogs(serverId: string, query: string): LogEntry[]
  
  // 实时日志推送（通过 WebSocket 或 IPC）
  subscribeToLogs(serverId: string, callback: LogCallback): Unsubscribe
}

interface LogEntry {
  timestamp: Date
  serverId: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  source: 'stdout' | 'stderr' | 'system'
}
```

### 4. 市场服务 (MarketplaceService)

```typescript
// electron/main/services/marketplace-service.ts

class MarketplaceService {
  private cache: CacheManager
  private githubToken?: string
  
  // 搜索 MCP Servers
  async searchServers(options: SearchOptions): Promise<SearchResult>
  
  // 获取服务器详情
  async getServerDetails(repoFullName: string): Promise<ServerDetails>
  
  // 获取 README
  async getReadme(repoFullName: string): Promise<string>
  
  // 检测安装类型
  private detectInstallType(repo: GitHubRepo): InstallType
  
  // 获取 npm 包信息
  private async getNpmInfo(packageName: string): Promise<NpmInfo>
  
  // 获取下载量
  private async getDownloads(packageName: string): Promise<number>
  
  // 安装服务器
  async installServer(server: MarketItem): Promise<ServerConfig>
  
  // 自动检测分类
  private detectCategory(repo: GitHubRepo): string[]
}

interface SearchOptions {
  query?: string
  category?: string
  language?: string
  sort: 'stars' | 'updated' | 'created'
  page: number
  perPage: number
}
```

## 🔐 IPC 通信设计

### Preload 脚本

```typescript
// electron/preload/index.ts

import { contextBridge, ipcRenderer } from 'electron'

// 安全地暴露 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 服务器管理
  server: {
    getAll: () => ipcRenderer.invoke('server:getAll'),
    create: (config) => ipcRenderer.invoke('server:create', config),
    update: (id, config) => ipcRenderer.invoke('server:update', id, config),
    delete: (id) => ipcRenderer.invoke('server:delete', id),
    start: (id) => ipcRenderer.invoke('server:start', id),
    stop: (id) => ipcRenderer.invoke('server:stop', id),
    getStatus: (id) => ipcRenderer.invoke('server:getStatus', id),
  },
  
  // 日志管理
  log: {
    get: (serverId, options) => ipcRenderer.invoke('log:get', serverId, options),
    clear: (serverId) => ipcRenderer.invoke('log:clear', serverId),
    export: (serverId, path) => ipcRenderer.invoke('log:export', serverId, path),
    onLog: (callback) => {
      const subscription = (_, data) => callback(data)
      ipcRenderer.on('log:new', subscription)
      return () => ipcRenderer.removeListener('log:new', subscription)
    }
  },
  
  // 市场功能
  marketplace: {
    search: (options) => ipcRenderer.invoke('marketplace:search', options),
    getDetails: (repo) => ipcRenderer.invoke('marketplace:getDetails', repo),
    install: (server) => ipcRenderer.invoke('marketplace:install', server),
  },
  
  // 配置管理
  config: {
    export: () => ipcRenderer.invoke('config:export'),
    getTemplates: () => ipcRenderer.invoke('config:getTemplates'),
  }
})
```

## 📁 项目结构

```
tt-mcp-manager/
├── electron/                    # Electron 主进程
│   ├── main/
│   │   ├── index.ts            # 主进程入口
│   │   ├── services/           # 核心服务
│   │   │   ├── process-manager.ts
│   │   │   ├── config-manager.ts
│   │   │   ├── log-manager.ts
│   │   │   ├── marketplace-service.ts
│   │   │   └── api-server.ts
│   │   ├── ipc/                # IPC 处理器
│   │   │   ├── server-ipc.ts
│   │   │   ├── log-ipc.ts
│   │   │   ├── marketplace-ipc.ts
│   │   │   └── config-ipc.ts
│   │   ├── types/              # 类型定义
│   │   │   └── index.ts
│   │   └── utils/              # 工具函数
│   │       ├── validation.ts
│   │       └── helpers.ts
│   └── preload/
│       └── index.ts            # 预加载脚本
│
├── src/                        # Vue 前端
│   ├── main.ts                 # 前端入口
│   ├── App.vue                 # 根组件
│   ├── components/             # 组件
│   │   ├── ui/                 # ShadCN 组件
│   │   ├── layout/
│   │   │   ├── Sidebar.vue
│   │   │   └── Header.vue
│   │   ├── server/
│   │   │   ├── ServerList.vue
│   │   │   ├── ServerCard.vue
│   │   │   ├── ServerDetail.vue
│   │   │   └── ServerForm.vue
│   │   ├── marketplace/
│   │   │   ├── SearchBar.vue
│   │   │   ├── ServerMarketCard.vue
│   │   │   └── CategoryFilter.vue
│   │   ├── logs/
│   │   │   └── LogViewer.vue
│   │   └── templates/
│   │       └── TemplateCard.vue
│   ├── views/                  # 页面
│   │   ├── Dashboard.vue
│   │   ├── Marketplace.vue
│   │   ├── Templates.vue
│   │   └── Settings.vue
│   ├── stores/                 # Pinia stores
│   │   ├── servers.ts
│   │   ├── logs.ts
│   │   ├── marketplace.ts
│   │   └── templates.ts
│   ├── composables/            # 组合式函数
│   │   ├── useServer.ts
│   │   ├── useLog.ts
│   │   └── useMarketplace.ts
│   ├── router/                 # 路由
│   │   └── index.ts
│   ├── types/                  # 前端类型
│   │   └── index.ts
│   ├── utils/                  # 工具函数
│   │   └── format.ts
│   └── assets/                 # 静态资源
│       ├── styles/
│       │   ├── index.css
│       │   └── tailwind.css
│       └── images/
│
├── templates/                  # MCP Server 模板
│   ├── filesystem.json
│   ├── git.json
│   ├── web-search.json
│   ├── database.json
│   └── http.json
│
├── docs/                       # 文档
│   ├── 01-project-overview.md
│   ├── 02-technical-architecture.md
│   ├── 03-ui-prototype.md
│   ├── 04-flow-diagrams.md
│   ├── 05-api-design.md
│   ├── 06-template-design.md
│   ├── 07-marketplace.md
│   └── 08-development-guide.md
│
├── package.json
├── electron.vite.config.ts
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── .cursorrules
└── README.md
```

## 🔄 数据流

### 启动服务器流程

```
用户点击"启动"按钮
    ↓
Vue 组件调用 store.startServer(id)
    ↓
Store 通过 IPC 发送请求
    ↓
主进程接收 'server:start' 消息
    ↓
ProcessManager.startServer(config)
    ↓
spawn() 启动子进程
    ↓
监听 stdout/stderr
    ↓
通过 IPC 发送状态更新
    ↓
Store 更新服务器状态
    ↓
UI 显示"运行中"状态
```

### 日志实时推送流程

```
MCP Server 输出日志
    ↓
ProcessManager 监听 stdout
    ↓
LogManager.addLog(serverId, message)
    ↓
通过 IPC 发送 'log:new' 事件
    ↓
渲染进程监听器接收
    ↓
Store 添加日志到列表
    ↓
LogViewer 组件自动更新显示
```

## ⚡ 性能优化

### 1. 前端优化
- 虚拟滚动：处理大量日志数据
- 懒加载：路由和组件按需加载
- 防抖节流：搜索和滚动事件优化
- 缓存：市场数据本地缓存 1 小时

### 2. 后端优化
- 进程池：复用子进程
- 日志轮转：限制日志文件大小
- 批量操作：减少文件 I/O
- API 限流：避免触发 GitHub API 限制

### 3. 内存管理
- 日志限制：每个服务器最多保留 10000 条日志
- 定时清理：自动清理过期缓存
- 弱引用：避免内存泄漏

