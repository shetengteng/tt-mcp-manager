import * as fs from 'fs/promises'
import * as path from 'path'
import type { CursorRule, RuleFrontmatter } from '../types'

/**
 * Cursor Rules 文件解析器
 * 解析 MDC/MD 文件并转换为 CursorRule 对象
 */
export class RulesFileParser {
  /**
   * 解析单个 MDC/MD/CURSORRULES 文件
   */
  async parseRuleFile(filePath: string, parentRuleId?: number): Promise<CursorRule | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const fileName = path.basename(filePath)
      const fileExt = path.extname(filePath)
      const nameWithoutExt = path.basename(filePath, fileExt)
      const directoryPath = path.dirname(filePath)

      // 确定文件类型
      let fileType: 'cursorrules' | 'mdc'
      if (fileName === '.cursorrules') {
        fileType = 'cursorrules'
      } else if (fileExt === '.mdc') {
        fileType = 'mdc'
      } else {
        // 不支持 md 文件
        return null
      }

      // 提取 frontmatter
      const frontmatter = this.extractFrontmatter(content)

      // 提取内容（去除 frontmatter）
      const ruleContent = this.extractContent(content)

      // 从文件名推断语言（对于 .cursorrules 文件使用目录名）
      const dirName = path.basename(directoryPath)
      const inferName = fileType === 'cursorrules' ? dirName : nameWithoutExt
      const language = this.inferLanguage(inferName, frontmatter)

      // 从描述推断分类
      const category = this.inferCategory(frontmatter, inferName)

      // 生成唯一名称（包含目录信息以避免冲突）
      const uniqueName = fileType === 'cursorrules' ? dirName : `${dirName}/${nameWithoutExt}`

      // 生成原始文件名（用于安装时保留）
      const originalFileName = fileType === 'cursorrules' ? '.cursorrules' : `${nameWithoutExt}.mdc`

