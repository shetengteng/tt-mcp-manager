<script setup lang="ts">
// 主布局组件 - 使用 Shadcn Sidebar
import { useRouter, useRoute } from 'vue-router'
import { LayoutDashboard, Store, FileText, Settings } from 'lucide-vue-next'
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
  SidebarTrigger
} from '@/components/ui/sidebar'

const router = useRouter()
const route = useRoute()

// 导航菜单项
const menuItems = [
  {
    title: '仪表盘',
    icon: LayoutDashboard,
    path: '/'
  },
  {
    title: '市场',
    icon: Store,
    path: '/marketplace'
  },
  {
    title: '模板',
    icon: FileText,
    path: '/templates'
  },
  {
    title: '设置',
    icon: Settings,
    path: '/settings'
  }
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
  <SidebarProvider
    style="--sidebar-width: 13rem; --sidebar-width-mobile: 13rem"
    :default-open="true"
  >
    <!-- 侧边栏 -->
    <Sidebar collapsible="icon" variant="sidebar">
      <!-- 侧边栏头部 -->
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" as-child>
              <a href="/" class="flex items-center gap-2">
                <div
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
                >
                  <span class="text-sm font-bold">M</span>
                </div>
                <div
                  class="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden"
                >
                  <span class="font-semibold">MCP Manager</span>
                  <span class="text-xs text-muted-foreground">服务器管理工具</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <!-- 侧边栏内容 -->
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>导航</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem v-for="item in menuItems" :key="item.path">
                <SidebarMenuButton
                  :tooltip="item.title"
                  :is-active="isActive(item.path)"
                  @click="navigateTo(item.path)"
                >
                  <component :is="item.icon" class="h-4 w-4 shrink-0" />
                  <span>{{ item.title }}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <!-- 侧边栏底部 -->
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" class="text-xs text-muted-foreground">
              <span>版本 1.0.0</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>

    <!-- 主内容区域 -->
    <SidebarInset class="flex h-screen flex-col">
      <!-- 顶部导航栏 -->
      <header class="flex h-14 shrink-0 items-center gap-4 bg-background px-6 border-b">
        <div class="flex flex-1 items-center justify-between">
          <div class="flex items-center gap-2">
            <SidebarTrigger class="border-none" />
            <h1 class="text-lg font-semibold">
              {{ menuItems.find(item => item.path === route.path)?.title || 'MCP Manager' }}
            </h1>
          </div>
        </div>
      </header>

      <!-- 页面内容 - 添加滚动容器 -->
      <main class="flex-1 overflow-y-auto p-6">
        <router-view />
      </main>
    </SidebarInset>
  </SidebarProvider>
</template>

<style scoped lang="scss">
/* 平滑过渡 */
button {
  transition: all 0.2s ease;
}
</style>
