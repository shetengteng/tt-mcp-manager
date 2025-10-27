<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useMarketplaceStore } from '@/stores/marketplace'
import { Search, Star, Download } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

const marketplaceStore = useMarketplaceStore()
const selectedCategory = ref('')
const selectedSort = ref('stars')

onMounted(() => {
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
</script>

<template>
  <div class="flex gap-6 h-full overflow-hidden">
    <!-- 左侧筛选器 - 固定不滚动 -->
    <div class="w-64 shrink-0 overflow-y-auto">
      <Card>
        <CardHeader>
          <CardTitle>筛选器</CardTitle>
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
        <div v-else-if="marketplaceStore.items.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
        <Card
          v-for="item in marketplaceStore.items"
          :key="item.id"
          class="hover:border-primary cursor-pointer transition-colors"
          @click="marketplaceStore.selectItem(item)"
        >
          <CardHeader>
            <div class="flex items-start gap-2 mb-2">
              <CardTitle class="text-lg flex-1 min-w-0 break-words">
                {{ item.displayName }}
              </CardTitle>
              <div class="flex items-center gap-1 shrink-0">
                <Badge v-if="item.official" variant="default" class="text-xs whitespace-nowrap">官方</Badge>
                <Badge variant="secondary" class="text-xs whitespace-nowrap">{{ item.language }}</Badge>
              </div>
            </div>
            <CardDescription class="line-clamp-2">
              {{ item.description }}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div class="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <div class="flex items-center gap-1">
                <Star class="h-3 w-3" />
                <span>{{ item.stars.toLocaleString() }}</span>
              </div>
              <span>by {{ item.author }}</span>
            </div>
            <div class="text-xs font-mono text-muted-foreground truncate" :title="item.installCommand">
              {{ item.installCommand }}
            </div>
          </CardContent>

          <CardFooter class="flex gap-2">
            <Button
              size="sm"
              class="flex-1"
              @click.stop="console.log('安装', item.name)"
            >
              安装
            </Button>
            <Button
              size="sm"
              variant="outline"
              @click.stop="console.log('查看详情', item.name)"
            >
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
  </div>
</template>

