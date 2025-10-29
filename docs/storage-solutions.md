# MCP Manager 数据存储方案对比

## 📊 当前存储方案分析

### 现状（JSON 文件）

**存储位置：**

```
~/.mcp-manager/
├── config.json        # 服务器配置（所有服务器）
├── settings.json      # 应用设置
└── logs/             # 日志文件目录
    ├── server-1.log
    ├── server-2.log
    └── ...
```

**数据结构：**

```json
// config.json
{
  "version": "1.0.0",
  "servers": [
    {
      "id": "server-123",
      "name": "My Server",
      "type": "npm",
      "command": "npx",
      "args": ["@modelcontextprotocol/server-memory"],
      "workingDirectory": "~/mcp-servers/memory",
      "env": {},
      "autoStart": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}

// settings.json
{
  "autoStart": false,
  "minimizeToTray": true,
  "keepBackground": true,
  "defaultInstallPath": "~/mcp-servers",
  "githubToken": ""
}
```

**实现方式：**

- 使用 Node.js `fs` 模块读写 JSON 文件
- 内存中使用 `Map<string, ServerConfig>` 管理服务器配置
- 每次修改都会重写整个 JSON 文件
- 日志采用单独的文本文件，每个服务器一个

**优点：**
✅ 实现简单，无需额外依赖
✅ 数据可读性强，易于调试
✅ 轻量级，适合小规模数据
✅ 易于备份和迁移（直接复制文件）
✅ 无需数据库管理

**缺点：**
❌ 性能问题：大量服务器时需要重写整个文件
❌ 并发问题：多个进程同时写入可能导致数据损坏
❌ 查询能力弱：无法进行复杂查询和索引
❌ 扩展性差：难以支持关系数据和复杂查询
❌ 缺乏事务支持：无法保证数据一致性

---

## 🎯 方案对比

## 方案 1：保持 JSON 文件（改进版）

### 改进措施

1. **文件锁机制**：添加文件锁防止并发写入
2. **原子写入**：先写临时文件，再重命名
3. **数据备份**：定期备份配置文件
4. **压缩存储**：对日志文件进行压缩

### 实现示例

```typescript
class ConfigManager {
  private async saveConfigs(): Promise<void> {
    const tempPath = `${this.configPath}.tmp`
    const backupPath = `${this.configPath}.backup`

    try {
      // 1. 备份现有文件
      if (await this.fileExists(this.configPath)) {
        await fs.copyFile(this.configPath, backupPath)
      }

      // 2. 写入临时文件
      await fs.writeFile(tempPath, JSON.stringify(data, null, 2))

      // 3. 原子性重命名
      await fs.rename(tempPath, this.configPath)
    } catch (error) {
      // 4. 失败时恢复备份
      if (await this.fileExists(backupPath)) {
        await fs.copyFile(backupPath, this.configPath)
      }
      throw error
    }
  }
}
```

### 适用场景

- ✅ 服务器数量 < 50 个
- ✅ 配置修改频率低（每分钟 < 10 次）
- ✅ 无需复杂查询和统计
- ✅ 追求轻量级和简单性

### 开发成本

- 工作量：1-2 天
- 复杂度：低
- 维护成本：低

---

## 方案 2：SQLite 数据库（推荐）⭐

### 架构设计

**数据库文件：**

```
~/.mcp-manager/
└── mcp-manager.db    # SQLite 数据库文件
```

**表结构设计：**

```sql
-- 服务器配置表
CREATE TABLE servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('npm', 'python', 'git')),
  command TEXT NOT NULL,
  args TEXT NOT NULL,  -- JSON 数组
  working_directory TEXT,
  env TEXT,           -- JSON 对象
  auto_start INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT    -- 软删除
);

-- 创建索引
CREATE INDEX idx_servers_type ON servers(type);
CREATE INDEX idx_servers_created_at ON servers(created_at);

-- 应用设置表
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 服务器日志表（可选）
CREATE TABLE server_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id TEXT NOT NULL,
  level TEXT NOT NULL CHECK(level IN ('info', 'warn', 'error')),
  message TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
);

-- 日志索引
CREATE INDEX idx_logs_server_id ON server_logs(server_id);
CREATE INDEX idx_logs_timestamp ON server_logs(timestamp);
CREATE INDEX idx_logs_level ON server_logs(level);

-- 服务器统计表（新增功能）
CREATE TABLE server_stats (
  server_id TEXT PRIMARY KEY,
  start_count INTEGER DEFAULT 0,
  total_runtime INTEGER DEFAULT 0,  -- 总运行时间（秒）
  last_start_time TEXT,
  last_stop_time TEXT,
  error_count INTEGER DEFAULT 0,
  FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
);
```

