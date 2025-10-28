<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import {
  LayoutDashboard,
  Store,
  FileText,
  Settings,
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()

// 导航菜单项
const menuItems = [
  {
    title: '仪表盘',
    icon: LayoutDashboard,
    path: '/',
  },
  {
    title: '市场',
    icon: Store,
    path: '/marketplace',
  },
  {
    title: '模板',
    icon: FileText,
    path: '/templates',
  },
  {
    title: '设置',
    icon: Settings,
    path: '/settings',
  },
]

// 判断是否为当前路由
const isActive = (path: string) => {
  return route.path === path
}

// 导航到指定路由
const navigateTo = (path: string) => {
  router.push(path)
}
</script>

<template>
  <SidebarProvider>
    <Sidebar>
      <!-- 侧边栏头部 -->
      <SidebarHeader class="p-4">
        <div class="flex items-center gap-2">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span class="text-lg font-bold">M</span>
          </div>
          <div class="flex flex-col">
            <span class="text-sm font-semibold">MCP Manager</span>
            <span class="text-xs text-muted-foreground">服务器管理工具</span>
          </div>
        </div>
      </SidebarHeader>

      <!-- 侧边栏内容 -->
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>导航</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem
                v-for="item in menuItems"
                :key="item.path"
              >
                <SidebarMenuButton
                  :is-active="isActive(item.path)"
                  @click="navigateTo(item.path)"
                >
                  <component
                    :is="item.icon"
                    class="h-4 w-4"
                  />
                  <span>{{ item.title }}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <!-- 侧边栏底部 -->
      <SidebarFooter class="p-4">
        <div class="flex items-center gap-2 text-sm text-muted-foreground">
          <span>版本 1.0.0</span>
        </div>
      </SidebarFooter>
    </Sidebar>

    <!-- 主内容区域 -->
    <SidebarInset class="flex flex-col h-screen">
      <!-- 顶部导航栏 -->
      <header class="flex h-14 shrink-0 items-center gap-4 bg-background px-6">
        <SidebarTrigger />
        <div class="flex flex-1 items-center justify-between">
          <h1 class="text-lg font-semibold">
            {{ menuItems.find((item) => item.path === route.path)?.title || 'MCP Manager' }}
          </h1>
          <div class="flex items-center gap-2">
            <!-- 可以在这里添加其他操作按钮 -->
          </div>
        </div>
      </header>

      <!-- 页面内容 -->
      <main class="flex-1 overflow-y-auto p-6">
        <router-view />
      </main>
    </SidebarInset>
  </SidebarProvider>
</template>

<style scoped lang="scss">
/* 可以在这里添加自定义样式 */
</style>

