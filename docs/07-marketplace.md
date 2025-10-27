# 市场功能文档

## 🛍️ 市场概述

MCP Server 市场允许用户发现、搜索和安装来自 GitHub 的开源 MCP Server。

### 核心功能

1. **搜索和筛选**：按关键词、分类、语言搜索
2. **热度排序**：按 Star 数、更新时间、下载量排序
3. **详情查看**：查看 README、配置示例、使用指南
4. **一键安装**：自动检测类型并安装

## 📊 数据源

### 主要数据源：GitHub API

**API 端点**：
```
https://api.github.com/search/repositories
```

**搜索查询示例**：
```http
GET /search/repositories?q=mcp-server+in:name,description&sort=stars&order=desc&per_page=30&page=1
```

**支持的功能**：

✅ **搜索**：
- 关键词搜索：`q=filesystem+mcp-server`
- 位置限定：`in:name,description,readme`
- 语言筛选：`language:typescript`
- Topic 筛选：`topic:mcp`
- Star 数筛选：`stars:>100`
- 时间筛选：`created:>2024-01-01`

✅ **排序**：
- `stars` - 按 Star 数排序（热门）
- `updated` - 按最后更新时间（最新）
- `created` - 按创建时间
- `score` - 按相关性得分（默认）

✅ **分页**：
- `per_page` - 每页数量（1-100）
- `page` - 页码

❌ **限制**：
- 无内置分类系统（需自动检测）
- 无用户评分（只有 Star 数）
- 无下载量统计（需额外API）
- 速率限制（未认证：60次/小时，认证：5000次/小时）

### 辅助数据源

#### 1. awesome-mcp-servers

**仓库**：https://github.com/punkpeye/awesome-mcp-servers

**Stars**：73,671 ⭐

**用途**：精选的 MCP Server 列表，可作为推荐数据源

#### 2. NPM API

**端点**：`https://api.npmjs.org/downloads/point/last-month/{package}`

**用途**：获取 npm 包的下载量

**示例**：
```http
GET /downloads/point/last-month/@modelcontextprotocol/server-filesystem

Response:
{
  "downloads": 1200000,
  "start": "2024-01-01",
  "end": "2024-01-31",
  "package": "@modelcontextprotocol/server-filesystem"
}
```

#### 3. PyPI API

**端点**：`https://pypi.org/pypi/{package}/json`

**用途**：获取 Python 包信息和下载量

## 🏗️ 实现架构

### MarketplaceService 类设计