### 实现方案

**依赖：**

```json
{
  "better-sqlite3": "^9.2.2" // 同步 API，性能最佳
}
```

**代码示例：**

```typescript
import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

class DatabaseManager {
  private db: Database.Database

  constructor() {
    const dbPath = join(app.getPath('userData'), 'mcp-manager.db')
    this.db = new Database(dbPath)
    this.init()
  }

  private init() {
    // 开启 WAL 模式（写性能提升）
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('synchronous = NORMAL')

    // 创建表
    this.createTables()
  }

  private createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS servers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        command TEXT NOT NULL,
        args TEXT NOT NULL,
        working_directory TEXT,
        env TEXT,
        auto_start INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_servers_type ON servers(type);
    `)
  }

  // 服务器操作
  saveServer(server: ServerConfig) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO servers 
      (id, name, type, command, args, working_directory, env, auto_start, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      server.id,
      server.name,
      server.type,
      server.command,
      JSON.stringify(server.args),
      server.workingDirectory,
      JSON.stringify(server.env || {}),
      server.autoStart ? 1 : 0,
      server.createdAt,
      new Date().toISOString()
    )
  }

  getAllServers(): ServerConfig[] {
    const stmt = this.db.prepare('SELECT * FROM servers ORDER BY created_at DESC')
    const rows = stmt.all()

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      command: row.command,
      args: JSON.parse(row.args),
      workingDirectory: row.working_directory,
      env: JSON.parse(row.env || '{}'),
      autoStart: row.auto_start === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  deleteServer(id: string) {
    const stmt = this.db.prepare('DELETE FROM servers WHERE id = ?')
    stmt.run(id)
  }

  // 事务支持
  saveMultipleServers(servers: ServerConfig[]) {
    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO servers 
      (id, name, type, command, args, working_directory, env, auto_start, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const transaction = this.db.transaction((servers: ServerConfig[]) => {
      for (const server of servers) {
        insert.run(/* ... */)
      }
    })

    transaction(servers)
  }

  close() {
    this.db.close()
  }
}
```

### 优点

✅ **性能优秀**：读写速度快，支持索引
✅ **事务支持**：保证数据一致性
✅ **查询强大**：支持 SQL 查询和聚合
✅ **扩展性好**：易于添加新表和关系
✅ **数据完整性**：外键约束和数据类型检查
✅ **备份简单**：单个文件，易于备份
✅ **无需服务器**：嵌入式数据库，零配置

### 缺点

❌ 需要引入 `better-sqlite3` 依赖（~3MB）
❌ 需要编写 SQL 语句
❌ 数据不如 JSON 直观（需要工具查看）

### 适用场景

- ✅ 服务器数量 > 20 个
- ✅ 需要复杂查询和统计
- ✅ 需要日志持久化和查询
- ✅ 未来功能扩展（统计、分析、历史记录）

### 开发成本

- 工作量：3-5 天
- 复杂度：中等
- 维护成本：中等

---

## 方案 3：混合方案

### 架构

- **SQLite**：存储服务器配置、日志、统计数据
- **JSON 文件**：存储应用设置（Settings）
- **文本文件**：临时日志（实时显示，定期归档到数据库）

### 优点

✅ 结合两者优势
✅ 关键数据用 SQLite 保证可靠性
✅ 简单配置用 JSON 保持易用性
✅ 灵活性高

### 缺点

❌ 架构复杂度增加
❌ 两套存储逻辑

### 开发成本

- 工作量：4-6 天
- 复杂度：中高
- 维护成本：中高

---

## 方案 4：IndexedDB（浏览器方案）

### 说明

由于这是 Electron 应用，渲染进程可以使用 IndexedDB。

### 优点

✅ 浏览器原生支持
✅ 异步 API，不阻塞 UI
✅ 支持事务和索引

### 缺点

❌ 主进程无法直接访问
❌ 需要 IPC 通信
❌ 备份和迁移复杂
❌ 调试困难

### 适用场景

- 仅前端需要持久化的数据
- 不推荐用于主要数据存储

---

## 📈 性能对比

| 指标                 | JSON 文件 | SQLite   | IndexedDB   |
| -------------------- | --------- | -------- | ----------- |
| 写入 50 条记录       | ~50ms     | ~5ms     | ~10ms       |
| 读取 50 条记录       | ~10ms     | ~1ms     | ~5ms        |
| 查询（WHERE）        | O(n)      | O(log n) | O(log n)    |
| 并发写入             | ❌ 不支持 | ✅ 支持  | ⚠️ 有限支持 |
| 文件大小（50服务器） | ~15KB     | ~50KB    | ~100KB      |
| 启动时间             | 快        | 快       | 中等        |

---

## 💡 推荐方案总结

### 小型项目（< 20 服务器）

**推荐：方案 1（改进的 JSON）**

- 简单够用
- 无需额外依赖
- 开发快速

### 中大型项目（> 20 服务器）

**推荐：方案 2（SQLite）⭐**

- 性能优秀
- 功能强大
- 易于扩展
- 生产就绪

### 长期规划

**推荐：方案 2（SQLite）**

- 为未来功能预留空间：
  - 📊 服务器使用统计
  - 📈 性能监控
  - 📝 完整日志历史
  - 🔍 高级搜索和过滤
  - 📦 批量操作
  - 🔄 配置版本管理

---

## 🚀 迁移方案

### 从 JSON 迁移到 SQLite

```typescript
class MigrationManager {
  async migrateFromJSON() {
    // 1. 读取旧的 JSON 配置
    const oldConfig = await this.loadJSONConfig()

    // 2. 创建 SQLite 数据库
    const db = new DatabaseManager()

    // 3. 迁移数据
    for (const server of oldConfig.servers) {
      db.saveServer(server)
    }

    // 4. 备份旧配置
    await fs.rename(this.configPath, `${this.configPath}.backup`)

    console.log('✓ 迁移完成')
  }
}
```

---

## 📋 实施建议

### 立即实施（方案 2 - SQLite）

1. ✅ 添加 `better-sqlite3` 依赖
2. ✅ 创建 `DatabaseManager` 类
3. ✅ 设计数据库 Schema
4. ✅ 实现数据迁移脚本
5. ✅ 更新 ConfigManager 使用数据库
6. ✅ 添加单元测试
7. ✅ 更新文档

### 预估工作量

- 数据库设计：0.5 天
- 核心实现：2 天
- 数据迁移：0.5 天
- 测试和调试：1 天
- 文档更新：0.5 天
- **总计：4-5 天**

---

## ❓ 您的选择

请根据项目需求选择合适的方案：

- [ ] **方案 1**：保持 JSON 文件（改进版）- 简单快速
- [ ] **方案 2**：SQLite 数据库（推荐）- 功能强大 ⭐
- [ ] **方案 3**：混合方案 - 灵活平衡
- [ ] **方案 4**：IndexedDB - 不推荐

**我的建议：选择方案 2（SQLite）**，原因：

1. 当前已有 20+ 服务器数据结构，未来会更多
2. 需要日志查询和统计功能
3. 性能和扩展性都有保障
4. 开发成本合理（4-5天）
5. 长期维护成本低

您更倾向哪个方案？或者有其他考虑因素吗？

---

## 🌐 市场数据同步方案（新增）

### 背景

市场（Marketplace）需要展示 MCP Server 列表，数据来源于官方 MCP Registry：

- **API**: `https://registry.modelcontextprotocol.io/v0.1/servers`
- **数据量**: 700+ 服务器
- **更新频率**: 每天有新增

### 方案设计

#### 数据流

```
官方 Registry API
    ↓ (定期同步)
SQLite 本地缓存
    ↓ (快速查询)
前端 Marketplace 页面
```

#### SQLite Schema（市场数据表）

```sql
-- MCP 市场服务器表
CREATE TABLE marketplace_servers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,            -- 完整包名 (e.g., "ai.aliengiraffe/spotdb")
  display_name TEXT NOT NULL,    -- 显示名称 (e.g., "Spotdb")
  full_name TEXT,                -- 完整名称
  description TEXT,              -- 描述
  stars INTEGER DEFAULT 0,       -- GitHub stars
  forks INTEGER DEFAULT 0,       -- GitHub forks
  language TEXT,                 -- 编程语言 (TypeScript/Python/Docker)
  topics TEXT,                   -- 标签 JSON 数组 ["official", "ai"]
  github_url TEXT,               -- GitHub 仓库地址
  homepage TEXT,                 -- 主页
  license TEXT,                  -- 开源协议
  created_at TEXT,               -- 创建时间
  updated_at TEXT,               -- 更新时间
  npm_package TEXT,              -- NPM 包名
  python_package TEXT,           -- Python 包名
  download_count INTEGER DEFAULT 0,  -- 下载量
  category TEXT NOT NULL,        -- 分类 JSON 数组 ["database", "ai"]
  install_type TEXT NOT NULL CHECK(install_type IN ('npm', 'python', 'git')),
  install_command TEXT NOT NULL, -- 安装命令
  author TEXT NOT NULL,          -- 作者
  official INTEGER DEFAULT 0,    -- 是否官方
  synced_at TEXT NOT NULL        -- 同步时间
);

-- 索引优化
CREATE INDEX idx_marketplace_name ON marketplace_servers(name);
CREATE INDEX idx_marketplace_author ON marketplace_servers(author);
CREATE INDEX idx_marketplace_category ON marketplace_servers(category);
CREATE INDEX idx_marketplace_language ON marketplace_servers(language);
CREATE INDEX idx_marketplace_official ON marketplace_servers(official);
CREATE INDEX idx_marketplace_synced_at ON marketplace_servers(synced_at);

-- 全文搜索（可选）
CREATE VIRTUAL TABLE marketplace_search USING fts5(
  name,
  display_name,
  description,
  author,
  content=marketplace_servers
);

-- 同步元数据表
CREATE TABLE sync_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

#### 同步服务实现

**文件**: `electron/main/services/registry-sync.ts`

```typescript
import Database from 'better-sqlite3'
import axios from 'axios'
import { app } from 'electron'
import { join } from 'path'

interface RegistrySyncOptions {
  autoSync?: boolean // 是否自动同步
  syncInterval?: number // 同步间隔（毫秒）
  maxRetries?: number // 最大重试次数
}

export class RegistrySyncService {
  private db: Database.Database
  private syncTimer: NodeJS.Timeout | null = null
  private readonly API_URL = 'https://registry.modelcontextprotocol.io/v0.1/servers'

  constructor(private options: RegistrySyncOptions = {}) {
    const dbPath = join(app.getPath('userData'), 'mcp-manager.db')
    this.db = new Database(dbPath)
    this.init()
  }

  private init() {
    // 创建表
    this.createTables()

    // 启动自动同步
    if (this.options.autoSync) {
      this.startAutoSync()
    }
  }

  private createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS marketplace_servers (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
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
        install_type TEXT NOT NULL,
        install_command TEXT NOT NULL,
        author TEXT NOT NULL,
        official INTEGER DEFAULT 0,
        synced_at TEXT NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_marketplace_name ON marketplace_servers(name);
      CREATE INDEX IF NOT EXISTS idx_marketplace_category ON marketplace_servers(category);
      
      CREATE TABLE IF NOT EXISTS sync_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `)
  }

  /**
   * 从官方 Registry 同步数据
   */
  async syncFromRegistry(): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      console.log('[RegistrySync] 开始同步...')

      // 1. 递归获取所有分页数据
      const servers = await this.fetchAllServers()

      // 2. 使用事务批量插入
      const result = this.saveServers(servers)

      // 3. 更新同步元数据
      this.updateSyncMetadata('last_sync', new Date().toISOString())
      this.updateSyncMetadata('server_count', servers.length.toString())

      console.log(`[RegistrySync] 同步完成: ${servers.length} 个服务器`)

      return { success: true, count: servers.length }
    } catch (error: any) {
      console.error('[RegistrySync] 同步失败:', error)
      return { success: false, count: 0, error: error.message }
    }
  }

  /**
   * 递归获取所有服务器（处理分页）
   */
  private async fetchAllServers(): Promise<any[]> {
    const allServers: any[] = []
    let cursor: string | undefined = undefined
    let pageCount = 0

    while (true) {
      pageCount++
      const url = cursor ? `${this.API_URL}?cursor=${encodeURIComponent(cursor)}` : this.API_URL

      const response = await axios.get(url, { timeout: 15000 })
      const data = response.data

      if (!data.servers || data.servers.length === 0) {
        break
      }

      // 只保留最新版本
      const latestServers = data.servers.filter(
        (item: any) => item._meta?.['io.modelcontextprotocol.registry/official']?.isLatest === true
      )

      allServers.push(...latestServers)

      if (data.metadata?.nextCursor) {
        cursor = data.metadata.nextCursor
      } else {
        break
      }

      // 安全限制
      if (pageCount >= 100) break
    }

    return allServers
  }

  /**
   * 批量保存服务器到数据库
   */
  private saveServers(servers: any[]): number {
    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO marketplace_servers 
      (id, name, display_name, full_name, description, stars, language, topics, 
       github_url, homepage, npm_package, python_package, category, install_type, 
       install_command, author, official, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const transaction = this.db.transaction((servers: any[]) => {
      for (const item of servers) {
        const transformed = this.transformServer(item)
        insert.run(
          transformed.id,
          transformed.name,
          transformed.displayName,
          transformed.fullName,
          transformed.description,
          transformed.stars,
          transformed.language,
          JSON.stringify(transformed.topics),
          transformed.githubUrl,
          transformed.homepage,
          transformed.npmPackage,
          transformed.pythonPackage,
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
  private transformServer(item: any) {
    // 使用前面实现的转换逻辑
    // ... (与 mcp-registry.ts 中的 registryServerToMarketItem 相同)
  }

  /**
   * 查询服务器
   */
  searchServers(query?: string, category?: string): any[] {
    let sql = 'SELECT * FROM marketplace_servers WHERE 1=1'
    const params: any[] = []

    if (category && category !== 'all') {
      sql += ' AND category LIKE ?'
      params.push(`%"${category}"%`)
    }

    if (query) {
      sql += ' AND (name LIKE ? OR display_name LIKE ? OR description LIKE ?)'
      const searchTerm = `%${query}%`
      params.push(searchTerm, searchTerm, searchTerm)
    }

    sql += ' ORDER BY official DESC, stars DESC LIMIT 100'

    const stmt = this.db.prepare(sql)
    const rows = stmt.all(...params)

    return rows.map(row => ({
      ...row,
      topics: JSON.parse(row.topics || '[]'),
      category: JSON.parse(row.category || '[]'),
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
      nextSync: this.getNextSyncTime()
    }
  }

  /**
   * 启动自动同步
   */
  startAutoSync() {
    const interval = this.options.syncInterval || 6 * 60 * 60 * 1000 // 默认 6 小时

    this.syncTimer = setInterval(() => {
      this.syncFromRegistry()
    }, interval)

    // 立即执行一次
    this.syncFromRegistry()
  }

  /**
   * 停止自动同步
   */
  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
    }
  }

  // 辅助方法
  private updateSyncMetadata(key: string, value: string) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO sync_metadata (key, value, updated_at)
      VALUES (?, ?, ?)
    `)
    stmt.run(key, value, new Date().toISOString())
  }

  private getSyncMetadata(key: string): string | null {
    const stmt = this.db.prepare('SELECT value FROM sync_metadata WHERE key = ?')
    const row = stmt.get(key) as any
    return row?.value || null
  }

  private getNextSyncTime(): string {
    const lastSync = this.getSyncMetadata('last_sync')
    if (!lastSync) return 'Unknown'

    const interval = this.options.syncInterval || 6 * 60 * 60 * 1000
    const nextTime = new Date(new Date(lastSync).getTime() + interval)
    return nextTime.toISOString()
  }

  close() {
    this.stopAutoSync()
    this.db.close()
  }
}
```

### 使用方式

#### 1. 主进程初始化

```typescript
// electron/main/services/index.ts
import { RegistrySyncService } from './registry-sync'

