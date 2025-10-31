import { contextBridge, ipcRenderer } from 'electron'
import type { ServerConfig, LogQueryOptions, SearchOptions } from '../main/types'

/**
 * 暴露安全的 API 到渲染进程
 * 使用 contextBridge 确保主进程和渲染进程之间的安全通信
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // 服务器管理
  server: {
    getAll: () => ipcRenderer.invoke('server:getAll'),
    get: (id: string) => ipcRenderer.invoke('server:get', id),
    create: (config: ServerConfig) => ipcRenderer.invoke('server:create', config),
    update: (id: string, config: Partial<ServerConfig>) =>
      ipcRenderer.invoke('server:update', id, config),
    delete: (id: string) => ipcRenderer.invoke('server:delete', id),
    start: (id: string) => ipcRenderer.invoke('server:start', id),
    stop: (id: string) => ipcRenderer.invoke('server:stop', id),
    restart: (id: string) => ipcRenderer.invoke('server:restart', id),
    getStatus: (id: string) => ipcRenderer.invoke('server:getStatus', id),
    test: (id: string) => ipcRenderer.invoke('server:test', id)
  },

  // 日志管理
  log: {
    get: (serverId: string, options?: LogQueryOptions) =>
      ipcRenderer.invoke('log:get', serverId, options),
    clear: (serverId: string) => ipcRenderer.invoke('log:clear', serverId),
    export: (serverId: string, filePath: string) =>
      ipcRenderer.invoke('log:export', serverId, filePath),
    search: (serverId: string, query: string) => ipcRenderer.invoke('log:search', serverId, query),
    // 订阅日志更新
    onLog: (callback: (data: any) => void) => {
      const subscription = (_: any, data: any) => callback(data)
      ipcRenderer.on('log:new', subscription)
      return () => ipcRenderer.removeListener('log:new', subscription)
    }
  },

  // 市场功能
  marketplace: {
    search: (options: SearchOptions) => ipcRenderer.invoke('marketplace:search', options),
    getDetails: (repoFullName: string) =>
      ipcRenderer.invoke('marketplace:getDetails', repoFullName),
    getReadme: (repoFullName: string) => ipcRenderer.invoke('marketplace:getReadme', repoFullName),
    install: (item: any, config: any) => ipcRenderer.invoke('marketplace:install', item, config)
  },

  // 模板管理
  template: {
    getAll: () => ipcRenderer.invoke('template:getAll'),
    get: (templateId: string) => ipcRenderer.invoke('template:get', templateId),
    createServer: (templateId: string, config: any) =>
      ipcRenderer.invoke('template:createServer', templateId, config)
  },

  // 配置管理
  config: {
    exportSingle: (serverId: string) => ipcRenderer.invoke('config:exportSingle', serverId),
    export: () => ipcRenderer.invoke('config:export'),
    exportToFile: (filePath: string) => ipcRenderer.invoke('config:exportToFile', filePath),
    import: (filePath: string) => ipcRenderer.invoke('config:import', filePath),
    syncSingleToCursor: (serverId: string) =>
      ipcRenderer.invoke('config:syncSingleToCursor', serverId),
    syncToCursor: () => ipcRenderer.invoke('config:syncToCursor')
  },

  // 应用设置
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (settings: any) => ipcRenderer.invoke('settings:update', settings),
    selectFolder: () => ipcRenderer.invoke('settings:selectFolder')
  },

  // Cursor Rules 管理
  rules: {
    search: (options: any) => ipcRenderer.invoke('rules:search', options),
    getById: (id: number) => ipcRenderer.invoke('rules:getById', id),
    install: (ruleId: number, config: any) => ipcRenderer.invoke('rules:install', ruleId, config),
    uninstall: (installId: number) => ipcRenderer.invoke('rules:uninstall', installId),
    toggle: (installId: number, enabled: boolean) =>
      ipcRenderer.invoke('rules:toggle', installId, enabled),
    getInstalled: () => ipcRenderer.invoke('rules:getInstalled'),
    importLocalRules: () => ipcRenderer.invoke('rules:importLocalRules'),
    reimportAll: () => ipcRenderer.invoke('rules:reimportAll')
  }
})
