<script setup lang="ts">
// 统计卡片组件 - 展示服务器统计信息
import { computed } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useServerStore } from '@/stores/servers'

// 使用 store
const serverStore = useServerStore()

// 计算错误服务器数量
const errorServers = computed(() => {
  return serverStore.servers.filter(s => {
    const status = serverStore.serverStatuses[s.id]
    return status?.status === 'error'
  })
})

// 计算已停止服务器数量
const stoppedServers = computed(() => {
  return serverStore.servers.length - serverStore.runningServers.length - errorServers.value.length
})
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
    <!-- 服务器总数 -->
    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-medium text-muted-foreground">
          服务器总数
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold">
          {{ serverStore.servers.length }}
        </div>
      </CardContent>
    </Card>

    <!-- 运行中 -->
    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-medium text-muted-foreground">
          运行中
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold text-green-600">
          {{ serverStore.runningServers.length }}
        </div>
      </CardContent>
    </Card>

    <!-- 错误 -->
    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-medium text-muted-foreground">
          错误
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold text-red-600">
          {{ errorServers.length }}
        </div>
      </CardContent>
    </Card>

    <!-- 已停止 -->
    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-medium text-muted-foreground">
          已停止
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold text-gray-500">
          {{ stoppedServers }}
        </div>
      </CardContent>
    </Card>
  </div>
</template>

