import * as fs from 'fs/promises'
import * as path from 'path'
import type { CursorRule, RuleFrontmatter } from '../types'

/**
 * Cursor Rules 文件解析器
 * 解析 MDC/MD 文件并转换为 CursorRule 对象
 */
export class RulesFileParser {
  /**
   * 解析单个 MDC/MD 文件
   */
  async parseRuleFile(filePath: string): Promise<CursorRule | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const fileName = path.basename(filePath, path.extname(filePath))

      // 提取 frontmatter
      const frontmatter = this.extractFrontmatter(content)

      // 提取内容（去除 frontmatter）
      const ruleContent = this.extractContent(content)

      // 从文件名推断语言
      const language = this.inferLanguage(fileName, frontmatter)

      // 从描述推断分类
      const category = this.inferCategory(frontmatter, fileName)

      return {
        id: 0, // 数据库自动生成
        name: fileName,
        displayName: this.formatDisplayName(fileName),
        description: frontmatter.description || '',
        descriptionZh: '', // 后续可以添加翻译
        author: frontmatter.author || 'Community',
        language: language,
        category: category,
        tags: frontmatter.tags || this.extractTags(ruleContent),
        content: ruleContent,
        sourceUrl: `local://src/data/rules/${path.basename(filePath)}`,
        stars: 0,
        downloads: 0,
        lastUpdated: new Date().toISOString(),
        version: frontmatter.version || '1.0.0',
        official: false,
        license: frontmatter.license || 'MIT',
        scope: 'project',
        globs: frontmatter.globs
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

    // 分类映射
    if (
      lowerFileName.includes('react') ||
      lowerFileName.includes('vue') ||
      lowerFileName.includes('angular')
    ) {
      categories.push('前端框架')
    }
    if (lowerFileName.includes('typescript') || lowerFileName.includes('javascript')) {
      categories.push('编程语言')
    }
    if (lowerFileName.includes('test') || lowerDesc.includes('test')) {
      categories.push('测试')
    }
    if (lowerFileName.includes('database') || lowerDesc.includes('database')) {
      categories.push('数据库')
    }
    if (lowerFileName.includes('api') || lowerDesc.includes('api')) {
      categories.push('API开发')
    }
    if (lowerFileName.includes('clean') || lowerDesc.includes('best practice')) {
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

    const walkDirectory = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          await walkDirectory(fullPath)
        } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdc')) {
          const rule = await this.parseRuleFile(fullPath)
          if (rule) {
            rules.push(rule)
          }
        }
      }
    }

    await walkDirectory(directoryPath)
    return rules
  }
}
