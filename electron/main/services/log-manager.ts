import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import { EventEmitter } from 'events'
import type { LogEntry, LogLevel, LogQueryOptions } from '../types'

/**
 * 日志管理器
 * 负责收集、存储和查询服务器日志
 */
export class LogManager extends EventEmitter {
  // 内存中的日志（每个服务器最多保留 10000 条）
  private logs: Map<string, LogEntry[]> = new Map()
  private maxLogSize: number = 10000
  private logsDir: string

  constructor() {
    super()
    // 日志目录: ~/.mcp-manager/logs/
    const userDataPath = app.getPath('userData')
    this.logsDir = join(userDataPath, 'logs')
  }

  /**
   * 初始化日志管理器
   */
  async init(): Promise<void> {
    await this.ensureLogsDir()
  }

  /**
   * 确保日志目录存在
   */
  private async ensureLogsDir(): Promise<void> {
    try {
      await fs.access(this.logsDir)
    } catch {
      await fs.mkdir(this.logsDir, { recursive: true })
    }
  }

  /**
   * 添加日志
   */
  addLog(serverId: string, message: string, level: LogLevel, source: 'stdout' | 'stderr' | 'system' = 'system'): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      serverId,
      level,
      message,
      source
    }

    // 获取或创建服务器的日志数组
    if (!this.logs.has(serverId)) {
      this.logs.set(serverId, [])
    }

    const serverLogs = this.logs.get(serverId)!
    serverLogs.push(entry)

    // 如果超过最大限制，删除最旧的日志
    if (serverLogs.length > this.maxLogSize) {
      serverLogs.shift()
    }

    // 异步写入文件（不阻塞）
    this.writeLogToFile(entry).catch(error => {
      console.error('写入日志文件失败:', error)
    })

    // 触发日志事件
    this.emit('log:new', entry)
  }

  /**
   * 获取日志
   */
  getLogs(serverId: string, options?: LogQueryOptions): LogEntry[] {
    const serverLogs = this.logs.get(serverId) || []
    let filtered = serverLogs

    // 按级别过滤
    if (options?.level) {
      filtered = filtered.filter(log => log.level === options.level)
    }

    // 按关键词搜索
    if (options?.search) {
      const searchLower = options.search.toLowerCase()
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchLower)
      )
    }

    // 分页
    const offset = options?.offset || 0
    const limit = options?.limit || filtered.length

    return filtered.slice(offset, offset + limit)
  }

  /**
   * 清空日志
   */
  clearLogs(serverId: string): void {
    this.logs.delete(serverId)
    console.log(`清空服务器日志: ${serverId}`)
  }

  /**
   * 搜索日志
   */
  searchLogs(serverId: string, query: string): LogEntry[] {
    const serverLogs = this.logs.get(serverId) || []
    const queryLower = query.toLowerCase()

    return serverLogs.filter(log =>
      log.message.toLowerCase().includes(queryLower)
    )
  }

  /**
   * 导出日志到文件
   */
  async exportLogs(serverId: string, filePath: string): Promise<void> {
    const logs = this.logs.get(serverId) || []
    
    // 格式化日志
    const content = logs.map(log => {
      const timestamp = log.timestamp.toISOString()
      const level = log.level.toUpperCase().padEnd(5)
      return `[${timestamp}] [${level}] [${log.source}] ${log.message}`
    }).join('\n')

    await fs.writeFile(filePath, content, 'utf-8')
    console.log(`导出日志到: ${filePath}`)
  }

  /**
   * 写入日志到文件
   */
  private async writeLogToFile(entry: LogEntry): Promise<void> {
    const date = entry.timestamp.toISOString().split('T')[0]
    const logFile = join(this.logsDir, `${entry.serverId}-${date}.log`)

    const timestamp = entry.timestamp.toISOString()
    const level = entry.level.toUpperCase().padEnd(5)
    const line = `[${timestamp}] [${level}] [${entry.source}] ${entry.message}\n`

    try {
      await fs.appendFile(logFile, line, 'utf-8')
    } catch (error) {
      // 如果文件不存在，创建它
      await fs.writeFile(logFile, line, 'utf-8')
    }
  }

  /**
   * 获取日志统计信息
   */
  getStats(serverId: string): {
    total: number
    byLevel: Record<LogLevel, number>
  } {
    const logs = this.logs.get(serverId) || []
    
    const stats = {
      total: logs.length,
      byLevel: {
        info: 0,
        warn: 0,
        error: 0,
        debug: 0
      } as Record<LogLevel, number>
    }

    logs.forEach(log => {
      stats.byLevel[log.level]++
    })

    return stats
  }

  /**
   * 清理过期日志文件（超过指定天数）
   */
  async cleanupOldLogs(days: number = 7): Promise<void> {
    try {
      const files = await fs.readdir(this.logsDir)
      const now = Date.now()
      const maxAge = days * 24 * 60 * 60 * 1000

      for (const file of files) {
        if (!file.endsWith('.log')) continue

        const filePath = join(this.logsDir, file)
        const stats = await fs.stat(filePath)
        const age = now - stats.mtime.getTime()

        if (age > maxAge) {
          await fs.unlink(filePath)
          console.log(`删除过期日志文件: ${file}`)
        }
      }
    } catch (error) {
      console.error('清理日志文件失败:', error)
    }
  }
}

