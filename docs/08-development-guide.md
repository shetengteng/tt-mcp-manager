# 开发指南

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Git

### 安装依赖

```bash
# 克隆项目
git clone https://github.com/yourusername/tt-mcp-manager.git
cd tt-mcp-manager

# 安装依赖
pnpm install
```

### 开发模式

```bash
# 启动开发服务器
pnpm dev

# 在另一个终端查看日志
pnpm dev:watch
```

### 构建

```bash
# 构建应用
pnpm build

# 构建并打包
pnpm build:all

# 仅打包（需要先构建）
pnpm build:mac  # macOS
pnpm build:win  # Windows
pnpm build:linux  # Linux
```

## 📁 项目结构

```
tt-mcp-manager/
├── electron/                    # Electron 主进程
│   ├── main/
│   │   ├── index.ts            # 主进程入口
│   │   ├── services/           # 核心服务
│   │   ├── ipc/                # IPC 处理器
│   │   ├── types/              # 类型定义
│   │   └── utils/              # 工具函数
│   └── preload/
│       └── index.ts            # 预加载脚本
│
├── src/                        # Vue 前端
│   ├── main.ts                 # 前端入口
│   ├── App.vue                 # 根组件
│   ├── components/             # 组件
│   ├── views/                  # 页面
│   ├── stores/                 # Pinia stores
│   ├── composables/            # 组合式函数
│   ├── router/                 # 路由
│   ├── types/                  # 类型定义
│   ├── utils/                  # 工具函数
│   └── assets/                 # 静态资源
│
├── templates/                  # MCP Server 模板
├── docs/                       # 文档
├── tests/                      # 测试
├── package.json
├── electron.vite.config.ts
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

## 🛠️ 开发规范

### TypeScript

遵循严格的 TypeScript 模式：

```typescript
// ✅ 好的实践
interface ServerConfig {
  id: string
  name: string
  command: string
  args: string[]
}

function createServer(config: ServerConfig): Server {
  // 实现
}

// ❌ 避免使用 any
function processData(data: any) {  // 不好
  // ...
}
```

### Vue 组合式 API

使用 `<script setup>` 语法：

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// Props 定义
const props = defineProps<{
  serverId: string
}>()

// Emits 定义
const emit = defineEmits<{
  update: [server: Server]
  delete: [id: string]
}>()

// 响应式数据
const server = ref<Server | null>(null)

// 计算属性
const isRunning = computed(() => server.value?.status === 'running')

// 方法
const handleStart = async () => {
  await window.electronAPI.server.start(props.serverId)
  emit('update', server.value!)
}

// 生命周期
onMounted(async () => {
  server.value = await window.electronAPI.server.get(props.serverId)
})
</script>

<template>
  <div class="server-card">
    <h3>{{ server?.name }}</h3>
    <Button @click="handleStart" :disabled="isRunning">
      启动
    </Button>
  </div>
</template>

<style scoped lang="scss">
.server-card {
  padding: 16px;
  border-radius: 8px;
}
</style>
```

### 注释规范

**强制使用中文注释**：

```typescript
// ✅ 好的注释
// 启动 MCP Server 进程
async function startServer(id: string): Promise<void> {
  // 获取服务器配置
  const config = await configManager.getConfig(id)
  
  // 检查依赖是否已安装
  if (!await checkDependencies(config)) {
    throw new Error('依赖未安装')
  }
  
  // 启动进程
  const process = spawn(config.command, config.args)
}

// ❌ 避免英文注释
// Start MCP Server process
async function startServer(id: string): Promise<void> {
  // ...
}
```

### 卫语句优先

```typescript
// ✅ 好的实践 - 使用卫语句
async function startServer(id: string): Promise<void> {
  // 早期返回，减少嵌套
  if (!id) {
    throw new Error('服务器 ID 不能为空')
  }
  
  const config = await configManager.getConfig(id)
  if (!config) {
    throw new Error('服务器配置不存在')
  }
  
  if (processManager.isRunning(id)) {
    throw new Error('服务器已在运行')
  }
  
  // 主要逻辑
  await processManager.start(config)
}

// ❌ 避免深层嵌套
async function startServer(id: string): Promise<void> {
  if (id) {
    const config = await configManager.getConfig(id)
    if (config) {
      if (!processManager.isRunning(id)) {
        await processManager.start(config)
      } else {
        throw new Error('服务器已在运行')
      }
    } else {
      throw new Error('服务器配置不存在')
    }
  } else {
    throw new Error('服务器 ID 不能为空')
  }
}
```