// 创建同步服务
export const registrySync = new RegistrySyncService({
  autoSync: true, // 启用自动同步
  syncInterval: 6 * 60 * 60 * 1000, // 每 6 小时同步一次
  maxRetries: 3
})

// 应用启动时初始化
app.on('ready', async () => {
  await registrySync.syncFromRegistry() // 立即同步一次
})

// 应用退出时清理
app.on('before-quit', () => {
  registrySync.close()
})
```

#### 2. IPC 接口

```typescript
// electron/main/ipc/marketplace-ipc.ts
import { ipcMain } from 'electron'
import { registrySync } from '../services'

// 搜索服务器
ipcMain.handle('marketplace:search', async (event, query, category) => {
  return registrySync.searchServers(query, category)
})

// 手动同步
ipcMain.handle('marketplace:sync', async () => {
  return await registrySync.syncFromRegistry()
})

// 获取同步状态
ipcMain.handle('marketplace:sync-status', async () => {
  return registrySync.getSyncStatus()
})
```

#### 3. 设置页面添加同步按钮

```vue
<template>
  <div class="settings-section">
    <h3>市场数据同步</h3>
    <div class="sync-info">
      <p>上次同步: {{ syncStatus.lastSync }}</p>
      <p>服务器数量: {{ syncStatus.serverCount }}</p>
      <p>下次同步: {{ syncStatus.nextSync }}</p>
    </div>
    <Button @click="handleManualSync" :disabled="syncing">
      {{ syncing ? '同步中...' : '立即同步' }}
    </Button>
  </div>
