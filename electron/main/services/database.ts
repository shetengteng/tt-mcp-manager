import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

/**
 * 数据库管理服务
 * 负责 SQLite 数据库的初始化、Schema 创建和迁移
 */
export class DatabaseService {
  private static instance: DatabaseService | null = null
  private db: Database.Database | null = null

  private constructor() {
    // 私有构造函数，单例模式
  }

  /**
   * 获取数据库服务实例（单例）
   */
  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  /**
   * 初始化数据库
   */
  init(): void {
    if (this.db) {
      console.log('[Database] 数据库已初始化')
      return
    }

    try {
      const dbPath = join(app.getPath('userData'), 'mcp-manager.db')
      console.log(`[Database] 数据库路径: ${dbPath}`)

      this.db = new Database(dbPath)

      // 优化设置
      this.db.pragma('journal_mode = WAL') // Write-Ahead Logging 模式
      this.db.pragma('synchronous = NORMAL') // 同步模式
      this.db.pragma('foreign_keys = ON') // 启用外键约束

      // 创建表
      this.createTables()

      console.log('[Database] 数据库初始化成功')
    } catch (error) {
      console.error('[Database] 初始化失败:', error)
      throw error
    }
  }

  /**
   * 创建所有表
   */
  private createTables(): void {
    if (!this.db) throw new Error('数据库未初始化')

    // 开始事务
    const transaction = this.db.transaction(() => {
      // 1. 市场服务器表
      this.db!.exec(`
        CREATE TABLE IF NOT EXISTS marketplace_servers (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          display_name TEXT NOT NULL,
          full_name TEXT,
          description TEXT,
          stars INTEGER DEFAULT 0,
          forks INTEGER DEFAULT 0,
          language TEXT,
          topics TEXT,
          github_url TEXT,
          homepage TEXT,
          license TEXT,
          created_at TEXT,
          updated_at TEXT,
          npm_package TEXT,
          python_package TEXT,
          download_count INTEGER DEFAULT 0,
          category TEXT NOT NULL,
          install_type TEXT NOT NULL CHECK(install_type IN ('npm', 'python', 'git')),
          install_command TEXT NOT NULL,
          author TEXT NOT NULL,
          official INTEGER DEFAULT 0,
          synced_at TEXT NOT NULL
        )
      `)

      // 2. 创建索引
      this.db!.exec(`
        CREATE INDEX IF NOT EXISTS idx_marketplace_name ON marketplace_servers(name);
        CREATE INDEX IF NOT EXISTS idx_marketplace_author ON marketplace_servers(author);
        CREATE INDEX IF NOT EXISTS idx_marketplace_category ON marketplace_servers(category);
        CREATE INDEX IF NOT EXISTS idx_marketplace_language ON marketplace_servers(language);
        CREATE INDEX IF NOT EXISTS idx_marketplace_official ON marketplace_servers(official);
        CREATE INDEX IF NOT EXISTS idx_marketplace_synced_at ON marketplace_servers(synced_at);
      `)

      // 3. 同步元数据表
      this.db!.exec(`
        CREATE TABLE IF NOT EXISTS sync_metadata (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)

      console.log('[Database] 表和索引创建成功')
    })

    transaction()
  }

  /**
   * 获取数据库实例
   */
  getDatabase(): Database.Database {
    if (!this.db) {
      throw new Error('数据库未初始化，请先调用 init()')
    }
    return this.db
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      try {
        this.db.close()
        this.db = null
        console.log('[Database] 数据库连接已关闭')
      } catch (error) {
        console.error('[Database] 关闭数据库时出错:', error)
      }
    }
  }

  /**
   * 清空市场服务器表（用于测试）
   */
  clearMarketplaceServers(): void {
    if (!this.db) throw new Error('数据库未初始化')

    try {
      this.db.prepare('DELETE FROM marketplace_servers').run()
      console.log('[Database] 市场服务器表已清空')
    } catch (error) {
      console.error('[Database] 清空表失败:', error)
      throw error
    }
  }

  /**
   * 获取数据库统计信息
   */
  getStats() {
    if (!this.db) throw new Error('数据库未初始化')

    const serverCount = this.db
      .prepare('SELECT COUNT(*) as count FROM marketplace_servers')
      .get() as { count: number }

    return {
      serverCount: serverCount.count,
      dbPath: this.db.name
    }
  }
}

// 导出单例实例
export const database = DatabaseService.getInstance()
