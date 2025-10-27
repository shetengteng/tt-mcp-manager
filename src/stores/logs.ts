import { defineStore } from 'pinia'
import { ref, onUnmounted } from 'vue'
import type { LogEntry } from '@/types/electron'

/**
 * 日志状态管理
 */
export const useLogStore = defineStore('logs', () => {
  // 状态
  const logs = ref<Map<string, LogEntry[]>>(new Map())
  const loading = ref(false)

  // 日志订阅取消函数
  let unsubscribe: (() => void) | null = null

  // 操作
  async function loadLogs(serverId: string, options?: any) {
    loading.value = true
    try {
      const entries = await window.electronAPI.log.get(serverId, options)
      logs.value.set(serverId, entries)
    } catch (error) {
      console.error('加载日志失败:', error)
    } finally {
      loading.value = false
    }
  }

  async function clearLogs(serverId: string) {
    try {
      await window.electronAPI.log.clear(serverId)
      logs.value.delete(serverId)
    } catch (error) {
      console.error('清空日志失败:', error)
      throw error
    }
  }

  async function exportLogs(serverId: string, filePath: string) {
    try {
      await window.electronAPI.log.export(serverId, filePath)
    } catch (error) {
      console.error('导出日志失败:', error)
      throw error
    }
  }

  async function searchLogs(serverId: string, query: string) {
    try {
      const entries = await window.electronAPI.log.search(serverId, query)
      logs.value.set(serverId, entries)
    } catch (error) {
      console.error('搜索日志失败:', error)
      throw error
    }
  }

  function subscribeToLogs() {
    // 订阅日志更新
    unsubscribe = window.electronAPI.log.onLog((logEntry: LogEntry) => {
      const serverLogs = logs.value.get(logEntry.serverId) || []
      serverLogs.push(logEntry)
      logs.value.set(logEntry.serverId, serverLogs)
    })
  }

  function unsubscribeFromLogs() {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  }

  function getServerLogs(serverId: string): LogEntry[] {
    return logs.value.get(serverId) || []
  }

  // 清理
  onUnmounted(() => {
    unsubscribeFromLogs()
  })

  return {
    // 状态
    logs,
    loading,
    // 操作
    loadLogs,
    clearLogs,
    exportLogs,
    searchLogs,
    subscribeToLogs,
    unsubscribeFromLogs,
    getServerLogs
  }
})

