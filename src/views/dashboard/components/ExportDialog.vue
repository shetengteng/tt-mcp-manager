<script setup lang="ts">
// 导出配置对话框组件 - 内聚导出和复制业务逻辑
import { Download } from 'lucide-vue-next'
import { useToast } from '@/components/ui/toast/use-toast'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'

// 定义 props
interface Props {
  open: boolean
  config: string
}

const props = defineProps<Props>()

// 定义 emit 事件
const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { toast } = useToast()

// 复制配置到剪贴板
async function handleCopy() {
  try {
    await navigator.clipboard.writeText(props.config)
    
    toast({
      title: '已复制',
      description: '配置已复制到剪贴板',
      duration: 2000,
    })
    
    emit('update:open', false)
  } catch (error: any) {
    toast({
      title: '复制失败',
      description: error.message || '复制到剪贴板时发生错误',
      variant: 'destructive',
      duration: 3000,
    })
  }
}
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent class="max-w-3xl max-h-[80vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>
          导出 Cursor 配置
        </DialogTitle>
        <DialogDescription>
          将以下配置复制到 Cursor 的设置文件中（Preferences > Settings > JSON）
        </DialogDescription>
      </DialogHeader>

      <div class="flex-1 overflow-hidden flex flex-col gap-4">
        <!-- 配置预览 -->
        <div class="flex-1 overflow-y-auto border rounded-md bg-muted/20">
          <pre class="p-4 text-sm font-mono"><code>{{ config }}</code></pre>
        </div>

        <!-- 使用说明 -->
        <div class="space-y-2 text-sm">
          <p class="font-medium">
            📋 使用步骤：
          </p>
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
          <p class="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
            💡 提示
          </p>
          <ul class="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
            <li>配置已包含工作目录（cwd）和环境变量（env）</li>
            <li>路径中的 ~ 已自动展开为实际路径</li>
            <li>确保所有服务器在 MCP Manager 中已成功启动</li>
            <li>如有 API 密钥等敏感信息，请检查 env 字段</li>
          </ul>
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          @click="emit('update:open', false)"
        >
          关闭
        </Button>
        <Button @click="handleCopy">
          <Download class="h-4 w-4 mr-2" />
          复制配置
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
