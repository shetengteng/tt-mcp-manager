# 市场功能实现方案

## 📋 概述

本文档详细说明 MCP Manager 市场功能的实现方案，包括数据获取、缓存机制、搜索过滤等。

---

## 🏗️ 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                   前端 (Vue 3)                          │
│  ┌─────────────┐  ┌────────────────┐  ┌─────────────┐ │
│  │ Marketplace │  │ MarketFilter   │  │ ServerCard  │ │
│  │ View        │──│ Component      │──│ Component   │ │
│  └─────────────┘  └────────────────┘  └─────────────┘ │
│         │                                               │
│         │ IPC: marketplace:search                       │
│         ↓                                               │
└─────────────────────────────────────────────────────────┘
                       │
┌─────────────────────────────────────────────────────────┐
│              主进程 (Electron)                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  marketplace-ipc.ts (IPC 处理器)                 │  │
│  └──────────────────────┬───────────────────────────┘  │
│                         │                               │
│  ┌──────────────────────┴───────────────────────────┐  │
│  │  MCPRegistryService (核心服务)                   │  │
│  │  - fetchNPMServers()                             │  │
│  │  - fetchGitHubServers()                          │  │
│  │  - mergeServers()                                │  │
│  │  - searchServers()                               │  │
│  └──────────────────────┬───────────────────────────┘  │
│                         │                               │
└─────────────────────────┼───────────────────────────────┘
                         │
          ┌──────────────┴───────────────┐
          │                              │
   ┌──────┴──────┐              ┌────────┴─────┐
   │  NPM API    │              │  GitHub API  │
   │             │              │              │
   └─────────────┘              └──────────────┘
```

---

## 📦 数据源

### 1. NPM API

**端点**: `https://api.npms.io/v2/search`

**查询参数**：

```typescript
{
  q: "keywords:mcp-server OR keywords:model-context-protocol",
  size: 250
}
```

**返回数据**：

```json
{
  "results": [
    {
      "package": {
        "name": "@modelcontextprotocol/server-memory",
        "version": "0.1.0",
        "description": "MCP Memory Server",
        "keywords": ["mcp", "server", "memory"],
        "author": { "name": "Anthropic" },
        "links": {
          "npm": "https://www.npmjs.com/package/...",
          "repository": "https://github.com/..."
        },
        "date": "2024-01-01T00:00:00.000Z"
      },
      "score": {
        "final": 0.95,
        "detail": {
          "quality": 0.9,
          "popularity": 0.8,
          "maintenance": 0.95
        }
      }
    }
  ]
}
```

**优点**：

- ✅ 官方 API，稳定可靠
- ✅ 包含下载量、版本等详细信息
- ✅ 免费无限制访问
- ✅ 数据实时更新

### 2. GitHub API（可选）

**端点**: `https://api.github.com/search/repositories`

**查询参数**：

```typescript
{
  q: "mcp server topic:model-context-protocol",
  sort: "stars",
  order: "desc"
}
```

**速率限制**：

- 未认证：60 次/小时
- 认证：5000 次/小时

---

## 💾 数据模型

### MarketItem 接口

```typescript
interface MarketItem {
  // 基本信息
  id: string // 唯一标识 (包名)
  name: string // 显示名称
  description: string // 描述
  category: string // 分类

  // 安装信息
  installType: 'npm' | 'git' | 'python'
  command: string // 启动命令
  args: string[] // 参数
  env: Record<string, string> // 环境变量

  // 元数据
  author: string // 作者
  version: string // 版本
  downloads: number // 下载量
  stars: number // 星标数
  tags: string[] // 标签

  // 链接
  homepage: string // 主页
  repository: string // 仓库

  // 状态
  verified: boolean // 已验证
  official: boolean // 官方
  lastUpdate: string // 最后更新
}
```

---

## 🔄 缓存机制

### 缓存策略

**实现方式**：内存缓存

**缓存时长**：1 小时

**缓存逻辑**：

```typescript
class MCPRegistryService {
  private cache: MarketItem[] = []
  private cacheExpiry: number = 0
  private readonly CACHE_TTL = 1000 * 60 * 60 // 1小时

  async getAllServers(): Promise<MarketItem[]> {
    // 检查缓存
    if (this.cache.length > 0 && Date.now() < this.cacheExpiry) {
      return this.cache
    }

    // 获取新数据
    const servers = await this.fetchNPMServers()

    // 更新缓存
    this.cache = servers
    this.cacheExpiry = Date.now() + this.CACHE_TTL

    return servers
  }
}
```

**缓存更新策略**：

1. 首次访问：立即从 API 获取数据
2. 1小时内：使用缓存数据
3. 超过1小时：自动刷新
4. 手动刷新：clearCache() 方法

---

## 🔍 搜索和过滤

### 搜索功能

**搜索范围**：

- 服务器名称
- 描述
- 标签
- 作者

**实现代码**：

