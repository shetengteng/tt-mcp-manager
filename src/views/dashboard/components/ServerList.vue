<script setup lang="ts">
// 服务器列表组件 - 展示和管理所有服务器
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useServerStore } from '@/stores/servers'
import { useToast } from '@/components/ui/toast/use-toast'
import { Plus } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TooltipProvider } from '@/components/ui/tooltip'
import ServerCard from './ServerCard.vue'

const router = useRouter()
const serverStore = useServerStore()
const { toast } = useToast()

// 操作中的服务器 ID 集合
const operatingServers = ref<Set<string>>(new Set())

// 定义 emit 事件
const emit = defineEmits<{
  openDeleteDialog: [serverId: string, serverName: string]
  openLogsDialog: [serverId: string, serverName: string]
  openTestDialog: [serverId: string, serverName: string]
  openExportDialog: [config: string]
}>()

// 获取服务器状态
function getServerStatus(serverId: string) {
  return serverStore.serverStatuses[serverId]
}

// 判断服务器是否正在运行
function isServerRunning(serverId: string) {
  const status = getServerStatus(serverId)
  return status?.status === 'running'
}

// 判断服务器是否处于错误状态
function isServerError(serverId: string) {
  const status = getServerStatus(serverId)
  return status?.status === 'error'
}

// 检查服务器是否正在操作中
function isServerOperating(serverId: string) {
  return operatingServers.value.has(serverId)
}

// 获取服务器状态文本
function getServerStatusText(serverId: string) {
  const status = getServerStatus(serverId)
  if (!status) return '未知'
  
  switch (status.status) {
    case 'running': return '运行中'
    case 'stopped': return '已停止'
    case 'error': return '错误'
    case 'restarting': return '重启中'
    default: return status.status
  }
}

// 获取状态指示器颜色
function getStatusColor(serverId: string) {
  const status = getServerStatus(serverId)
  if (!status) return 'bg-gray-300'
  
  switch (status.status) {
    case 'running': return 'bg-green-500 animate-pulse'
    case 'error': return 'bg-red-500 animate-pulse'
    case 'restarting': return 'bg-yellow-500 animate-pulse'
    default: return 'bg-gray-300'
  }
}

// 启动服务器
async function handleStartServer(serverId: string, serverName: string) {
  if (operatingServers.value.has(serverId)) {
    console.log('服务器操作中，跳过:', serverId)
    return
  }
  
  operatingServers.value.add(serverId)
  try {
    console.log('开始启动操作:', serverId)
    await new Promise(resolve => setTimeout(resolve, 200))
    
    await serverStore.startServer(serverId)
    console.log('启动操作完成:', serverId)
    
    toast({
      title: '启动成功',
      description: `${serverName} 已成功启动`,
      duration: 2000,
    })
  } catch (error: any) {
    console.error('启动操作失败:', error)
    toast({
      title: '启动失败',
      description: error.message || '启动服务器时发生错误',
      variant: 'destructive',
      duration: 3000,
    })
  } finally {
    operatingServers.value.delete(serverId)
  }
}

// 停止服务器
async function handleStopServer(serverId: string, serverName: string) {
  if (operatingServers.value.has(serverId)) {
    console.log('服务器操作中，跳过:', serverId)
    return
  }
  
  operatingServers.value.add(serverId)
  try {
    console.log('开始停止操作:', serverId)
    await serverStore.stopServer(serverId)
    console.log('停止操作完成:', serverId)
    
    await new Promise(resolve => setTimeout(resolve, 500))
    
    toast({
      title: '已停止',
      description: `${serverName} 已停止运行`,
      duration: 2000,
    })
  } catch (error: any) {
    console.error('停止操作失败:', error)
    toast({
      title: '停止失败',
      description: error.message || '停止服务器时发生错误',
      variant: 'destructive',
      duration: 3000,
    })
  } finally {
    operatingServers.value.delete(serverId)
  }
}

// 导出单个服务器配置
async function handleExportServer(serverId: string, serverName: string) {
  try {
    const config = await window.electronAPI.config.exportSingle(serverId)
    const configString = JSON.stringify(config, null, 2)
    emit('openExportDialog', configString)
  } catch (error: any) {
    toast({
      title: '导出失败',
      description: error.message || `导出 ${serverName} 配置时发生错误`,
      variant: 'destructive',
      duration: 3000,
    })
  }
}

// 同步单个服务器到 Cursor
async function handleSyncServer(serverId: string, serverName: string) {
  try {
    const result = await window.electronAPI.config.syncSingleToCursor(serverId)
    
    if (result.success) {
      toast({
        title: '🎉 同步成功',
        description: `${serverName} 已同步到 Cursor，请重启 Cursor 以加载新配置`,
        duration: 3000,
      })
    } else {
      toast({
        title: '❌ 同步失败',
        description: result.message,
        variant: 'destructive',
        duration: 3000,
      })
    }
  } catch (error: any) {
    toast({
      title: '同步失败',
      description: error.message || `同步 ${serverName} 到 Cursor 时发生错误`,
      variant: 'destructive',
      duration: 3000,
    })
  }
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>
        服务器列表
      </CardTitle>
      <CardDescription>
        管理您的 MCP 服务器
      </CardDescription>
    </CardHeader>
    <CardContent>
      <!-- 加载中 -->
      <div
        v-if="serverStore.loading"
        class="text-center py-8"
      >
        <div class="text-muted-foreground">
          加载中...
        </div>
      </div>

      <!-- 空状态 -->
      <div
        v-else-if="serverStore.servers.length === 0"
        class="flex flex-col items-center justify-center py-12"
      >
        <p class="text-muted-foreground mb-4">
          还没有配置任何服务器
        </p>
        <Button @click="router.push('/templates')">
          <Plus class="h-4 w-4 mr-2" />
          创建第一个服务器
        </Button>
      </div>

      <!-- 服务器列表 -->
      <div
        v-else
        class="space-y-3"
      >
        <TooltipProvider :delay-duration="200">
          <ServerCard
            v-for="server in serverStore.servers"
            :key="server.id"
            :server="server"
            :is-running="isServerRunning(server.id)"
            :is-error="isServerError(server.id)"
            :is-operating="isServerOperating(server.id)"
            :status-color="getStatusColor(server.id)"
            :status-text="getServerStatusText(server.id)"
            @click="serverStore.selectServer(server.id)"
            @start="handleStartServer(server.id, server.name)"
            @stop="handleStopServer(server.id, server.name)"
            @view-logs="emit('openLogsDialog', server.id, server.name)"
            @test="emit('openTestDialog', server.id, server.name)"
            @export="handleExportServer(server.id, server.name)"
            @sync="handleSyncServer(server.id, server.name)"
            @delete="emit('openDeleteDialog', server.id, server.name)"
          />
        </TooltipProvider>
      </div>
    </CardContent>
  </Card>
</template>
