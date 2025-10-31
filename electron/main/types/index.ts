import { ChildProcess } from 'child_process'

/**
 * 服务器配置
 */
export interface ServerConfig {
  id: string
  name: string
  type: 'npm' | 'python' | 'git'
  command: string
  args: string[]
  env: Record<string, string>
  workingDirectory?: string
  autoStart: boolean
  autoRestart: boolean
  maxRestarts: number
}

/**
 * 服务器状态
 */
export type ServerStatus = 'running' | 'stopped' | 'error' | 'restarting'

/**
 * MCP 服务器进程
 */
export interface MCPServerProcess {
  id: string
  config: ServerConfig
  process: ChildProcess
  status: ServerStatus
  startTime: Date
  restartCount: number
  pid?: number
}

/**
 * 日志级别
 */
export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

/**
 * 日志来源
 */
export type LogSource = 'stdout' | 'stderr' | 'system'

/**
 * 日志条目
 */
export interface LogEntry {
  timestamp: Date
  serverId: string
  level: LogLevel
  message: string
  source: LogSource
}

/**
 * 日志查询选项
 */
export interface LogQueryOptions {
  level?: LogLevel
  limit?: number
  offset?: number
  search?: string
}

/**
 * 市场搜索选项
 */
export interface SearchOptions {
  query?: string
  category?: string
  language?: string
  sort: 'stars' | 'updated' | 'created'
  page: number
  perPage: number
}

/**
 * 市场项目
 */
export interface MarketItem {
  id: number
  name: string
  displayName: string
  fullName?: string
  description: string
  stars: number
  forks?: number
  language: string
  topics: string[]
  githubUrl: string
  homepage?: string
  license?: string
  createdAt?: string
  updatedAt?: string
  npmPackage?: string
  pythonPackage?: string
  downloadCount?: number
  category: string[]
  installType?: 'npm' | 'python' | 'git'
  installCommand: string
  author: string
  official: boolean
}

/**
 * 搜索结果
 */
export interface SearchResult {
  total: number
  page: number
  perPage: number
  items: MarketItem[]
}

/**
 * 模板配置
 */
export interface TemplateConfig {
  id: string
  name: string
  description: string
  icon: string
  category: string
  tags: string[]
  popularity: number
  difficulty: 'simple' | 'medium' | 'hard'
  install: {
    type: 'npm' | 'python' | 'git'
    package: string
    version?: string
    command: string
  }
  config: {
    command: string
    args: string[]
    env: Record<string, string>
    autoStart: boolean
    autoRestart: boolean
    maxRestarts: number
  }
  requiredConfig: ConfigField[]
  features: string[]
  security?: {
    warning: string
    recommendations: string[]
  }
}

/**
 * 配置字段
 */
export interface ConfigField {
  key: string
  label: string
  type: 'text' | 'password' | 'directory' | 'file' | 'number' | 'select' | 'checkbox' | 'textarea'
  required: boolean
  description?: string
  defaultValue?: string
  placeholder?: string
  validation?: ValidationRule
}

/**
 * 验证规则
 */
export interface ValidationRule {
  mustExist?: boolean
  mustBeAbsolute?: boolean
  mustBeDirectory?: boolean
  mustBeFile?: boolean
  mustContain?: string[]
  minLength?: number
  maxLength?: number
  pattern?: string
  min?: number
  max?: number
}

/**
 * 配置验证结果
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Cursor 配置格式
 */
export interface CursorConfig {
  mcpServers: Record<
    string,
    {
      command: string
      args: string[]
      env?: Record<string, string>
    }
  >
}

/**
 * Cursor Rule 规则
 */
export interface CursorRule {
  id: number
  name: string
  displayName: string
  description: string
  descriptionZh?: string
  author: string
  language: string
  category: string[]
  tags: string[]
  content: string
  sourceUrl: string
  stars: number
  downloads: number
  lastUpdated: string
  version: string
  official: boolean
  license?: string
  scope: 'project' | 'workspace' | 'global'
  globs?: string
  createdAt?: string
  updatedAt?: string
}

/**
 * Rule 搜索选项
 */
export interface RuleSearchOptions {
  query?: string
  category?: string
  language?: string
  sort: 'stars' | 'updated' | 'downloads' | 'created'
  page: number
  perPage: number
}

/**
 * Rule 搜索结果
 */
export interface RuleSearchResult {
  total: number
  page: number
  perPage: number
  items: CursorRule[]
}

/**
 * 已安装的 Rule
 */
export interface InstalledRule {
  id: number
  ruleId: number
  ruleName: string
  displayName: string
  installPath: string
  installType: 'project' | 'workspace' | 'global'
  enabled: boolean
  installedAt: string
  lastUpdated?: string
}

/**
 * Rule 安装配置
 */
export interface RuleInstallConfig {
  ruleId: number
  targetPath: string
  installType: 'project' | 'workspace' | 'global'
  enabled: boolean
}

/**
 * Rule 前端数据
 */
export interface RuleFrontmatter {
  description?: string
  globs?: string
  tags?: string[]
  category?: string[]
  language?: string
  author?: string
  version?: string
  license?: string
}
