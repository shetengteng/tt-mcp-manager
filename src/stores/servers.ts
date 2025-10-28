import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ServerConfig } from '@/types/electron'

/**
 * 服务器状态管理
 */
export const useServerStore = defineStore('servers', () => {
  // 状态
  const servers = ref<ServerConfig[]>([])
  const selectedServerId = ref<string | null>(null)
  const loading = ref(false)
  const serverStatuses = ref<Record<string, { status: string; uptime?: number; pid?: number }>>({})

  // 计算属性
  const selectedServer = computed(() => {
    if (!selectedServerId.value) return null
    return servers.value.find(s => s.id === selectedServerId.value)
  })

  const runningServers = computed(() => {
    return servers.value.filter(s => {
      const status = serverStatuses.value[s.id]
      return status?.status === 'running'
    })
  })

  // 操作
  async function loadServers() {
    loading.value = true
    try {
      const result = await window.electronAPI.server.getAll()
      servers.value = result
      // 加载每个服务器的状态
      await refreshStatuses()
    } catch (error) {
      console.error('加载服务器列表失败:', error)
    } finally {
      loading.value = false
    }
  }

  // 刷新所有服务器状态
  async function refreshStatuses() {
    const newStatuses: Record<string, { status: string; uptime?: number; pid?: number }> = {}
    for (const server of servers.value) {
      try {
        const status = await window.electronAPI.server.getStatus(server.id)
        newStatuses[server.id] = status
      } catch (error) {
        console.error(`获取服务器状态失败 [${server.id}]:`, error)
      }
    }
    // 一次性更新所有状态以触发响应式更新
    serverStatuses.value = newStatuses
  }

  async function createServer(config: ServerConfig) {
    try {
      const server = await window.electronAPI.server.create(config)
      servers.value.push(server)
      return server
    } catch (error) {
      console.error('创建服务器失败:', error)
      throw error
    }
  }

  async function updateServer(id: string, updates: Partial<ServerConfig>) {
    try {
      const updated = await window.electronAPI.server.update(id, updates)
      const index = servers.value.findIndex(s => s.id === id)
      if (index !== -1) {
        servers.value[index] = updated
      }
      return updated
    } catch (error) {
      console.error('更新服务器失败:', error)
      throw error
    }
  }

  async function deleteServer(id: string) {
    try {
      await window.electronAPI.server.delete(id)
      servers.value = servers.value.filter(s => s.id !== id)
    } catch (error) {
      console.error('删除服务器失败:', error)
      throw error
    }
  }

  async function startServer(id: string) {
    try {
      const result = await window.electronAPI.server.start(id)
      
      if (!result.success) {
        throw new Error(result.error)
      }
      
      // 更新状态 - 创建新对象以触发响应式更新
      const status = await window.electronAPI.server.getStatus(id)
      
      serverStatuses.value = {
        ...serverStatuses.value,
        [id]: status
      }
    } catch (error) {
      console.error('启动服务器失败:', error)
      throw error
    }
  }

  async function stopServer(id: string) {
    try {
      console.log('[Store] 调用停止 API:', id)
      const result = await window.electronAPI.server.stop(id)
      console.log('[Store] 停止 API 返回:', result)
      
      // 更新状态 - 创建新对象以触发响应式更新
      const status = await window.electronAPI.server.getStatus(id)
      console.log('[Store] 停止后获取状态:', status)
      
      serverStatuses.value = {
        ...serverStatuses.value,
        [id]: status
      }
      console.log('[Store] 停止后更新状态完成')
    } catch (error) {
      console.error('[Store] 停止服务器失败:', error)
      throw error
    }
  }

  async function restartServer(id: string) {
    try {
      await window.electronAPI.server.restart(id)
      // 更新状态 - 创建新对象以触发响应式更新
      const status = await window.electronAPI.server.getStatus(id)
      serverStatuses.value = {
        ...serverStatuses.value,
        [id]: status
      }
    } catch (error) {
      console.error('重启服务器失败:', error)
      throw error
    }
  }

  function selectServer(id: string | null) {
    selectedServerId.value = id
  }

  return {
    // 状态
    servers,
    selectedServerId,
    loading,
    serverStatuses,
    // 计算属性
    selectedServer,
    runningServers,
    // 操作
    loadServers,
    refreshStatuses,
    createServer,
    updateServer,
    deleteServer,
    startServer,
    stopServer,
    restartServer,
    selectServer
  }
})

