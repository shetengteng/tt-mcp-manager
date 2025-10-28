<script setup lang="ts">
// 测试结果对话框组件 - 内聚测试业务逻辑
import { ref, watch } from 'vue'
import { TestTube2, FileText } from 'lucide-vue-next'
import { useToast } from '@/components/ui/toast/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'

// 定义测试结果类型
interface TestResult {
  success: boolean
  capabilities?: {
    tools?: string[]
    resources?: string[]
    prompts?: string[]
  }
  error?: string
}

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
  openLogsDialog: [serverId: string, serverName: string]
}>()

const { toast } = useToast()

// 测试状态
const isTesting = ref(false)
const testResult = ref<TestResult | null>(null)

// 监听对话框打开状态，自动执行测试
watch(() => props.open, async (isOpen) => {
  if (isOpen && props.serverId) {
    await executeTest()
  } else if (!isOpen) {
    // 关闭时清理状态
    testResult.value = null
    isTesting.value = false
  }
})

// 执行测试
async function executeTest() {
  if (!props.serverId) return
  
  isTesting.value = true
  testResult.value = null
  
  try {
    console.log('🧪 开始测试服务器:', props.serverId, props.serverName)
    
    const startTime = Date.now()
    const minDisplayTime = 800
    
    const result = await window.electronAPI.server.test(props.serverId)
    console.log('🧪 测试结果:', result)
    
    // 确保最小显示时间
    const elapsedTime = Date.now() - startTime
    const remainingTime = Math.max(0, minDisplayTime - elapsedTime)
    
    if (remainingTime > 0) {
      await new Promise(resolve => setTimeout(resolve, remainingTime))
    }
    
    testResult.value = result

    if (result.success) {
      toast({
        title: '✅ 测试成功',
        description: `${props.serverName} 正常响应`,
        duration: 2000,
      })
    } else {
      toast({
        title: '❌ 测试失败',
        description: result.error || '服务器未响应',
        variant: 'destructive',
        duration: 3000,
      })
    }
  } catch (error: any) {
    console.error('🧪 测试异常:', error)
    testResult.value = {
      success: false,
      error: error.message || '测试请求失败'
    }
    toast({
      title: '测试失败',
      description: error.message || '测试服务器时发生错误',
      variant: 'destructive',
      duration: 3000,
    })
  } finally {
    isTesting.value = false
  }
}

// 查看日志
function handleViewLogs() {
  if (!props.serverId) return
  emit('update:open', false)
  setTimeout(() => {
    emit('openLogsDialog', props.serverId!, props.serverName)
  }, 100)
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-2xl">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <TestTube2 class="h-5 w-5" />
          {{ serverName }} - 功能测试
        </DialogTitle>
        <DialogDescription>
          检查 MCP Server 是否正常响应并查看支持的功能
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 min-h-[300px] flex flex-col">
        <!-- 测试中 -->
        <div v-if="isTesting" class="flex-1 flex items-center justify-center">
          <div class="flex flex-col items-center gap-4">
            <div class="relative">
              <div class="animate-spin rounded-full h-16 w-16 border-4 border-primary/20" />
              <div class="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent absolute top-0 left-0" />
            </div>
            <div class="text-center space-y-2">
              <p class="text-base font-medium">
                正在测试服务器...
              </p>
              <p class="text-xs text-muted-foreground">
                发送测试请求并等待响应
              </p>
            </div>
          </div>
        </div>

        <!-- 测试结果 -->
        <div v-else-if="testResult" class="space-y-4 flex-1">
          <!-- 成功 -->
          <div v-if="testResult.success" class="space-y-4">
            <div class="flex items-center gap-2 text-green-600 dark:text-green-400">
              <div class="w-3 h-3 rounded-full bg-green-600 dark:bg-green-400" />
              <span class="font-medium">✅ 服务器响应正常</span>
            </div>

            <!-- 支持的功能 -->
            <div v-if="testResult.capabilities" class="space-y-3">
              <!-- Tools -->
              <div v-if="testResult.capabilities.tools && testResult.capabilities.tools.length > 0">
                <h4 class="text-sm font-medium mb-2">
                  🔧 支持的工具 ({{ testResult.capabilities.tools.length }})
                </h4>
                <div class="bg-muted p-3 rounded-md max-h-40 overflow-y-auto">
                  <div class="space-y-1">
                    <Badge 
                      v-for="tool in testResult.capabilities.tools" 
                      :key="tool"
                      variant="secondary"
                      class="mr-2 mb-1"
                    >
                      {{ tool }}
                    </Badge>
                  </div>
                </div>
              </div>

              <!-- Resources -->
              <div v-if="testResult.capabilities.resources && testResult.capabilities.resources.length > 0">
                <h4 class="text-sm font-medium mb-2">
                  📦 支持的资源 ({{ testResult.capabilities.resources.length }})
                </h4>
                <div class="bg-muted p-3 rounded-md max-h-40 overflow-y-auto">
                  <div class="space-y-1">
                    <Badge 
                      v-for="resource in testResult.capabilities.resources" 
                      :key="resource"
                      variant="secondary"
                      class="mr-2 mb-1"
                    >
                      {{ resource }}
                    </Badge>
                  </div>
                </div>
              </div>

              <!-- Prompts -->
              <div v-if="testResult.capabilities.prompts && testResult.capabilities.prompts.length > 0">
                <h4 class="text-sm font-medium mb-2">
                  💬 支持的提示 ({{ testResult.capabilities.prompts.length }})
                </h4>
                <div class="bg-muted p-3 rounded-md max-h-40 overflow-y-auto">
                  <div class="space-y-1">
                    <Badge 
                      v-for="prompt in testResult.capabilities.prompts" 
                      :key="prompt"
                      variant="secondary"
                      class="mr-2 mb-1"
                    >
                      {{ prompt }}
                    </Badge>
                  </div>
                </div>
              </div>

              <!-- 无功能 -->
              <div v-if="!testResult.capabilities.tools?.length && !testResult.capabilities.resources?.length && !testResult.capabilities.prompts?.length">
                <p class="text-sm text-muted-foreground">
                  服务器未返回功能列表
                </p>
              </div>
            </div>

            <!-- 提示 -->
            <div class="bg-green-50 dark:bg-green-950 p-3 rounded-md">
              <p class="text-sm text-green-700 dark:text-green-300">
                ✅ 服务器已通过测试，可以在 Cursor 中使用
              </p>
            </div>
          </div>

          <!-- 失败 -->
          <div v-else class="space-y-4">
            <div class="flex items-center gap-2 text-red-600 dark:text-red-400">
              <div class="w-3 h-3 rounded-full bg-red-600 dark:bg-red-400" />
              <span class="font-medium">❌ 测试失败</span>
            </div>

            <div class="bg-red-50 dark:bg-red-950 p-3 rounded-md">
              <p class="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
                错误信息
              </p>
              <p class="text-sm text-red-700 dark:text-red-300 font-mono">
                {{ testResult.error }}
              </p>
            </div>

            <div class="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-md">
              <p class="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                💡 排查建议
              </p>
              <ul class="text-xs text-yellow-700 dark:text-yellow-300 space-y-1 list-disc list-inside">
                <li>检查服务器是否正在运行（绿色指示器）</li>
                <li>查看日志输出是否有错误信息</li>
                <li>确认命令和参数配置正确</li>
                <li>检查工作目录是否存在</li>
                <li>尝试重启服务器</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">
          关闭
        </Button>
        <Button 
          v-if="testResult && !testResult.success"
          variant="default"
          @click="handleViewLogs"
        >
          <FileText class="h-4 w-4 mr-2" />
          查看日志
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
