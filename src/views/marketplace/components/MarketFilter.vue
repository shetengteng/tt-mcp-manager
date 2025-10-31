<script setup lang="ts">
// MCP市场筛选器组件
import { Filter } from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

// 定义 props
interface Props {
  selectedCategory: string
  selectedSort: string
}

defineProps<Props>()

// 定义 emit 事件
const emit = defineEmits<{
  'update:selectedCategory': [value: string]
  'update:selectedSort': [value: string]
}>()
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center gap-2">
        <Filter class="h-5 w-5" />
        筛选
      </CardTitle>
    </CardHeader>
    <CardContent class="space-y-6">
      <!-- 分类 -->
      <div>
        <Label class="text-sm font-medium mb-3 block">
          分类
        </Label>
        <RadioGroup
          :model-value="selectedCategory"
          @update:model-value="emit('update:selectedCategory', $event)"
        >
          <div class="flex items-center space-x-2 mb-2">
            <RadioGroupItem
              id="cat-all"
              value=""
            />
            <Label
              for="cat-all"
              class="cursor-pointer"
            >
              全部
            </Label>
          </div>
          <div class="flex items-center space-x-2 mb-2">
            <RadioGroupItem
              id="cat-official"
              value="official"
            />
            <Label
              for="cat-official"
              class="cursor-pointer"
            >
              官方
            </Label>
          </div>
          <div class="flex items-center space-x-2 mb-2">
            <RadioGroupItem
              id="cat-ai"
              value="ai"
            />
            <Label
              for="cat-ai"
              class="cursor-pointer"
            >
              AI 工具
            </Label>
          </div>
          <div class="flex items-center space-x-2 mb-2">
            <RadioGroupItem
              id="cat-dev"
              value="development"
            />
            <Label
              for="cat-dev"
              class="cursor-pointer"
            >
              开发工具
            </Label>
          </div>
          <div class="flex items-center space-x-2 mb-2">
            <RadioGroupItem
              id="cat-data"
              value="data"
            />
            <Label
              for="cat-data"
              class="cursor-pointer"
            >
              数据处理
            </Label>
          </div>
        </RadioGroup>
      </div>

      <!-- 排序 -->
      <div>
        <Label class="text-sm font-medium mb-3 block">
          排序方式
        </Label>
        <RadioGroup
          :model-value="selectedSort"
          @update:model-value="emit('update:selectedSort', $event)"
        >
          <div class="flex items-center space-x-2 mb-2">
            <RadioGroupItem
              id="sort-stars"
              value="stars"
            />
            <Label
              for="sort-stars"
              class="cursor-pointer"
            >
              星标数
            </Label>
          </div>
          <div class="flex items-center space-x-2 mb-2">
            <RadioGroupItem
              id="sort-updated"
              value="updated"
            />
            <Label
              for="sort-updated"
              class="cursor-pointer"
            >
              最近更新
            </Label>
          </div>
          <div class="flex items-center space-x-2 mb-2">
            <RadioGroupItem
              id="sort-created"
              value="created"
            />
            <Label
              for="sort-created"
              class="cursor-pointer"
            >
              最新发布
            </Label>
          </div>
        </RadioGroup>
      </div>
    </CardContent>
  </Card>
</template>

