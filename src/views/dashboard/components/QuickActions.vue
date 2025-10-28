<script setup lang="ts">
// 快速操作组件 - 提供快速导航和操作入口，内聚同步和导出业务逻辑
import { useRouter } from 'vue-router'
import { useServerStore } from '@/stores/servers'
import { useToast } from '@/components/ui/toast/use-toast'
import { ShoppingBag, Plus, Download } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const router = useRouter()
const serverStore = useServerStore()
const { toast } = useToast()

// 定义 emit 事件
const emit = defineEmits<{
  openExportDialog: [config: string]
}>()

// 同步到 Cursor
async function handleSyncToCursor() {
  try {
    const result = await window.electronAPI.config.syncToCursor()
    
    if (result.success) {
      toast({
        title: '🎉 同步成功',
        description: `${result.message}，请重启 Cursor 以加载新配置`,
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
      description: error.message || '同步配置到 Cursor 时发生错误',
      variant: 'destructive',
      duration: 3000,
    })
  }
}

// 导出配置
async function handleExportConfig() {
  try {
    const config = await window.electronAPI.config.export()
    const configString = JSON.stringify(config, null, 2)
    emit('openExportDialog', configString)
  } catch (error: any) {
    toast({
      title: '导出失败',
      description: error.message || '导出配置时发生错误',
      variant: 'destructive',
      duration: 3000,
    })
  }
}
</script>

<template>
  <Card class="mb-6">
    <CardHeader>
      <CardTitle>
        快速操作
      </CardTitle>
      <CardDescription>
        快速开始使用 MCP Manager
      </CardDescription>
    </CardHeader>
    <CardContent class="flex gap-4 flex-wrap">
      <Button @click="router.push('/templates')">
        <Plus class="h-4 w-4 mr-2" />
        从模板创建
      </Button>
      <Button variant="secondary" @click="router.push('/marketplace')">
        <ShoppingBag class="h-4 w-4 mr-2" />
        浏览市场
      </Button>
      <Button 
        variant="default" 
        :disabled="serverStore.servers.length === 0"
        class="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        @click="handleSyncToCursor" 
      >
        <Download class="h-4 w-4 mr-2" />
        同步到 Cursor
      </Button>
      <Button 
        variant="outline"
        :disabled="serverStore.servers.length === 0"
        @click="handleExportConfig" 
      >
        <Download class="h-4 w-4 mr-2" />
        导出配置
      </Button>
    </CardContent>
  </Card>
</template>
