<script setup lang="ts">
// 服务器卡片组件 - 展示单个服务器的信息和操作按钮
import { Play, Pause, FileText, TestTube2, Download, RefreshCcw, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'

// 定义 props
interface Props {
  server: {
    id: string
    name: string
    type: string
    command: string
  }
  isRunning: boolean
  isError: boolean
  isOperating: boolean
  statusColor: string
  statusText: string
}

const props = defineProps<Props>()

// 定义 emit 事件
const emit = defineEmits<{
  click: []
  start: []
  stop: []
  viewLogs: []
  test: []
  export: []
  sync: []
  delete: []
}>()
</script>

<template>
  <Card
    class="hover:border-primary cursor-pointer transition-colors"
    @click="emit('click')"
  >
    <CardContent class="p-4">
      <div class="space-y-3">
        <!-- 第一行：服务器信息 -->
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1 flex-wrap">
              <!-- 运行状态指示器 -->
              <div 
                class="w-2 h-2 rounded-full shrink-0"
                :class="statusColor"
                :title="statusText"
              />
              <h4 class="font-medium">
                {{ server.name }}
              </h4>
              <Badge class="shrink-0">
                {{ server.type }}
              </Badge>
              <Badge 
                v-if="isRunning" 
                variant="default" 
                class="text-xs shrink-0"
              >
                运行中
              </Badge>
              <Badge 
                v-else-if="isError" 
                variant="destructive" 
                class="text-xs shrink-0"
              >
                错误
              </Badge>
            </div>
            <p class="text-sm text-muted-foreground truncate">
              {{ server.command }}
            </p>
          </div>
        </div>

        <!-- 第二行：错误提示 + 操作按钮 -->
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <!-- 错误提示 -->
          <div v-if="isError" class="flex items-center gap-2">
            <span class="text-xs text-destructive whitespace-nowrap">
              启动失败
            </span>
          </div>
          <div v-else class="flex-1" />
          
          <!-- 按钮组 -->
          <div class="flex gap-2 flex-wrap">
            <!-- 启动按钮 -->
            <Tooltip :delay-duration="0">
              <TooltipTrigger as-child>
                <div class="inline-flex">
                  <Button
                    size="sm"
                    variant="default"
                    :disabled="isRunning || isOperating"
                    class="pointer-events-auto"
                    @click.stop="emit('start')"
                  >
                    <Play class="h-4 w-4" />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>
                  启动服务器
                </p>
              </TooltipContent>
            </Tooltip>

            <!-- 停止按钮 -->
            <Tooltip :delay-duration="0">
              <TooltipTrigger as-child>
                <div class="inline-flex">
                  <Button
                    size="sm"
                    variant="secondary"
                    :disabled="!isRunning || isOperating"
                    class="pointer-events-auto"
                    @click.stop="emit('stop')"
                  >
                    <Pause class="h-4 w-4" />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>
                  停止服务器
                </p>
              </TooltipContent>
            </Tooltip>

            <!-- 日志按钮 -->
            <Tooltip :delay-duration="0">
              <TooltipTrigger as-child>
                <div class="inline-flex">
                  <Button
                    size="sm"
                    :variant="isError ? 'destructive' : 'outline'"
                    :disabled="isOperating"
                    class="pointer-events-auto"
                    @click.stop="emit('viewLogs')"
                  >
                    <FileText class="h-4 w-4" />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>
                  {{ isError ? '查看错误日志' : '查看日志' }}
                </p>
              </TooltipContent>
            </Tooltip>

            <!-- 测试按钮 -->
            <Tooltip :delay-duration="0">
              <TooltipTrigger as-child>
                <div class="inline-flex">
                  <Button
                    size="sm"
                    variant="outline"
                    :disabled="!isRunning || isOperating"
                    class="pointer-events-auto"
                    @click.stop="emit('test')"
                  >
                    <TestTube2 class="h-4 w-4" />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>
                  测试功能
                </p>
              </TooltipContent>
            </Tooltip>

            <!-- 导出按钮 -->
            <Tooltip :delay-duration="0">
              <TooltipTrigger as-child>
                <div class="inline-flex">
                  <Button
                    size="sm"
                    variant="outline"
                    :disabled="isOperating"
                    class="pointer-events-auto"
                    @click.stop="emit('export')"
                  >
                    <Download class="h-4 w-4" />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>
                  导出配置
                </p>
              </TooltipContent>
            </Tooltip>

            <!-- 同步到 Cursor 按钮 -->
            <Tooltip :delay-duration="0">
              <TooltipTrigger as-child>
                <div class="inline-flex">
                  <Button
                    size="sm"
                    variant="outline"
                    :disabled="isOperating"
                    class="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 pointer-events-auto"
                    @click.stop="emit('sync')"
                  >
                    <RefreshCcw class="h-4 w-4" />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>
                  同步到 Cursor
                </p>
              </TooltipContent>
            </Tooltip>

            <!-- 删除按钮 -->
            <Tooltip :delay-duration="0">
              <TooltipTrigger as-child>
                <div class="inline-flex">
                  <Button
                    size="sm"
                    variant="destructive"
                    :disabled="isOperating"
                    class="pointer-events-auto"
                    @click.stop="emit('delete')"
                  >
                    <Trash2 class="h-4 w-4" />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>
                  删除
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

