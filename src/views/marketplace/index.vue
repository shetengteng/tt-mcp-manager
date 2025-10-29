<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useMarketplaceStore } from '@/stores/marketplace'
import { useServerStore } from '@/stores/servers'
import { useSettingsStore } from '@/stores/settings'
import { useToast } from '@/components/ui/toast/use-toast'
import { Search, Star, Download, ExternalLink, Github, Filter } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import type { MarketItem } from '@/types/electron'

const marketplaceStore = useMarketplaceStore()
const serverStore = useServerStore()
const settingsStore = useSettingsStore()
const { toast } = useToast()
const selectedCategory = ref('')
const selectedSort = ref('stars')
const selectedLanguage = ref('')

// 对话框状态
const showInstallDialog = ref(false)
const showDetailsDialog = ref(false)
const currentItem = ref<MarketItem | null>(null)
const installing = ref(false)

// 安装配置
const installConfig = ref({
  name: '',
  workingDirectory: '',
  env: {} as Record<string, string>,
  args: [] as string[]
})

onMounted(async () => {
  await settingsStore.loadSettings()
  marketplaceStore.search()
})

function handleSearch() {
  marketplaceStore.search({ page: 1 })
}

function handleCategoryChange(value: string) {
  selectedCategory.value = value
  marketplaceStore.setCategory(value)
  handleSearch()
}

function handleSortChange(value: string) {
  selectedSort.value = value
  marketplaceStore.searchOptions.sort = value as 'stars' | 'updated' | 'created'
  handleSearch()
}

function handleLanguageChange(value: string) {
  selectedLanguage.value = value
  marketplaceStore.setLanguage(value)
  handleSearch()
}

// 打开安装对话框
async function openInstallDialog(item: MarketItem) {
  currentItem.value = item
  // 确保设置已加载
  if (!settingsStore.settings.defaultInstallPath) {
    await settingsStore.loadSettings()
  }

  // 使用设置中的默认路径 + 服务器名称
  // 清理服务器名称：去掉特殊字符，去掉开头/结尾/连续的横线
  let serverNameSlug = item.name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-') // 替换特殊字符为 -
    .replace(/^-+|-+$/g, '') // 去掉开头和结尾的 -
    .replace(/-+/g, '-') // 将连续的 - 替换为单个 -

  const basePath = settingsStore.settings.defaultInstallPath || '~/mcp-servers'
  const defaultWorkDir = `${basePath}/${serverNameSlug}`

  installConfig.value = {
    name: item.displayName,
    workingDirectory: defaultWorkDir,
    env: {},
    args: []
  }
  showInstallDialog.value = true
}

// 打开详情对话框
async function openDetailsDialog(item: MarketItem) {
  currentItem.value = item
  showDetailsDialog.value = true
}

// 执行安装
async function handleInstall() {
  if (!currentItem.value) return

  installing.value = true
  try {
    await marketplaceStore.install(currentItem.value, installConfig.value)
    showInstallDialog.value = false
    // 刷新服务器列表
    await serverStore.loadServers()
    toast({
      title: '安装成功',
      description: `${currentItem.value.displayName} 已成功安装并添加到服务器列表`,
      duration: 3000
    })
  } catch (error: any) {
    toast({
      title: '安装失败',
      description: error.message || '安装过程中发生错误',
      variant: 'destructive',
      duration: 3000
    })
  } finally {
    installing.value = false
  }
}

// 打开外部链接
function openExternal(url: string) {
  window.open(url, '_blank')
}
</script>

