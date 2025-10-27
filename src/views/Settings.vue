<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

// 响应式状态
const autoStart = ref(false)
const minimizeToTray = ref(false)
const keepBackground = ref(false)
const githubToken = ref('')
</script>

<template>
  <div>
    <div class="max-w-4xl space-y-6">
      <!-- 常规设置 -->
      <Card>
        <CardHeader>
          <CardTitle>常规设置</CardTitle>
          <CardDescription>配置应用的基本行为</CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label for="auto-start">开机时自动启动</Label>
              <p class="text-sm text-muted-foreground">
                系统启动时自动运行 MCP Manager
              </p>
            </div>
            <Switch id="auto-start" v-model:checked="autoStart" />
          </div>
          
          <Separator />
          
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label for="minimize-tray">最小化到系统托盘</Label>
              <p class="text-sm text-muted-foreground">
                点击最小化按钮时隐藏到系统托盘
              </p>
            </div>
            <Switch id="minimize-tray" v-model:checked="minimizeToTray" />
          </div>
          
          <Separator />
          
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label for="keep-background">关闭窗口时保持后台运行</Label>
              <p class="text-sm text-muted-foreground">
                关闭窗口时不退出应用，保持服务器运行
              </p>
            </div>
            <Switch id="keep-background" v-model:checked="keepBackground" />
          </div>
        </CardContent>
      </Card>

      <!-- API 设置 -->
      <Card>
        <CardHeader>
          <CardTitle>API 设置</CardTitle>
          <CardDescription>配置外部 API 的访问凭证</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <Label for="github-token">GitHub Personal Access Token (可选)</Label>
            <Input
              id="github-token"
              v-model="githubToken"
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            />
            <p class="text-xs text-muted-foreground">
              用于访问 GitHub API，提高请求限制到 5000/小时。在 GitHub Settings → Developer settings → Personal access tokens 中创建
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button>保存设置</Button>
        </CardFooter>
      </Card>

      <!-- Cursor 集成 -->
      <Card>
        <CardHeader>
          <CardTitle>Cursor 集成</CardTitle>
          <CardDescription>与 Cursor IDE 进行集成</CardDescription>
        </CardHeader>
        <CardContent>
          <Button>
            导出配置到 Cursor
          </Button>
          <p class="mt-3 text-sm text-muted-foreground">
            将当前所有服务器配置导出为 Cursor 可用的 JSON 格式，可以直接导入到 Cursor 的 MCP 配置中
          </p>
        </CardContent>
      </Card>

      <!-- 关于 -->
      <Card>
        <CardHeader>
          <CardTitle>关于 MCP Manager</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div>
            <p class="text-sm font-semibold">版本 1.0.0</p>
            <p class="text-sm text-muted-foreground mt-1">
              基于 Electron + Vue 3 + Shadcn-Vue 构建
            </p>
          </div>
          
          <Separator />
          
          <div class="flex flex-wrap gap-3">
            <Button variant="outline" size="sm">
              检查更新
            </Button>
            <Button variant="outline" size="sm">
              查看文档
            </Button>
            <Button variant="outline" size="sm">
              GitHub 仓库
            </Button>
            <Button variant="outline" size="sm">
              报告问题
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

