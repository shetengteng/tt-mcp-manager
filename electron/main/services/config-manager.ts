import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import type {
  ServerConfig,
  ValidationResult,
  CursorConfig
} from '../types'

/**
 * 配置管理器
 * 负责读写和管理所有服务器配置
 */
export class ConfigManager {
  private configPath: string
  private servers: Map<string, ServerConfig> = new Map()

  constructor() {
    // 配置文件路径: ~/.mcp-manager/config.json
    const userDataPath = app.getPath('userData')
    this.configPath = join(userDataPath, 'config.json')
  }

  /**
   * 初始化配置管理器
   */
  async init(): Promise<void> {
    await this.ensureConfigDir()
    await this.loadConfigs()
  }

  /**
   * 确保配置目录存在
   */
  private async ensureConfigDir(): Promise<void> {
    const configDir = join(app.getPath('userData'))
    try {
      await fs.access(configDir)
    } catch {
      await fs.mkdir(configDir, { recursive: true })
    }
  }

  /**
   * 加载所有服务器配置
   */
  async loadConfigs(): Promise<ServerConfig[]> {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8')
      const data = JSON.parse(content)
      
      // 将配置加载到内存
      this.servers.clear()
      if (data.servers && Array.isArray(data.servers)) {
        data.servers.forEach((config: ServerConfig) => {
          this.servers.set(config.id, config)
        })
      }

      return Array.from(this.servers.values())
    } catch (error: any) {
      // 如果文件不存在，返回空数组
      if (error.code === 'ENOENT') {
        console.log('配置文件不存在，创建新的配置文件')
        await this.saveConfigs()
        return []
      }
      throw error
    }
  }

  /**
   * 保存所有配置到文件
   */
  private async saveConfigs(): Promise<void> {
    const data = {
      version: '1.0.0',
      servers: Array.from(this.servers.values())
    }
    await fs.writeFile(this.configPath, JSON.stringify(data, null, 2), 'utf-8')
  }

  /**
   * 获取所有服务器配置
   */
  getAllConfigs(): ServerConfig[] {
    return Array.from(this.servers.values())
  }

  /**
   * 获取单个服务器配置
   */
  getConfig(serverId: string): ServerConfig | undefined {
    return this.servers.get(serverId)
  }

  /**
   * 保存服务器配置
   */
  async saveConfig(config: ServerConfig): Promise<void> {
    // 验证配置
    const validation = this.validateConfig(config)
    if (!validation.valid) {
      throw new Error(`配置验证失败: ${validation.errors.join(', ')}`)
    }

    // 如果没有 ID，生成一个
    if (!config.id) {
      config.id = this.generateId()
    }

    this.servers.set(config.id, config)
    await this.saveConfigs()
  }

  /**
   * 更新服务器配置
   */
  async updateConfig(serverId: string, updates: Partial<ServerConfig>): Promise<ServerConfig> {
    const existing = this.servers.get(serverId)
    if (!existing) {
      throw new Error(`服务器 ${serverId} 不存在`)
    }

    const updated = { ...existing, ...updates, id: serverId }
    
    // 验证更新后的配置
    const validation = this.validateConfig(updated)
    if (!validation.valid) {
      throw new Error(`配置验证失败: ${validation.errors.join(', ')}`)
    }

    this.servers.set(serverId, updated)
    await this.saveConfigs()
    
    return updated
  }

  /**
   * 删除服务器配置
   */
  async deleteConfig(serverId: string): Promise<void> {
    if (!this.servers.has(serverId)) {
      throw new Error(`服务器 ${serverId} 不存在`)
    }

    this.servers.delete(serverId)
    await this.saveConfigs()
  }

  /**
   * 验证配置
   */
  validateConfig(config: ServerConfig): ValidationResult {
    const errors: string[] = []

    // 必填字段检查
    if (!config.name) {
      errors.push('服务器名称不能为空')
    }

    if (!config.command) {
      errors.push('启动命令不能为空')
    }

    if (!config.type || !['npm', 'python', 'git'].includes(config.type)) {
      errors.push('服务器类型必须是 npm、python 或 git')
    }

    if (!Array.isArray(config.args)) {
      errors.push('命令参数必须是数组')
    }

    // 工作目录检查（如果提供）
    if (config.workingDirectory) {
      // 这里可以添加路径存在性检查
      // 但在配置时可能路径还不存在，所以只做基本检查
      if (typeof config.workingDirectory !== 'string') {
        errors.push('工作目录必须是字符串')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 导出单个服务器配置（Cursor 格式）
   */
  exportSingleForCursor(serverId: string): CursorConfig {
    const config = this.servers.get(serverId)
    if (!config) {
      throw new Error(`服务器 ${serverId} 不存在`)
    }

    const os = require('os')
    const mcpServers: Record<string, {
      command: string
      args: string[]
      env?: Record<string, string>
      cwd?: string
    }> = {}

    // 使用服务器名称作为键（转换为小写，替换空格和特殊字符）
    const key = config.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    
    mcpServers[key] = {
      command: config.command,
      args: config.args
    }

    // 如果有工作目录，展开 ~ 并添加
    if (config.workingDirectory) {
      const expandedPath = config.workingDirectory.replace(/^~/, os.homedir())
      mcpServers[key].cwd = expandedPath
    }

    // 如果有环境变量，添加到配置中
    if (config.env && Object.keys(config.env).length > 0) {
      mcpServers[key].env = config.env
    }

    return { mcpServers }
  }

  /**
   * 导出所有服务器配置（Cursor 格式）
   */
  exportForCursor(): CursorConfig {
    const os = require('os')
    const mcpServers: Record<string, {
      command: string
      args: string[]
      env?: Record<string, string>
      cwd?: string
    }> = {}

    this.servers.forEach((config, id) => {
      // 使用服务器名称作为键（转换为小写，替换空格和特殊字符）
      const key = config.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      
      mcpServers[key] = {
        command: config.command,
        args: config.args
      }

      // 如果有工作目录，展开 ~ 并添加
      if (config.workingDirectory) {
        const expandedPath = config.workingDirectory.replace(/^~/, os.homedir())
        mcpServers[key].cwd = expandedPath
      }

      // 如果有环境变量，添加到配置中
      if (config.env && Object.keys(config.env).length > 0) {
        mcpServers[key].env = config.env
      }
    })

    return { mcpServers }
  }

  /**
   * 导出配置到文件
   */
  async exportToFile(filePath: string): Promise<void> {
    const config = this.exportForCursor()
    await fs.writeFile(filePath, JSON.stringify(config, null, 2), 'utf-8')
  }

  /**
   * 从文件导入配置
   */
  async importFromFile(filePath: string): Promise<void> {
    const content = await fs.readFile(filePath, 'utf-8')
    const data = JSON.parse(content)

    // 验证导入的数据格式
    if (!data.servers || !Array.isArray(data.servers)) {
      throw new Error('无效的配置文件格式')
    }

    // 导入所有服务器配置
    for (const config of data.servers) {
      await this.saveConfig(config)
    }
  }

  /**
   * 同步单个服务器配置到 Cursor
   */
  async syncSingleToCursor(serverId: string): Promise<{ success: boolean; message: string }> {
    try {
      const os = require('os')
      const path = require('path')
      
      // 获取服务器配置
      const config = this.getConfig(serverId)
      if (!config) {
        return {
          success: false,
          message: '服务器配置不存在'
        }
      }
      
      // Cursor 配置文件路径
      const cursorConfigPath = path.join(os.homedir(), '.cursor', 'mcp.json')
      
      console.log('[ConfigManager] 同步单个服务器到 Cursor:', config.name)
      
      // 读取现有的 Cursor 配置
      let cursorConfig: any = { mcpServers: {} }
      try {
        const content = await fs.readFile(cursorConfigPath, 'utf-8')
        cursorConfig = JSON.parse(content)
      } catch (error) {
        console.log('[ConfigManager] Cursor 配置文件不存在，将创建新文件')
      }
      
      // 获取单个服务器的配置
      const singleConfig = this.exportSingleForCursor(serverId)
      
      // 合并到 Cursor 配置
      const mergedConfig = {
        ...cursorConfig,
        mcpServers: {
          ...cursorConfig.mcpServers,
          ...singleConfig.mcpServers
        }
      }
      
      // 确保 .cursor 目录存在
      const cursorDir = path.join(os.homedir(), '.cursor')
      try {
        await fs.access(cursorDir)
      } catch {
        await fs.mkdir(cursorDir, { recursive: true })
      }
      
      // 写入配置文件
      await fs.writeFile(
        cursorConfigPath,
        JSON.stringify(mergedConfig, null, 2),
        'utf-8'
      )
      
      console.log('[ConfigManager] 成功同步单个服务器到 Cursor:', config.name)
      
      return {
        success: true,
        message: `已同步 ${config.name} 到 Cursor`
      }
    } catch (error: any) {
      console.error('[ConfigManager] 同步单个服务器到 Cursor 失败:', error)
      return {
        success: false,
        message: `同步失败: ${error.message}`
      }
    }
  }

  /**
   * 同步配置到 Cursor
   */
  async syncToCursor(): Promise<{ success: boolean; message: string }> {
    try {
      const os = require('os')
      const path = require('path')
      
      // Cursor 配置文件路径
      const cursorConfigPath = path.join(os.homedir(), '.cursor', 'mcp.json')
      
      console.log('[ConfigManager] Cursor 配置路径:', cursorConfigPath)
      
      // 读取现有的 Cursor 配置
      let cursorConfig: any = { mcpServers: {} }
      try {
        const content = await fs.readFile(cursorConfigPath, 'utf-8')
        cursorConfig = JSON.parse(content)
        console.log('[ConfigManager] 读取到现有 Cursor 配置')
      } catch (error) {
        console.log('[ConfigManager] Cursor 配置文件不存在，将创建新文件')
      }
      
      // 获取我们的配置
      const ourConfig = this.exportForCursor()
      
      // 合并配置（保留 Cursor 中其他的配置，更新我们管理的）
      const mergedConfig = {
        ...cursorConfig,
        mcpServers: {
          ...cursorConfig.mcpServers,
          ...ourConfig.mcpServers
        }
      }
      
      // 确保 .cursor 目录存在
      const cursorDir = path.join(os.homedir(), '.cursor')
      try {
        await fs.access(cursorDir)
      } catch {
        await fs.mkdir(cursorDir, { recursive: true })
        console.log('[ConfigManager] 创建 .cursor 目录')
      }
      
      // 写入配置文件
      await fs.writeFile(
        cursorConfigPath,
        JSON.stringify(mergedConfig, null, 2),
        'utf-8'
      )
      
      console.log('[ConfigManager] 成功同步配置到 Cursor')
      
      return {
        success: true,
        message: `已同步 ${this.servers.size} 个 MCP Server 配置到 Cursor`
      }
    } catch (error: any) {
      console.error('[ConfigManager] 同步到 Cursor 失败:', error)
      return {
        success: false,
        message: `同步失败: ${error.message}`
      }
    }
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `server-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

