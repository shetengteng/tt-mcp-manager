# MCP 服务器资源和 API 列表

## 📋 概述

本文档整理了可用的 MCP (Model Context Protocol) 服务器资源、API 和市场。

---

## 🌟 官方资源

### 1. Anthropic 官方 MCP Servers

**GitHub Organization**: https://github.com/modelcontextprotocol

**官方维护的服务器**：

- `@modelcontextprotocol/server-memory` - 内存存储服务器
- `@modelcontextprotocol/server-filesystem` - 文件系统访问
- `@modelcontextprotocol/server-github` - GitHub 集成
- `@modelcontextprotocol/server-postgres` - PostgreSQL 数据库
- `@modelcontextprotocol/server-sqlite` - SQLite 数据库
- `@modelcontextprotocol/server-puppeteer` - 浏览器自动化
- `@modelcontextprotocol/server-slack` - Slack 集成
- `@modelcontextprotocol/server-brave-search` - Brave 搜索
- `@modelcontextprotocol/server-google-maps` - Google 地图
- `@modelcontextprotocol/server-everything` - 综合服务器

**NPM 仓库**：

```bash
https://www.npmjs.com/search?q=%40modelcontextprotocol
```

---

## 🏪 第三方市场

### 1. Smithery - MCP 服务器市场

**网站**: https://smithery.ai

**特点**：

- ✅ 最大的 MCP 服务器市场
- ✅ 社区贡献的服务器
- ✅ 分类浏览
- ✅ 评分和评论系统
- ✅ 安装指导

**API 可能性**：

- Smithery 可能提供 API，需要进一步调查
- 可以爬取网站数据
- 建议联系 Smithery 团队获取官方 API

**数据获取方案**：

```javascript
// 爬取示例（需要遵守网站规则）
const servers = await fetch('https://smithery.ai/api/servers')
const data = await servers.json()
```

### 2. Glama - AI 工具市场

**网站**: https://glama.ai

**特点**：

- ✅ 包含 MCP 服务器
- ✅ AI 工具集成市场
- ✅ 搜索和过滤功能

---

## 🔍 搜索策略

### NPM Package Search

**API**: https://api.npms.io/v2/search

**搜索 MCP 服务器**：

```bash
# 搜索所有 MCP 相关包
curl "https://api.npms.io/v2/search?q=keywords:mcp+keywords:server"

# 搜索 @modelcontextprotocol 下的包
curl "https://api.npms.io/v2/search?q=scope:modelcontextprotocol"
```

**返回格式**：

```json
{
  "total": 20,
  "results": [
    {
      "package": {
        "name": "@modelcontextprotocol/server-memory",
        "version": "0.1.0",
        "description": "MCP Memory Server",
        "keywords": ["mcp", "server", "memory"],
        "links": {
          "npm": "https://www.npmjs.com/package/@modelcontextprotocol/server-memory",
          "repository": "https://github.com/modelcontextprotocol/servers"
        }
      }
    }
  ]
}
```

### GitHub Search API

**API**: https://api.github.com/search/repositories

**搜索 MCP 服务器仓库**：

```bash
# 搜索 MCP 相关仓库
curl "https://api.github.com/search/repositories?q=mcp+server+topic:model-context-protocol"

# 搜索特定组织的仓库
curl "https://api.github.com/orgs/modelcontextprotocol/repos"
```

**返回格式**：

```json
{
  "total_count": 50,
  "items": [
    {
      "name": "servers",
      "full_name": "modelcontextprotocol/servers",
      "description": "Model Context Protocol Servers",
      "html_url": "https://github.com/modelcontextprotocol/servers",
      "topics": ["mcp", "model-context-protocol"],
      "stargazers_count": 1234,
      "language": "TypeScript"
    }
  ]
}
```

### GitHub Topics

**话题页面**: https://github.com/topics/model-context-protocol

**相关话题**：

- `model-context-protocol`
- `mcp-server`
- `claude-mcp`
- `anthropic-mcp`

---

## 💡 推荐实现方案

### 方案 1：组合 API（推荐）⭐

**数据源**：

1. **NPM API** - 官方包
2. **GitHub API** - 开源项目
3. **静态数据** - 手工维护的优质列表

**实现步骤**：

