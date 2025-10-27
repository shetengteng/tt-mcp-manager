import { app } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'
import type {
  ServerTemplate,
  ServerConfig,
  TemplateVariable,
} from '../types'

/**
 * 模板管理器
 * 负责加载、搜索和应用 MCP 服务器模板
 */
export class TemplateManager {
  private templates: Map<string, ServerTemplate> = new Map()
  private templatesDir: string

  constructor() {
    // 模板目录在开发环境和生产环境中的位置不同
    this.templatesDir = app.isPackaged
      ? path.join(process.resourcesPath, 'templates')
      : path.join(app.getAppPath(), 'templates')
  }

  /**
   * 初始化模板管理器，加载所有模板
   */
  async initialize(): Promise<void> {
    console.log('正在初始化模板管理器...')
    try {
      await this.loadTemplates()
      console.log(`已加载 ${this.templates.size} 个模板`)
    } catch (error) {
      console.error('模板管理器初始化失败:', error)
      throw error
    }
  }

  /**
   * 从模板目录加载所有模板
   */
  private async loadTemplates(): Promise<void> {
    try {
      // 确保模板目录存在
      await fs.mkdir(this.templatesDir, { recursive: true })

      // 读取目录中的所有 JSON 文件
      const files = await fs.readdir(this.templatesDir)
      const jsonFiles = files.filter((file) => file.endsWith('.json'))

      // 加载每个模板文件
      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.templatesDir, file)
          const content = await fs.readFile(filePath, 'utf-8')
          const template = JSON.parse(content) as ServerTemplate

          // 验证模板格式
          if (this.validateTemplate(template)) {
            this.templates.set(template.name, template)
            console.log(`已加载模板: ${template.displayName}`)
          } else {
            console.warn(`模板格式无效，跳过: ${file}`)
          }
        } catch (error) {
          console.error(`加载模板文件失败: ${file}`, error)
        }
      }
    } catch (error) {
      console.error('读取模板目录失败:', error)
      throw error
    }
  }

  /**
   * 验证模板格式是否正确
   */
  private validateTemplate(template: any): template is ServerTemplate {
    return (
      typeof template === 'object' &&
      typeof template.name === 'string' &&
      typeof template.displayName === 'string' &&
      typeof template.description === 'string' &&
      typeof template.config === 'object' &&
      typeof template.config.command === 'string' &&
      Array.isArray(template.config.args)
    )
  }

  /**
   * 获取所有模板
   */
  getAllTemplates(): ServerTemplate[] {
    return Array.from(this.templates.values())
  }

  /**
   * 根据名称获取模板
   */
  getTemplate(name: string): ServerTemplate | undefined {
    return this.templates.get(name)
  }

  /**
   * 根据分类获取模板
   */
  getTemplatesByCategory(category: string): ServerTemplate[] {
    return this.getAllTemplates().filter(
      (template) => template.category === category
    )
  }

  /**
   * 搜索模板
   * @param query 搜索关键词
   */
  searchTemplates(query: string): ServerTemplate[] {
    const lowerQuery = query.toLowerCase()

    return this.getAllTemplates().filter((template) => {
      // 在名称、显示名称、描述和标签中搜索
      return (
        template.name.toLowerCase().includes(lowerQuery) ||
        template.displayName.toLowerCase().includes(lowerQuery) ||
        template.description.toLowerCase().includes(lowerQuery) ||
        template.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
      )
    })
  }

  /**
   * 根据模板创建服务器配置
   * @param templateName 模板名称
   * @param values 变量值映射
   */
  createConfigFromTemplate(
    templateName: string,
    values: Record<string, string>
  ): ServerConfig | null {
    const template = this.templates.get(templateName)
    if (!template) {
      console.error(`模板不存在: ${templateName}`)
      return null
    }

    try {
      // 替换配置中的变量
      const config: ServerConfig = {
        name: `${template.displayName} - ${Date.now()}`,
        command: template.config.command,
        args: this.replaceVariables(template.config.args, values),
        env: this.replaceVariables(template.config.env || {}, values),
        cwd: template.config.cwd || null,
        autoStart: false,
      }

      return config
    } catch (error) {
      console.error('从模板创建配置失败:', error)
      return null
    }
  }

  /**
   * 替换字符串或对象中的变量
   */
  private replaceVariables<T>(
    data: T,
    values: Record<string, string>
  ): T {
    if (typeof data === 'string') {
      // 替换 ${variableName} 格式的变量
      return data.replace(/\$\{(\w+)\}/g, (match, varName) => {
        return values[varName] || match
      }) as any
    } else if (Array.isArray(data)) {
      // 递归处理数组
      return data.map((item) => this.replaceVariables(item, values)) as any
    } else if (typeof data === 'object' && data !== null) {
      // 递归处理对象
      const result: any = {}
      for (const [key, value] of Object.entries(data)) {
        result[key] = this.replaceVariables(value, values)
      }
      return result
    }

    return data
  }

  /**
   * 获取所有可用的分类
   */
  getCategories(): string[] {
    const categories = new Set<string>()
    this.getAllTemplates().forEach((template) => {
      if (template.category) {
        categories.add(template.category)
      }
    })
    return Array.from(categories)
  }

  /**
   * 重新加载所有模板
   */
  async reload(): Promise<void> {
    this.templates.clear()
    await this.loadTemplates()
  }

  /**
   * 添加自定义模板
   */
  async addTemplate(template: ServerTemplate): Promise<boolean> {
    try {
      // 验证模板格式
      if (!this.validateTemplate(template)) {
        throw new Error('模板格式无效')
      }

      // 保存到文件
      const filePath = path.join(this.templatesDir, `${template.name}.json`)
      await fs.writeFile(filePath, JSON.stringify(template, null, 2), 'utf-8')

      // 添加到内存中
      this.templates.set(template.name, template)
      console.log(`已添加自定义模板: ${template.displayName}`)

      return true
    } catch (error) {
      console.error('添加模板失败:', error)
      return false
    }
  }

  /**
   * 删除模板
   */
  async removeTemplate(name: string): Promise<boolean> {
    try {
      const filePath = path.join(this.templatesDir, `${name}.json`)

      // 从文件系统删除
      await fs.unlink(filePath)

      // 从内存中删除
      this.templates.delete(name)
      console.log(`已删除模板: ${name}`)

      return true
    } catch (error) {
      console.error('删除模板失败:', error)
      return false
    }
  }
}

// 导出单例实例
export const templateManager = new TemplateManager()