```typescript
// electron/main/services/marketplace-service.ts

interface SearchOptions {
  query?: string
  category?: string
  language?: string
  sort: 'stars' | 'updated' | 'created'
  page: number
  perPage: number
}

interface MarketItem {
  id: number
  name: string
  fullName: string
  description: string
  stars: number
  forks: number
  language: string
  topics: string[]
  githubUrl: string
  homepage?: string
  license?: string
  createdAt: string
  updatedAt: string
  // 增强字段
  npmPackage?: string
  pythonPackage?: string
  downloadCount: number
  category: string[]
  installType: 'npm' | 'python' | 'git'
}

class MarketplaceService {
  private cache: Map<string, CacheEntry>
  private githubToken?: string
  private CACHE_TTL = 3600000 // 1小时
  
  constructor(githubToken?: string) {
    this.githubToken = githubToken
    this.cache = new Map()
  }
  
  /**
   * 搜索 MCP Servers
   */
  async searchServers(options: SearchOptions): Promise<SearchResult> {
    const cacheKey = this.getCacheKey(options)
    
    // 检查缓存
    const cached = this.getCached(cacheKey)
    if (cached) {
      return cached
    }
    
    // 构建查询
    const query = this.buildQuery(options)
    
    // 调用 GitHub API
    const response = await this.fetchGitHub(
      `/search/repositories?${new URLSearchParams({
        q: query,
        sort: options.sort,
        order: 'desc',
        per_page: options.perPage.toString(),
        page: options.page.toString()
      })}`
    )
    
    const data = await response.json()
    
    // 增强数据
    const items = await this.enrichItems(data.items)
    
    const result = {
      total: data.total_count,
      page: options.page,
      perPage: options.perPage,
      items
    }
    
    // 缓存结果
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    })
    
    return result
  }
  
  /**
   * 构建搜索查询
   */
  private buildQuery(options: SearchOptions): string {
    let parts: string[] = []
    
    // 基础查询
    if (options.query) {
      parts.push(options.query)
    }
    
    // MCP Server 特定查询
    parts.push('(mcp-server OR "model context protocol")')
    
    // 分类筛选
    if (options.category) {
      const categoryQuery = this.getCategoryQuery(options.category)
      if (categoryQuery) {
        parts.push(categoryQuery)
      }
    }
    
    // 语言筛选
    if (options.language) {
      parts.push(`language:${options.language}`)
    }
    
    return parts.join(' ')
  }
  
  /**
   * 获取分类查询
   */
  private getCategoryQuery(category: string): string {
    const queries: Record<string, string> = {
      '开发工具': '(development OR developer-tools OR git OR ci-cd)',
      '文件系统': '(filesystem OR file-system OR files)',
      '数据平台': '(database OR sql OR data OR analytics)',
      'Web服务': '(web OR http OR api OR rest)',
      'AI工具': '(ai OR llm OR model OR ml)',
      '金融数据': '(finance OR stock OR trading)'
    }
    return queries[category] || ''
  }
  
  /**
   * 增强数据
   */
  private async enrichItems(repos: any[]): Promise<MarketItem[]> {
    return Promise.all(
      repos.map(async (repo) => {
        // 检测安装类型和包名
        const installInfo = await this.detectInstallType(repo)
        
        // 获取下载量
        let downloadCount = 0
        if (installInfo.npmPackage) {
          downloadCount = await this.getNpmDownloads(installInfo.npmPackage)
        } else if (installInfo.pythonPackage) {
          downloadCount = await this.getPyPiDownloads(installInfo.pythonPackage)
        }
        
        // 自动检测分类
        const category = this.detectCategory(repo)
        
        return {
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          language: repo.language,
          topics: repo.topics,
          githubUrl: repo.html_url,
          homepage: repo.homepage,
          license: repo.license?.name,
          createdAt: repo.created_at,
          updatedAt: repo.updated_at,
          npmPackage: installInfo.npmPackage,
          pythonPackage: installInfo.pythonPackage,
          downloadCount,
          category,
          installType: installInfo.type
        }
      })
    )
  }
  
  /**
   * 检测安装类型
   */
  private async detectInstallType(repo: any): Promise<{
    type: 'npm' | 'python' | 'git'
    npmPackage?: string
    pythonPackage?: string
  }> {
    // 检查 homepage 是否指向 npm
    if (repo.homepage?.includes('npmjs.com/package/')) {
      return {
        type: 'npm',
        npmPackage: repo.homepage.split('/package/')[1]
      }
    }
    
    // 尝试获取 package.json
    try {
      const packageJson = await this.getFileContent(
        repo.full_name,
        'package.json'
      )
      const pkg = JSON.parse(packageJson)
      return {
        type: 'npm',
        npmPackage: pkg.name
      }
    } catch {
      // 不是 npm 包
    }
    
    // 尝试获取 setup.py
    try {
      await this.getFileContent(repo.full_name, 'setup.py')
      return {
        type: 'python',
        pythonPackage: repo.name.replace(/^mcp-server-/, '')
      }
    } catch {
      // 不是 Python 包
    }
    
    // 默认为 git 源码安装
    return { type: 'git' }
  }
  
  /**
   * 自动检测分类
   */
  private detectCategory(repo: any): string[] {
    const categories: string[] = []
    const text = `
      ${repo.name}
      ${repo.description}
      ${repo.topics.join(' ')}
    `.toLowerCase()
    
    const rules: Record<string, RegExp> = {
      '文件系统': /filesystem|file-system|files|directories/,
      '开发工具': /git|ci-cd|development|developer|playwright|testing/,
      '数据平台': /database|sql|postgres|mysql|data|analytics/,
      'Web服务': /web|http|api|rest|fetch|request/,
      'AI工具': /ai|llm|model|ml|prediction/,
      '金融数据': /finance|stock|trading|market/
    }
    
    for (const [category, pattern] of Object.entries(rules)) {
      if (pattern.test(text)) {
        categories.push(category)
      }
    }
    
    return categories.length > 0 ? categories : ['其他']
  }
  
  /**
   * 获取 npm 下载量
   */
  private async getNpmDownloads(packageName: string): Promise<number> {
    try {
      const response = await fetch(
        `https://api.npmjs.org/downloads/point/last-month/${packageName}`
      )
      const data = await response.json()
      return data.downloads || 0
    } catch {
      return 0
    }
  }
  
  /**
   * 获取文件内容
   */
  private async getFileContent(
    repoFullName: string,
    filePath: string
  ): Promise<string> {
    const response = await this.fetchGitHub(
      `/repos/${repoFullName}/contents/${filePath}`
    )
    const data = await response.json()
    return Buffer.from(data.content, 'base64').toString('utf-8')
  }
  
  /**
   * 调用 GitHub API
   */
  private async fetchGitHub(path: string): Promise<Response> {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
    
    if (this.githubToken) {
      headers['Authorization'] = `Bearer ${this.githubToken}`
    }
    
    return fetch(`https://api.github.com${path}`, { headers })
  }
  
  /**
   * 获取缓存
   */
  private getCached(key: string): any {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }
  
  /**
   * 生成缓存键
   */
  private getCacheKey(options: SearchOptions): string {
    return JSON.stringify(options)
  }
}
```

## 🎯 分类系统

### 自动分类规则

| 分类 | 关键词匹配 |
|------|------------|
| 📁 文件系统 | filesystem, file-system, files, directories |
| 🛠️ 开发工具 | git, ci-cd, development, playwright, testing, esp32 |
| 📦 数据平台 | database, sql, postgres, mysql, data, analytics, databricks |
| 🌐 Web服务 | web, http, api, rest, fetch, request, maps |
| 💰 金融数据 | finance, stock, trading, market, alphavantage |
| 🤖 AI工具 | ai, llm, model, ml, prediction, time |

### 分类优先级

1. 完全匹配（名称）> 完全匹配（描述）> Topics匹配
2. 一个仓库可以属于多个分类
3. 无匹配时归类为"其他"

## 🔄 安装流程

### 安装类型检测

```typescript
async function installServer(item: MarketItem, config: any) {
  switch (item.installType) {
    case 'npm':
      return await installNpmPackage(item, config)
    case 'python':
      return await installPythonPackage(item, config)
    case 'git':
      return await installFromGit(item, config)
  }
}