```typescript
// services/mcp-registry.ts
class MCPRegistry {
  // 1. 从 NPM 获取官方包
  async fetchNPMServers() {
    const response = await fetch('https://api.npms.io/v2/search?q=keywords:mcp-server')
    return response.json()
  }

  // 2. 从 GitHub 获取仓库
  async fetchGitHubServers() {
    const response = await fetch(
      'https://api.github.com/search/repositories?q=mcp+server+in:name,description'
    )
    return response.json()
  }

  // 3. 合并和去重
  async getAllServers() {
    const npmServers = await this.fetchNPMServers()
    const githubServers = await this.fetchGitHubServers()
    const staticServers = await import('./static-mcp-list.json')

    return this.mergeAndDeduplicate([npmServers, githubServers, staticServers])
  }
}
```

**优点**：

- ✅ 数据准确可靠
- ✅ 覆盖面广
- ✅ 自动更新
- ✅ 免费使用

**缺点**：

- ❌ 需要处理多个数据源
- ❌ 可能有重复数据

---

### 方案 2：静态数据 + 定期更新

**数据源**：

- 手工维护的 JSON 文件
- 定期从各个来源更新

**文件结构**：

```json
// data/mcp-registry.json
{
  "version": "1.0.0",
  "updated": "2024-01-01T00:00:00Z",
  "servers": [
    {
      "id": "filesystem",
      "name": "@modelcontextprotocol/server-filesystem",
      "category": "filesystem",
      "description": "File system access server",
      "installType": "npm",
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem"],
      "github": "https://github.com/modelcontextprotocol/servers",
      "npm": "https://www.npmjs.com/package/@modelcontextprotocol/server-filesystem",
      "tags": ["official", "filesystem", "files"],
      "verified": true,
      "stars": 1234,
      "downloads": 50000
    }
  ],
  "categories": ["filesystem", "database", "web", "ai", "productivity", "development"]
}
```

**更新脚本**：

```bash
# scripts/update-registry.sh
#!/bin/bash

# 获取 NPM 数据
curl "https://api.npms.io/v2/search?q=keywords:mcp-server" > npm-servers.json

# 获取 GitHub 数据
curl "https://api.github.com/search/repositories?q=mcp+server" > github-servers.json

# 合并数据
node scripts/merge-registry.js
```

**优点**：

- ✅ 快速加载
- ✅ 无 API 限制
- ✅ 可离线使用
- ✅ 数据质量可控

**缺点**：

- ❌ 需要手动维护
- ❌ 可能不够实时

---

### 方案 3：爬取 Smithery（谨慎使用）

**警告**：爬取前请：

1. 检查网站的 `robots.txt`
2. 遵守速率限制
3. 考虑联系网站管理员获取 API

**实现**：

```typescript
// 仅供参考，实际使用前需要授权
async function fetchSmitheryServers() {
  const response = await fetch('https://smithery.ai/servers')
  const html = await response.text()

  // 使用 cheerio 或其他库解析 HTML
  const servers = parseHTML(html)
  return servers
}
```

---

## 📊 数据结构标准化

### 统一的服务器数据格式

```typescript
interface MCPServer {
  id: string // 唯一标识
  name: string // 显示名称
  packageName: string // npm 包名
  description: string // 描述
  category: string // 分类
  installType: 'npm' | 'git' | 'python'
  command: string // 启动命令
  args: string[] // 参数
  env?: Record<string, string> // 环境变量

  // 元数据
  version?: string // 版本
  author?: string // 作者
  license?: string // 许可证

  // 链接
  github?: string // GitHub 仓库
  npm?: string // NPM 页面
  docs?: string // 文档
  homepage?: string // 主页

  // 统计
  stars?: number // GitHub 星标
  downloads?: number // 下载量
  lastUpdated?: string // 最后更新

  // 标签
  tags: string[] // 标签
  verified: boolean // 是否验证
  official: boolean // 是否官方

  // 配置示例
  examples?: {
    name: string
    config: object
  }[]
}
```

---

## 🚀 实施建议

### 阶段 1：基础功能（1-2天）

1. ✅ 实现 NPM API 集成
2. ✅ 创建静态 JSON 数据文件
3. ✅ 基础搜索和过滤
4. ✅ 显示服务器列表

### 阶段 2：增强功能（2-3天）

1. ✅ GitHub API 集成
2. ✅ 数据合并和去重
3. ✅ 高级搜索（分类、标签）
4. ✅ 缓存机制

### 阶段 3：优化（1-2天）

1. ✅ 数据定期更新
2. ✅ 评分和推荐系统
3. ✅ 用户反馈
4. ✅ 性能优化