### 错误处理

```typescript
// ✅ 统一的错误处理
class MCPError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'MCPError'
  }
}

// 使用示例
async function startServer(id: string) {
  try {
    const config = await configManager.getConfig(id)
    await processManager.start(config)
  } catch (error) {
    if (error instanceof MCPError) {
      // 已知错误
      logger.error(`启动服务器失败: ${error.message}`, error.details)
    } else {
      // 未知错误
      logger.error('未知错误', error)
    }
    throw new MCPError(
      'START_FAILED',
      `启动服务器失败: ${error.message}`,
      { serverId: id, originalError: error }
    )
  }
}
```

## 🧪 测试

### 单元测试

使用 Vitest 进行单元测试：

```typescript
// tests/services/process-manager.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { ProcessManager } from '@/electron/main/services/process-manager'

describe('ProcessManager', () => {
  let processManager: ProcessManager
  
  beforeEach(() => {
    processManager = new ProcessManager()
  })
  
  it('应该能够启动服务器', async () => {
    const config = {
      id: 'test-001',
      name: 'Test Server',
      command: 'node',
      args: ['test.js']
    }
    
    await processManager.startServer(config)
    
    expect(processManager.isRunning('test-001')).toBe(true)
  })
})
```

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行单个测试文件
pnpm test tests/services/process-manager.test.ts

# 监听模式
pnpm test:watch

# 生成覆盖率报告
pnpm test:coverage
```

## 🔧 IPC 通信

### 添加新的 IPC 处理器

1. **在主进程定义处理器**：

```typescript
// electron/main/ipc/server-ipc.ts
import { ipcMain } from 'electron'
import { processManager } from '../services'

export function setupServerIpc() {
  // 启动服务器
  ipcMain.handle('server:start', async (_, serverId: string) => {
    try {
      await processManager.startServer(serverId)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
  
  // 停止服务器
  ipcMain.handle('server:stop', async (_, serverId: string) => {
    await processManager.stopServer(serverId)
    return { success: true }
  })
}
```

2. **在 preload 中暴露 API**：

```typescript
// electron/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  server: {
    start: (id: string) => ipcRenderer.invoke('server:start', id),
    stop: (id: string) => ipcRenderer.invoke('server:stop', id)
  }
})
```

3. **定义类型**：

```typescript
// src/types/electron.d.ts
export interface ElectronAPI {
  server: {
    start: (id: string) => Promise<{ success: boolean; error?: string }>
    stop: (id: string) => Promise<{ success: boolean }>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
```

4. **在渲染进程使用**：

```typescript
// src/stores/servers.ts
import { defineStore } from 'pinia'

export const useServerStore = defineStore('servers', () => {
  const startServer = async (id: string) => {
    const result = await window.electronAPI.server.start(id)
    if (!result.success) {
      throw new Error(result.error)
    }
  }
  
  return { startServer }
})
```

## 📦 添加新的服务模块

### 1. 创建服务类

```typescript
// electron/main/services/example-service.ts

/**
 * 示例服务
 * 提供示例功能
 */
export class ExampleService {
  private data: Map<string, any>
  
  constructor() {
    this.data = new Map()
  }
  
  /**
   * 获取数据
   * @param id - 数据 ID
   * @returns 数据内容
   */
  async getData(id: string): Promise<any> {
    return this.data.get(id)
  }
  
  /**
   * 保存数据
   * @param id - 数据 ID
   * @param value - 数据内容
   */
  async saveData(id: string, value: any): Promise<void> {
    this.data.set(id, value)
  }
}
```

### 2. 注册服务

```typescript
// electron/main/services/index.ts
import { ProcessManager } from './process-manager'
import { ConfigManager } from './config-manager'
import { ExampleService } from './example-service'

// 创建服务实例
export const processManager = new ProcessManager()
export const configManager = new ConfigManager()
export const exampleService = new ExampleService()

// 初始化所有服务
export async function initializeServices() {
  await configManager.init()
  // 其他初始化
}
```

### 3. 添加 IPC 接口

```typescript
// electron/main/ipc/example-ipc.ts
import { ipcMain } from 'electron'
import { exampleService } from '../services'

export function setupExampleIpc() {
  ipcMain.handle('example:getData', async (_, id: string) => {
    return await exampleService.getData(id)
  })
  
  ipcMain.handle('example:saveData', async (_, id: string, value: any) => {
    await exampleService.saveData(id, value)
    return { success: true }
  })
}
```

## 🎨 添加新的 UI 组件

### 1. 使用 ShadCN 组件

```bash
# 添加新组件
npx shadcn-vue@latest add badge
npx shadcn-vue@latest add toast
```

### 2. 创建自定义组件

```vue
<!-- src/components/ServerStatusBadge.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'

// Props 定义
const props = defineProps<{
  status: 'running' | 'stopped' | 'error'
}>()

// 计算样式
const variant = computed(() => {
  switch (props.status) {
    case 'running':
      return 'success'
    case 'stopped':
      return 'secondary'
    case 'error':
      return 'destructive'
  }
})

// 计算文本
const text = computed(() => {
  switch (props.status) {
    case 'running':
      return '运行中'
    case 'stopped':
      return '已停止'
    case 'error':
      return '错误'
  }
})
</script>

<template>
  <Badge :variant="variant">
    {{ text }}
  </Badge>
</template>
```

### 3. 使用组件

```vue
<script setup lang="ts">
import ServerStatusBadge from '@/components/ServerStatusBadge.vue'
import { ref } from 'vue'

const serverStatus = ref<'running' | 'stopped' | 'error'>('running')
</script>

<template>
  <div>
    <ServerStatusBadge :status="serverStatus" />
  </div>
</template>
```

## 🐛 调试

### 主进程调试

1. 在 VSCode 中创建调试配置：

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Main Process",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron-vite",
      "args": ["--debug"],
      "outputCapture": "std"
    }
  ]
}
```

2. 按 F5 开始调试

### 渲染进程调试

1. 运行 `pnpm dev`
2. 在应用中按 `Cmd+Option+I` (macOS) 或 `Ctrl+Shift+I` (Windows/Linux)
3. 使用 Chrome DevTools 调试

### 日志

```typescript
// 主进程日志
import { app } from 'electron'
import path from 'path'
import fs from 'fs/promises'

class Logger {
  private logPath: string
  
  constructor() {
    this.logPath = path.join(app.getPath('userData'), 'logs', 'main.log')
  }
  
  async log(level: string, message: string, ...args: any[]) {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] [${level}] ${message} ${JSON.stringify(args)}\n`
    
    // 控制台输出
    console.log(logEntry)
    
    // 文件输出
    await fs.appendFile(this.logPath, logEntry)
  }
  