async function installNpmPackage(item: MarketItem, config: any) {
  // 1. 安装包
  await exec(`npm install -g ${item.npmPackage}`)
  
  // 2. 创建服务器配置
  return {
    id: generateId(),
    name: config.name || item.name,
    type: 'npm',
    command: 'npx',
    args: [item.npmPackage, ...config.args],
    env: config.env || {},
    autoStart: false,
    autoRestart: true,
    maxRestarts: 3
  }
}
```

## 📈 性能优化

### 1. 缓存策略

- **内存缓存**：搜索结果缓存 1 小时
- **渐进式加载**：先显示基本信息，后加载详情
- **批量请求**：合并多个 API 请求

### 2. API 限流

```typescript
class RateLimiter {
  private requests: number[] = []
  private limit: number
  private window: number // 毫秒
  
  async throttle() {
    const now = Date.now()
    // 清理过期请求
    this.requests = this.requests.filter(
      time => now - time < this.window
    )
    
    if (this.requests.length >= this.limit) {
      // 等待直到窗口重置
      const waitTime = this.window - (now - this.requests[0])
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.requests.push(now)
  }
}
```

### 3. 错误处理

```typescript
async function searchWithRetry(
  options: SearchOptions,
  maxRetries = 3
): Promise<SearchResult> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await marketplaceService.searchServers(options)
    } catch (error) {
      if (i === maxRetries - 1) throw error
      
      // 指数退避
      await new Promise(resolve => 
        setTimeout(resolve, 1000 * Math.pow(2, i))
      )
    }
  }
}
```

## 🔍 搜索优化

### 相关性排序

```typescript
function calculateRelevance(repo: any, query: string): number {
  let score = 0
  const lowerQuery = query.toLowerCase()
  
  // 名称完全匹配
  if (repo.name.toLowerCase() === lowerQuery) {
    score += 100
  }
  
  // 名称包含
  if (repo.name.toLowerCase().includes(lowerQuery)) {
    score += 50
  }
  
  // 描述包含
  if (repo.description?.toLowerCase().includes(lowerQuery)) {
    score += 20
  }
  
  // Topics 匹配
  score += repo.topics.filter((t: string) => 
    t.includes(lowerQuery)
  ).length * 10
  
  // Star 权重
  score += Math.log10(repo.stargazers_count + 1) * 5
  
  return score
}
```

### 搜索建议

```typescript
const searchSuggestions = {
  '文件系统': ['filesystem', 'file-system', 'files'],
  'Git': ['git', 'version-control', 'repository'],
  '数据库': ['database', 'sql', 'postgres', 'mysql'],
  '网络': ['web', 'http', 'api', 'fetch'],
  'AI': ['ai', 'llm', 'model', 'prediction']
}
```

