import * as path from 'path'
import { app } from 'electron'
import { RulesDatabase } from './rules-database'
import { RulesFileParser } from './rules-parser'
import type { CursorRule } from '../types'

/**
 * Cursor Rules 数据导入器
 * 负责从本地文件导入规则到数据库
 */
export class RulesImporter {
  private database: RulesDatabase
  private parser: RulesFileParser

  constructor() {
    this.database = new RulesDatabase()
    this.parser = new RulesFileParser()
  }

  /**
   * 从本地文件导入所有规则到数据库
   */
  async importLocalRules(): Promise<{ success: number; failed: number }> {
    console.log('开始导入本地 Cursor Rules...')

    const stats = { success: 0, failed: 0 }

    // 数据目录路径
    const dataPath = app.isPackaged
      ? path.join(process.resourcesPath, 'data')
      : path.join(app.getAppPath(), 'data')

    const rulesDirectories = [path.join(dataPath, 'rules'), path.join(dataPath, 'rules-new')]

    // 解析所有规则文件
    const allRules: CursorRule[] = []

    for (const dir of rulesDirectories) {
      try {
        console.log(`正在扫描目录: ${dir}`)
        const rules = await this.parser.parseRulesDirectory(dir)
        allRules.push(...rules)
        console.log(`✓ ${dir}: 解析 ${rules.length} 条规则`)
      } catch (error) {
        console.error(`✗ ${dir}: 扫描失败`, error)
      }
    }

    console.log(`\n共解析 ${allRules.length} 条规则，开始导入数据库...`)

    // 去重（根据 name）
    const uniqueRules = this.deduplicateRules(allRules)
    console.log(`去重后：${uniqueRules.length} 条规则`)

    // 批量导入数据库（分两步：先导入父规则，再导入子规则）
    try {
      // 第一步：导入所有 cursorrules 类型的规则和没有父规则的规则
      const parentRules = uniqueRules.filter(
        rule => rule.fileType === 'cursorrules' || !rule.sourceUrl.includes('|parent:')
      )
      
      // 先插入父规则
      for (const rule of parentRules) {
        // 清理 sourceUrl（移除临时标记）
        if (rule.sourceUrl.includes('|parent:')) {
          rule.sourceUrl = rule.sourceUrl.split('|parent:')[0]
        }
        this.database.upsertRule(rule)
      }
      
      console.log(`✓ 第一步：导入 ${parentRules.length} 条父规则`)
      
      // 输出一些示例数据用于调试
      if (parentRules.length > 0) {
        const sample = parentRules[0]
        console.log(`示例规则：`)
        console.log(`  - 名称: ${sample.displayName}`)
        console.log(`  - 语言: ${sample.language}`)
        console.log(`  - 分类: ${sample.category.join(', ')}`)
        console.log(`  - 文件类型: ${sample.fileType}`)
      }

      // 第二步：导入子规则并建立关联
      const childRules = uniqueRules.filter(rule => rule.sourceUrl.includes('|parent:'))
      
      for (const rule of childRules) {
        // 从 sourceUrl 中提取父规则名称
        const [cleanUrl, parentName] = rule.sourceUrl.split('|parent:')
        rule.sourceUrl = cleanUrl

        // 查找父规则的ID
        const parentRule = this.database.getRuleByName(parentName)
        if (parentRule) {
          rule.parentRuleId = parentRule.id
        }

        this.database.upsertRule(rule)
      }

      console.log(`✓ 第二步：导入 ${childRules.length} 条子规则`)

      const count = uniqueRules.length
      stats.success = count
      console.log(`\n✓ 成功导入 ${count} 条规则到数据库`)
    } catch (error) {
      console.error('✗ 导入数据库失败:', error)
      stats.failed = uniqueRules.length
    }

    return stats
  }

  /**
   * 去重规则（保留最新的）
   */
  private deduplicateRules(rules: CursorRule[]): CursorRule[] {
    const ruleMap = new Map<string, CursorRule>()

    for (const rule of rules) {
      const existing = ruleMap.get(rule.name)
      if (!existing || rule.lastUpdated > existing.lastUpdated) {
        ruleMap.set(rule.name, rule)
      }
    }

    return Array.from(ruleMap.values())
  }

  /**
   * 检查是否需要重新导入
   */
  async shouldReimport(): Promise<boolean> {
    // 检查数据库中的规则数量
    const dbRulesCount = this.database.getRulesCount()

    // 如果数据库为空，需要导入
    if (dbRulesCount === 0) {
      return true
    }

    // 检查最后导入时间（可以添加更多逻辑）
    return false
  }
}
