<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useToast } from '@/components/ui/toast/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { FolderOpen, RefreshCw, Database } from 'lucide-vue-next'

const settingsStore = useSettingsStore()
const { toast } = useToast()

// 同步状态
const syncStatus = ref({
  lastSync: 'Loading...',
  serverCount: 0,
  syncing: false
})
const syncing = ref(false)

// 规则刷新状态
const refreshingRules = ref(false)

onMounted(async () => {
  await settingsStore.loadSettings()
  await loadSyncStatus()
})

// 加载同步状态
async function loadSyncStatus() {
  try {
    // TODO: 实现同步状态 API
    // const result = await window.electronAPI.marketplace.getSyncStatus()
    // 暂时使用默认值
    syncStatus.value = {
      lastSync: '暂未同步',
      serverCount: 0,
      syncing: false
    }
  } catch (error: any) {
    console.error('加载同步状态失败:', error)
  }
}

// 手动触发同步
async function handleManualSync() {
  syncing.value = true
  try {
    // TODO: 实现市场同步 API
    // const result = await window.electronAPI.marketplace.sync()
    
    toast({
      title: '功能开发中',
      description: '市场数据同步功能正在开发中',
      duration: 3000
    })
    
    await loadSyncStatus()
  } catch (error: any) {
    toast({
      title: '同步失败',
      description: error.message || '同步过程中发生错误',
      variant: 'destructive',
      duration: 3000
    })
  } finally {
    syncing.value = false
  }
}

async function handleSaveSettings() {
  try {
    await settingsStore.updateSettings(settingsStore.settings)
    toast({
      title: '保存成功',
      description: '设置已成功保存',
      duration: 2000
    })
  } catch (error: any) {
    toast({
      title: '保存失败',
      description: error.message || '保存设置时发生错误',
      variant: 'destructive',
      duration: 3000
    })
  }
}

async function handleSelectFolder() {
  try {
    const result = await window.electronAPI.settings.selectFolder()
    if (result.success && result.path) {
      settingsStore.settings.defaultInstallPath = result.path
      toast({
        title: '文件夹已选择',
        description: result.path,
        duration: 2000
      })
    }
  } catch (error: any) {
    toast({
      title: '选择失败',
      description: error.message || '选择文件夹时发生错误',
      variant: 'destructive',
      duration: 3000
    })
  }
}

// 重新刷新 Cursor Rules 数据库
async function handleRefreshRules() {
  refreshingRules.value = true
  try {
    const result = await window.electronAPI.rules.reimportAll()

    if (result.success > 0) {
      toast({
        title: '刷新成功！',
        description: `成功导入 ${result.success} 条规则${result.failed > 0 ? `，${result.failed} 条失败` : ''}`,
        duration: 3000
      })
    } else {
      toast({
        title: '刷新失败',
        description: result.failed > 0 ? `${result.failed} 条规则导入失败` : '没有规则被导入',
        variant: 'destructive',
        duration: 3000
      })
    }
  } catch (error: any) {
    toast({
      title: '刷新失败',
      description: error.message || '刷新规则数据库时发生错误',
      variant: 'destructive',
      duration: 3000
    })
  } finally {
    refreshingRules.value = false
  }
}
</script>

