<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useServerStore } from '@/stores/servers'
import { useLogStore } from '@/stores/logs'
import { useToast } from '@/components/ui/toast/use-toast'
import { ShoppingBag, Play, Pause, Plus, Trash2, Terminal, ExternalLink, Download } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'

const router = useRouter()

// 使用 stores
const serverStore = useServerStore()
const logStore = useLogStore()
const { toast } = useToast()

// 删除确认对话框
const showDeleteDialog = ref(false)
const serverToDelete = ref<string | null>(null)
const serverToDeleteName = ref('')

// 日志查看对话框
const showLogsDialog = ref(false)
const currentServerLogs = ref<string | null>(null)
const currentServerLogsName = ref('')

// 加载数据
onMounted(async () => {
  await serverStore.loadServers()
  logStore.subscribeToLogs()
})

// 打开删除确认对话框
function openDeleteDialog(serverId: string, serverName: string) {
  serverToDelete.value = serverId
  serverToDeleteName.value = serverName
  showDeleteDialog.value = true
}

// 确认删除
async function confirmDelete() {
  if (!serverToDelete.value) return
  
  try {
    await serverStore.deleteServer(serverToDelete.value)
    showDeleteDialog.value = false
    toast({
      title: '删除成功',
      description: `已成功删除服务器: ${serverToDeleteName.value}`,
    })
    serverToDelete.value = null
    serverToDeleteName.value = ''
  } catch (error: any) {
    toast({
      title: '删除失败',
      description: error.message || '删除服务器时发生错误',
      variant: 'destructive',
    })
  }
}

// 启动服务器并显示反馈
async function handleStartServer(serverId: string, serverName: string) {
  try {
    await serverStore.startServer(serverId)
    toast({
      title: '启动成功',
      description: `${serverName} 已成功启动`,
    })
  } catch (error: any) {
    toast({
      title: '启动失败',
      description: error.message || '启动服务器时发生错误',
      variant: 'destructive',
    })
  }
}

// 停止服务器并显示反馈
async function handleStopServer(serverId: string, serverName: string) {
  try {
    await serverStore.stopServer(serverId)
    toast({
      title: '已停止',
      description: `${serverName} 已停止运行`,
    })
  } catch (error: any) {
    toast({
      title: '停止失败',
      description: error.message || '停止服务器时发生错误',
      variant: 'destructive',
    })
  }
}

// 获取服务器状态
function getServerStatus(serverId: string) {
  return serverStore.serverStatuses[serverId]
}

// 判断服务器是否正在运行
function isServerRunning(serverId: string) {
  const status = getServerStatus(serverId)
  return status?.status === 'running'
}

// 查看服务器日志
async function viewServerLogs(serverId: string, serverName: string) {
  try {
    currentServerLogs.value = serverId
    currentServerLogsName.value = serverName
    showLogsDialog.value = true
    
    // 加载日志
    await logStore.loadLogs(serverId)
  } catch (error: any) {
    toast({
      title: '加载日志失败',
      description: error.message || '无法加载服务器日志',
      variant: 'destructive',
    })
  }
}

// 获取格式化的日志文本
function getFormattedLogs(serverId: string) {
  const logs = logStore.logs[serverId] || []
  if (logs.length === 0) {
    return '暂无日志输出'
  }
  return logs.map(log => {
    const time = new Date(log.timestamp).toLocaleTimeString()
    const level = log.level.toUpperCase().padEnd(5)
    return `[${time}] [${level}] ${log.message}`
  }).join('\n')
}

// 导出 Cursor 配置
async function exportCursorConfig() {
  try {
    const config = await window.electronAPI.config.exportForCursor()
    
    // 创建 JSON 字符串
    const json = JSON.stringify(config, null, 2)
    
    // 复制到剪贴板
    await navigator.clipboard.writeText(json)
    
    toast({
      title: '配置已复制',
      description: '已将 Cursor 配置复制到剪贴板，请粘贴到 Cursor 设置中',
    })
  } catch (error: any) {
    toast({
      title: '导出失败',
      description: error.message || '导出配置时发生错误',
      variant: 'destructive',
    })
  }
}
</script>

