<script setup lang="ts">
// 主布局组件 - 可拖动侧边栏
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { LayoutDashboard, Store, FileText, Settings, PanelLeft } from 'lucide-vue-next'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const router = useRouter()
const route = useRoute()

// 侧边栏状态
const isCollapsed = ref(false)
const layoutKey = ref(0)

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

// 面板大小数组（左侧和右侧的百分比）
// 展开时约 240px (15%)，收起时约 80px (5%)
const panelSizes = ref([15, 85])

// 切换侧边栏折叠状态
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
  // 更新面板大小
  if (isCollapsed.value) {
    // 收起：只保留图标宽度，稍宽一些避免挤压
    panelSizes.value = [5, 95]
  } else {
    // 展开：正常宽度
    panelSizes.value = [15, 85]
  }
  // 强制重新渲染
  layoutKey.value++
}

// 监听面板大小变化
const handlePanelResize = (sizes: number[]) => {
  panelSizes.value = sizes
  // 当拖动到很小时自动折叠为图标模式
  if (sizes[0] && sizes[0] < 8) {
    isCollapsed.value = true
  } else if (sizes[0] && sizes[0] > 10) {
    isCollapsed.value = false
  }
}
</script>

<template>
  <TooltipProvider>
    <ResizablePanelGroup
      id="main-layout"
      :key="layoutKey"
      direction="horizontal"
      class="h-screen w-full"
      @layout="handlePanelResize"
    >
      <!-- 左侧可拖动侧边栏 -->
      <ResizablePanel
        id="sidebar"
        :default-size="isCollapsed ? 5 : 15"
        :min-size="5"
        :max-size="30"
        :collapsible="false"
      >
        <div class="flex h-full flex-col bg-muted/40 border-r">
          <!-- 侧边栏头部 -->
          <div class="p-4">
            <div v-if="!isCollapsed" class="flex items-center gap-2">
              <div
                class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
              >
                <span class="text-lg font-bold">M</span>
              </div>
              <div class="flex flex-col">
                <span class="text-sm font-semibold">MCP Manager</span>
                <span class="text-xs text-muted-foreground">服务器管理工具</span>
              </div>
            </div>
            <div v-else class="flex justify-center">
              <div
                class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
              >
                <span class="text-sm font-bold">M</span>
              </div>
            </div>
          </div>

          <!-- 侧边栏内容 -->
          <div class="flex-1 overflow-y-auto p-2">
            <div class="space-y-1">
              <div v-for="item in menuItems" :key="item.path">
                <!-- 展开状态 -->
                <Button
                  v-if="!isCollapsed"
                  :variant="isActive(item.path) ? 'secondary' : 'ghost'"
                  class="w-full justify-start"
                  @click="navigateTo(item.path)"
                >
                  <component :is="item.icon" class="h-4 w-4 mr-2" />
                  <span>{{ item.title }}</span>
                </Button>

                <!-- 折叠状态 - 只显示图标 -->
                <Tooltip v-else>
                  <TooltipTrigger as-child>
                    <Button
                      :variant="isActive(item.path) ? 'secondary' : 'ghost'"
                      size="icon"
                      class="w-full"
                      @click="navigateTo(item.path)"
                    >
                      <component :is="item.icon" class="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{{ item.title }}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          <!-- 侧边栏底部 -->
          <div class="p-4">
            <div v-if="!isCollapsed" class="flex items-center gap-2 text-xs text-muted-foreground">
              <span>版本 1.0.0</span>
            </div>
            <div v-else class="flex justify-center">
              <Tooltip>
                <TooltipTrigger>
                  <span class="text-xs text-muted-foreground">v1</span>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>版本 1.0.0</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </ResizablePanel>

      <!-- 拖动手柄 -->
      <ResizableHandle />

      <!-- 右侧主内容区域 -->
      <ResizablePanel id="content" :default-size="isCollapsed ? 95 : 85" :min-size="50">
        <div class="flex flex-col h-full">
          <!-- 顶部导航栏 -->
          <header class="flex h-14 shrink-0 items-center gap-4 bg-background px-6">
            <div class="flex flex-1 items-center justify-between">
              <div class="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger as-child>
                    <Button variant="ghost" size="icon" @click="toggleCollapse">
                      <PanelLeft class="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{{ isCollapsed ? '展开侧边栏' : '折叠侧边栏' }}</p>
                  </TooltipContent>
                </Tooltip>
                <h1 class="text-lg font-semibold">
                  {{ menuItems.find(item => item.path === route.path)?.title || 'MCP Manager' }}
                </h1>
              </div>
            </div>
          </header>

          <!-- 页面内容 -->
          <main class="flex-1 overflow-y-auto p-6">
            <router-view />
          </main>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  </TooltipProvider>
</template>

<style scoped lang="scss">
/* 平滑过渡 */
button {
  transition: all 0.2s ease;
}
</style>
