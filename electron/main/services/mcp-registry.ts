import type { MarketItem } from '../types'
import axios from 'axios'

/**
 * 官方 Registry API 数据结构
 */
interface RegistryServer {
  server: {
    name: string
    description?: string
    version: string
    repository?: {
      url: string
      source: string
    }
    packages?: Array<{
      registryType: string
      identifier: string
      version?: string
      runtimeHint?: string
      transport?: { type: string }
    }>
    remotes?: Array<{
      type: string
      url: string
    }>
  }
  _meta?: {
    'io.modelcontextprotocol.registry/official'?: {
      status: string
      isLatest: boolean
    }
  }
}

interface RegistryResponse {
  servers: RegistryServer[]
  metadata?: {
    nextCursor?: string
    count: number
  }
}

/**
 * MCP 注册表服务
 * 从官方 MCP Registry API 获取服务器列表
 */
export class MCPRegistryService {
  private cache: MarketItem[] = []
  private cacheExpiry: number = 0
  private readonly CACHE_TTL = 1000 * 60 * 60 // 1小时
  private readonly API_BASE_URL = 'https://registry.modelcontextprotocol.io/v0.1/servers'

  /**
   * 获取所有 MCP 服务器
   */
  async getAllServers(): Promise<MarketItem[]> {
    // 检查缓存
    if (this.cache.length > 0 && Date.now() < this.cacheExpiry) {
      console.log('[MCPRegistry] 使用缓存数据')
      return this.cache
    }

    console.log('[MCPRegistry] 从官方 Registry API 获取最新数据...')

    try {
      // 从官方 API 获取所有服务器
      const servers = await this.fetchAllFromRegistry()

      // 更新缓存
      this.cache = servers
      this.cacheExpiry = Date.now() + this.CACHE_TTL

      console.log(`[MCPRegistry] 成功获取 ${servers.length} 个服务器`)

      return servers
    } catch (error) {
      console.error('[MCPRegistry] 获取数据失败:', error)

      // 如果有缓存，返回缓存（即使过期）
      if (this.cache.length > 0) {
        console.log('[MCPRegistry] 使用过期缓存')
        return this.cache
      }

      throw error
    }
  }

  /**
   * 从官方 Registry 获取所有服务器（支持分页）
   */
  private async fetchAllFromRegistry(): Promise<MarketItem[]> {
    const allServers: RegistryServer[] = []
    let cursor: string | undefined = undefined
    let pageCount = 0

    try {
      // 递归获取所有分页数据
      while (true) {
        pageCount++
        const url = cursor
          ? `${this.API_BASE_URL}?cursor=${encodeURIComponent(cursor)}`
          : this.API_BASE_URL

        console.log(`[MCPRegistry] 获取第 ${pageCount} 页...`)

        const response = await axios.get<RegistryResponse>(url, {
          timeout: 10000,
          headers: {
            Accept: 'application/json'
          }
        })

        const data = response.data

        if (!data.servers || data.servers.length === 0) {
          break
        }

        // 只保留最新版本的服务器
        const latestServers = data.servers.filter(
          item =>
            item._meta &&
            item._meta['io.modelcontextprotocol.registry/official'] &&
            item._meta['io.modelcontextprotocol.registry/official'].isLatest === true
        )

        allServers.push(...latestServers)
        console.log(
          `[MCPRegistry] 第 ${pageCount} 页: 获取 ${data.servers.length} 条记录，其中 ${latestServers.length} 条为最新版本`
        )

        // 检查是否有下一页
        if (data.metadata && data.metadata.nextCursor) {
          cursor = data.metadata.nextCursor
        } else {
          break
        }

        // 安全限制：最多获取 100 页
        if (pageCount >= 100) {
          console.warn('[MCPRegistry] 达到最大页数限制 (100)，停止获取')
          break
        }
      }

      console.log(`[MCPRegistry] 总共获取 ${allServers.length} 个最新版本的服务器`)

      // 转换为 MarketItem 格式
      return allServers.map(item => this.registryServerToMarketItem(item))
    } catch (error) {
      console.error('[MCPRegistry] 从 Registry API 获取数据失败:', error)
      throw error
    }
  }

