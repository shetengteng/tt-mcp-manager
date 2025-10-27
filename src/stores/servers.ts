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

  // 计算属性
  const selectedServer = computed(() => {
    if (!selectedServerId.value) return null
    return servers.value.find(s => s.id === selectedServerId.value)
  })

  const runningServers = computed(() => {
    return servers.value.filter(s => {
      // 这里需要从状态中获取，暂时返回空
      return false
    })
  })

  // 操作
  async function loadServers() {
    loading.value = true
    try {
      const result = await window.electronAPI.server.getAll()
      servers.value = result
    } catch (error) {
      console.error('加载服务器列表失败:', error)
    } finally {
      loading.value = false
    }
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
    } catch (error) {
      console.error('启动服务器失败:', error)
      throw error
    }
  }

  async function stopServer(id: string) {
    try {
      await window.electronAPI.server.stop(id)
    } catch (error) {
      console.error('停止服务器失败:', error)
      throw error
    }
  }

  async function restartServer(id: string) {
    try {
      await window.electronAPI.server.restart(id)
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
    // 计算属性
    selectedServer,
    runningServers,
    // 操作
    loadServers,
    createServer,
    updateServer,
    deleteServer,
    startServer,
    stopServer,
    restartServer,
    selectServer
  }
})

