<script setup lang="ts">
import { ref } from 'vue'
import {
  ChevronDown,
  ChevronUp,
  BookOpen,
  FolderTree,
  Settings,
  CheckCircle
} from 'lucide-vue-next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

// 是否展开帮助
const isExpanded = ref(false)
</script>

<template>
  <Card class="mb-6 border-blue-200 bg-blue-50/50">
    <CardHeader class="pb-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <BookOpen class="h-5 w-5 text-blue-600" />
          <CardTitle class="text-lg"> 使用指南 </CardTitle>
        </div>
        <Button variant="ghost" size="sm" @click="isExpanded = !isExpanded">
          <ChevronDown v-if="!isExpanded" class="h-4 w-4" />
          <ChevronUp v-else class="h-4 w-4" />
        </Button>
      </div>
      <CardDescription>了解如何安装和使用 Cursor Rules</CardDescription>
    </CardHeader>

    <CardContent v-if="isExpanded" class="space-y-4 text-sm max-h-[500px] overflow-y-auto pr-2">
      <!-- 什么是 Cursor Rules -->
      <div>
        <h3 class="font-semibold mb-2 flex items-center gap-2">
          <BookOpen class="h-4 w-4 text-blue-600" />
          什么是 Cursor Rules？
        </h3>
        <p class="text-muted-foreground leading-relaxed">
          Cursor Rules 是一套编程规范和最佳实践的集合，可以帮助 AI
          助手更好地理解你的项目需求和编码风格。 通过安装适合的 Rules，你可以让 AI
          生成更符合项目规范的代码。
        </p>
      </div>

      <Separator />

      <!-- 安装类型说明 -->
      <div>
        <h3 class="font-semibold mb-3 flex items-center gap-2">
          <FolderTree class="h-4 w-4 text-blue-600" />
          安装类型说明
        </h3>
        <div class="space-y-3">
          <!-- 项目级别 -->
          <div class="p-3 bg-white rounded-md border">
            <div class="flex items-center gap-2 mb-2">
              <Badge variant="default"> 项目级别 </Badge>
              <span class="text-xs text-muted-foreground">推荐使用</span>
            </div>
            <p class="text-muted-foreground text-xs leading-relaxed mb-2">
              在项目根目录创建
              <code class="px-1 py-0.5 bg-muted rounded text-xs">.cursorrules</code> 文件，
              仅对当前项目生效。
            </p>
            <div class="text-xs text-muted-foreground">
              <div class="font-medium mb-1">适用场景：</div>
              <ul class="list-disc list-inside space-y-0.5 ml-2">
                <li>特定技术栈的项目（如 Vue、React 等）</li>
                <li>有明确编码规范的团队项目</li>
                <li>需要针对性优化的单一项目</li>
              </ul>
            </div>
          </div>

          <!-- 工作区级别 -->
          <div class="p-3 bg-white rounded-md border">
            <div class="flex items-center gap-2 mb-2">
              <Badge variant="secondary"> 工作区级别 </Badge>
            </div>
            <p class="text-muted-foreground text-xs leading-relaxed mb-2">
              在工作区目录的
              <code class="px-1 py-0.5 bg-muted rounded text-xs">.cursor/rules/</code>
              文件夹中创建规则文件，可以在工作区内的多个项目间共享。
            </p>
            <div class="text-xs text-muted-foreground">
              <div class="font-medium mb-1">适用场景：</div>
              <ul class="list-disc list-inside space-y-0.5 ml-2">
                <li>多个项目使用相同技术栈</li>
                <li>团队共享的编码规范</li>
                <li>需要管理多个规则配置</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <!-- 使用步骤 -->
      <div>
        <h3 class="font-semibold mb-3 flex items-center gap-2">
          <Settings class="h-4 w-4 text-blue-600" />
          使用步骤
        </h3>
        <div class="space-y-2">
          <div class="flex items-start gap-2">
            <div
              class="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold shrink-0 mt-0.5"
            >
              1
            </div>
            <p class="text-muted-foreground text-xs leading-relaxed">
              浏览并搜索适合你项目的 Rules（可以按分类、语言筛选）
            </p>
          </div>
          <div class="flex items-start gap-2">
            <div
              class="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold shrink-0 mt-0.5"
            >
              2
            </div>
            <p class="text-muted-foreground text-xs leading-relaxed">
              点击「安装」按钮，选择项目路径和安装类型
            </p>
          </div>
          <div class="flex items-start gap-2">
            <div
              class="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold shrink-0 mt-0.5"
            >
              3
            </div>
            <p class="text-muted-foreground text-xs leading-relaxed">
              完成安装后，Cursor 会自动识别并应用规则
            </p>
          </div>
          <div class="flex items-start gap-2">
            <div
              class="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold shrink-0 mt-0.5"
            >
              4
            </div>
            <p class="text-muted-foreground text-xs leading-relaxed">
              在 Cursor 中使用 AI 助手时，AI 会参考这些规则生成代码
            </p>
          </div>
        </div>
      </div>

      <Separator />

      <!-- 注意事项 -->
      <div>
        <h3 class="font-semibold mb-3 flex items-center gap-2">
          <CheckCircle class="h-4 w-4 text-blue-600" />
          注意事项
        </h3>
        <ul class="space-y-2 text-muted-foreground text-xs">
          <li class="flex items-start gap-2">
            <span class="text-blue-600 mt-0.5">•</span>
            <span class="leading-relaxed"> 同一项目建议只安装一套主要的 Rules，避免规则冲突 </span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-blue-600 mt-0.5">•</span>
            <span class="leading-relaxed">
              安装后需要重新加载 Cursor 窗口才能生效（Cmd/Ctrl + Shift + P → Reload Window）
            </span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-blue-600 mt-0.5">•</span>
            <span class="leading-relaxed">
              可以随时编辑
              <code class="px-1 py-0.5 bg-muted rounded">.cursorrules</code> 文件来自定义规则
            </span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-blue-600 mt-0.5">•</span>
            <span class="leading-relaxed"> 如需卸载，直接删除对应的规则文件即可 </span>
          </li>
        </ul>
      </div>

      <!-- 快速提示 -->
      <div class="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
        <div class="flex items-start gap-2">
          <span class="text-yellow-600 text-lg">💡</span>
          <div class="flex-1">
            <p class="text-xs font-medium text-yellow-900 mb-1">快速提示</p>
            <p class="text-xs text-yellow-700 leading-relaxed">
              对于新项目，推荐先安装「项目级别」的技术栈规则（如 Vue、React），
              再根据需要添加其他规则（如代码质量、最佳实践等）。
            </p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