```typescript
async searchServers(query: string, category?: string): Promise<MarketItem[]> {
  const servers = await this.getAllServers()
  const lowerQuery = query.toLowerCase()

  return servers.filter(server => {
    // 分类过滤
    if (category && category !== 'all' && server.category !== category) {
      return false
    }

    // 关键词搜索
    if (query) {
      return (
        server.name.toLowerCase().includes(lowerQuery) ||
        server.description.toLowerCase().includes(lowerQuery) ||
        server.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
        server.author.toLowerCase().includes(lowerQuery)
      )
    }

    return true
  })
}
```

### 分类系统

**分类列表**：

- `all` - 全部
- `filesystem` - 文件系统
- `database` - 数据库
- `web` - 网络/API
- `development` - 开发工具
- `productivity` - 生产力
- `other` - 其他

**分类推断逻辑**：

```typescript
private inferCategory(keywords: string[]): string {
  const keywordStr = keywords.join(' ').toLowerCase()

  if (keywordStr.includes('filesystem')) return 'filesystem'
  if (keywordStr.includes('database')) return 'database'
  if (keywordStr.includes('web')) return 'web'
  if (keywordStr.includes('git')) return 'development'
  // ... 更多规则

  return 'other'
}
```

---

## 📊 排序规则

**优先级排序**：

1. 官方包 (`official = true`)
2. 验证包 (`verified = true`)
3. 下载量 (`downloads`)
4. 星标数 (`stars`)

**实现代码**：

```typescript
return servers.sort((a, b) => {
  // 官方包优先
  if (a.official !== b.official) return a.official ? -1 : 1

  // 验证包优先
  if (a.verified !== b.official) return a.verified ? -1 : 1

  // 下载量排序
  return (b.downloads || 0) - (a.downloads || 0)
})
```

---

## 🔌 IPC 通信

### 前端请求

```typescript
// stores/marketplace.ts
async searchServers(query: string, category?: string) {
  this.loading = true
  try {
    const result = await window.electronAPI.marketplace.search({
      query,
      category,
      page: 1,
      pageSize: 100
    })

    this.servers = result.items
    this.total = result.total
  } catch (error) {
    console.error('搜索失败:', error)
  } finally {
    this.loading = false
  }
}
```

### 主进程处理

```typescript
// electron/main/ipc/marketplace-ipc.ts
ipcMain.handle('marketplace:search', async (_, options: SearchOptions) => {
  try {
    // 使用 Registry Service
    const servers = await mcpRegistry.searchServers(options.query || '', options.category)

    return {
      items: servers,
      total: servers.length,
      page: 1,
      pageSize: servers.length
    }
  } catch (error) {
    console.error('搜索市场失败:', error)

    // 降级到静态数据
    return await marketplaceService.searchServers(options)
  }
})
```

---

## 🚀 性能优化

### 1. 缓存策略

- ✅ 内存缓存，1小时有效期
- ✅ 减少 API 请求次数
- ✅ 提高响应速度

### 2. 数据预加载

```typescript
// 应用启动时预加载
onMounted(async () => {
  await mcpRegistry.getAllServers()
})
```

### 3. 降级机制

- API 失败时使用静态数据
- 确保功能可用性

### 4. 懒加载

- 图标按需加载
- 虚拟滚动（大量数据时）

---

## 🔒 错误处理

### API 失败处理

```typescript
try {
  const servers = await mcpRegistry.searchServers(query)
  return servers
} catch (error) {
  console.error('API 失败:', error)

  // 降级到静态数据
  return staticServers
}
```

### 网络超时

```typescript
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 5000)

try {
  const response = await fetch(url, {
    signal: controller.signal
  })
  return await response.json()
} catch (error) {
  if (error.name === 'AbortError') {
    console.error('请求超时')
  }
  throw error
} finally {
  clearTimeout(timeoutId)
}
```

---

## 📈 未来扩展

### 1. GitHub API 集成

- 获取星标数
- 获取最近活跃度
- 获取 Issues 和 PR 数量

### 2. 本地数据库缓存

- 使用 SQLite 持久化缓存
- 减少内存占用
- 支持离线模式

### 3. 用户评分系统

- 本地记录用户评分
- 显示社区评分
- 推荐算法

### 4. 自动更新检测

- 定期检查包版本
- 提示用户更新
- 自动更新功能

---

## 🧪 测试

### 单元测试

```typescript
describe('MCPRegistryService', () => {
  it('should fetch servers from NPM', async () => {
    const servers = await mcpRegistry.fetchNPMServers()
    expect(servers.length).toBeGreaterThan(0)
  })

  it('should cache results', async () => {
    const servers1 = await mcpRegistry.getAllServers()
    const servers2 = await mcpRegistry.getAllServers()
    expect(servers1).toBe(servers2) // 应该返回相同的引用
  })

  it('should search servers', async () => {
    const results = await mcpRegistry.searchServers('filesystem')
    expect(
      results.every(s => s.name.includes('filesystem') || s.description.includes('filesystem'))
    ).toBe(true)
  })
})
```

---

## 📝 总结

市场功能基于以下核心特性：

1. **多数据源集成** - NPM API + 静态数据
2. **智能缓存** - 1小时内存缓存
3. **强大搜索** - 多字段模糊搜索
4. **分类过滤** - 自动推断分类
5. **优先排序** - 官方包优先
6. **降级机制** - 确保功能可用

现已完成基础实现，可以正常使用！
