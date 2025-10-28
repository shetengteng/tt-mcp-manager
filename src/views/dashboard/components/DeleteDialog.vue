<script setup lang="ts">
// 删除确认对话框组件 - 内聚删除业务逻辑
import { Trash2 } from 'lucide-vue-next'
import { useServerStore } from '@/stores/servers'
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

const serverStore = useServerStore()
const { toast } = useToast()

// 确认删除
async function handleConfirm() {
  if (!props.serverId) return
  
  try {
    await serverStore.deleteServer(props.serverId)
    emit('update:open', false)
    
    toast({
      title: '删除成功',
      description: `已成功删除服务器: ${props.serverName}`,
      duration: 2000,
    })
  } catch (error: any) {
    toast({
      title: '删除失败',
      description: error.message || '删除服务器时发生错误',
      variant: 'destructive',
      duration: 3000,
    })
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>
          确认删除
        </DialogTitle>
        <DialogDescription>
          您确定要删除此服务器吗？
        </DialogDescription>
      </DialogHeader>

      <div class="py-4">
        <div class="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p class="font-medium mb-2">
            {{ serverName }}
          </p>
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
          @click="emit('update:open', false)"
        >
          取消
        </Button>
        <Button
          variant="destructive"
          @click="handleConfirm"
        >
          <Trash2 class="h-4 w-4 mr-2" />
          确认删除
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
