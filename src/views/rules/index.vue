<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRulesStore } from '@/stores/rules'
import { useToast } from '@/components/ui/toast/use-toast'
import { Search, Download, Filter, Info } from 'lucide-vue-next'
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
import type { CursorRule } from '@/types/electron'
import HelpGuide from './components/HelpGuide.vue'

const rulesStore = useRulesStore()
const { toast } = useToast()
const selectedCategory = ref('')
const selectedSort = ref('stars')
const selectedLanguage = ref('')

// 对话框状态
const showInstallDialog = ref(false)
const showDetailsDialog = ref(false)
const currentRule = ref<CursorRule | null>(null)
const installing = ref(false)

// 安装配置
const installConfig = ref({
  targetPath: '',
  installType: 'project' as 'project' | 'workspace' | 'global',
  enabled: true
})

onMounted(async () => {
  await rulesStore.search()
})

function handleSearch() {
  rulesStore.search({ page: 1 })
}

function handleCategoryChange(value: string) {
  selectedCategory.value = value
  rulesStore.setCategory(value)
  handleSearch()
}

function handleSortChange(value: string) {
  selectedSort.value = value
  rulesStore.setSort(value as any)
  handleSearch()
}

function handleLanguageChange(value: string) {
  selectedLanguage.value = value
  rulesStore.setLanguage(value)
  handleSearch()
}

// 打开安装对话框
function openInstallDialog(rule: CursorRule) {
  currentRule.value = rule
  installConfig.value = {
    targetPath: '',
    installType: 'project',
    enabled: true
  }
  showInstallDialog.value = true
}

// 打开详情对话框
function openDetailsDialog(rule: CursorRule) {
  currentRule.value = rule
  showDetailsDialog.value = true
}

