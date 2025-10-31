import Database from 'better-sqlite3'
import * as path from 'path'
import { app } from 'electron'
import type { CursorRule, InstalledRule, RuleSearchOptions, RuleSearchResult } from '../types'

/**
 * Cursor Rules SQLite 数据库服务
 * 负责规则的存储、查询和管理
 */
export class RulesDatabase {
  private db: Database.Database

  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'cursor-rules.db')
    this.db = new Database(dbPath)
    this.initDatabase()
  }

  /**
   * 初始化数据库表结构
   */
  private initDatabase() {
    // 规则主表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cursor_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        description TEXT,
        description_zh TEXT,
        author TEXT,
        language TEXT,
        content TEXT NOT NULL,
        source_url TEXT,
        stars INTEGER DEFAULT 0,
        downloads INTEGER DEFAULT 0,
        last_updated TEXT,
        version TEXT DEFAULT '1.0.0',
        official INTEGER DEFAULT 0,
        license TEXT,
        scope TEXT DEFAULT 'project',
        globs TEXT,
        file_type TEXT DEFAULT 'md',
        parent_rule_id INTEGER,
        directory_path TEXT,
        original_file_name TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_rule_id) REFERENCES cursor_rules(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_rules_name ON cursor_rules(name);
      CREATE INDEX IF NOT EXISTS idx_rules_language ON cursor_rules(language);
      CREATE INDEX IF NOT EXISTS idx_rules_stars ON cursor_rules(stars DESC);
      CREATE INDEX IF NOT EXISTS idx_rules_file_type ON cursor_rules(file_type);
      CREATE INDEX IF NOT EXISTS idx_rules_parent ON cursor_rules(parent_rule_id);
      CREATE INDEX IF NOT EXISTS idx_rules_directory ON cursor_rules(directory_path);

      -- 分类表
      CREATE TABLE IF NOT EXISTS rule_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      );

      -- 规则-分类关联表
      CREATE TABLE IF NOT EXISTS rule_category_mappings (
        rule_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        PRIMARY KEY (rule_id, category_id),
        FOREIGN KEY (rule_id) REFERENCES cursor_rules(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES rule_categories(id) ON DELETE CASCADE
      );

      -- 标签表
      CREATE TABLE IF NOT EXISTS rule_tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      );

      -- 规则-标签关联表
      CREATE TABLE IF NOT EXISTS rule_tag_mappings (
        rule_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (rule_id, tag_id),
        FOREIGN KEY (rule_id) REFERENCES cursor_rules(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES rule_tags(id) ON DELETE CASCADE
      );

      -- 已安装规则表
      CREATE TABLE IF NOT EXISTS installed_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rule_id INTEGER NOT NULL,
        install_path TEXT NOT NULL,
        install_type TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        installed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (rule_id) REFERENCES cursor_rules(id) ON DELETE CASCADE
      );
    `)
  }

  /**
   * 插入或更新单个规则
   */
  upsertRule(rule: CursorRule): number {
    const stmt = this.db.prepare(`
      INSERT INTO cursor_rules (
        name, display_name, description, description_zh, author, language,
        content, source_url, stars, downloads, last_updated, version,
        official, license, scope, globs, file_type, parent_rule_id, directory_path, original_file_name, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(name) DO UPDATE SET
        display_name = excluded.display_name,
        description = excluded.description,
        description_zh = excluded.description_zh,
        content = excluded.content,
        stars = excluded.stars,
        downloads = excluded.downloads,
        last_updated = excluded.last_updated,
        version = excluded.version,
        file_type = excluded.file_type,
        parent_rule_id = excluded.parent_rule_id,
        directory_path = excluded.directory_path,
        original_file_name = excluded.original_file_name,
        updated_at = CURRENT_TIMESTAMP
    `)

    const info = stmt.run(
      rule.name,
      rule.displayName,
      rule.description,
      rule.descriptionZh || '',
      rule.author,
      rule.language,
      rule.content,
      rule.sourceUrl,
      rule.stars,
      rule.downloads,
      rule.lastUpdated,
      rule.version,
      rule.official ? 1 : 0,
      rule.license || 'MIT',
      rule.scope,
      rule.globs || '',
      rule.fileType || 'mdc',
      rule.parentRuleId || null,
      rule.directoryPath || null,
      rule.originalFileName || null
    )

    const ruleId = info.lastInsertRowid as number

    // 处理分类
    if (rule.category && rule.category.length > 0) {
      this.upsertRuleCategories(ruleId, rule.category)
    }

    // 处理标签
    if (rule.tags && rule.tags.length > 0) {
      this.upsertRuleTags(ruleId, rule.tags)
    }

    return ruleId
  }

  /**
   * 批量插入规则（使用事务）
   */
  bulkUpsertRules(rules: CursorRule[]): number {
    const transaction = this.db.transaction((rules: CursorRule[]) => {
      for (const rule of rules) {
        this.upsertRule(rule)
      }
    })

    transaction(rules)
    return rules.length
  }

  /**
   * 处理规则分类
   */
  private upsertRuleCategories(ruleId: number, categories: string[]) {
    // 删除现有关联
    this.db.prepare('DELETE FROM rule_category_mappings WHERE rule_id = ?').run(ruleId)

    for (const categoryName of categories) {
      // 插入或获取分类ID
      let categoryId = this.db
        .prepare('SELECT id FROM rule_categories WHERE name = ?')
        .get(categoryName) as { id: number } | undefined

      if (!categoryId) {
        const info = this.db
          .prepare('INSERT INTO rule_categories (name) VALUES (?)')
          .run(categoryName)
        categoryId = { id: info.lastInsertRowid as number }
      }

      // 创建关联
      this.db
        .prepare(
          'INSERT OR IGNORE INTO rule_category_mappings (rule_id, category_id) VALUES (?, ?)'
        )
        .run(ruleId, categoryId.id)
    }
  }

  /**
   * 处理规则标签
   */
  private upsertRuleTags(ruleId: number, tags: string[]) {
    // 删除现有关联
    this.db.prepare('DELETE FROM rule_tag_mappings WHERE rule_id = ?').run(ruleId)

    for (const tagName of tags) {
      // 插入或获取标签ID
      let tagId = this.db.prepare('SELECT id FROM rule_tags WHERE name = ?').get(tagName) as
        | { id: number }
        | undefined

      if (!tagId) {
        const info = this.db.prepare('INSERT INTO rule_tags (name) VALUES (?)').run(tagName)
        tagId = { id: info.lastInsertRowid as number }
      }

      // 创建关联
      this.db
        .prepare('INSERT OR IGNORE INTO rule_tag_mappings (rule_id, tag_id) VALUES (?, ?)')
        .run(ruleId, tagId.id)
    }
  }

  /**
   * 搜索规则
   */
  searchRules(options: RuleSearchOptions): RuleSearchResult {
    const {
      query = '',
      category = '',
      language = '',
      fileType = '',
      sort = 'stars',
      page = 1,
      perPage = 30
    } = options

    let sql = `SELECT DISTINCT r.* FROM cursor_rules r`
    const conditions: string[] = []
    const params: any[] = []

    // 搜索查询（简单实现，使用LIKE）
    if (query) {
      conditions.push(
        `(r.name LIKE ? OR r.display_name LIKE ? OR r.description LIKE ? OR r.content LIKE ?)`
      )
      const searchPattern = `%${query}%`
      params.push(searchPattern, searchPattern, searchPattern, searchPattern)
    }

    // 分类筛选
    if (category) {
      sql += `
        INNER JOIN rule_category_mappings rcm ON r.id = rcm.rule_id
        INNER JOIN rule_categories rc ON rcm.category_id = rc.id
      `
      conditions.push(`rc.name = ?`)
      params.push(category)
    }

    // 语言筛选
    if (language) {
      conditions.push(`r.language = ?`)
      params.push(language)
    }

    // 文件类型筛选
    if (fileType) {
      conditions.push(`r.file_type = ?`)
      params.push(fileType)
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ')
    }

    // 排序
    switch (sort) {
      case 'stars':
        sql += ` ORDER BY r.stars DESC`
        break
      case 'updated':
        sql += ` ORDER BY r.last_updated DESC`
        break
      case 'downloads':
        sql += ` ORDER BY r.downloads DESC`
        break
      case 'created':
        sql += ` ORDER BY r.created_at DESC`
        break
    }

    // 分页
    const offset = (page - 1) * perPage
    sql += ` LIMIT ? OFFSET ?`
    params.push(perPage, offset)

    // 执行查询
    const rules = this.db.prepare(sql).all(...params) as any[]

    // 查询总数
    let countSql = `SELECT COUNT(DISTINCT r.id) as total FROM cursor_rules r`
    if (category) {
      countSql += `
        INNER JOIN rule_category_mappings rcm ON r.id = rcm.rule_id
        INNER JOIN rule_categories rc ON rcm.category_id = rc.id
      `
    }
    if (conditions.length > 0) {
      countSql += ` WHERE ` + conditions.join(' AND ')
    }

    const countParams = params.slice(0, -2) // 去掉 LIMIT 和 OFFSET
    const { total } = this.db.prepare(countSql).get(...countParams) as { total: number }

    // 转换数据格式
    const items = rules.map(r => this.rowToRule(r))

    return {
      total,
      page,
      perPage,
      items
    }
  }

  /**
   * 根据ID获取规则
   */
  getRuleById(id: number): CursorRule | null {
    const rule = this.db.prepare('SELECT * FROM cursor_rules WHERE id = ?').get(id) as any

    if (!rule) return null

    return this.rowToRule(rule)
  }

  /**
   * 根据名称获取规则
   */
  getRuleByName(name: string): CursorRule | null {
    const rule = this.db.prepare('SELECT * FROM cursor_rules WHERE name = ?').get(name) as any

    if (!rule) return null

    return this.rowToRule(rule)
  }

  /**
   * 数据库行转换为 CursorRule 对象
   */
  private rowToRule(row: any): CursorRule {
    // 获取分类
    const categories = this.db
      .prepare(
        `
      SELECT rc.name 
      FROM rule_categories rc
      INNER JOIN rule_category_mappings rcm ON rc.id = rcm.category_id
      WHERE rcm.rule_id = ?
    `
      )
      .all(row.id) as { name: string }[]

    // 获取标签
    const tags = this.db
      .prepare(
        `
      SELECT rt.name 
      FROM rule_tags rt
      INNER JOIN rule_tag_mappings rtm ON rt.id = rtm.tag_id
      WHERE rtm.rule_id = ?
    `
      )
      .all(row.id) as { name: string }[]

    return {
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description || '',
      descriptionZh: row.description_zh || '',
      author: row.author || 'Community',
      language: row.language || 'General',
      category: categories.map(c => c.name),
      tags: tags.map(t => t.name),
      content: row.content,
      sourceUrl: row.source_url || '',
      stars: row.stars || 0,
      downloads: row.downloads || 0,
      lastUpdated: row.last_updated || '',
      version: row.version || '1.0.0',
      official: row.official === 1,
      license: row.license,
      scope: row.scope || 'project',
      globs: row.globs,
      fileType: row.file_type || 'mdc',
      parentRuleId: row.parent_rule_id || undefined,
      directoryPath: row.directory_path || undefined,
      originalFileName: row.original_file_name || undefined
    }
  }

  /**
   * 获取规则总数
   */
  getRulesCount(): number {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM cursor_rules').get() as {
      count: number
    }
    return result.count
  }

  /**
   * 记录已安装的规则
   */
  recordInstallation(ruleId: number, installPath: string, installType: string) {
    const stmt = this.db.prepare(`
      INSERT INTO installed_rules (rule_id, install_path, install_type)
      VALUES (?, ?, ?)
    `)
    stmt.run(ruleId, installPath, installType)
  }

  /**
   * 获取已安装的规则列表
   */
  getInstalledRules(): InstalledRule[] {
    const rows = this.db
      .prepare(
        `
      SELECT 
        ir.*,
        r.name as rule_name,
        r.display_name
      FROM installed_rules ir
      JOIN cursor_rules r ON ir.rule_id = r.id
      ORDER BY ir.installed_at DESC
    `
      )
      .all() as any[]

    return rows.map(row => ({
      id: row.id,
      ruleId: row.rule_id,
      ruleName: row.rule_name,
      displayName: row.display_name,
      installPath: row.install_path,
      installType: row.install_type,
      enabled: row.enabled === 1,
      installedAt: row.installed_at,
      lastUpdated: row.last_updated
    }))
  }

  /**
   * 删除已安装的规则
   */
  uninstallRule(installId: number) {
    this.db.prepare('DELETE FROM installed_rules WHERE id = ?').run(installId)
  }

  /**
   * 切换规则启用状态
   */
  toggleRule(installId: number, enabled: boolean) {
    this.db
      .prepare('UPDATE installed_rules SET enabled = ? WHERE id = ?')
      .run(enabled ? 1 : 0, installId)
  }

  /**
   * 清空所有规则数据并重建表结构
   */
  clearAllRules() {
    // 删除所有表（这样会自动重建包含新字段的表结构）
    this.db.exec(`
      DROP TABLE IF EXISTS rule_tag_mappings;
      DROP TABLE IF EXISTS rule_category_mappings;
      DROP TABLE IF EXISTS installed_rules;
      DROP TABLE IF EXISTS cursor_rules;
      DROP TABLE IF EXISTS rule_tags;
      DROP TABLE IF EXISTS rule_categories;
    `)
    console.log('✓ 已清空所有规则数据，重建表结构...')

    // 重新初始化表结构
    this.initDatabase()
    console.log('✓ 表结构重建完成')
  }

  /**
   * 关闭数据库
   */
  close() {
    this.db.close()
  }
}
