import axios from 'axios'
import { database } from './database'
import type { MarketItem } from '../types'

/**
 * Registry API 响应数据结构
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

interface SyncOptions {
  autoSync?: boolean
  syncInterval?: number
  maxRetries?: number
}

/**
 * MCP Registry 同步服务
 * 负责从官方 API 拉取数据并存储到 SQLite
 */
export class RegistrySyncService {
  private syncTimer: NodeJS.Timeout | null = null
  private readonly API_URL = 'https://registry.modelcontextprotocol.io/v0.1/servers'
  private syncing = false

  constructor(private options: SyncOptions = {}) {
    // 默认配置
    this.options = {
      autoSync: false,
      syncInterval: 6 * 60 * 60 * 1000, // 6 小时
      maxRetries: 3,
      ...options
    }
  }

  /**
   * 启动自动同步
   */
  start(): void {
    if (this.syncTimer) {
      console.log('[RegistrySync] 已经在运行')
      return
    }

    console.log('[RegistrySync] 启动自动同步服务')

    if (this.options.autoSync) {
      this.syncTimer = setInterval(() => {
        this.syncFromRegistry()
      }, this.options.syncInterval!)

      // 立即执行一次（异步，不阻塞）
      this.syncFromRegistry().catch(error => {
        console.error('[RegistrySync] 初始同步失败:', error)
      })
    }
  }