// 执行安装
async function handleInstall() {
  if (!currentRule.value || !installConfig.value.targetPath) {
    toast({
      title: '错误',
      description: '请选择安装路径',
      variant: 'destructive',
      duration: 3000
    })
    return
  }

  installing.value = true
  try {
    const result = await rulesStore.install(currentRule.value.id, installConfig.value)

    if (result.success) {
      showInstallDialog.value = false
      toast({
        title: '安装成功',
        description: `${currentRule.value.displayName} 已成功安装`,
        duration: 3000
      })
    } else {
      toast({
        title: '安装失败',
        description: result.error || '安装过程中发生错误',
        variant: 'destructive',
        duration: 3000
      })
    }
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

// 选择文件夹
async function selectFolder() {
  try {
    const result = await window.electronAPI.settings.selectFolder()
    if (result.success && result.path) {
      installConfig.value.targetPath = result.path
    }
  } catch (error) {
    console.error('选择文件夹失败:', error)
  }
}
</script>

<template>
  <div class="flex gap-6 h-full overflow-hidden">
    <!-- 左侧筛选器 -->
    <div class="w-64 shrink-0 overflow-y-auto">
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
            <Label class="text-sm font-medium mb-3 block">分类</Label>
            <RadioGroup :model-value="selectedCategory" @update:model-value="handleCategoryChange">
              <div class="flex items-center space-x-2 mb-2">
                <RadioGroupItem id="cat-all" value="" />
                <Label for="cat-all" class="font-normal cursor-pointer">全部</Label>
              </div>
              <div class="flex items-center space-x-2 mb-2">
                <RadioGroupItem id="cat-frontend" value="前端框架" />
                <Label for="cat-frontend" class="font-normal cursor-pointer">前端框架</Label>
              </div>
              <div class="flex items-center space-x-2 mb-2">
                <RadioGroupItem id="cat-lang" value="编程语言" />
                <Label for="cat-lang" class="font-normal cursor-pointer">编程语言</Label>
              </div>
              <div class="flex items-center space-x-2 mb-2">
                <RadioGroupItem id="cat-test" value="测试" />
                <Label for="cat-test" class="font-normal cursor-pointer">测试</Label>
              </div>
              <div class="flex items-center space-x-2">
                <RadioGroupItem id="cat-best" value="最佳实践" />
                <Label for="cat-best" class="font-normal cursor-pointer">最佳实践</Label>
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
                <RadioGroupItem id="lang-vue" value="Vue" />
                <Label for="lang-vue" class="font-normal cursor-pointer">Vue</Label>
              </div>
              <div class="flex items-center space-x-2 mb-2">
                <RadioGroupItem id="lang-react" value="React" />
                <Label for="lang-react" class="font-normal cursor-pointer">React</Label>
              </div>
              <div class="flex items-center space-x-2 mb-2">
                <RadioGroupItem id="lang-ts" value="TypeScript" />
                <Label for="lang-ts" class="font-normal cursor-pointer">TypeScript</Label>
              </div>
              <div class="flex items-center space-x-2">
                <RadioGroupItem id="lang-python" value="Python" />
                <Label for="lang-python" class="font-normal cursor-pointer">Python</Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          <!-- 排序 -->
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

    <!-- 右侧主内容区 -->
    <div class="flex-1 min-w-0 flex flex-col overflow-hidden">
      <!-- 使用指南 -->
      <HelpGuide />

      <!-- 搜索栏 -->
      <div class="mb-6 shrink-0">
        <div class="flex gap-2">
          <Input
            v-model="rulesStore.searchOptions.query"
            type="text"
            placeholder="搜索 Cursor Rules..."
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
        <div class="mb-4 text-sm text-muted-foreground">找到 {{ rulesStore.total }} 条规则</div>

        <!-- 加载中 -->
        <div v-if="rulesStore.loading" class="flex items-center justify-center py-12">
          <p class="text-muted-foreground">加载中...</p>
        </div>

        <!-- 规则卡片网格 -->
        <div
          v-else-if="rulesStore.items.length > 0"
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6"
        >
          <Card
            v-for="rule in rulesStore.items"
            :key="rule.id"
            class="hover:border-primary cursor-pointer transition-colors flex flex-col"
            @click="rulesStore.selectRule(rule)"
          >
            <CardHeader>
              <div class="flex items-start gap-2 mb-3">
                <CardTitle class="text-base leading-relaxed flex-1 min-w-0 break-normal">
                  {{ rule.displayName }}
                </CardTitle>
                <div class="flex items-center gap-1 shrink-0">
                  <Badge v-if="rule.official" variant="default" class="text-xs whitespace-nowrap">
                    官方
                  </Badge>
                  <Badge variant="secondary" class="text-xs whitespace-nowrap">
                    {{ rule.language }}
                  </Badge>
                </div>
              </div>
              <CardDescription class="line-clamp-3 text-sm leading-relaxed">
                {{ rule.descriptionZh || rule.description }}
              </CardDescription>
            </CardHeader>

            <CardContent class="flex-1">
              <div class="text-xs text-muted-foreground">by {{ rule.author }}</div>
            </CardContent>

            <CardFooter class="flex gap-2 mt-auto">
              <Button size="sm" class="flex-1" @click.stop="openInstallDialog(rule)">
                <Download class="h-3 w-3 mr-1" />
                安装
              </Button>
              <Button size="sm" variant="outline" @click.stop="openDetailsDialog(rule)">
                详情
              </Button>
            </CardFooter>
          </Card>
        </div>

        <!-- 空状态 -->
        <div v-else class="flex items-center justify-center py-12">
          <p class="text-muted-foreground">没有找到匹配的规则</p>
        </div>
      </div>
    </div>

    <!-- 安装对话框 -->
    <Dialog v-model:open="showInstallDialog">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>安装 {{ currentRule?.displayName }}</DialogTitle>
          <DialogDescription>配置规则安装选项</DialogDescription>
        </DialogHeader>

        <!-- 简短说明 -->
        <div class="px-6 pb-2 pt-2">
          <div class="text-sm text-muted-foreground space-y-2">
            <p class="leading-relaxed">安装步骤：</p>
            <ol class="list-decimal list-inside space-y-1 text-xs">
              <li>选择要安装规则的项目或工作区路径</li>
              <li>选择安装类型（推荐使用项目级别）</li>
              <li>点击安装按钮完成安装</li>
            </ol>
          </div>
        </div>

        <div class="space-y-4 py-4">
          <!-- 安装路径 -->
          <div class="space-y-2">
            <Label for="target-path">安装路径</Label>
            <div class="flex gap-2">
              <Input
                id="target-path"
                v-model="installConfig.targetPath"
                placeholder="选择项目或工作区路径"
                readonly
              />
              <Button @click="selectFolder">选择</Button>
            </div>
            <p class="text-xs text-muted-foreground">选择你的项目根目录或工作区目录</p>
          </div>

          <!-- 安装类型 -->
          <div class="space-y-3">
            <Label>安装类型</Label>
            <RadioGroup v-model="installConfig.installType">
              <div
                class="flex items-start space-x-2 p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors"
              >
                <RadioGroupItem id="type-project" value="project" class="mt-1" />
                <div class="flex-1">
                  <Label for="type-project" class="font-normal cursor-pointer">
                    <div class="flex items-center gap-2 mb-1">
                      <span>项目级别</span>
                      <Badge variant="default" class="text-xs">推荐</Badge>
                    </div>
                    <p class="text-xs text-muted-foreground leading-relaxed">
                      在项目根目录创建
                      <code class="px-1 py-0.5 bg-muted rounded">.cursorrules</code> 文件，
                      仅对当前项目生效
                    </p>
                  </Label>
                </div>
              </div>
              <div
                class="flex items-start space-x-2 p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors"
              >
                <RadioGroupItem id="type-workspace" value="workspace" class="mt-1" />
                <div class="flex-1">
                  <Label for="type-workspace" class="font-normal cursor-pointer">
                    <div class="mb-1">工作区级别</div>
                    <p class="text-xs text-muted-foreground leading-relaxed">
                      在
                      <code class="px-1 py-0.5 bg-muted rounded">.cursor/rules/</code>
                      目录创建规则文件， 可在工作区内的多个项目间共享
                    </p>
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          <!-- 提示信息 -->
          <div class="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Info class="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <p class="text-xs text-blue-900 leading-relaxed">
              安装后需要重新加载 Cursor 窗口才能生效
              <br />
              （Cmd/Ctrl + Shift + P → Reload Window）
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" :disabled="installing" @click="showInstallDialog = false">
            取消
          </Button>
          <Button :disabled="installing || !installConfig.targetPath" @click="handleInstall">
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
            {{ currentRule?.displayName }}
            <Badge v-if="currentRule?.official" variant="default" class="ml-2">官方</Badge>
          </DialogTitle>
          <DialogDescription>by {{ currentRule?.author }}</DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-4">
          <!-- 基本信息 -->
          <div>
            <h3 class="font-medium mb-2">描述</h3>
            <p class="text-sm text-muted-foreground">
              {{ currentRule?.descriptionZh || currentRule?.description }}
            </p>
          </div>

          <!-- 语言和分类 -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <Label class="text-xs text-muted-foreground">语言</Label>
              <div class="mt-1">
                <Badge variant="secondary">
                  {{ currentRule?.language }}
                </Badge>
              </div>
            </div>
          </div>

          <!-- 分类 -->
          <div v-if="currentRule?.category && currentRule.category.length > 0">
            <Label class="text-xs text-muted-foreground">分类</Label>
            <div class="flex flex-wrap gap-2 mt-2">
              <Badge v-for="cat in currentRule.category" :key="cat" variant="outline">
                {{ cat }}
              </Badge>
            </div>
          </div>

          <!-- 规则内容预览 -->
          <div>
            <Label class="text-xs text-muted-foreground">规则内容</Label>
            <div class="mt-2 p-3 bg-muted rounded-md max-h-64 overflow-y-auto">
              <pre class="text-xs whitespace-pre-wrap">{{ currentRule?.content }}</pre>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="showDetailsDialog = false">关闭</Button>
          <Button
            @click="
              () => {
                openInstallDialog(currentRule!)
                showDetailsDialog = false
              }
            "
          >
            <Download class="h-4 w-4 mr-2" />
            安装
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