---

## 📝 代码示例

### 完整的 Registry Service

```typescript
// services/mcp-registry.ts
import type { MCPServer } from '@/types'

export class MCPRegistryService {
  private cache: MCPServer[] = []
  private cacheExpiry: number = 0
  private readonly CACHE_TTL = 1000 * 60 * 60 // 1小时

  /**
   * 获取所有 MCP 服务器
   */
  async getAllServers(): Promise<MCPServer[]> {
    // 检查缓存
    if (this.cache.length > 0 && Date.now() < this.cacheExpiry) {
      return this.cache
    }

    // 获取数据
    const servers = await Promise.all([
      this.fetchNPMServers(),
      this.fetchStaticServers()
      // this.fetchGitHubServers(), // 可选
    ])

    // 合并和去重
    const merged = this.mergeServers(...servers)

    // 更新缓存
    this.cache = merged
    this.cacheExpiry = Date.now() + this.CACHE_TTL

    return merged
  }

  /**
   * 从 NPM 获取服务器
   */
  private async fetchNPMServers(): Promise<MCPServer[]> {
    try {
      const response = await fetch('https://api.npms.io/v2/search?q=keywords:mcp-server&size=250')
      const data = await response.json()

      return data.results.map((item: any) => ({
        id: item.package.name,
        name: item.package.name,
        packageName: item.package.name,
        description: item.package.description || '',
        category: this.inferCategory(item.package.keywords),
        installType: 'npm',
        command: 'npx',
        args: [item.package.name],
        version: item.package.version,
        author: item.package.author?.name,
        license: item.package.license,
        npm: item.package.links.npm,
        github: item.package.links.repository,
        homepage: item.package.links.homepage,
        tags: item.package.keywords || [],
        verified: false,
        official: item.package.name.startsWith('@modelcontextprotocol/'),
        lastUpdated: item.package.date
      }))
    } catch (error) {
      console.error('获取 NPM 服务器失败:', error)
      return []
    }
  }

  /**
   * 从静态文件获取服务器
   */
  private async fetchStaticServers(): Promise<MCPServer[]> {
    try {
      const response = await fetch('/data/mcp-registry.json')
      const data = await response.json()
      return data.servers
    } catch (error) {
      console.error('获取静态服务器列表失败:', error)
      return []
    }
  }

  /**
   * 合并服务器列表
   */
  private mergeServers(...serverLists: MCPServer[][]): MCPServer[] {
    const map = new Map<string, MCPServer>()

    for (const servers of serverLists) {
      for (const server of servers) {
        // 使用包名作为唯一标识
        const key = server.packageName || server.id

        // 如果已存在，合并数据（优先使用更完整的数据）
        if (map.has(key)) {
          const existing = map.get(key)!
          map.set(key, { ...existing, ...server })
        } else {
          map.set(key, server)
        }
      }
    }

    return Array.from(map.values())
  }

  /**
   * 根据关键词推断分类
   */
  private inferCategory(keywords: string[] = []): string {
    if (keywords.includes('filesystem') || keywords.includes('files')) return 'filesystem'
    if (keywords.includes('database') || keywords.includes('db')) return 'database'
    if (keywords.includes('web') || keywords.includes('http')) return 'web'
    if (keywords.includes('ai') || keywords.includes('ml')) return 'ai'
    return 'other'
  }

  /**
   * 搜索服务器
   */
  async searchServers(query: string): Promise<MCPServer[]> {
    const servers = await this.getAllServers()
    const lowerQuery = query.toLowerCase()

    return servers.filter(
      server =>
        server.name.toLowerCase().includes(lowerQuery) ||
        server.description.toLowerCase().includes(lowerQuery) ||
        server.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    )
  }

  /**
   * 按分类过滤
   */
  async getServersByCategory(category: string): Promise<MCPServer[]> {
    const servers = await this.getAllServers()
    return servers.filter(server => server.category === category)
  }
}

export const mcpRegistry = new MCPRegistryService()
```

---

## 🎯 总结

推荐使用 **方案 1（组合 API）**：

1. 使用 NPM API 获取官方包
2. 使用 GitHub API 获取开源项目
3. 维护静态数据作为补充
4. 实现缓存机制提高性能

**下一步行动**：

1. 实现 NPM API 集成
2. 创建静态 JSON 数据文件
3. 更新市场页面使用新的数据源
4. 添加搜索和过滤功能

需要我开始实现吗？