  /**
   * 停止自动同步
   */
  stop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
      console.log('[RegistrySync] 自动同步已停止')
    }
  }

  /**
   * 从官方 Registry 同步数据
   */
  async syncFromRegistry(): Promise<{ success: boolean; count: number; error?: string }> {
    if (this.syncing) {
      return { success: false, count: 0, error: '正在同步中' }
    }

    this.syncing = true

    try {
      console.log('[RegistrySync] 开始同步...')
      const startTime = Date.now()

      // 1. 递归获取所有分页数据
      const servers = await this.fetchAllServers()

      // 2. 批量保存到数据库
      const count = this.saveServers(servers)

      // 3. 更新同步元数据
      this.updateSyncMetadata('last_sync', new Date().toISOString())
      this.updateSyncMetadata('server_count', count.toString())

      const duration = ((Date.now() - startTime) / 1000).toFixed(2)
      console.log(`[RegistrySync] 同步完成: ${count} 个服务器，耗时 ${duration}s`)

      return { success: true, count }
    } catch (error: any) {
      console.error('[RegistrySync] 同步失败:', error)
      return { success: false, count: 0, error: error.message }
    } finally {
      this.syncing = false
    }
  }

  /**
   * 递归获取所有服务器（处理分页）
   */
  private async fetchAllServers(): Promise<RegistryServer[]> {
    const allServers: RegistryServer[] = []
    let cursor: string | undefined = undefined
    let pageCount = 0

    while (true) {
      pageCount++
      const url = cursor ? `${this.API_URL}?cursor=${encodeURIComponent(cursor)}` : this.API_URL

      console.log(`[RegistrySync] 获取第 ${pageCount} 页...`)

      const response = await axios.get<RegistryResponse>(url, {
        timeout: 15000,
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
        `[RegistrySync]   - ${data.servers.length} 条记录，其中 ${latestServers.length} 条为最新版本`
      )

      // 检查是否有下一页
      if (data.metadata && data.metadata.nextCursor) {
        cursor = data.metadata.nextCursor
      } else {
        break
      }

      // 安全限制：最多 100 页
      if (pageCount >= 100) {
        console.warn('[RegistrySync] 达到最大页数限制 (100)')
        break
      }
    }

    return allServers
  }

  /**
   * 批量保存服务器到数据库
   */
  private saveServers(servers: RegistryServer[]): number {
    const db = database.getDatabase()

    const insert = db.prepare(`
      INSERT OR REPLACE INTO marketplace_servers 
      (id, name, display_name, full_name, description, stars, forks, language, topics, 
       github_url, homepage, npm_package, python_package, category, install_type, 
       install_command, author, official, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const transaction = db.transaction((servers: RegistryServer[]) => {
      for (const item of servers) {
        const transformed = this.transformServer(item)
        insert.run(
          transformed.id,
          transformed.name,
          transformed.displayName,
          transformed.fullName,
          transformed.description,
          transformed.stars,
          transformed.forks || 0,
          transformed.language,
          JSON.stringify(transformed.topics),
          transformed.githubUrl,
          transformed.homepage,
          transformed.npmPackage || null,
          transformed.pythonPackage || null,
          JSON.stringify(transformed.category),
          transformed.installType,
          transformed.installCommand,
          transformed.author,
          transformed.official ? 1 : 0,
          new Date().toISOString()
        )
      }
    })

    transaction(servers)
    return servers.length
  }

  /**
   * 转换 Registry 数据为本地格式
   */
  private transformServer(item: RegistryServer): MarketItem {
    const server = item.server

    // 提取类别
    const category = this.inferCategory(server)

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
      id,
      name: server.name,
      displayName,
      fullName: server.name,
      description: server.description || 'No description',
      stars: 0,
      forks: 0,
      language,
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
      installType,
      installCommand,
      author,
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
   */
  private formatDisplayName(fullName: string): string {
    const parts = fullName.split('/')
    const name = parts[parts.length - 1]

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
  private inferCategory(server: any): string {
    const name = server.name?.toLowerCase() || ''
    const desc = server.description?.toLowerCase() || ''
    const combined = `${name} ${desc}`

    if (
      combined.includes('database') ||
      combined.includes('postgres') ||
      combined.includes('sqlite') ||
      combined.includes('sql')
    ) {
      return '数据平台'
    }
    if (combined.includes('filesystem') || combined.includes('file')) {
      return '文件系统'
    }
    if (combined.includes('github') || combined.includes('gitlab') || combined.includes('git')) {
      return '开发工具'
    }
    if (combined.includes('web') || combined.includes('http') || combined.includes('api')) {
      return 'Web服务'
    }
    if (
      combined.includes('cloud') ||
      combined.includes('aws') ||
      combined.includes('azure') ||
      combined.includes('gcp')
    ) {
      return 'Web服务'
    }
    if (
      combined.includes('ai') ||
      combined.includes('ml') ||
      combined.includes('model') ||
      combined.includes('llm')
    ) {
      return 'Web服务'
    }
    if (
      combined.includes('slack') ||
      combined.includes('chat') ||
      combined.includes('communication')
    ) {
      return 'Web服务'
    }

    return 'Web服务'
  }

  /**
   * 查询服务器
   */
  searchServers(query?: string, category?: string): MarketItem[] {
    const db = database.getDatabase()

    let sql = 'SELECT * FROM marketplace_servers WHERE 1=1'
    const params: any[] = []

    if (category && category !== '' && category !== 'all') {
      sql += ' AND category LIKE ?'
      params.push(`%"${category}"%`)
    }

    if (query && query.trim()) {
      sql += ' AND (name LIKE ? OR display_name LIKE ? OR description LIKE ?)'
      const searchTerm = `%${query}%`
      params.push(searchTerm, searchTerm, searchTerm)
    }

    sql += ' ORDER BY official DESC, stars DESC LIMIT 1000'

    const stmt = db.prepare(sql)
    const rows = stmt.all(...params) as any[]

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      fullName: row.full_name,
      description: row.description,
      stars: row.stars,
      forks: row.forks || 0,
      language: row.language,
      topics: JSON.parse(row.topics || '[]'),
      githubUrl: row.github_url,
      homepage: row.homepage,
      license: row.license,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      npmPackage: row.npm_package,
      pythonPackage: row.python_package,
      downloadCount: row.download_count || 0,
      category: JSON.parse(row.category || '[]'),
      installType: row.install_type,
      installCommand: row.install_command,
      author: row.author,
      official: row.official === 1
    }))
  }

  /**
   * 获取同步状态
   */
  getSyncStatus() {
    const lastSync = this.getSyncMetadata('last_sync')
    const serverCount = this.getSyncMetadata('server_count')

    return {
      lastSync: lastSync || 'Never',
      serverCount: parseInt(serverCount || '0'),
      syncing: this.syncing
    }
  }

  /**
   * 更新同步元数据
   */
  private updateSyncMetadata(key: string, value: string): void {
    const db = database.getDatabase()
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO sync_metadata (key, value, updated_at)
      VALUES (?, ?, ?)
    `)
    stmt.run(key, value, new Date().toISOString())
  }

  /**
   * 获取同步元数据
   */
  private getSyncMetadata(key: string): string | null {
    const db = database.getDatabase()
    const stmt = db.prepare('SELECT value FROM sync_metadata WHERE key = ?')
    const row = stmt.get(key) as any
    return row?.value || null
  }
}

// 导出单例实例
export const registrySync = new RegistrySyncService({
  autoSync: true,
  syncInterval: 6 * 60 * 60 * 1000 // 6 小时
})