      return {
        id: 0, // 数据库自动生成
        name: uniqueName,
        displayName:
          fileType === 'cursorrules'
            ? this.formatDisplayName(dirName)
            : this.formatDisplayName(nameWithoutExt),
        description: frontmatter.description || '',
        descriptionZh: '', // 后续可以添加翻译
        author: frontmatter.author || 'Community',
        language: language,
        category: category,
        tags: frontmatter.tags || this.extractTags(ruleContent),
        content: ruleContent,
        sourceUrl: `local://data/rules/${path.relative(process.cwd(), filePath)}`,
        stars: 0,
        downloads: 0,
        lastUpdated: new Date().toISOString(),
        version: frontmatter.version || '1.0.0',
        official: false,
        license: frontmatter.license || 'MIT',
        scope: 'project',
        globs: frontmatter.globs,
        fileType: fileType,
        parentRuleId: parentRuleId,
        directoryPath: directoryPath,
        originalFileName: originalFileName
      }
    } catch (error) {
      console.error(`解析文件失败: ${filePath}`, error)
      return null
    }
  }

  /**
   * 提取 YAML frontmatter
   */
  private extractFrontmatter(content: string): RuleFrontmatter {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/
    const match = content.match(frontmatterRegex)

    if (!match) return {}

    const frontmatter: RuleFrontmatter = {}
    const lines = match[1].split('\n')

    for (const line of lines) {
      const [key, ...valueParts] = line.split(':')
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim()
        const cleanKey = key.trim() as keyof RuleFrontmatter

        // 处理数组类型（tags, category）
        if (cleanKey === 'tags' || cleanKey === 'category') {
          frontmatter[cleanKey] = value.split(',').map(v => v.trim())
        } else {
          frontmatter[cleanKey] = value as any
        }
      }
    }

    return frontmatter
  }

  /**
   * 提取内容（去除 frontmatter）
   */
  private extractContent(content: string): string {
    const frontmatterRegex = /^---\s*\n[\s\S]*?\n---\s*\n/
    return content.replace(frontmatterRegex, '').trim()
  }

  /**
   * 从文件名推断编程语言
   */
  private inferLanguage(fileName: string, frontmatter: RuleFrontmatter): string {
    // 优先使用 frontmatter 中的 language
    if (frontmatter.language) {
      return frontmatter.language
    }

    // 语言映射表
    const languageMap: Record<string, string> = {
      vue: 'Vue',
      react: 'React',
      typescript: 'TypeScript',
      javascript: 'JavaScript',
      python: 'Python',
      rust: 'Rust',
      go: 'Go',
      java: 'Java',
      cpp: 'C++',
      csharp: 'C#',
      php: 'PHP',
      ruby: 'Ruby',
      swift: 'Swift',
      kotlin: 'Kotlin',
      nextjs: 'Next.js',
      nuxtjs: 'Nuxt.js',
      svelte: 'Svelte',
      angular: 'Angular',
      fastapi: 'FastAPI',
      django: 'Django',
      flask: 'Flask',
      express: 'Express',
      nestjs: 'NestJS'
    }

    const lowerFileName = fileName.toLowerCase()
    for (const [key, value] of Object.entries(languageMap)) {
      if (lowerFileName.includes(key)) {
        return value
      }
    }

    return 'General'
  }

  /**
   * 推断分类
   */
  private inferCategory(frontmatter: RuleFrontmatter, fileName: string): string[] {
    if (frontmatter.category && frontmatter.category.length > 0) {
      return frontmatter.category
    }

    const categories: string[] = []
    const lowerFileName = fileName.toLowerCase()
    const lowerDesc = (frontmatter.description || '').toLowerCase()

    // 前端框架
    if (
      lowerFileName.includes('react') ||
      lowerFileName.includes('vue') ||
      lowerFileName.includes('angular') ||
      lowerFileName.includes('svelte') ||
      lowerFileName.includes('nextjs') ||
      lowerFileName.includes('nuxt') ||
      lowerFileName.includes('astro')
    ) {
      categories.push('前端框架')
    }

    // 后端开发
    if (
      lowerFileName.includes('fastapi') ||
      lowerFileName.includes('django') ||
      lowerFileName.includes('flask') ||
      lowerFileName.includes('express') ||
      lowerFileName.includes('spring') ||
      lowerFileName.includes('laravel') ||
      lowerFileName.includes('ktor') ||
      lowerFileName.includes('backend') ||
      lowerFileName.includes('server') ||
      lowerDesc.includes('backend') ||
      lowerDesc.includes('server')
    ) {
      categories.push('后端开发')
    }

    // 编程语言
    if (
      lowerFileName.includes('typescript') ||
      lowerFileName.includes('javascript') ||
      lowerFileName.includes('python') ||
      lowerFileName.includes('java') ||
      lowerFileName.includes('kotlin') ||
      lowerFileName.includes('rust') ||
      lowerFileName.includes('cpp') ||
      lowerFileName.includes('csharp') ||
      lowerFileName.includes('php') ||
      lowerFileName.includes('ruby') ||
      lowerFileName.includes('swift')
    ) {
      categories.push('编程语言')
    }

    // 移动开发
    if (
      lowerFileName.includes('android') ||
      lowerFileName.includes('ios') ||
      lowerFileName.includes('mobile') ||
      lowerFileName.includes('swift') ||
      lowerFileName.includes('kotlin') ||
      lowerFileName.includes('react-native') ||
      lowerFileName.includes('flutter') ||
      lowerDesc.includes('mobile') ||
      lowerDesc.includes('android') ||
      lowerDesc.includes('ios')
    ) {
      categories.push('移动开发')
    }

    // 数据库
    if (
      lowerFileName.includes('database') ||
      lowerFileName.includes('sql') ||
      lowerFileName.includes('mongodb') ||
      lowerFileName.includes('postgres') ||
      lowerFileName.includes('mysql') ||
      lowerDesc.includes('database') ||
      lowerDesc.includes('sql')
    ) {
      categories.push('数据库')
    }

    // 测试
    if (
      lowerFileName.includes('test') ||
      lowerFileName.includes('cypress') ||
      lowerFileName.includes('jest') ||
      lowerFileName.includes('vitest') ||
      lowerDesc.includes('test')
    ) {
      categories.push('测试')
    }

    // API开发
    if (
      lowerFileName.includes('api') ||
      lowerFileName.includes('rest') ||
      lowerFileName.includes('graphql') ||
      lowerDesc.includes('api')
    ) {
      categories.push('API开发')
    }

    // 最佳实践
    if (
      lowerFileName.includes('clean') ||
      lowerFileName.includes('quality') ||
      lowerFileName.includes('best-practice') ||
      lowerFileName.includes('guidelines') ||
      lowerDesc.includes('best practice') ||
      lowerDesc.includes('guidelines')
    ) {
      categories.push('最佳实践')
    }

    return categories.length > 0 ? categories : ['通用']
  }

  /**
   * 从内容中提取标签
   */
  private extractTags(content: string): string[] {
    // 简单实现：提取标题作为标签
    const tags: string[] = []
    const headingRegex = /^##\s+(.+)$/gm
    let match

    while ((match = headingRegex.exec(content)) !== null) {
      tags.push(match[1].trim())
    }

    return tags.slice(0, 10) // 最多10个标签
  }

  /**
   * 格式化显示名称
   */
  private formatDisplayName(fileName: string): string {
    // 将 kebab-case 转换为 Title Case
    return fileName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  /**
   * 批量解析目录下的所有规则文件
   */
  async parseRulesDirectory(directoryPath: string): Promise<CursorRule[]> {
    const rules: CursorRule[] = []
    // 用于记录每个目录的 cursorrules 规则ID（临时记录，用于关联）
    const directoryRuleMap = new Map<string, { name: string; index: number }>()

    // 第一遍：收集所有文件
    const allFiles: Array<{ path: string; dir: string; name: string }> = []

    const walkDirectory = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          await walkDirectory(fullPath)
        } else if (entry.name === '.cursorrules' || entry.name.endsWith('.mdc')) {
          allFiles.push({
            path: fullPath,
            dir: dir,
            name: entry.name
          })
        }
      }
    }

    await walkDirectory(directoryPath)

    // 第二遍：先解析 .cursorrules 文件
    for (const file of allFiles) {
      if (file.name === '.cursorrules') {
        const rule = await this.parseRuleFile(file.path)
        if (rule) {
          rules.push(rule)
          // 记录该目录的 cursorrules 规则（使用规则在数组中的索引）
          directoryRuleMap.set(file.dir, {
            name: rule.name,
            index: rules.length - 1
          })
        }
      }
    }

    // 第三遍：解析其他文件（.mdc 和 .md）
    for (const file of allFiles) {
      if (file.name !== '.cursorrules') {
        // 查找该目录是否有对应的 .cursorrules
        const parentInfo = directoryRuleMap.get(file.dir)

        const rule = await this.parseRuleFile(file.path)
        if (rule) {
          // 如果有父规则，先记录父规则的名称（稍后需要通过名称查找ID）
          if (parentInfo) {
            rule.parentRuleId = 0 // 临时标记，表示需要关联
            // 将父规则名称存储在 sourceUrl 中（临时方案）
            rule.sourceUrl = `${rule.sourceUrl}|parent:${parentInfo.name}`
          }
          rules.push(rule)
        }
      }
    }

    return rules
  }
}