  info(message: string, ...args: any[]) {
    return this.log('INFO', message, ...args)
  }
  
  error(message: string, ...args: any[]) {
    return this.log('ERROR', message, ...args)
  }
}

export const logger = new Logger()
```

## 📚 常用命令

```bash
# 开发
pnpm dev              # 启动开发服务器
pnpm dev:watch        # 监听模式

# 构建
pnpm build            # 构建应用
pnpm build:mac        # 打包 macOS 应用
pnpm build:win        # 打包 Windows 应用
pnpm build:linux      # 打包 Linux 应用

# 测试
pnpm test             # 运行测试
pnpm test:watch       # 监听模式测试
pnpm test:coverage    # 生成覆盖率报告

# 代码质量
pnpm lint             # 运行 ESLint
pnpm lint:fix         # 自动修复 ESLint 错误
pnpm format           # 格式化代码（Prettier）
pnpm type-check       # TypeScript 类型检查

# 依赖管理
pnpm install          # 安装依赖
pnpm update           # 更新依赖
pnpm clean            # 清理构建产物
```

## 🚢 发布流程

1. **更新版本号**：
```bash
npm version patch  # 或 minor、major
```

2. **构建所有平台**：
```bash
pnpm build:all
```

3. **测试安装包**：
- 在目标平台上安装并测试

4. **创建 Git 标签**：
```bash
git tag v1.0.0
git push origin v1.0.0
```

5. **发布 GitHub Release**：
- 上传构建产物
- 编写 Release Notes

## 📖 参考资源

- [Electron 文档](https://www.electronjs.org/docs)
- [Vue 3 文档](https://vuejs.org/)
- [ShadCN-Vue 文档](https://www.shadcn-vue.com/)
- [Pinia 文档](https://pinia.vuejs.org/)
- [TailwindCSS 文档](https://tailwindcss.com/)
- [MCP 协议规范](https://modelcontextprotocol.io/)

