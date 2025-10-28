<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, RefreshCcw } from 'lucide-vue-next'

// 定义模板接口
interface ServerTemplate {
  name: string
  displayName: string
  description: string
  category: string
  version: string
  author: string
  tags: string[]
  icon: string
  repository: string
  config: any
  requirements: any
  variables: any[]
  features: string[]
  permissions: any[]
  documentation: string
}

// 响应式数据
const templates = ref<ServerTemplate[]>([])
const searchQuery = ref('')
const selectedCategory = ref('all')
const loading = ref(false)

// 计算属性：过滤后的模板
const filteredTemplates = computed(() => {
  let result = templates.value

  // 按分类过滤
  if (selectedCategory.value !== 'all') {
    result = result.filter((t) => t.category === selectedCategory.value)
  }

  // 按搜索关键词过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(
      (t) =>
        t.displayName.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.tags?.some((tag) => tag.toLowerCase().includes(query))
    )
  }

  return result
})

// 计算属性：所有分类
const categories = computed(() => {
  if (!Array.isArray(templates.value)) {
    return ['all']
  }
  const cats = new Set(templates.value.map((t) => t.category))
  return ['all', ...Array.from(cats)]
})

// 获取分类显示名称
const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    all: '全部',
    system: '系统',
    development: '开发',
    database: '数据库',
    communication: '通讯',
    automation: '自动化',
  }
  return labels[category] || category
}

// 加载模板列表
const loadTemplates = async () => {
  loading.value = true
  try {
    const result = await window.electronAPI.template.getAll()
    // result 是 { success: true, data: [] } 格式
    if (result && result.success && Array.isArray(result.data)) {
      templates.value = result.data
    } else {
      templates.value = []
    }
    console.log('已加载模板:', templates.value.length)
  } catch (error) {
    console.error('加载模板失败:', error)
    templates.value = []
  } finally {
    loading.value = false
  }
}

// 使用模板
const useTemplate = async (template: ServerTemplate) => {
  console.log('使用模板:', template.name)
  // TODO: 打开配置对话框，让用户填写模板变量
  alert(`即将使用模板: ${template.displayName}\n功能即将实现...`)
}

// 生命周期钩子
onMounted(() => {
  loadTemplates()
})
</script>

<template>
  <div class="flex flex-col">
    <!-- 顶部工具栏 -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-2xl font-bold">模板库</h2>
          <p class="text-sm text-muted-foreground mt-1">
            💡 从模板快速创建常用的 MCP Server 配置
          </p>
        </div>
        <Button @click="loadTemplates" variant="outline" size="sm" :disabled="loading">
          <RefreshCcw :class="['h-4 w-4 mr-2', { 'animate-spin': loading }]" />
          刷新
        </Button>
      </div>

      <!-- 搜索和筛选 -->
      <div class="flex gap-4">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            placeholder="搜索模板..."
            class="pl-10"
          />
        </div>
        <div class="flex gap-2">
          <Button
            v-for="cat in categories"
            :key="cat"
            @click="selectedCategory = cat"
            :variant="selectedCategory === cat ? 'default' : 'outline'"
            size="sm"
          >
            {{ getCategoryLabel(cat) }}
          </Button>
        </div>
      </div>
    </div>

    <!-- 模板网格 -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <p class="text-muted-foreground">加载中...</p>
    </div>

    <div v-else-if="filteredTemplates.length === 0" class="flex flex-col items-center justify-center py-12">
      <p class="text-muted-foreground mb-2">未找到模板</p>
      <p class="text-sm text-muted-foreground">尝试调整搜索条件</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="template in filteredTemplates"
        :key="template.name"
        class="p-6 border rounded-lg hover:border-primary cursor-pointer transition-colors bg-card"
      >
        <div class="text-4xl mb-3">{{ template.icon }}</div>
        <h3 class="font-semibold mb-2">{{ template.displayName }}</h3>
        <p class="text-sm text-muted-foreground mb-4 line-clamp-2">
          {{ template.description }}
        </p>
        <div class="flex flex-wrap gap-2 mb-4">
          <Badge
            v-for="tag in template.tags.slice(0, 3)"
            :key="tag"
            variant="secondary"
            class="text-xs"
          >
            {{ tag }}
          </Badge>
        </div>
        <div class="flex items-center justify-between mb-4 text-xs text-muted-foreground">
          <span>{{ template.author }}</span>
          <span>v{{ template.version }}</span>
        </div>
        <Button @click="useTemplate(template)" class="w-full">
          使用此模板
        </Button>
      </div>
    </div>
  </div>
</template>

