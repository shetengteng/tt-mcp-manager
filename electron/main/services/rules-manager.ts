import * as fs from 'fs/promises'
import * as path from 'path'
import { RulesDatabase } from './rules-database'
import type { RuleInstallConfig } from '../types'

/**
 * Cursor Rules 管理器
 * 负责规则的安装、卸载和启用/禁用
 */
export class RulesManager {
  private database: RulesDatabase

  constructor() {
    this.database = new RulesDatabase()
  }

  /**
   * 安装规则
   */
  async installRule(ruleId: number, config: RuleInstallConfig): Promise<void> {
    // 获取规则内容
    const rule = this.database.getRuleById(ruleId)
    if (!rule) {
      throw new Error(`规则 ${ruleId} 不存在`)
    }

    // 确定安装路径
    const installPath = this.resolveInstallPath(config.targetPath, config.installType)

    // 写入规则文件
    await this.writeRuleFile(installPath, config.installType, rule.content)

    // 记录安装信息
    this.database.recordInstallation(ruleId, installPath, config.installType)

    console.log(`✓ 规则 "${rule.displayName}" 已安装到: ${installPath}`)
  }

  /**
   * 解析安装路径
   */
  private resolveInstallPath(targetPath: string, installType: string): string {
    // 如果是绝对路径，直接使用
    if (path.isAbsolute(targetPath)) {
      return targetPath
    }

    // 否则，根据安装类型处理
    switch (installType) {
      case 'project':
        // 项目级别：在目标路径下创建 .cursorrules 文件
        return path.join(targetPath, '.cursorrules')
      case 'workspace':
        // 工作区级别：在 .cursor/rules/ 目录下
        return path.join(targetPath, '.cursor', 'rules')
      case 'global':
        // 全局级别：用户主目录
        return path.join(process.env.HOME || process.env.USERPROFILE || '~', '.cursor', 'rules')
      default:
        throw new Error(`未知的安装类型: ${installType}`)
    }
  }

  /**
   * 写入规则文件
   */
  private async writeRuleFile(
    installPath: string,
    installType: string,
    content: string
  ): Promise<void> {
    if (installType === 'project') {
      // 项目级别：直接写入 .cursorrules 文件
      await fs.writeFile(installPath, content, 'utf-8')
    } else {
      // 工作区/全局级别：写入 .cursor/rules/ 目录
      await fs.mkdir(installPath, { recursive: true })
      const fileName = `rule-${Date.now()}.md`
      await fs.writeFile(path.join(installPath, fileName), content, 'utf-8')
    }
  }

  /**
   * 卸载规则
   */
  async uninstallRule(installId: number): Promise<void> {
    const installed = this.database.getInstalledRules().find(r => r.id === installId)
    if (!installed) {
      throw new Error(`未找到安装记录: ${installId}`)
    }

    // 删除规则文件
    try {
      await fs.unlink(installed.installPath)
      console.log(`✓ 已删除规则文件: ${installed.installPath}`)
    } catch (error) {
      console.warn(`无法删除规则文件: ${installed.installPath}`, error)
    }

    // 删除安装记录
    this.database.uninstallRule(installId)
  }

  /**
   * 切换规则启用状态
   */
  async toggleRule(installId: number, enabled: boolean): Promise<void> {
    this.database.toggleRule(installId, enabled)
    console.log(`✓ 规则 ${installId} 已${enabled ? '启用' : '禁用'}`)
  }
}
