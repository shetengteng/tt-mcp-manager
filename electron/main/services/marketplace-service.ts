import type { SearchOptions, SearchResult, MarketItem } from '../types'
import * as path from 'path'
import * as fs from 'fs/promises'
import { app } from 'electron'

interface CacheEntry {
  data: any
  timestamp: number
}

// MCP Servers 数据接口
interface MCPServersData {
  servers: MarketItem[]
  categories: Array<{ id: string; name: string; count: number }>
  metadata: {
    lastUpdated: string
    totalServers: number
    officialServers: number
    communityServers: number
  }
}

/**
 * 市场服务
 * 负责从本地数据提供 MCP Server 信息
 */
export class MarketplaceService {
  private cache: Map<string, CacheEntry> = new Map()
  private githubToken?: string
  private CACHE_TTL = 3600000 // 1小时缓存
  private mcpServersData: MCPServersData | null = null

  constructor(githubToken?: string) {
    this.githubToken = githubToken
    this.loadMCPServersData()
  }

  /**
   * 加载 MCP Servers 数据
   */
  private async loadMCPServersData(): Promise<void> {
    try {
      // 在开发环境和生产环境中使用不同的路径
      const dataPath = app.isPackaged
        ? path.join(process.resourcesPath, 'src', 'data', 'mcp-servers.json')
        : path.join(app.getAppPath(), 'src', 'data', 'mcp-servers.json')

      const content = await fs.readFile(dataPath, 'utf-8')
      this.mcpServersData = JSON.parse(content)

      // 自动推断并设置 installType
      if (this.mcpServersData?.servers) {
        this.mcpServersData.servers = this.mcpServersData.servers.map(server => {
          if (!server.installType) {
            // 根据 npmPackage、pythonPackage 或 installCommand 推断类型
            if (server.npmPackage || server.installCommand?.includes('npx')) {
              server.installType = 'npm'
            } else if (
              server.pythonPackage ||
              server.installCommand?.includes('pip') ||
              server.installCommand?.includes('python')
            ) {
              server.installType = 'python'
            } else {
              server.installType = 'git'
            }
          }
          return server
        })
      }

      const serverCount = this.mcpServersData?.servers?.length || 0
      console.log(`已加载 ${serverCount} 个 MCP Servers`)
    } catch (error) {
      console.error('加载 MCP Servers 数据失败:', error)
      // 如果加载失败，使用空数据
      this.mcpServersData = {
        servers: [],
        categories: [],
        metadata: {
          lastUpdated: new Date().toISOString(),
          totalServers: 0,
          officialServers: 0,
          communityServers: 0
        }
      }
    }
  }

  /**
   * 搜索 MCP Servers（从本地数据）
   */
  async searchServers(options: SearchOptions): Promise<SearchResult> {
    // 确保数据已加载
    if (!this.mcpServersData) {
      await this.loadMCPServersData()
    }

    if (!this.mcpServersData) {
      return {
        total: 0,
        page: options.page,
        perPage: options.perPage,
        items: []
      }
    }

    // 过滤服务器
    let filtered = this.mcpServersData.servers

    // 搜索查询
    if (options.query) {
      const query = options.query.toLowerCase()
      filtered = filtered.filter(
        server =>
          server.name.toLowerCase().includes(query) ||
          server.displayName.toLowerCase().includes(query) ||
          server.description.toLowerCase().includes(query) ||
          server.topics.some(topic => topic.toLowerCase().includes(query))
      )
    }

    // 分类筛选
    if (options.category) {
      filtered = filtered.filter(server => server.category.includes(options.category))
    }

    // 语言筛选
    if (options.language) {
      filtered = filtered.filter(server => server.language === options.language)
    }

    // 排序
    switch (options.sort) {
      case 'stars':
        filtered.sort((a, b) => b.stars - a.stars)
        break
      case 'updated':
        // 官方服务器优先
        filtered.sort((a, b) => {
          if (a.official && !b.official) return -1
          if (!a.official && b.official) return 1
          return b.stars - a.stars
        })
        break
      case 'created':
        filtered.sort((a, b) => b.id - a.id)
        break
    }

    // 分页
    const total = filtered.length
    const startIndex = (options.page - 1) * options.perPage
    const endIndex = startIndex + options.perPage
    const items = filtered.slice(startIndex, endIndex)

    return {
      total,
      page: options.page,
      perPage: options.perPage,
      items
    }
  }

  /**
   * 获取服务器详情
   */
  async getServerDetails(repoFullName: string): Promise<any> {
    if (!this.mcpServersData) {
      await this.loadMCPServersData()
    }

    const server = this.mcpServersData?.servers.find(
      s => s.name === repoFullName || s.githubUrl.includes(repoFullName)
    )

    return server || null
  }

  /**
   * 获取 README
   */
  async getReadme(repoFullName: string): Promise<string> {
    // 返回基本的 README 内容
    const server = await this.getServerDetails(repoFullName)
    if (!server) {
      return '# README 不可用'
    }

    return `# ${server.displayName}

${server.description}

## 安装

\`\`\`bash
${server.installCommand}
\`\`\`

## 信息

- **作者**: ${server.author}
- **语言**: ${server.language}
- **许可证**: ${server.license || 'MIT'}
- **GitHub**: ${server.githubUrl}

${server.homepage ? `- **主页**: ${server.homepage}` : ''}

## 标签

${server.topics.map(t => `\`${t}\``).join(' ')}
`
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear()
    console.log('清除市场缓存')
  }

  /**
   * 重新加载数据
   */
  async reload(): Promise<void> {
    this.mcpServersData = null
    await this.loadMCPServersData()
  }
}
