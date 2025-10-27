import type { SearchOptions, SearchResult, MarketItem } from '../types'

interface CacheEntry {
  data: any
  timestamp: number
}

/**
 * 市场服务
 * 负责从 GitHub 搜索和获取 MCP Server 信息
 */
export class MarketplaceService {
  private cache: Map<string, CacheEntry> = new Map()
  private githubToken?: string
  private CACHE_TTL = 3600000 // 1小时缓存

  constructor(githubToken?: string) {
    this.githubToken = githubToken
  }

  /**
   * 搜索 MCP Servers
   */
  async searchServers(options: SearchOptions): Promise<SearchResult> {
    const cacheKey = this.getCacheKey(options)

    // 检查缓存
    const cached = this.getCached(cacheKey)
    if (cached) {
      console.log('使用缓存的搜索结果')
      return cached
    }

    // 构建查询
    const query = this.buildQuery(options)

    console.log('搜索 GitHub:', query)

    // 调用 GitHub API
    const params = new URLSearchParams({
      q: query,
      sort: options.sort,
      order: 'desc',
      per_page: options.perPage.toString(),
      page: options.page.toString()
    })

    const response = await this.fetchGitHub(`/search/repositories?${params}`)
    const data = await response.json()

    // 增强数据
    const items = await this.enrichItems(data.items || [])

    const result: SearchResult = {
      total: data.total_count || 0,
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
   * 获取服务器详情
   */
  async getServerDetails(repoFullName: string): Promise<any> {
    const cacheKey = `details:${repoFullName}`
    const cached = this.getCached(cacheKey)
    if (cached) {
      return cached
    }

    const response = await this.fetchGitHub(`/repos/${repoFullName}`)
    const data = await response.json()

    // 缓存结果
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    })

    return data
  }

  /**
   * 获取 README
   */
  async getReadme(repoFullName: string): Promise<string> {
    const cacheKey = `readme:${repoFullName}`
    const cached = this.getCached(cacheKey)
    if (cached) {
      return cached
    }

    try {
      const response = await this.fetchGitHub(`/repos/${repoFullName}/readme`)
      const data = await response.json()
      const content = Buffer.from(data.content, 'base64').toString('utf-8')

      // 缓存结果
      this.cache.set(cacheKey, {
        data: content,
        timestamp: Date.now()
      })

      return content
    } catch (error) {
      console.error('获取 README 失败:', error)
      return '# README 不可用'
    }
  }

  /**
   * 构建搜索查询
   */
  private buildQuery(options: SearchOptions): string {
    const parts: string[] = []

    // 基础查询
    if (options.query) {
      parts.push(options.query)
    }

    // MCP Server 特定查询
    parts.push('(mcp-server OR "model context protocol" OR mcp)')

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
      '开发工具': '(development OR developer-tools OR git OR ci-cd OR playwright)',
      '文件系统': '(filesystem OR file-system OR files)',
      '数据平台': '(database OR sql OR data OR analytics OR databricks)',
      'Web服务': '(web OR http OR api OR rest OR fetch)',
      'AI工具': '(ai OR llm OR model OR ml OR prediction)',
      '金融数据': '(finance OR stock OR trading OR market)'
    }
    return queries[category] || ''
  }

  /**
   * 增强数据
   */
  private async enrichItems(repos: any[]): Promise<MarketItem[]> {
    const items: MarketItem[] = []

    for (const repo of repos) {
      try {
        // 检测安装类型和包名
        const installInfo = await this.detectInstallType(repo)

        // 获取下载量
        let downloadCount = 0
        if (installInfo.npmPackage) {
          downloadCount = await this.getNpmDownloads(installInfo.npmPackage)
        }

        // 自动检测分类
        const category = this.detectCategory(repo)

        items.push({
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description || '',
          stars: repo.stargazers_count || 0,
          forks: repo.forks_count || 0,
          language: repo.language || 'Unknown',
          topics: repo.topics || [],
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
        })
      } catch (error) {
        console.error(`处理仓库失败 ${repo.full_name}:`, error)
      }
    }

    return items
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
      const packageJson = await this.getFileContent(repo.full_name, 'package.json')
      const pkg = JSON.parse(packageJson)
      if (pkg.name) {
        return {
          type: 'npm',
          npmPackage: pkg.name
        }
      }
    } catch {
      // 不是 npm 包
    }

    // 尝试检测 Python 包
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
      ${repo.name || ''}
      ${repo.description || ''}
      ${(repo.topics || []).join(' ')}
    `.toLowerCase()

    const rules: Record<string, RegExp> = {
      '文件系统': /filesystem|file-system|files|directories/,
      '开发工具': /git|ci-cd|development|developer|playwright|testing|esp32/,
      '数据平台': /database|sql|postgres|mysql|data|analytics|databricks/,
      'Web服务': /web|http|api|rest|fetch|request|maps/,
      'AI工具': /ai|llm|model|ml|prediction|time/,
      '金融数据': /finance|stock|trading|market|alphavantage/
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
      if (!response.ok) return 0
      
      const data = await response.json()
      return data.downloads || 0
    } catch (error) {
      console.error(`获取 npm 下载量失败 [${packageName}]:`, error)
      return 0
    }
  }

  /**
   * 获取文件内容
   */
  private async getFileContent(repoFullName: string, filePath: string): Promise<string> {
    const response = await this.fetchGitHub(`/repos/${repoFullName}/contents/${filePath}`)
    const data = await response.json()
    
    if (data.content) {
      return Buffer.from(data.content, 'base64').toString('utf-8')
    }
    
    throw new Error('文件内容不可用')
  }

  /**
   * 调用 GitHub API
   */
  private async fetchGitHub(path: string): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }

    if (this.githubToken) {
      headers['Authorization'] = `Bearer ${this.githubToken}`
    }

    const response = await fetch(`https://api.github.com${path}`, { headers })

    if (!response.ok) {
      throw new Error(`GitHub API 错误: ${response.status} ${response.statusText}`)
    }

    return response
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

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear()
    console.log('清除市场缓存')
  }
}