<template>
  <div class="flex flex-col">
    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">服务器总数</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ serverStore.servers.length }}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">运行中</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold text-green-600">{{ serverStore.runningServers.length }}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">已停止</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold text-gray-500">
            {{ serverStore.servers.length - serverStore.runningServers.length }}
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- 快速操作 -->
    <Card class="mb-6">
      <CardHeader>
        <CardTitle>快速操作</CardTitle>
        <CardDescription>快速开始使用 MCP Manager</CardDescription>
      </CardHeader>
      <CardContent class="flex gap-4">
        <Button @click="router.push('/templates')">
          <Plus class="h-4 w-4 mr-2" />
          从模板创建
        </Button>
        <Button variant="secondary" @click="router.push('/marketplace')">
          <ShoppingBag class="h-4 w-4 mr-2" />
          浏览市场
        </Button>
      </CardContent>
    </Card>

    <!-- 服务器列表 -->
    <Card>
      <CardHeader>
        <CardTitle>服务器列表</CardTitle>
        <CardDescription>管理您的 MCP 服务器</CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="serverStore.loading" class="text-center py-8">
          <div class="text-muted-foreground">加载中...</div>
        </div>

        <div
          v-else-if="serverStore.servers.length === 0"
          class="flex flex-col items-center justify-center py-12"
        >
          <p class="text-muted-foreground mb-4">还没有配置任何服务器</p>
          <Button @click="router.push('/templates')">
            <Plus class="h-4 w-4 mr-2" />
            创建第一个服务器
          </Button>
        </div>

        <div v-else class="space-y-3">
          <Card
            v-for="server in serverStore.servers"
            :key="server.id"
            class="hover:border-primary cursor-pointer transition-colors"
            @click="serverStore.selectServer(server.id)"
          >
            <CardContent class="p-4">
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <!-- 运行状态指示器 -->
                    <div 
                      class="w-2 h-2 rounded-full"
                      :class="isServerRunning(server.id) ? 'bg-green-500 animate-pulse' : 'bg-gray-300'"
                    ></div>
                    <h4 class="font-medium">{{ server.name }}</h4>
                    <Badge>{{ server.type }}</Badge>
                    <Badge v-if="isServerRunning(server.id)" variant="default" class="text-xs">运行中</Badge>
                  </div>
                  <p class="text-sm text-muted-foreground">{{ server.command }}</p>
                </div>
                <div class="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    :disabled="isServerRunning(server.id)"
                    @click.stop="handleStartServer(server.id, server.name)"
                  >
                    <Play class="h-4 w-4 mr-1" />
                    启动
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    :disabled="!isServerRunning(server.id)"
                    @click.stop="handleStopServer(server.id, server.name)"
                  >
                    <Pause class="h-4 w-4 mr-1" />
                    停止
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    @click.stop="openDeleteDialog(server.id, server.name)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>

    <!-- 删除确认对话框 -->
    <Dialog v-model:open="showDeleteDialog">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
          <DialogDescription>
            您确定要删除此服务器吗？
          </DialogDescription>
        </DialogHeader>

        <div class="py-4">
          <div class="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p class="font-medium mb-2">{{ serverToDeleteName }}</p>
            <p class="text-sm text-muted-foreground">
              ⚠️ 此操作将：
            </p>
            <ul class="text-sm text-muted-foreground list-disc list-inside mt-2 space-y-1">
              <li>删除服务器配置</li>
              <li>停止正在运行的服务器进程</li>
              <li>清除相关日志记录</li>
            </ul>
            <p class="text-sm text-destructive font-medium mt-3">
              此操作不可撤销！
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            @click="showDeleteDialog = false"
          >
            取消
          </Button>
          <Button
            variant="destructive"
            @click="confirmDelete"
          >
            <Trash2 class="h-4 w-4 mr-2" />
            确认删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

