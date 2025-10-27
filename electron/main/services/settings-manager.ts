import { app } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'

/**
 * 应用设置接口
 */
export interface AppSettings {
  autoStart: boolean
  minimizeToTray: boolean
  keepBackground: boolean
  defaultInstallPath: string
  githubToken: string
}

/**
 * 默认设置
 */
const DEFAULT_SETTINGS: AppSettings = {
  autoStart: false,
  minimizeToTray: true,
  keepBackground: true,
  defaultInstallPath: '~/mcp-servers',
  githubToken: ''
}

/**
 * 设置管理器
 * 负责保存和加载应用设置
 */
export class SettingsManager {
  private settingsPath: string
  private settings: AppSettings

  constructor() {
    const userDataPath = app.getPath('userData')
    this.settingsPath = path.join(userDataPath, 'settings.json')
    this.settings = { ...DEFAULT_SETTINGS }
  }

  /**
   * 初始化设置管理器
   */
  async initialize(): Promise<void> {
    try {
      await this.load()
      console.log('✓ 设置管理器初始化完成')
    } catch (error) {
      console.error('初始化设置管理器失败:', error)
      // 使用默认设置
      this.settings = { ...DEFAULT_SETTINGS }
      await this.save()
    }
  }

  /**
   * 获取所有设置
   */
  getSettings(): AppSettings {
    return { ...this.settings }
  }

  /**
   * 更新设置
   */
  async updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
    this.settings = {
      ...this.settings,
      ...updates
    }
    await this.save()
    return this.getSettings()
  }

  /**
   * 重置为默认设置
   */
  async resetSettings(): Promise<AppSettings> {
    this.settings = { ...DEFAULT_SETTINGS }
    await this.save()
    return this.getSettings()
  }

  /**
   * 加载设置
   */
  private async load(): Promise<void> {
    try {
      const data = await fs.readFile(this.settingsPath, 'utf-8')
      const loaded = JSON.parse(data)
      this.settings = {
        ...DEFAULT_SETTINGS,
        ...loaded
      }
      console.log('设置已加载:', this.settingsPath)
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // 文件不存在，使用默认设置
        console.log('设置文件不存在，使用默认设置')
        this.settings = { ...DEFAULT_SETTINGS }
        await this.save()
      } else {
        throw error
      }
    }
  }

  /**
   * 保存设置
   */
  private async save(): Promise<void> {
    try {
      const dir = path.dirname(this.settingsPath)
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(
        this.settingsPath,
        JSON.stringify(this.settings, null, 2),
        'utf-8'
      )
      console.log('设置已保存:', this.settingsPath)
    } catch (error) {
      console.error('保存设置失败:', error)
      throw error
    }
  }
}