</template>

<script setup lang="ts">
const syncing = ref(false)
const syncStatus = ref({
  lastSync: 'Loading...',
  serverCount: 0,
  nextSync: 'Loading...'
})

async function loadSyncStatus() {
  syncStatus.value = await window.electronAPI.invoke('marketplace:sync-status')
}

async function handleManualSync() {
  syncing.value = true
  try {
    const result = await window.electronAPI.invoke('marketplace:sync')
    if (result.success) {
      toast({ title: `同步成功！获取 ${result.count} 个服务器` })
      await loadSyncStatus()
    } else {
      toast({ title: '同步失败', description: result.error, variant: 'destructive' })
    }
  } finally {
    syncing.value = false
  }
}

onMounted(() => {
  loadSyncStatus()
})
</script>
```

### 优势

#### ✅ 性能优化

- **快速查询**: 本地 SQLite 查询，毫秒级响应
- **减少网络请求**: 只在定时同步时请求 API
- **支持离线**: 本地缓存，离线也能浏览

#### ✅ 用户体验

- **即时搜索**: 无需等待 API 响应
- **全文搜索**: SQLite FTS5 支持高级搜索
- **分类过滤**: 索引优化，快速筛选

#### ✅ 可维护性

- **数据一致性**: 事务保证
- **易于扩展**: 可添加更多字段和索引
- **错误恢复**: 同步失败不影响现有数据

### 开发任务清单

- [ ] 安装 `better-sqlite3` 依赖
- [ ] 创建 `RegistrySyncService` 类
- [ ] 实现数据转换逻辑
- [ ] 添加 IPC 接口
- [ ] 更新 marketplace store 使用本地数据
- [ ] 在设置页面添加同步功能
- [ ] 添加同步状态显示
- [ ] 测试完整流程
- [ ] 更新文档

### 预估工作量

- 数据库设计: 0.5 天
- 同步服务实现: 2 天
- IPC 和前端集成: 1 天
- 测试和优化: 1 天
- **总计: 4-5 天**
