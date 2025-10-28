<script setup lang="ts">
// 日志查看对话框组件 - 内聚日志加载业务逻辑
import { watch } from 'vue'
import { FileText } from 'lucide-vue-next'
import { useLogStore } from '@/stores/logs'
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
  serverId: string | null
  serverName: string
}

const props = defineProps<Props>()

// 定义 emit 事件
const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const logStore = useLogStore()
const { toast } = useToast()

// 监听对话框打开状态，自动加载日志
watch(() => props.open, async (isOpen) => {
  if (isOpen && props.serverId) {
    try {
      await logStore.loadLogs(props.serverId)
    } catch (error: any) {
      toast({
        title: '加载日志失败',
        description: error.message || '无法加载服务器日志',
        variant: 'destructive',
        duration: 3000,
      })
    }
  }
})

// 获取格式化的日志文本
function getFormattedLogs(serverId: string) {
  const logs = logStore.getServerLogs(serverId)
  if (logs.length === 0) {
    return '暂无日志输出\n\n💡 提示：\n- 如果服务器刚启动，日志可能需要几秒钟才会出现\n- 如果服务器启动失败，可能不会有日志输出\n- 请检查服务器是否正在运行（绿色指示器）'
  }
  return logs.map(log => {
    const time = new Date(log.timestamp).toLocaleTimeString()
    const level = log.level.toUpperCase().padEnd(5)
    return `[${time}] [${level}] ${log.message}`
  }).join('\n')
}
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent class="max-w-4xl h-[80vh] flex flex-col">
      <DialogHeader class="shrink-0">
        <DialogTitle class="flex items-center gap-2">
          <FileText class="h-5 w-5" />
          {{ serverName }} - 运行日志
        </DialogTitle>
        <DialogDescription>
          实时查看服务器的运行日志输出
        </DialogDescription>
      </DialogHeader>

      <div class="flex-1 min-h-0 overflow-hidden">
        <div class="h-full overflow-y-auto border rounded-md bg-black/90 p-4">
          <pre class="text-xs font-mono text-green-400 whitespace-pre-wrap break-words">{{ serverId ? getFormattedLogs(serverId) : '暂无日志输出' }}</pre>
        </div>
      </div>

      <DialogFooter class="shrink-0">
        <Button
          variant="outline"
          @click="emit('update:open', false)"
        >
          关闭
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
