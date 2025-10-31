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

    // 写入规则文件并获取实际文件路径
    const actualFilePath = await this.writeRuleFile(
      installPath,
      config.installType,
      rule.content,
      rule.originalFileName
    )

    // 记录安装信息
    this.database.recordInstallation(ruleId, actualFilePath, config.installType)

    console.log(`✓ 规则 "${rule.displayName}" 已安装到: ${actualFilePath}`)
  }

  /**
   * 解析安装路径
   */
  private resolveInstallPath(targetPath: string, installType: string): string {
    // 根据安装类型处理路径
    switch (installType) {
      case 'project':
        // 项目级别：在目标路径下创建 .cursorrules 文件
        return path.join(targetPath, '.cursorrules')
      case 'workspace':
        // 工作区级别：在 .cursor/rules/ 目录下
        return path.join(targetPath, '.cursor', 'rules')
      case 'global':
        // 全局级别：用户主目录
        const homeDir = process.env.HOME || process.env.USERPROFILE || '~'
        return path.join(homeDir, '.cursor', 'rules')
      default:
        throw new Error(`未知的安装类型: ${installType}`)
    }
  }

  /**
   * 写入规则文件
   * @returns 返回实际写入的文件路径
   */
  private async writeRuleFile(
    installPath: string,
    installType: string,
    content: string,
    originalFileName?: string
  ): Promise<string> {
    if (installType === 'project') {
      // 项目级别：直接写入 .cursorrules 文件
      await fs.writeFile(installPath, content, 'utf-8')
      return installPath
    } else {
      // 工作区/全局级别：写入 .cursor/rules/ 目录
      await fs.mkdir(installPath, { recursive: true })
      
      // 使用原始文件名，如果没有则使用默认名称
      const fileName = originalFileName || `rule-${Date.now()}.md`
      const filePath = path.join(installPath, fileName)
      await fs.writeFile(filePath, content, 'utf-8')
      return filePath
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
