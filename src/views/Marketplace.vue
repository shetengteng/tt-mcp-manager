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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
  marketplaceStore.searchOptions.sort = value
  handleSearch()
}
</script>

<template>
  <div class="h-full flex gap-6">
    <!-- 侧边栏（筛选器） -->
    <Card class="w-64 shrink-0">
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

        <!-- 排序 -->
        <div>
          <Label class="text-sm font-medium mb-3 block">排序</Label>
          <Select :model-value="selectedSort" @update:model-value="handleSortChange">
            <SelectTrigger>
              <SelectValue placeholder="选择排序方式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stars">最热门</SelectItem>
              <SelectItem value="updated">最新更新</SelectItem>
              <SelectItem value="created">最新创建</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>

    <!-- 主内容区 -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- 搜索栏 -->
      <div class="mb-6">
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

      <!-- 结果统计 -->
      <div class="mb-4 text-sm text-muted-foreground">
        找到 {{ marketplaceStore.total }} 个结果
      </div>

      <!-- 加载中 -->
      <div v-if="marketplaceStore.loading" class="flex-1 flex items-center justify-center">
        <p class="text-muted-foreground">加载中...</p>
      </div>

      <!-- 服务器卡片网格 -->
      <div v-else-if="marketplaceStore.items.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card
          v-for="item in marketplaceStore.items"
          :key="item.id"
          class="hover:border-primary cursor-pointer transition-colors"
          @click="marketplaceStore.selectItem(item)"
        >
          <CardHeader>
            <div class="flex items-start justify-between">
              <CardTitle class="text-lg">{{ item.name }}</CardTitle>
              <Badge variant="secondary">{{ item.language }}</Badge>
            </div>
            <CardDescription class="line-clamp-2">
              {{ item.description }}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div class="flex items-center justify-between text-xs text-muted-foreground">
              <div class="flex items-center gap-1">
                <Star class="h-3 w-3" />
                <span>{{ item.stars.toLocaleString() }}</span>
              </div>
              <div class="flex items-center gap-1">
                <Download class="h-3 w-3" />
                <span>{{ item.downloadCount > 0 ? item.downloadCount.toLocaleString() : 'N/A' }}</span>
              </div>
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
      <div v-else class="flex-1 flex items-center justify-center">
        <p class="text-muted-foreground">没有找到匹配的服务器</p>
      </div>
    </div>
  </div>
</template>

