<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useServerStore } from '@/stores/servers'
import { useLogStore } from '@/stores/logs'
import { useToast } from '@/components/ui/toast/use-toast'
import { ShoppingBag, Play, Pause, Plus, Trash2, Terminal, ExternalLink, Download, FileText } from 'lucide-vue-next'
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

// 导出配置对话框
const showExportDialog = ref(false)
const exportedConfig = ref('')

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

// 操作中的服务器 ID 集合
const operatingServers = ref<Set<string>>(new Set())

// 检查服务器是否正在操作中
function isServerOperating(serverId: string) {
  return operatingServers.value.has(serverId)
}

// 启动服务器并显示反馈
async function handleStartServer(serverId: string, serverName: string) {
  if (operatingServers.value.has(serverId)) {
    console.log('服务器操作中，跳过:', serverId)
    return
  }
  
  operatingServers.value.add(serverId)
  try {
    console.log('开始启动操作:', serverId)
    
    // 额外等待一下，确保前一次停止完全执行完
    await new Promise(resolve => setTimeout(resolve, 200))
    console.log('启动前等待完成:', serverId)
    
    await serverStore.startServer(serverId)
    console.log('启动操作完成:', serverId)
    toast({
      title: '启动成功',
      description: `${serverName} 已成功启动`,
    })
  } catch (error: any) {
    console.error('启动操作失败:', error)
    toast({
      title: '启动失败',
      description: error.message || '启动服务器时发生错误',
      variant: 'destructive',
    })
  } finally {
    operatingServers.value.delete(serverId)
  }
}

// 停止服务器并显示反馈
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
    
    // 等待一小段时间确保进程完全清理
    await new Promise(resolve => setTimeout(resolve, 500))
    console.log('停止操作清理完成:', serverId)
    
    toast({
      title: '已停止',
      description: `${serverName} 已停止运行`,
    })
  } catch (error: any) {
    console.error('停止操作失败:', error)
    toast({
      title: '停止失败',
      description: error.message || '停止服务器时发生错误',
      variant: 'destructive',
    })
  } finally {
    operatingServers.value.delete(serverId)
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
    const config = await window.electronAPI.config.export()
    
    // 创建格式化的 JSON 字符串
    exportedConfig.value = JSON.stringify(config, null, 2)
    
    // 显示预览对话框
    showExportDialog.value = true
  } catch (error: any) {
    toast({
      title: '导出失败',
      description: error.message || '导出配置时发生错误',
      variant: 'destructive',
    })
  }
}

// 复制配置到剪贴板
async function copyConfig() {
  try {
    await navigator.clipboard.writeText(exportedConfig.value)
    toast({
      title: '已复制',
      description: '配置已复制到剪贴板',
    })
    showExportDialog.value = false
  } catch (error: any) {
    toast({
      title: '复制失败',
      description: error.message || '复制到剪贴板时发生错误',
      variant: 'destructive',
    })
  }
}

// 导出单个服务器配置
async function exportSingleServer(serverId: string, serverName: string) {
  try {
    const config = await window.electronAPI.config.exportSingle(serverId)
    
    // 创建格式化的 JSON 字符串
    exportedConfig.value = JSON.stringify(config, null, 2)
    
    // 显示预览对话框
    showExportDialog.value = true
  } catch (error: any) {
    toast({
      title: '导出失败',
      description: error.message || `导出 ${serverName} 配置时发生错误`,
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
        <Button variant="outline" @click="exportCursorConfig" :disabled="serverStore.servers.length === 0">
          <Download class="h-4 w-4 mr-2" />
          导出 Cursor 配置
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
                    :disabled="isServerRunning(server.id) || isServerOperating(server.id)"
                    @click.stop="handleStartServer(server.id, server.name)"
                  >
                    <Play class="h-4 w-4 mr-1" />
                    {{ isServerOperating(server.id) ? '操作中...' : '启动' }}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    :disabled="!isServerRunning(server.id) || isServerOperating(server.id)"
                    @click.stop="handleStopServer(server.id, server.name)"
                  >
                    <Pause class="h-4 w-4 mr-1" />
                    {{ isServerOperating(server.id) ? '操作中...' : '停止' }}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    :disabled="isServerOperating(server.id)"
                    @click.stop="viewServerLogs(server.id, server.name)"
                    title="查看日志"
                  >
                    <FileText class="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    :disabled="isServerOperating(server.id)"
                    @click.stop="exportSingleServer(server.id, server.name)"
                    title="导出配置"
                  >
                    <Download class="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    :disabled="isServerOperating(server.id)"
                    @click.stop="openDeleteDialog(server.id, server.name)"
                    title="删除"
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

    <!-- 日志查看对话框 -->
    <Dialog v-model:open="showLogsDialog">
      <DialogContent class="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <FileText class="h-5 w-5" />
            {{ currentServerLogsName }} - 运行日志
          </DialogTitle>
          <DialogDescription>
            实时查看服务器的运行日志输出
          </DialogDescription>
        </DialogHeader>

        <div class="flex-1 overflow-hidden">
          <div class="h-full overflow-y-auto border rounded-md bg-black/90 p-4">
            <pre class="text-xs font-mono text-green-400 whitespace-pre-wrap">{{ currentServerLogs ? getFormattedLogs(currentServerLogs) : '暂无日志输出' }}</pre>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="showLogsDialog = false">
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 导出配置对话框 -->
    <Dialog v-model:open="showExportDialog">
      <DialogContent class="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>导出 Cursor 配置</DialogTitle>
          <DialogDescription>
            将以下配置复制到 Cursor 的设置文件中（Preferences > Settings > JSON）
          </DialogDescription>
        </DialogHeader>

        <div class="flex-1 overflow-hidden flex flex-col gap-4">
          <!-- 配置预览 -->
          <div class="flex-1 overflow-y-auto border rounded-md bg-muted/20">
            <pre class="p-4 text-sm font-mono"><code>{{ exportedConfig }}</code></pre>
          </div>

          <!-- 使用说明 -->
          <div class="space-y-2 text-sm">
            <p class="font-medium">📋 使用步骤：</p>
            <ol class="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
              <li>点击下方"复制配置"按钮</li>
              <li>打开 Cursor 编辑器</li>
              <li>按 <kbd class="px-1 py-0.5 text-xs bg-muted rounded">Cmd+Shift+P</kbd> 打开命令面板</li>
              <li>输入 "Preferences: Open Settings (JSON)"</li>
              <li>在 JSON 配置中找到或添加 <code class="px-1 py-0.5 bg-muted rounded">mcpServers</code> 字段</li>
              <li>粘贴配置并保存</li>
              <li>重启 Cursor 即可使用！</li>
            </ol>
          </div>

          <!-- 注意事项 -->
          <div class="bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
            <p class="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">💡 提示</p>
            <ul class="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
              <li>配置已包含工作目录（cwd）和环境变量（env）</li>
              <li>路径中的 ~ 已自动展开为实际路径</li>
              <li>确保所有服务器在 MCP Manager 中已成功启动</li>
              <li>如有 API 密钥等敏感信息，请检查 env 字段</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="showExportDialog = false">
            关闭
          </Button>
          <Button @click="copyConfig">
            <Download class="h-4 w-4 mr-2" />
            复制配置
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