  /**
   * 将 Registry 服务器数据转换为 MarketItem
   */
  private registryServerToMarketItem(item: RegistryServer): MarketItem {
    const server = item.server

    // 提取类别（返回数组）
    const category = this.inferCategoryFromServer(server)

    // 提取安装信息
    let installType: 'npm' | 'python' | 'git' = 'npm'
    let installCommand = ''

    if (server.packages && server.packages.length > 0) {
      const pkg = server.packages[0]
      if (pkg.registryType === 'npm') {
        installType = 'npm'
        const runtimeHint = pkg.runtimeHint || 'npx'
        installCommand = `${runtimeHint} ${pkg.identifier}`
      } else if (pkg.registryType === 'pypi') {
        installType = 'python'
        installCommand = `pip install ${pkg.identifier}`
      } else if (pkg.registryType === 'oci') {
        installType = 'git' // 使用 git 作为 docker 的替代
        installCommand = `docker run ${pkg.identifier}`
      }
    } else if (server.remotes && server.remotes.length > 0) {
      installType = 'npm' // remote 默认为 npm
      installCommand = server.remotes[0].url
    }

    // 标记为官方
    const isOfficial =
      item._meta &&
      item._meta['io.modelcontextprotocol.registry/official'] &&
      item._meta['io.modelcontextprotocol.registry/official'].status === 'active'

    // 生成友好的显示名称
    const displayName = this.formatDisplayName(server.name)

    // 提取作者
    const author = server.name.split('/')[0] || 'Unknown'

    // 推断语言
    const language = this.inferLanguage(installType, server.packages)

    // 生成唯一 ID（使用 hash）
    const id = this.generateNumericId(server.name)

    return {
      id: id,
      name: server.name,
      displayName: displayName,
      fullName: server.name,
      description: server.description || 'No description',
      stars: 0, // Registry API 不提供 stars
      forks: 0,
      language: language,
      topics: isOfficial ? ['official', category] : [category],
      githubUrl: server.repository?.url || '',
      homepage: server.repository?.url || '',
      license: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      npmPackage:
        installType === 'npm' && server.packages?.[0]?.identifier
          ? server.packages[0].identifier
          : undefined,
      pythonPackage:
        installType === 'python' && server.packages?.[0]?.identifier
          ? server.packages[0].identifier
          : undefined,
      downloadCount: 0,
      category: [category],
      installType: installType,
      installCommand: installCommand,
      author: author,
      official: isOfficial
    }
  }

  /**
   * 生成数字 ID（从字符串 hash）
   */
  private generateNumericId(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // 转换为 32bit 整数
    }
    return Math.abs(hash)
  }

  /**
   * 格式化显示名称
   * ai.aliengiraffe/spotdb -> Spotdb
   * com.example/my-server -> My Server
   */
  private formatDisplayName(fullName: string): string {
    // 取最后一部分
    const parts = fullName.split('/')
    const name = parts[parts.length - 1]

    // 转换为友好格式
    return name
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  /**
   * 推断编程语言
   */
  private inferLanguage(installType: string, packages?: any[]): string {
    if (installType === 'npm' || (packages && packages[0]?.registryType === 'npm')) {
      return 'TypeScript'
    }
    if (installType === 'python' || (packages && packages[0]?.registryType === 'pypi')) {
      return 'Python'
    }
    if (packages && packages[0]?.registryType === 'oci') {
      return 'Docker'
    }
    return 'Other'
  }

  /**
   * 根据服务器信息推断分类
   */
  private inferCategoryFromServer(server: any): string {
    const name = server.name?.toLowerCase() || ''
    const desc = server.description?.toLowerCase() || ''
    const combined = `${name} ${desc}`

    if (
      combined.includes('database') ||
      combined.includes('postgres') ||
      combined.includes('sqlite') ||
      combined.includes('sql')
    ) {
      return 'database'
    }
    if (combined.includes('filesystem') || combined.includes('file')) {
      return 'filesystem'
    }
    if (combined.includes('github') || combined.includes('gitlab') || combined.includes('git')) {
      return 'version-control'
    }
    if (combined.includes('web') || combined.includes('http') || combined.includes('api')) {
      return 'web'
    }
    if (
      combined.includes('cloud') ||
      combined.includes('aws') ||
      combined.includes('azure') ||
      combined.includes('gcp')
    ) {
      return 'cloud'
    }
    if (
      combined.includes('ai') ||
      combined.includes('ml') ||
      combined.includes('model') ||
      combined.includes('llm')
    ) {
      return 'ai'
    }
    if (
      combined.includes('slack') ||
      combined.includes('chat') ||
      combined.includes('communication')
    ) {
      return 'productivity'
    }

    return 'other'
  }

  /**
   * 搜索服务器
   */
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

  /**
   * 按分类获取服务器
   */
  async getServersByCategory(category: string): Promise<MarketItem[]> {
    const servers = await this.getAllServers()

    if (category === 'all') {
      return servers
    }

    return servers.filter(server => server.category === category)
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache = []
    this.cacheExpiry = 0
    console.log('[MCPRegistry] 缓存已清除')
  }

  /**
   * 获取缓存状态
   */
  getCacheStatus(): { cached: number; expiresIn: number } {
    return {
      cached: this.cache.length,
      expiresIn: Math.max(0, this.cacheExpiry - Date.now())
    }
  }
}

export const mcpRegistry = new MCPRegistryService()
