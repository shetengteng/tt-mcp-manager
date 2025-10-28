/**
 * Electron API 类型定义
 * 定义渲染进程可以访问的所有 API
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

export interface LogEntry {
  timestamp: Date
  serverId: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  source: 'stdout' | 'stderr' | 'system'
}

export interface LogQueryOptions {
  level?: 'info' | 'warn' | 'error' | 'debug'
  limit?: number
  offset?: number
  search?: string
}

export interface SearchOptions {
  query?: string
  category?: string
  language?: string
  sort: 'stars' | 'updated' | 'created'
  page: number
  perPage: number
}

export interface MarketItem {
  id: number
  name: string
  displayName: string
  fullName?: string
  description: string
  descriptionZh?: string // 中文描述
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

export interface ElectronAPI {
  server: {
    getAll: () => Promise<ServerConfig[]>
    get: (id: string) => Promise<ServerConfig | null>
    create: (config: ServerConfig) => Promise<ServerConfig>
    update: (id: string, config: Partial<ServerConfig>) => Promise<ServerConfig>
    delete: (id: string) => Promise<{ success: boolean }>
    start: (id: string) => Promise<{ success: boolean; error?: string }>
    stop: (id: string) => Promise<{ success: boolean }>
    restart: (id: string) => Promise<{ success: boolean }>
    getStatus: (id: string) => Promise<{ status: string; uptime?: number }>
    test: (id: string) => Promise<{
      success: boolean
      capabilities?: {
        tools?: string[]
        resources?: string[]
        prompts?: string[]
      }
      error?: string
    }>
  }

  log: {
    get: (serverId: string, options?: LogQueryOptions) => Promise<LogEntry[]>
    clear: (serverId: string) => Promise<{ success: boolean }>
    export: (serverId: string, filePath: string) => Promise<{ success: boolean }>
    search: (serverId: string, query: string) => Promise<LogEntry[]>
    onLog: (callback: (data: LogEntry) => void) => () => void
  }

  marketplace: {
    search: (options: SearchOptions) => Promise<{
      total: number
      page: number
      perPage: number
      items: MarketItem[]
    }>
    getDetails: (repoFullName: string) => Promise<any>
    getReadme: (repoFullName: string) => Promise<string>
    install: (item: MarketItem, config: any) => Promise<{ success: boolean; serverId?: string; error?: string }>
  }

  template: {
    getAll: () => Promise<any[]>
    get: (templateId: string) => Promise<any>
    createServer: (templateId: string, config: any) => Promise<ServerConfig>
  }

  config: {
    exportSingle: (serverId: string) => Promise<any>
    export: () => Promise<any>
    exportToFile: (filePath: string) => Promise<{ success: boolean }>
    import: (filePath: string) => Promise<{ success: boolean }>
    syncSingleToCursor: (serverId: string) => Promise<{ success: boolean; message: string }>
    syncToCursor: () => Promise<{ success: boolean; message: string }>
  }

  settings: {
    get: () => Promise<any>
    update: (settings: any) => Promise<{ success: boolean }>
    selectFolder: () => Promise<{ success: boolean; path?: string; canceled?: boolean }>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