<template>
  <div class="flex gap-6 h-full overflow-hidden">
    <!-- 左侧筛选器 - 固定不滚动 -->
    <div class="w-64 shrink-0 overflow-y-auto">
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Filter class="h-5 w-5" />
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-6">
          <!-- 分类 -->
          <div>
            <Label class="text-sm font-medium mb-3 block">分类</Label>
            <RadioGroup :model-value="selectedCategory" @update:model-value="handleCategoryChange">
              <div class="flex items-center space-x-2 mb-2">
                <RadioGroupItem id="cat-all" value="" />
                <Label for="cat-all" class="font-normal cursor-pointer">全部</Label>
              </div>
              <div class="flex items-center space-x-2 mb-2">
                <RadioGroupItem id="cat-dev" value="开发工具" />
                <Label for="cat-dev" class="font-normal cursor-pointer">开发工具</Label>
              </div>
              <div class="flex items-center space-x-2 mb-2">
                <RadioGroupItem id="cat-fs" value="文件系统" />
                <Label for="cat-fs" class="font-normal cursor-pointer">文件系统</Label>
              </div>
              <div class="flex items-center space-x-2 mb-2">
                <RadioGroupItem id="cat-data" value="数据平台" />
                <Label for="cat-data" class="font-normal cursor-pointer">数据平台</Label>
              </div>
              <div class="flex items-center space-x-2">
                <RadioGroupItem id="cat-web" value="Web服务" />
                <Label for="cat-web" class="font-normal cursor-pointer">Web服务</Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          <!-- 编程语言 -->
          <div>
            <Label class="text-sm font-medium mb-3 block">编程语言</Label>
            <RadioGroup :model-value="selectedLanguage" @update:model-value="handleLanguageChange">
              <div class="flex items-center space-x-2 mb-2">
                <RadioGroupItem id="lang-all" value="" />
                <Label for="lang-all" class="font-normal cursor-pointer">全部</Label>
              </div>
              <div class="flex items-center space-x-2 mb-2">
                <RadioGroupItem id="lang-ts" value="TypeScript" />
                <Label for="lang-ts" class="font-normal cursor-pointer">TypeScript</Label>
              </div>
              <div class="flex items-center space-x-2 mb-2">
                <RadioGroupItem id="lang-python" value="Python" />
                <Label for="lang-python" class="font-normal cursor-pointer">Python</Label>
              </div>
              <div class="flex items-center space-x-2 mb-2">
                <RadioGroupItem id="lang-go" value="Go" />
                <Label for="lang-go" class="font-normal cursor-pointer">Go</Label>
              </div>
              <div class="flex items-center space-x-2">
                <RadioGroupItem id="lang-docker" value="Docker" />
                <Label for="lang-docker" class="font-normal cursor-pointer">Docker</Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          <!-- 排序 - 改用 RadioGroup -->
          <div>
            <Label class="text-sm font-medium mb-3 block">排序</Label>
            <RadioGroup :model-value="selectedSort" @update:model-value="handleSortChange">
              <div class="flex items-center space-x-2 mb-2">
                <RadioGroupItem id="sort-stars" value="stars" />
                <Label for="sort-stars" class="font-normal cursor-pointer">最热门</Label>
              </div>
              <div class="flex items-center space-x-2 mb-2">
                <RadioGroupItem id="sort-updated" value="updated" />
                <Label for="sort-updated" class="font-normal cursor-pointer">最新更新</Label>
              </div>
              <div class="flex items-center space-x-2">
                <RadioGroupItem id="sort-created" value="created" />
                <Label for="sort-created" class="font-normal cursor-pointer">最新创建</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- 右侧主内容区 - 可滚动 -->
    <div class="flex-1 min-w-0 flex flex-col overflow-hidden">
      <!-- 搜索栏 - 固定不滚动 -->
      <div class="mb-6 shrink-0">
        <div class="flex gap-2">
          <Input
            v-model="marketplaceStore.searchOptions.query"
            type="text"
            placeholder="搜索 MCP Server..."
            class="flex-1"
            @keyup.enter="handleSearch"
          />
          <Button @click="handleSearch">
            <Search class="h-4 w-4 mr-2" />
            搜索
          </Button>
        </div>
      </div>

      <!-- 可滚动区域 -->
      <div class="flex-1 overflow-y-auto">
        <!-- 结果统计 -->
        <div class="mb-4 text-sm text-muted-foreground">
          找到 {{ marketplaceStore.total }} 个结果
        </div>

        <!-- 加载中 -->
        <div v-if="marketplaceStore.loading" class="flex items-center justify-center py-12">
          <p class="text-muted-foreground">加载中...</p>
        </div>

        <!-- 服务器卡片网格 -->
        <div
          v-else-if="marketplaceStore.items.length > 0"
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6"
        >
          <Card
            v-for="item in marketplaceStore.items"
            :key="item.id"
            class="hover:border-primary cursor-pointer transition-colors flex flex-col"
            @click="marketplaceStore.selectItem(item)"
          >
            <CardHeader>
              <div class="flex items-start gap-2 mb-3">
                <CardTitle class="text-base leading-relaxed flex-1 min-w-0 break-normal">
                  {{ item.displayName }}
                </CardTitle>
                <div class="flex items-center gap-1 shrink-0">
                  <Badge v-if="item.official" variant="default" class="text-xs whitespace-nowrap">
                    官方
                  </Badge>
                  <Badge variant="secondary" class="text-xs whitespace-nowrap">
                    {{ item.language }}
                  </Badge>
                </div>
              </div>
              <CardDescription class="line-clamp-3 text-sm leading-relaxed">
                {{ item.descriptionZh || item.description }}
              </CardDescription>
            </CardHeader>

            <CardContent class="flex-1">
              <div class="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <div class="flex items-center gap-1">
                  <Star class="h-3 w-3" />
                  <span>{{ item.stars.toLocaleString() }}</span>
                </div>
                <span>by {{ item.author }}</span>
              </div>
              <div
                class="text-xs font-mono text-muted-foreground truncate"
                :title="item.installCommand"
              >
                {{ item.installCommand }}
              </div>
            </CardContent>

            <CardFooter class="flex gap-2 mt-auto">
              <Button size="sm" class="flex-1" @click.stop="openInstallDialog(item)">
                <Download class="h-3 w-3 mr-1" />
                安装
              </Button>
              <Button size="sm" variant="outline" @click.stop="openDetailsDialog(item)">
                详情
              </Button>
            </CardFooter>
          </Card>
        </div>

        <!-- 空状态 -->
        <div v-else class="flex items-center justify-center py-12">
          <p class="text-muted-foreground">没有找到匹配的服务器</p>
        </div>
      </div>
    </div>

    <!-- 安装对话框 -->
    <Dialog v-model:open="showInstallDialog">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>安装 {{ currentItem?.displayName }}</DialogTitle>
          <DialogDescription> 配置服务器安装选项 </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-4">
          <!-- 服务器名称 -->
          <div class="space-y-2">
            <Label for="server-name">服务器名称</Label>
            <Input id="server-name" v-model="installConfig.name" placeholder="输入服务器名称" />
          </div>

          <!-- 工作目录 -->
          <div class="space-y-2">
            <Label for="working-dir">工作目录</Label>
            <Input
              id="working-dir"
              v-model="installConfig.workingDirectory"
              placeholder="服务器的工作目录"
            />
            <p class="text-xs text-muted-foreground">
              💡 服务器运行时的工作目录。对于 npx 包，程序本身由 npx
              管理，此目录用于存放服务器产生的数据和配置文件。
            </p>
          </div>

          <!-- 安装命令显示 -->
          <div class="space-y-2">
            <Label>安装命令</Label>
            <div class="p-3 bg-muted rounded-md">
              <code class="text-xs">{{ currentItem?.installCommand }}</code>
            </div>
          </div>

          <!-- 提示信息 -->
          <div class="text-sm text-muted-foreground">
            <p>点击安装后，将执行以下操作：</p>
            <ul class="list-disc list-inside mt-2 space-y-1">
              <li>创建工作目录（如果不存在）</li>
              <li>创建服务器配置</li>
              <li>添加到服务器列表</li>
            </ul>
            <p class="mt-2 text-xs">📦 注意：npx 包会在首次运行时自动下载，无需手动安装</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" :disabled="installing" @click="showInstallDialog = false">
            取消
          </Button>
          <Button :disabled="installing || !installConfig.name" @click="handleInstall">
            {{ installing ? '安装中...' : '安装' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 详情对话框 -->
    <Dialog v-model:open="showDetailsDialog">
      <DialogContent class="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            {{ currentItem?.displayName }}
            <Badge v-if="currentItem?.official" variant="default" class="ml-2"> 官方 </Badge>
          </DialogTitle>
          <DialogDescription> by {{ currentItem?.author }} </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-4">
          <!-- 基本信息 -->
          <div>
            <h3 class="font-medium mb-2">描述</h3>
            <p class="text-sm text-muted-foreground">
              {{ currentItem?.descriptionZh || currentItem?.description }}
            </p>
          </div>

          <!-- 统计信息 -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <Label class="text-xs text-muted-foreground">Stars</Label>
              <div class="flex items-center gap-1 mt-1">
                <Star class="h-4 w-4 text-yellow-500" />
                <span class="font-medium">{{ currentItem?.stars.toLocaleString() }}</span>
              </div>
            </div>
            <div>
              <Label class="text-xs text-muted-foreground">语言</Label>
              <div class="mt-1">
                <Badge variant="secondary">
                  {{ currentItem?.language }}
                </Badge>
              </div>
            </div>
          </div>

          <!-- 分类 -->
          <div v-if="currentItem?.category && currentItem.category.length > 0">
            <Label class="text-xs text-muted-foreground">分类</Label>
            <div class="flex flex-wrap gap-2 mt-2">
              <Badge v-for="cat in currentItem.category" :key="cat" variant="outline">
                {{ cat }}
              </Badge>
            </div>
          </div>

          <!-- 安装信息 -->
          <div>
            <Label class="text-xs text-muted-foreground">安装命令</Label>
            <div class="mt-2 p-3 bg-muted rounded-md">
              <code class="text-sm">{{ currentItem?.installCommand }}</code>
            </div>
          </div>

          <!-- 链接 -->
          <div class="flex gap-2">
            <Button
              v-if="currentItem?.githubUrl"
              variant="outline"
              size="sm"
              @click="openExternal(currentItem?.githubUrl || '')"
            >
              <Github class="h-4 w-4 mr-2" />
              GitHub
            </Button>
            <Button
              v-if="currentItem?.homepage"
              variant="outline"
              size="sm"
              @click="openExternal(currentItem?.homepage || '')"
            >
              <ExternalLink class="h-4 w-4 mr-2" />
              主页
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="showDetailsDialog = false"> 关闭 </Button>
          <Button @click="openInstallDialog(currentItem!); showDetailsDialog = false">
            <Download class="h-4 w-4 mr-2" />
            安装
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
