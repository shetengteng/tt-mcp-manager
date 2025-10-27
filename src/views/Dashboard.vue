<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useServerStore } from '@/stores/servers'
import { useLogStore } from '@/stores/logs'
import { ShoppingBag, Play, Pause, Plus } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const router = useRouter()

// 使用 stores
const serverStore = useServerStore()
const logStore = useLogStore()

// 加载数据
onMounted(async () => {
  await serverStore.loadServers()
  logStore.subscribeToLogs()
})
</script>

<template>
  <div class="h-full flex flex-col">
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
    <Card class="flex-1">
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
                    <h4 class="font-medium">{{ server.name }}</h4>
                    <Badge>{{ server.type }}</Badge>
                  </div>
                  <p class="text-sm text-muted-foreground">{{ server.command }}</p>
                </div>
                <div class="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    @click.stop="serverStore.startServer(server.id)"
                  >
                    <Play class="h-4 w-4 mr-1" />
                    启动
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    @click.stop="serverStore.stopServer(server.id)"
                  >
                    <Pause class="h-4 w-4 mr-1" />
                    停止
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