<template>
  <div>
    <div class="max-w-4xl space-y-6">
      <!-- 常规设置 -->
      <Card>
        <CardHeader>
          <CardTitle>常规设置</CardTitle>
          <CardDescription>配置应用的基本行为</CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label for="auto-start">开机时自动启动</Label>
              <p class="text-sm text-muted-foreground">系统启动时自动运行 MCP Manager</p>
            </div>
            <Switch id="auto-start" v-model:checked="settingsStore.settings.autoStart" />
          </div>

          <Separator />

          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label for="minimize-tray">最小化到系统托盘</Label>
              <p class="text-sm text-muted-foreground">点击最小化按钮时隐藏到系统托盘</p>
            </div>
            <Switch id="minimize-tray" v-model:checked="settingsStore.settings.minimizeToTray" />
          </div>

          <Separator />

          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label for="keep-background">关闭窗口时保持后台运行</Label>
              <p class="text-sm text-muted-foreground">关闭窗口时不退出应用，保持服务器运行</p>
            </div>
            <Switch id="keep-background" v-model:checked="settingsStore.settings.keepBackground" />
          </div>
        </CardContent>
        <CardFooter>
          <Button @click="handleSaveSettings"> 保存设置 </Button>
        </CardFooter>
      </Card>

      <!-- 安装设置 -->
      <Card>
        <CardHeader>
          <CardTitle>安装设置</CardTitle>
          <CardDescription>配置 MCP Server 的默认安装路径</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <Label for="install-path">默认安装路径</Label>
            <div class="flex gap-2">
              <Input
                id="install-path"
                v-model="settingsStore.settings.defaultInstallPath"
                placeholder="例如: ~/mcp-servers"
                class="flex-1"
              />
              <Button variant="outline" size="icon" @click="handleSelectFolder">
                <FolderOpen class="h-4 w-4" />
              </Button>
            </div>
            <p class="text-xs text-muted-foreground">
              新安装的 MCP Server
              的默认工作目录基础路径。每个服务器会在此目录下创建子目录用于存放数据和配置。
            </p>
            <p class="text-xs text-muted-foreground mt-1">
              💡 提示：可以使用 ~ 表示用户主目录（例如：~/mcp-servers）
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button @click="handleSaveSettings"> 保存设置 </Button>
        </CardFooter>
      </Card>

      <!-- API 设置 -->
      <Card>
        <CardHeader>
          <CardTitle>API 设置</CardTitle>
          <CardDescription>配置外部 API 的访问凭证</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <Label for="github-token">GitHub Personal Access Token (可选)</Label>
            <Input
              id="github-token"
              v-model="settingsStore.settings.githubToken"
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            />
            <p class="text-xs text-muted-foreground">
              用于访问 GitHub API，提高请求限制到 5000/小时。在 GitHub Settings → Developer settings
              → Personal access tokens 中创建
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button @click="handleSaveSettings"> 保存设置 </Button>
        </CardFooter>
      </Card>

      <!-- 市场数据同步 -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Database class="h-5 w-5" />
            市场数据同步
          </CardTitle>
          <CardDescription>从官方 MCP Registry 同步最新的服务器列表</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <p class="text-sm font-medium">上次同步</p>
              <p class="text-sm text-muted-foreground">
                {{ syncStatus.lastSync }}
              </p>
            </div>
            <div class="space-y-1">
              <p class="text-sm font-medium">服务器数量</p>
              <p class="text-sm text-muted-foreground">{{ syncStatus.serverCount }} 个</p>
            </div>
          </div>

          <Separator />

          <div class="space-y-2">
            <Button
              :disabled="syncing || syncStatus.syncing"
              class="w-full sm:w-auto"
              @click="handleManualSync"
            >
              <RefreshCw
                class="h-4 w-4 mr-2"
                :class="{ 'animate-spin': syncing || syncStatus.syncing }"
              />
              {{ syncing || syncStatus.syncing ? '同步中...' : '立即同步' }}
            </Button>
            <p class="text-xs text-muted-foreground">
              💡 提示：应用会每 6 小时自动同步一次市场数据，您也可以手动触发同步
            </p>
          </div>
        </CardContent>
      </Card>

      <!-- Cursor Rules 数据管理 -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Database class="h-5 w-5" />
            Cursor Rules 数据管理
          </CardTitle>
          <CardDescription>管理本地 Cursor Rules 规则数据库</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <p class="text-sm text-muted-foreground">
              重新扫描并导入 data/rules 目录中的所有规则文件（包括 .cursorrules 和 .mdc 文件）
            </p>
            <p class="text-sm text-muted-foreground">
              此操作会清空现有数据库并重新导入所有规则，支持最新的文件类型分类功能。
            </p>
          </div>

          <Separator />

          <div class="space-y-2">
            <Button
              :disabled="refreshingRules"
              variant="outline"
              class="w-full sm:w-auto"
              @click="handleRefreshRules"
            >
              <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': refreshingRules }" />
              {{ refreshingRules ? '刷新中...' : '重新刷新规则数据库' }}
            </Button>
            <p class="text-xs text-muted-foreground">
              ⚠️ 注意：此操作会清空已安装规则的记录，但不会删除已安装的规则文件
            </p>
          </div>
        </CardContent>
      </Card>

      <!-- Cursor 集成 -->
      <Card>
        <CardHeader>
          <CardTitle>Cursor 集成</CardTitle>
          <CardDescription>与 Cursor IDE 进行集成</CardDescription>
        </CardHeader>
        <CardContent>
          <Button> 导出配置到 Cursor </Button>
          <p class="mt-3 text-sm text-muted-foreground">
            将当前所有服务器配置导出为 Cursor 可用的 JSON 格式，可以直接导入到 Cursor 的 MCP 配置中
          </p>
        </CardContent>
      </Card>

      <!-- 关于 -->
      <Card>
        <CardHeader>
          <CardTitle>关于 MCP Manager</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div>
            <p class="text-sm font-semibold">版本 1.0.0</p>
            <p class="text-sm text-muted-foreground mt-1">
              基于 Electron + Vue 3 + Shadcn-Vue 构建
            </p>
          </div>

          <Separator />

          <div class="flex flex-wrap gap-3">
            <Button variant="outline" size="sm"> 检查更新 </Button>
            <Button variant="outline" size="sm"> 查看文档 </Button>
            <Button variant="outline" size="sm"> GitHub 仓库 </Button>
            <Button variant="outline" size="sm"> 报告问题 </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
