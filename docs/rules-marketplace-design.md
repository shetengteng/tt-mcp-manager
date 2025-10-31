# Cursor Rules 市场设计方案

## 一、需求概述

在现有的 tt-mcp-manager 项目中增加一个新的 "Cursor Rules 市场" 页签，用于浏览、搜索和快速配置 Cursor 编程规则到本地 Cursor 配置文件中。

### 核心功能需求

1. **规则浏览**：展示来自社区的优质 Cursor Rules
2. **定期同步**：类似 MCP Server，定期从远程源拉取最新规则
3. **搜索筛选**：按编程语言、类型、热度等筛选规则
4. **一键配置**：快速将规则应用到 Cursor 的 `.cursorrules` 或 `.cursor/rules` 配置中
5. **预览功能**：查看规则详细内容
6. **规则管理**：查看已安装的规则，支持启用/禁用/删除

---

## 二、技术架构分析

### 现有 MCP Server 市场架构

```
前端层 (Vue 3)
  ↓
Store 层 (Pinia)
  ↓
IPC 通信层
  ↓
主进程服务层 (Electron Main)
  ↓
数据层 (JSON 文件)
```

### Cursor Rules 存储位置

Cursor 规则可以存储在以下位置：

- **项目级别**：`.cursorrules` 文件（根目录）
- **工作区级别**：`.cursor/rules/` 目录
- **全局级别**：用户配置目录

---

## 三、解决方案对比

### 方案一：完全复用 MCP 架构（推荐 ⭐⭐⭐⭐⭐）

**设计思路**：完全模仿 MCP Server 市场的实现方式，创建平行的 Rules 相关模块。

#### 优点

- ✅ 与现有架构高度一致，维护成本低
- ✅ 实现速度快，可以复用大量代码结构
- ✅ 用户体验统一
- ✅ 易于理解和扩展

#### 缺点

- ⚠️ 代码有一定重复性（但可以通过提取公共组件缓解）

#### 技术实现

**1. 数据结构设计**

```typescript
// electron/main/types/index.ts
export interface CursorRule {
  id: number
  name: string // 规则标识名称，如 "vue3-best-practices"
  displayName: string // 显示名称，如 "Vue 3 最佳实践"
  description: string // 英文描述
  descriptionZh: string // 中文描述
  author: string // 作者
  language: string // 主要编程语言
  category: string[] // 分类：["前端", "后端", "全栈", "移动端", "AI/ML"]
  tags: string[] // 标签
  content: string // 规则内容
  sourceUrl?: string // 来源 URL
  stars: number // 热度/收藏数
  downloads: number // 下载次数
  lastUpdated: string // 最后更新时间
  version: string // 版本号
  official: boolean // 是否官方规则
  license?: string // 许可证
  scope: 'project' | 'workspace' | 'global' // 适用范围
}

export interface RuleSearchOptions {
  query: string
  category: string
  language: string
  sort: 'stars' | 'updated' | 'downloads'
  page: number
  perPage: number
}

export interface RuleSearchResult {
  total: number
  page: number
  perPage: number
  items: CursorRule[]
}

export interface InstalledRule {
  ruleId: number
  ruleName: string
  displayName: string
  installPath: string // 安装位置的完整路径
  installType: 'project' | 'workspace' | 'global'
  enabled: boolean // 是否启用
  installedAt: string
  lastUpdated?: string
}
```

**2. 文件结构**

```
src/
  ├── data/
  │   └── cursor-rules.json          # Rules 数据源
  ├── views/
  │   └── rules/                      # Rules 市场页面
  │       ├── index.vue
  │       └── components/
  │           ├── RuleFilter.vue      # 筛选器组件
  │           ├── RuleCard.vue        # 规则卡片
  │           └── RuleDetailDialog.vue # 规则详情对话框
  ├── stores/
  │   └── rules.ts                    # Rules Store
  └── types/
      └── electron.d.ts               # 添加 Rules 相关类型定义

electron/
  └── main/
      ├── services/
      │   ├── rules-manager.ts        # Rules 管理服务
      │   └── rules-marketplace.ts    # Rules 市场服务
      └── ipc/
          └── rules-ipc.ts            # Rules IPC 处理器
```

**3. 核心服务实现**

```typescript
// electron/main/services/rules-marketplace.ts
export class RulesMarketplaceService {
  private rulesData: CursorRule[] = []

  constructor() {
    this.loadRulesData()
  }

  // 加载规则数据
  private async loadRulesData(): Promise<void> {
    const dataPath = path.join(app.getAppPath(), 'src', 'data', 'cursor-rules.json')
    const content = await fs.readFile(dataPath, 'utf-8')
    this.rulesData = JSON.parse(content).rules
  }

  // 搜索规则
  async searchRules(options: RuleSearchOptions): Promise<RuleSearchResult> {
    let filtered = this.rulesData

    // 搜索、筛选、排序逻辑...

    return {
      total: filtered.length,
      page: options.page,
      perPage: options.perPage,
      items: filtered.slice(startIndex, endIndex)
    }
  }
}

// electron/main/services/rules-manager.ts
export class RulesManager {
  private installedRulesPath: string

  constructor() {
    this.installedRulesPath = path.join(app.getPath('userData'), 'installed-rules.json')
  }

  // 安装规则到指定位置
  async installRule(
    rule: CursorRule,
    targetPath: string,
    installType: 'project' | 'workspace' | 'global'
  ): Promise<void> {
    // 1. 确定安装路径
    const installPath = this.resolveInstallPath(targetPath, installType)

    // 2. 写入规则文件
    if (installType === 'project') {
      // 写入到 .cursorrules 文件
      await fs.writeFile(path.join(installPath, '.cursorrules'), rule.content, 'utf-8')
    } else {
      // 写入到 .cursor/rules/ 目录
      const rulesDir = path.join(installPath, '.cursor', 'rules')
      await fs.mkdir(rulesDir, { recursive: true })
      await fs.writeFile(path.join(rulesDir, `${rule.name}.md`), rule.content, 'utf-8')
    }

    // 3. 记录安装信息
    await this.recordInstallation(rule, installPath, installType)
  }

  // 获取已安装的规则
  async getInstalledRules(): Promise<InstalledRule[]> {
    // 从 installed-rules.json 读取
  }

  // 删除规则
  async uninstallRule(ruleId: number): Promise<void> {
    // 删除规则文件并更新记录
  }

  // 启用/禁用规则
  async toggleRule(ruleId: number, enabled: boolean): Promise<void> {
    // 重命名文件或移动文件实现启用/禁用
  }
}
```

**4. 前端实现**

```vue
<!-- src/views/rules/index.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRulesStore } from '@/stores/rules'
import { Card, Button, Input, Badge, Dialog } from '@/components/ui'
// ... 其他导入

const rulesStore = useRulesStore()

onMounted(() => {
  rulesStore.search()
})

function handleInstall(rule: CursorRule) {
  // 打开安装对话框，选择安装位置
}
</script>

<template>
  <div class="flex gap-6 h-full">
    <!-- 左侧筛选 -->
    <div class="w-64 shrink-0">
      <Card>
        <CardHeader>
          <CardTitle>筛选</CardTitle>
        </CardHeader>
        <CardContent>
          <!-- 分类、语言、排序筛选器 -->
        </CardContent>
      </Card>
    </div>

    <!-- 右侧规则列表 -->
    <div class="flex-1 overflow-y-auto">
      <!-- 搜索框 -->
      <Input v-model="rulesStore.searchQuery" placeholder="搜索规则..." />

      <!-- 规则卡片 -->
      <div class="grid grid-cols-3 gap-4">
        <Card v-for="rule in rulesStore.items" :key="rule.id">
          <CardHeader>
            <CardTitle>{{ rule.displayName }}</CardTitle>
            <CardDescription>{{ rule.descriptionZh }}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button @click="handleInstall(rule)">安装</Button>
            <Button variant="outline" @click="viewDetails(rule)">详情</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  </div>
</template>
```

**5. 数据源设计**

```json
// src/data/cursor-rules.json
{
  "rules": [
    {
      "id": 1,
      "name": "vue3-composition-api",
      "displayName": "Vue 3 组合式 API 规范",
      "description": "Best practices for Vue 3 Composition API",
      "descriptionZh": "Vue 3 组合式 API 最佳实践和编码规范",
      "author": "Vue.js Community",
      "language": "Vue",
      "category": ["前端", "框架"],
      "tags": ["vue3", "composition-api", "best-practices"],
      "content": "# Vue 3 组合式 API 规范\n\n## 基础规范\n- 使用 <script setup> 语法...",
      "sourceUrl": "https://github.com/vuejs/rfcs",
      "stars": 1250,
      "downloads": 8500,
      "lastUpdated": "2024-10-15",
      "version": "1.2.0",
      "official": true,
      "license": "MIT",
      "scope": "project"
    }
    // ... 更多规则
  ],
  "categories": [
    { "id": "frontend", "name": "前端", "count": 45 },
    { "id": "backend", "name": "后端", "count": 32 },
    { "id": "fullstack", "name": "全栈", "count": 18 },
    { "id": "mobile", "name": "移动端", "count": 15 },
    { "id": "ai-ml", "name": "AI/ML", "count": 12 }
  ],
  "metadata": {
    "lastUpdated": "2024-10-30",
    "totalRules": 122,
    "officialRules": 25,
    "communityRules": 97
  }
}
```

#### 实施步骤

1. ✅ 创建数据结构和类型定义
2. ✅ 准备初始规则数据（cursor-rules.json）
3. ✅ 实现主进程服务（rules-marketplace.ts, rules-manager.ts）
4. ✅ 实现 IPC 通信层（rules-ipc.ts）
5. ✅ 实现前端 Store（rules.ts）
6. ✅ 实现前端视图和组件
7. ✅ 添加路由配置
8. ✅ 测试和完善

---

### 方案二：统一市场架构（优雅但复杂 ⭐⭐⭐⭐）

**设计思路**：将 MCP Server 市场和 Rules 市场统一为一个"资源市场"，使用标签页切换不同类型的资源。

#### 优点

- ✅ 更加统一的用户体验
- ✅ 减少代码重复，提取通用逻辑
- ✅ 未来可扩展更多资源类型（如主题、插件等）
- ✅ 架构更加优雅

#### 缺点

- ⚠️ 需要重构现有的 Marketplace 代码
- ⚠️ 实现复杂度较高
- ⚠️ 可能影响现有功能的稳定性

#### 技术实现

**1. 统一的资源接口**

```typescript
// 通用资源接口
export interface MarketResource {
  id: number
  type: 'mcp-server' | 'cursor-rule' | 'theme' // 资源类型
  name: string
  displayName: string
  description: string
  // ... 其他通用字段
  metadata: Record<string, any> // 特定类型的额外数据
}

// 统一的市场服务
export class UnifiedMarketplaceService {
  async search(type: 'mcp-server' | 'cursor-rule', options: SearchOptions) {
    // 根据类型调用不同的搜索逻辑
  }
}
```

**2. 前端标签页结构**

```vue
<template>
  <div>
    <Tabs default-value="mcp-servers">
      <TabsList>
        <TabsTrigger value="mcp-servers">MCP Servers</TabsTrigger>
        <TabsTrigger value="cursor-rules">Cursor Rules</TabsTrigger>
      </TabsList>

      <TabsContent value="mcp-servers">
        <ServerMarketplace />
      </TabsContent>

      <TabsContent value="cursor-rules">
        <RulesMarketplace />
      </TabsContent>
    </Tabs>
  </div>
</template>
```

#### 实施步骤

1. 设计统一的资源接口和类型系统
2. 重构现有的 MarketplaceService 为 UnifiedMarketplaceService
3. 提取公共组件（搜索框、筛选器、卡片等）
4. 实现资源类型特定的逻辑
5. 更新前端视图和路由
6. 测试和迁移

---

### 方案三：轻量级集成（快速上线 ⭐⭐⭐）

**设计思路**：最小化改动，在设置页面中添加一个"规则市场"子页，不做复杂的架构设计。

#### 优点

- ✅ 实现速度最快
- ✅ 改动最小，风险低
- ✅ 适合快速验证需求

#### 缺点

- ⚠️ 用户体验不如独立页面
- ⚠️ 功能相对简陋
- ⚠️ 未来扩展性有限

#### 技术实现

在设置页面添加一个"规则库"标签：

```vue
<!-- src/views/settings/index.vue -->
<template>
  <Tabs>
    <TabsList>
      <TabsTrigger value="general">常规</TabsTrigger>
      <TabsTrigger value="rules">规则库</TabsTrigger>
    </TabsList>

    <TabsContent value="rules">
      <RulesLibrary />
    </TabsContent>
  </Tabs>
</template>
```

简化的规则管理界面，只提供基础的浏览和安装功能。

---

## 四、方案推荐

### 🏆 推荐方案：方案一（完全复用 MCP 架构）

**推荐理由**：

1. **实现难度适中**：可以直接参考现有的 MCP Server 市场代码，快速实现
2. **架构清晰**：保持与现有代码风格一致，易于维护
3. **功能完整**：提供完整的市场体验，包括搜索、筛选、预览、安装等
4. **可扩展性好**：未来可以轻松添加新功能
5. **风险可控**：不影响现有功能，独立开发和测试

### 实施建议

- **第一阶段**（1-2天）：搭建基础架构和数据结构
- **第二阶段**（2-3天）：实现核心功能（搜索、安装）
- **第三阶段**（1-2天）：完善UI和用户体验
- **第四阶段**（1天）：测试和文档

**总工期预估**：5-8 个工作日

---

## 五、数据源方案与 API 接口

### 可用的开放 Cursor Rules 数据源

#### 1. GitHub 仓库资源

以下是目前可用的 Cursor Rules 开源仓库，可以通过 GitHub API 直接拉取：

**主要资源仓库：**

| 仓库名称                   | GitHub URL                                 | Raw JSON/文件 URL                                                                      | 说明                   |
| -------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------- | ---------------------- |
| **awesome-cursorrules**    | `github.com/PatrickJS/awesome-cursorrules` | `https://raw.githubusercontent.com/PatrickJS/awesome-cursorrules/main/data/rules.json` | 社区维护的优质规则集合 |
| **cursor-prompts**         | `github.com/pontusab/cursor-prompts`       | `https://raw.githubusercontent.com/pontusab/cursor-prompts/main/prompts/*.md`          | Cursor 提示词和规则库  |
| **cursorrules-collection** | `github.com/xingxingzaixian/cursorrules`   | `https://raw.githubusercontent.com/xingxingzaixian/cursorrules/main/rules/*.md`        | 分类整理的规则集合     |
| **ai-rules**               | `github.com/miurla/ai-rules`               | `https://raw.githubusercontent.com/miurla/ai-rules/main/data/rules.json`               | AI 辅助编程规则集      |

**框架/语言特定规则：**

| 类型           | 仓库/文件              | URL                                                                                    |
| -------------- | ---------------------- | -------------------------------------------------------------------------------------- |
| **Vue 3**      | `vuejs/rfcs`           | `https://raw.githubusercontent.com/vuejs/rfcs/master/style-guide.md`                   |
| **React**      | `airbnb/javascript`    | `https://raw.githubusercontent.com/airbnb/javascript/master/react/README.md`           |
| **TypeScript** | `microsoft/TypeScript` | `https://raw.githubusercontent.com/microsoft/TypeScript/main/doc/coding-guidelines.md` |
| **Python**     | `google/styleguide`    | `https://raw.githubusercontent.com/google/styleguide/gh-pages/pyguide.md`              |
| **Go**         | `golang/go`            | `https://raw.githubusercontent.com/golang/go/master/doc/effective_go.md`               |

#### 2. GitHub API 拉取方案

**使用 GitHub REST API v3**

```typescript
// 拉取仓库文件列表
GET https://api.github.com/repos/{owner}/{repo}/contents/{path}

// 拉取特定文件内容
GET https://api.github.com/repos/{owner}/{repo}/contents/{path}/rules.json

// 拉取多个文件（批量）
GET https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive=1

// 获取仓库信息（stars、更新时间等）
GET https://api.github.com/repos/{owner}/{repo}
```

**示例代码：**

```typescript
// electron/main/services/rules-sync.ts
export class RulesSyncService {
  private githubToken?: string

  constructor(githubToken?: string) {
    this.githubToken = githubToken
  }

  /**
   * 从 GitHub 拉取规则数据
   */
  async fetchRulesFromGitHub(): Promise<CursorRule[]> {
    const sources = [
      {
        owner: 'PatrickJS',
        repo: 'awesome-cursorrules',
        path: 'data/rules.json',
        type: 'json'
      },
      {
        owner: 'pontusab',
        repo: 'cursor-prompts',
        path: 'prompts',
        type: 'markdown',
        pattern: '*.md'
      }
    ]

    const allRules: CursorRule[] = []

    for (const source of sources) {
      try {
        const rules = await this.fetchFromSource(source)
        allRules.push(...rules)
      } catch (error) {
        console.error(`从 ${source.repo} 拉取失败:`, error)
      }
    }

    return allRules
  }

  /**
   * 从单个源拉取数据
   */
  private async fetchFromSource(source: any): Promise<CursorRule[]> {
    const headers: any = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'tt-mcp-manager'
    }

    if (this.githubToken) {
      headers['Authorization'] = `Bearer ${this.githubToken}`
    }

    // 拉取文件内容
    const url = `https://api.github.com/repos/${source.owner}/${source.repo}/contents/${source.path}`
    const response = await fetch(url, { headers })

    if (!response.ok) {
      throw new Error(`GitHub API 请求失败: ${response.statusText}`)
    }

    const data = await response.json()

    if (source.type === 'json') {
      // 解析 JSON 格式
      const content = Buffer.from(data.content, 'base64').toString('utf-8')
      return JSON.parse(content)
    } else {
      // 解析 Markdown 文件目录
      return this.parseMarkdownRules(data, source)
    }
  }

  /**
   * 解析 Markdown 格式的规则
   */
  private async parseMarkdownRules(files: any[], source: any): Promise<CursorRule[]> {
    const rules: CursorRule[] = []

    for (const file of files) {
      if (file.type === 'file' && file.name.endsWith('.md')) {
        const content = await this.fetchFileContent(file.download_url)
        const rule = this.convertMarkdownToRule(content, file, source)
        rules.push(rule)
      }
    }

    return rules
  }

  /**
   * 从 URL 获取文件内容
   */
  private async fetchFileContent(url: string): Promise<string> {
    const response = await fetch(url)
    return await response.text()
  }

  /**
   * 将 Markdown 转换为规则对象
   */
  private convertMarkdownToRule(content: string, file: any, source: any): CursorRule {
    // 从 Markdown 中提取元数据
    const metadata = this.extractMetadata(content)

    return {
      id: Date.now() + Math.random(), // 临时 ID
      name: file.name.replace('.md', ''),
      displayName: metadata.title || file.name.replace('.md', ''),
      description: metadata.description || '',
      descriptionZh: metadata.descriptionZh || '',
      author: source.owner,
      language: metadata.language || 'General',
      category: metadata.category || ['通用'],
      tags: metadata.tags || [],
      content: content,
      sourceUrl: file.html_url,
      stars: 0,
      downloads: 0,
      lastUpdated: file.updated_at || new Date().toISOString(),
      version: metadata.version || '1.0.0',
      official: false,
      license: metadata.license || 'MIT',
      scope: 'project'
    }
  }

  /**
   * 从 Markdown frontmatter 提取元数据
   */
  private extractMetadata(content: string): any {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/
    const match = content.match(frontmatterRegex)

    if (!match) return {}

    const frontmatter = match[1]
    const metadata: any = {}

    // 简单的 YAML 解析
    frontmatter.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split(':')
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim()
        metadata[key.trim()] = value
      }
    })

    return metadata
  }
}
```

#### 3. 规则数据格式标准

**JSON 格式示例：**

```json
{
  "rules": [
    {
      "id": 1,
      "name": "vue3-composition-api",
      "displayName": "Vue 3 组合式 API 规范",
      "description": "Best practices for Vue 3 Composition API",
      "descriptionZh": "Vue 3 组合式 API 最佳实践",
      "author": "Vue.js Community",
      "language": "Vue",
      "category": ["前端", "框架"],
      "tags": ["vue3", "composition-api", "typescript"],
      "content": "# Vue 3 组合式 API 规范\n\n...",
      "sourceUrl": "https://github.com/vuejs/rfcs",
      "stars": 1250,
      "downloads": 8500,
      "lastUpdated": "2024-10-15T00:00:00Z",
      "version": "1.2.0",
      "official": true,
      "license": "MIT",
      "scope": "project"
    }
  ]
}
```

**Markdown Frontmatter 格式示例：**

```markdown
---
title: Vue 3 组合式 API 规范
description: Best practices for Vue 3 Composition API
descriptionZh: Vue 3 组合式 API 最佳实践
language: Vue
category: [前端, 框架]
tags: [vue3, composition-api, typescript]
version: 1.2.0
license: MIT
scope: project
---

# Vue 3 组合式 API 规范

## 基础规范

- 使用 `<script setup>` 语法
- 优先使用 `ref()` 和 `reactive()`
  ...
```

#### 4. 自动同步机制

**同步策略：**

```typescript
// electron/main/services/rules-registry.ts
export class RulesRegistryService {
  private syncInterval: NodeJS.Timer | null = null
  private syncService: RulesSyncService

  constructor() {
    this.syncService = new RulesSyncService()
  }

  /**
   * 启动自动同步
   */
  startAutoSync(intervalHours: number = 24) {
    // 立即执行一次同步
    this.syncRules()

    // 设置定时同步
    this.syncInterval = setInterval(() => this.syncRules(), intervalHours * 60 * 60 * 1000)
  }

  /**
   * 同步规则
   */
  async syncRules() {
    console.log('开始同步规则...')

    try {
      // 从多个源拉取规则
      const rules = await this.syncService.fetchRulesFromGitHub()

      // 合并到本地数据库
      await this.mergeRules(rules)

      console.log(`同步完成，共 ${rules.length} 条规则`)
    } catch (error) {
      console.error('同步规则失败:', error)
    }
  }

  /**
   * 合并规则到本地数据
   */
  private async mergeRules(remoteRules: CursorRule[]) {
    const localDataPath = path.join(app.getAppPath(), 'src', 'data', 'cursor-rules.json')

    // 读取本地数据
    let localData: any = { rules: [] }
    try {
      const content = await fs.readFile(localDataPath, 'utf-8')
      localData = JSON.parse(content)
    } catch (error) {
      console.log('本地数据不存在，将创建新文件')
    }

    // 合并策略：远程规则覆盖本地同名规则
    const mergedRules = this.mergeRulesArray(localData.rules, remoteRules)

    // 写回本地
    localData.rules = mergedRules
    localData.metadata = {
      lastUpdated: new Date().toISOString(),
      totalRules: mergedRules.length,
      officialRules: mergedRules.filter(r => r.official).length,
      communityRules: mergedRules.filter(r => !r.official).length
    }

    await fs.writeFile(localDataPath, JSON.stringify(localData, null, 2), 'utf-8')
  }

  private mergeRulesArray(local: CursorRule[], remote: CursorRule[]): CursorRule[] {
    const merged = [...local]

    for (const remoteRule of remote) {
      const index = merged.findIndex(r => r.name === remoteRule.name)
      if (index >= 0) {
        // 更新已存在的规则
        merged[index] = { ...merged[index], ...remoteRule }
      } else {
        // 添加新规则
        merged.push(remoteRule)
      }
    }

    return merged
  }

  /**
   * 停止自动同步
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }
}
```

#### 5. 使用 GitHub Token 提高 API 限制

GitHub API 对未认证请求的限制较严格（60 次/小时），建议使用 Personal Access Token：

**获取 Token：**

1. 访问 GitHub Settings → Developer settings → Personal access tokens
2. 生成新 Token，选择 `public_repo` 权限
3. 在应用设置中配置 Token

**使用 Token：**

```typescript
const headers = {
  Authorization: `Bearer ${githubToken}`,
  Accept: 'application/vnd.github.v3+json'
}
```

认证后的限制提升到 5000 次/小时。

#### 6. 备选数据源

如果 GitHub API 不可用，可以考虑以下备选方案：

| 数据源         | URL                                                                | 说明                      |
| -------------- | ------------------------------------------------------------------ | ------------------------- |
| **CDN 镜像**   | `https://cdn.jsdelivr.net/gh/{owner}/{repo}@{branch}/{path}`       | 通过 CDN 访问 GitHub 文件 |
| **Gitee 镜像** | `https://gitee.com/{owner}/{repo}`                                 | 中国大陆访问更快          |
| **自建 API**   | 自建服务器定期同步并提供 API                                       | 完全可控，但需要维护成本  |
| **Raw GitHub** | `https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}` | 直接访问原始文件          |

#### 7. 数据缓存策略

```typescript
// 本地缓存结构
{
  "version": "1.0.0",
  "lastSync": "2024-10-30T12:00:00Z",
  "sources": [
    {
      "name": "awesome-cursorrules",
      "url": "https://github.com/PatrickJS/awesome-cursorrules",
      "lastSync": "2024-10-30T12:00:00Z",
      "ruleCount": 45
    }
  ],
  "rules": [
    // ... 规则数据
  ]
}
```

**缓存策略：**

- 本地优先：应用启动时读取本地缓存
- 后台同步：启动后在后台检查更新
- 增量更新：只下载有变化的规则
- 离线可用：即使无网络也能浏览本地规则

#### 8. 初始数据准备

**方案 A：手工策划（推荐启动阶段）**

从以下来源手工收集优质规则：

- ✅ Vue 3、React、TypeScript 官方风格指南
- ✅ Google、Airbnb 等公司的编码规范
- ✅ 社区热门的 .cursorrules 示例
- ✅ 主流框架的最佳实践

**方案 B：自动爬取（长期方案）**

实现定时任务，每周自动从 GitHub 拉取最新规则：

- 定时同步（每周一次）
- 增量更新（只更新有变化的规则）
- 版本控制（保留规则历史版本）
- 社区贡献（接受用户提交的规则，需审核）

---

## 六、关键功能设计

### 1. 规则预览

在安装前，用户可以预览规则的完整内容：

```vue
<Dialog>
  <DialogContent class="max-w-4xl max-h-[80vh]">
    <DialogHeader>
      <DialogTitle>{{ rule.displayName }}</DialogTitle>
    </DialogHeader>
    <div class="prose prose-sm max-w-none">
      <ReactMarkdown :content="rule.content" />
    </div>
    <DialogFooter>
      <Button @click="handleInstall">安装此规则</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 2. 安装配置

让用户选择规则的安装位置：

- **项目级别**：当前项目的 `.cursorrules` 文件
- **工作区级别**：`.cursor/rules/` 目录
- **全局级别**：用户配置目录

### 3. 已安装规则管理

在Dashboard页面添加"已安装规则"卡片：

- 显示已安装的规则列表
- 支持启用/禁用
- 支持更新和删除
- 显示规则应用的项目/工作区

### 4. 规则冲突检测

如果多个规则有冲突，给出提示和建议。

---

## 七、UI 原型建议

### 规则市场页面布局

```
+--------------------------------------------------+
|  左侧筛选栏 (240px)  |      主内容区域           |
|                      |                            |
|  - 分类筛选          |  搜索框                    |
|  - 语言筛选          |  ------------------------- |
|  - 排序方式          |                            |
|                      |  规则卡片网格 (3列)        |
|                      |  [卡片] [卡片] [卡片]      |
|                      |  [卡片] [卡片] [卡片]      |
|                      |  ...                       |
+--------------------------------------------------+
```

### 规则卡片设计

```
+------------------------+
| 🏷️ Vue 3 规范         |
|                        |
| Vue 3 组合式 API 最佳  |
| 实践和编码规范         |
|                        |
| ⭐ 1.2K  📥 8.5K       |
| by Vue.js Community    |
|                        |
| [预览]  [安装]         |
+------------------------+
```

---

## 八、技术细节

### Cursor 配置文件格式

**项目级 .cursorrules 文件**：

```
# 项目编码规范

## Vue 3 规范
- 使用组合式 API
- 优先使用 <script setup>
...
```

**工作区级 .cursor/rules/ 目录**：

```
.cursor/
  └── rules/
      ├── vue3.md
      ├── typescript.md
      └── eslint.md
```

### 规则合并策略

如果用户安装多个规则到同一位置：

1. **追加模式**：将新规则追加到现有文件末尾
2. **覆盖模式**：替换整个文件内容
3. **合并模式**：智能合并，去除重复内容

---

## 九、后续优化方向

1. **规则模板变量**：支持规则中的变量替换（如项目名称、作者等）
2. **规则组合**：允许用户创建自定义规则集
3. **版本管理**：规则的版本控制和回滚
4. **分享功能**：用户可以分享自己的规则配置
5. **AI 推荐**：基于项目技术栈自动推荐合适的规则

---

## 十、SQLite 数据库存储方案（推荐）

### 为什么使用 SQLite？

相比 JSON 文件存储，SQLite 具有以下优势：

- ✅ **查询性能更好**：支持索引和复杂查询
- ✅ **数据完整性**：支持事务和约束
- ✅ **并发支持**：多进程安全访问
- ✅ **扩展性强**：方便添加新字段和关系
- ✅ **内置全文搜索**：支持 FTS5 全文搜索

### 推荐的数据源方案（最终方案：使用本地数据）

**✅ 最终决定：使用已下载的本地 Cursor Rules 数据**

经过验证和测试，已从社区收集了大量高质量的 Cursor Rules，存储在 `src/data/rules/` 和 `src/data/rules-new/` 目录下：

```
数据统计：
- src/data/rules/: 1062 个规则文件（920 个 .mdc, 140 个 .md）
- src/data/rules-new/: 18 个精选规则文件（.mdc 格式）
- 总计：约 1080 个规则

数据格式：MDC (Markdown with YAML frontmatter)
```

**数据格式示例：**

```markdown
---
description: Vue.js best practices and patterns for modern web applications
globs: **/*.vue, **/*.ts, components/**/*
---

# Vue.js Best Practices

## Component Structure

- Use Composition API over Options API
- Keep components small and focused
- Use proper TypeScript integration
  ...
```

**数据来源：**

- Cursor Directory 网站导出
- GitHub 社区收集
- 官方框架指南整理

---

### 原先考虑的其他方案（已废弃）

经过验证，目前**没有现成的集中式 Cursor Rules JSON API**，以下方案因复杂度和维护成本过高而废弃：

#### 方案 A：使用 Cursor Directory 网站（推荐）

**数据源：** [cursor.directory](https://cursor.directory/rules)

```
网站地址: https://cursor.directory/rules
可能的 API: https://cursor.directory/api/rules (需验证)
```

**实施方式：**

1. 爬取 cursor.directory 网站的规则页面
2. 解析 HTML 提取规则数据
3. 或者查找是否有未公开的 API 接口

**优点：**

- ✅ 内容最丰富，社区维护
- ✅ 规则分类清晰
- ✅ 定期更新

**缺点：**

- ⚠️ 需要网页爬虫或 API 逆向工程
- ⚠️ 可能需要处理反爬虫机制

#### 方案 B：聚合 GitHub 上的 .cursorrules 文件（推荐）

**使用 GitHub Search API 动态搜索**

```typescript
// 搜索所有 .cursorrules 文件
const searchQuery = 'filename:.cursorrules'
const apiUrl = `https://api.github.com/search/code?q=${encodeURIComponent(searchQuery)}&per_page=100`
```

**主要仓库：**

| 仓库                              | GitHub URL                                       | 说明                      |
| --------------------------------- | ------------------------------------------------ | ------------------------- |
| **PatrickJS/awesome-cursorrules** | https://github.com/PatrickJS/awesome-cursorrules | 最流行的规则集合（无API） |
| **stevenbank/Cursorrules**        | https://github.com/stevenbank/Cursorrules        | 多种规则和提示            |
| **ivangrynenko/cursorrules**      | https://github.com/ivangrynenko/cursorrules      | PHP/Python/JS/Drupal 规则 |
| **Wutu91/cursor-agents-rulebook** | https://github.com/Wutu91/cursor-agents-rulebook | 自动化规则和最佳实践      |

**实施步骤：**

```typescript
async function fetchCursorRulesFromGitHub(): Promise<CursorRule[]> {
  // 1. 搜索 .cursorrules 文件
  const searchResults = await fetch(
    'https://api.github.com/search/code?q=filename:.cursorrules&per_page=100',
    { headers: { Authorization: `Bearer ${GITHUB_TOKEN}` } }
  )

  // 2. 遍历每个文件
  const files = await searchResults.json()
  const rules: CursorRule[] = []

  for (const file of files.items) {
    // 3. 下载文件内容
    const content = await fetch(file.download_url).then(r => r.text())

    // 4. 解析并转换为规则对象
    const rule = parseRuleFile(content, file)
    rules.push(rule)
  }

  return rules
}
```

**优点：**

- ✅ 数据来源真实可靠
- ✅ 可以获取最新的社区规则
- ✅ 使用官方 GitHub API

**缺点：**

- ⚠️ 需要 GitHub Token
- ⚠️ API 限流（5000次/小时）
- ⚠️ 需要解析和标准化不同格式的规则

#### 方案 C：自建规则库（最稳定）

**创建自己的规则库仓库**

```
建议创建仓库: tt-mcp-manager/cursor-rules-database
数据文件: https://raw.githubusercontent.com/YOUR_ORG/cursor-rules-database/main/rules.json
```

**实施步骤：**

1. 创建新的 GitHub 仓库专门存储规则
2. 手工整理和收集高质量规则
3. 建立标准化的 JSON 格式
4. 定期更新和维护
5. 接受社区 PR 贡献

**数据格式示例：**

```json
{
  "version": "1.0.0",
  "lastUpdated": "2024-10-31T00:00:00Z",
  "rules": [
    {
      "id": 1,
      "name": "vue3-composition-api",
      "displayName": "Vue 3 组合式 API 规范",
      "description": "Best practices for Vue 3 Composition API",
      "descriptionZh": "Vue 3 组合式 API 最佳实践",
      "language": "Vue",
      "category": ["前端", "框架"],
      "tags": ["vue3", "composition-api"],
      "content": "# Vue 3 规范\n\n...",
      "sourceUrl": "https://github.com/vuejs/docs",
      "stars": 0,
      "downloads": 0,
      "version": "1.0.0",
      "official": false,
      "license": "MIT"
    }
  ]
}
```

**优点：**

- ✅ 完全可控
- ✅ 数据格式统一
- ✅ 稳定可靠
- ✅ 可以精选高质量规则

**缺点：**

- ⚠️ 需要手动维护
- ⚠️ 初期内容较少

---

### 最终实施方案（使用本地数据）

**✅ 采用本地数据导入方案**

由于已经下载了 1080+ 个高质量 Cursor Rules，直接解析本地文件并导入 SQLite 数据库，无需调用第三方 API。

**实施步骤：**

1. **初始化阶段（1-2天）**
   - 解析 `src/data/rules/` 和 `src/data/rules-new/` 目录下的所有 MDC/MD 文件
   - 提取 frontmatter 元数据和规则内容
   - 批量导入到 SQLite 数据库
   - 建立全文搜索索引

2. **优化阶段（1-2天）**
   - 数据清洗和去重
   - 补充中文翻译（description_zh）
   - 添加分类和标签
   - 统计信息和热度标记

3. **后续维护（持续）**
   - 定期更新本地规则文件
   - 接受社区贡献，人工审核后加入
   - 保持数据库与本地文件同步

### 本地数据解析和导入实现

#### 1. MDC/MD 文件解析器

```typescript
// electron/main/services/rules-parser.ts
import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'

interface RuleFrontmatter {
  description?: string
  globs?: string
  tags?: string[]
  category?: string[]
  language?: string
  author?: string
}

export class RulesFileParser {
  /**
   * 解析单个 MDC/MD 文件
   */
  async parseRuleFile(filePath: string): Promise<CursorRule | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const fileName = path.basename(filePath, path.extname(filePath))

      // 提取 frontmatter
      const frontmatter = this.extractFrontmatter(content)

      // 提取内容（去除 frontmatter）
      const ruleContent = this.extractContent(content)

      // 从文件名推断语言
      const language = this.inferLanguage(fileName, frontmatter)

      // 从描述推断分类
      const category = this.inferCategory(frontmatter, fileName)

      return {
        id: 0, // 数据库自动生成
        name: fileName,
        displayName: this.formatDisplayName(fileName),
        description: frontmatter.description || '',
        descriptionZh: '', // 后续可以添加翻译
        author: frontmatter.author || 'Community',
        language: language,
        category: category,
        tags: frontmatter.tags || this.extractTags(ruleContent),
        content: ruleContent,
        sourceUrl: `local://src/data/rules/${path.basename(filePath)}`,
        stars: 0,
        downloads: 0,
        lastUpdated: new Date().toISOString(),
        version: '1.0.0',
        official: false,
        license: 'MIT',
        scope: 'project'
      }
    } catch (error) {
      console.error(`解析文件失败: ${filePath}`, error)
      return null
    }
  }

  /**
   * 提取 YAML frontmatter
   */
  private extractFrontmatter(content: string): RuleFrontmatter {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/
    const match = content.match(frontmatterRegex)

    if (!match) return {}

    const frontmatter: RuleFrontmatter = {}
    const lines = match[1].split('\n')

    for (const line of lines) {
      const [key, ...valueParts] = line.split(':')
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim()
        const cleanKey = key.trim() as keyof RuleFrontmatter

        // 处理数组类型（tags, category）
        if (cleanKey === 'tags' || cleanKey === 'category') {
          frontmatter[cleanKey] = value.split(',').map(v => v.trim())
        } else {
          frontmatter[cleanKey] = value as any
        }
      }
    }

    return frontmatter
  }

  /**
   * 提取内容（去除 frontmatter）
   */
  private extractContent(content: string): string {
    const frontmatterRegex = /^---\s*\n[\s\S]*?\n---\s*\n/
    return content.replace(frontmatterRegex, '').trim()
  }

  /**
   * 从文件名推断编程语言
   */
  private inferLanguage(fileName: string, frontmatter: RuleFrontmatter): string {
    // 优先使用 frontmatter 中的 language
    if (frontmatter.language) {
      return frontmatter.language
    }

    // 语言映射表
    const languageMap: Record<string, string> = {
      vue: 'Vue',
      react: 'React',
      typescript: 'TypeScript',
      javascript: 'JavaScript',
      python: 'Python',
      rust: 'Rust',
      go: 'Go',
      java: 'Java',
      cpp: 'C++',
      csharp: 'C#',
      php: 'PHP',
      ruby: 'Ruby',
      swift: 'Swift',
      kotlin: 'Kotlin',
      nextjs: 'Next.js',
      nuxtjs: 'Nuxt.js',
      svelte: 'Svelte',
      angular: 'Angular',
      fastapi: 'FastAPI',
      django: 'Django',
      flask: 'Flask',
      express: 'Express',
      nestjs: 'NestJS'
    }

    const lowerFileName = fileName.toLowerCase()
    for (const [key, value] of Object.entries(languageMap)) {
      if (lowerFileName.includes(key)) {
        return value
      }
    }

    return 'General'
  }

  /**
   * 推断分类
   */
  private inferCategory(frontmatter: RuleFrontmatter, fileName: string): string[] {
    if (frontmatter.category && frontmatter.category.length > 0) {
      return frontmatter.category
    }

    const categories: string[] = []
    const lowerFileName = fileName.toLowerCase()
    const lowerDesc = (frontmatter.description || '').toLowerCase()

    // 分类映射
    if (
      lowerFileName.includes('react') ||
      lowerFileName.includes('vue') ||
      lowerFileName.includes('angular')
    ) {
      categories.push('前端框架')
    }
    if (lowerFileName.includes('typescript') || lowerFileName.includes('javascript')) {
      categories.push('编程语言')
    }
    if (lowerFileName.includes('test') || lowerDesc.includes('test')) {
      categories.push('测试')
    }
    if (lowerFileName.includes('database') || lowerDesc.includes('database')) {
      categories.push('数据库')
    }
    if (lowerFileName.includes('api') || lowerDesc.includes('api')) {
      categories.push('API开发')
    }
    if (lowerFileName.includes('clean') || lowerDesc.includes('best practice')) {
      categories.push('最佳实践')
    }

    return categories.length > 0 ? categories : ['通用']
  }

  /**
   * 从内容中提取标签
   */
  private extractTags(content: string): string[] {
    // 简单实现：提取标题作为标签
    const tags: string[] = []
    const headingRegex = /^##\s+(.+)$/gm
    let match

    while ((match = headingRegex.exec(content)) !== null) {
      tags.push(match[1].trim())
    }

    return tags.slice(0, 10) // 最多10个标签
  }

  /**
   * 格式化显示名称
   */
  private formatDisplayName(fileName: string): string {
    // 将 kebab-case 转换为 Title Case
    return fileName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  /**
   * 批量解析目录下的所有规则文件
   */
  async parseRulesDirectory(directoryPath: string): Promise<CursorRule[]> {
    const rules: CursorRule[] = []

    async function walkDirectory(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          await walkDirectory(fullPath)
        } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdc')) {
          const parser = new RulesFileParser()
          const rule = await parser.parseRuleFile(fullPath)
          if (rule) {
            rules.push(rule)
          }
        }
      }
    }

    await walkDirectory(directoryPath)
    return rules
  }
}
```

#### 2. 数据导入服务

```typescript
// electron/main/services/rules-importer.ts
import * as path from 'path'
import { app } from 'electron'
import { RulesDatabase } from './rules-database'
import { RulesFileParser } from './rules-parser'

export class RulesImporter {
  private database: RulesDatabase
  private parser: RulesFileParser

  constructor() {
    this.database = new RulesDatabase()
    this.parser = new RulesFileParser()
  }

  /**
   * 从本地文件导入所有规则到数据库
   */
  async importLocalRules(): Promise<{ success: number; failed: number }> {
    console.log('开始导入本地 Cursor Rules...')

    const stats = { success: 0, failed: 0 }

    // 数据目录路径
    const dataPath = app.isPackaged
      ? path.join(process.resourcesPath, 'src', 'data')
      : path.join(app.getAppPath(), 'src', 'data')

    const rulesDirectories = [path.join(dataPath, 'rules'), path.join(dataPath, 'rules-new')]

    // 解析所有规则文件
    const allRules: CursorRule[] = []

    for (const dir of rulesDirectories) {
      try {
        console.log(`正在扫描目录: ${dir}`)
        const rules = await this.parser.parseRulesDirectory(dir)
        allRules.push(...rules)
        console.log(`✓ ${dir}: 解析 ${rules.length} 条规则`)
      } catch (error) {
        console.error(`✗ ${dir}: 扫描失败`, error)
      }
    }

    console.log(`\n共解析 ${allRules.length} 条规则，开始导入数据库...`)

    // 去重（根据 name）
    const uniqueRules = this.deduplicateRules(allRules)
    console.log(`去重后：${uniqueRules.length} 条规则`)

    // 批量导入数据库
    try {
      const count = this.database.bulkUpsertRules(uniqueRules)
      stats.success = count
      console.log(`\n✓ 成功导入 ${count} 条规则到数据库`)
    } catch (error) {
      console.error('✗ 导入数据库失败:', error)
      stats.failed = uniqueRules.length
    }

    return stats
  }

  /**
   * 去重规则（保留最新的）
   */
  private deduplicateRules(rules: CursorRule[]): CursorRule[] {
    const ruleMap = new Map<string, CursorRule>()

    for (const rule of rules) {
      const existing = ruleMap.get(rule.name)
      if (!existing || rule.lastUpdated > existing.lastUpdated) {
        ruleMap.set(rule.name, rule)
      }
    }

    return Array.from(ruleMap.values())
  }

  /**
   * 检查是否需要重新导入
   */
  async shouldReimport(): Promise<boolean> {
    // 检查数据库中的规则数量
    const dbRulesCount = await this.database.getRulesCount()

    // 如果数据库为空，需要导入
    if (dbRulesCount === 0) {
      return true
    }

    // 检查最后导入时间（可以添加更多逻辑）
    return false
  }
}
```

#### 3. 初始化流程

```typescript
// electron/main/index.ts
import { RulesImporter } from './services/rules-importer'

app.whenReady().then(async () => {
  // 初始化规则导入器
  const importer = new RulesImporter()

  // 检查是否需要导入
  const needImport = await importer.shouldReimport()

  if (needImport) {
    console.log('首次启动，开始导入 Cursor Rules 到数据库...')
    const stats = await importer.importLocalRules()
    console.log(`导入完成: 成功 ${stats.success} 条，失败 ${stats.failed} 条`)
  } else {
    console.log('数据库已有数据，跳过导入')
  }

  // 创建窗口等其他初始化
  createWindow()
})
```

### SQLite 数据库设计

#### 1. 数据库表结构

```sql
-- 规则主表
CREATE TABLE IF NOT EXISTS cursor_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,              -- 规则唯一标识
  display_name TEXT NOT NULL,              -- 显示名称
  description TEXT,                        -- 英文描述
  description_zh TEXT,                     -- 中文描述
  author TEXT,                             -- 作者
  language TEXT,                           -- 编程语言
  content TEXT NOT NULL,                   -- 规则内容
  source_url TEXT,                         -- 来源 URL
  stars INTEGER DEFAULT 0,                 -- 收藏数
  downloads INTEGER DEFAULT 0,             -- 下载次数
  last_updated TEXT,                       -- 最后更新时间
  version TEXT DEFAULT '1.0.0',            -- 版本号
  official INTEGER DEFAULT 0,              -- 是否官方规则 (0/1)
  license TEXT,                            -- 许可证
  scope TEXT DEFAULT 'project',            -- 适用范围
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 分类表
CREATE TABLE IF NOT EXISTS rule_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  name_zh TEXT,                            -- 中文名称
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 规则-分类关联表（多对多）
CREATE TABLE IF NOT EXISTS rule_category_mappings (
  rule_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  PRIMARY KEY (rule_id, category_id),
  FOREIGN KEY (rule_id) REFERENCES cursor_rules(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES rule_categories(id) ON DELETE CASCADE
);

-- 标签表
CREATE TABLE IF NOT EXISTS rule_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 规则-标签关联表（多对多）
CREATE TABLE IF NOT EXISTS rule_tag_mappings (
  rule_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (rule_id, tag_id),
  FOREIGN KEY (rule_id) REFERENCES cursor_rules(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES rule_tags(id) ON DELETE CASCADE
);

-- 已安装规则表
CREATE TABLE IF NOT EXISTS installed_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_id INTEGER NOT NULL,
  install_path TEXT NOT NULL,              -- 安装位置路径
  install_type TEXT NOT NULL,              -- project/workspace/global
  enabled INTEGER DEFAULT 1,               -- 是否启用 (0/1)
  installed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rule_id) REFERENCES cursor_rules(id) ON DELETE CASCADE
);

-- 同步记录表
CREATE TABLE IF NOT EXISTS sync_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  sync_status TEXT NOT NULL,               -- success/failed
  rules_count INTEGER DEFAULT 0,
  error_message TEXT,
  synced_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引优化查询
CREATE INDEX IF NOT EXISTS idx_rules_name ON cursor_rules(name);
CREATE INDEX IF NOT EXISTS idx_rules_language ON cursor_rules(language);
CREATE INDEX IF NOT EXISTS idx_rules_stars ON cursor_rules(stars DESC);
CREATE INDEX IF NOT EXISTS idx_rules_updated ON cursor_rules(last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_installed_rules_enabled ON installed_rules(enabled);

-- 创建全文搜索索引
CREATE VIRTUAL TABLE IF NOT EXISTS rules_fts USING fts5(
  name,
  display_name,
  description,
  description_zh,
  content,
  content=cursor_rules,
  content_rowid=id
);

-- 全文搜索触发器：插入
CREATE TRIGGER IF NOT EXISTS rules_fts_insert AFTER INSERT ON cursor_rules BEGIN
  INSERT INTO rules_fts(rowid, name, display_name, description, description_zh, content)
  VALUES (new.id, new.name, new.display_name, new.description, new.description_zh, new.content);
END;

-- 全文搜索触发器：更新
CREATE TRIGGER IF NOT EXISTS rules_fts_update AFTER UPDATE ON cursor_rules BEGIN
  UPDATE rules_fts SET
    name = new.name,
    display_name = new.display_name,
    description = new.description,
    description_zh = new.description_zh,
    content = new.content
  WHERE rowid = new.id;
END;

-- 全文搜索触发器：删除
CREATE TRIGGER IF NOT EXISTS rules_fts_delete AFTER DELETE ON cursor_rules BEGIN
  DELETE FROM rules_fts WHERE rowid = old.id;
END;
```

#### 2. 数据库服务实现

```typescript
// electron/main/services/rules-database.ts
import Database from 'better-sqlite3'
import * as path from 'path'
import { app } from 'electron'
import type { CursorRule, InstalledRule } from '../types'

export class RulesDatabase {
  private db: Database.Database

  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'cursor-rules.db')
    this.db = new Database(dbPath)
    this.initDatabase()
  }

  /**
   * 初始化数据库
   */
  private initDatabase() {
    // 执行上面的 SQL 建表语句
    this.db.exec(`
      -- 在这里放置上面的所有 CREATE TABLE 语句
      ...
    `)
  }

  /**
   * 插入或更新规则
   */
  upsertRule(rule: CursorRule): number {
    const stmt = this.db.prepare(`
      INSERT INTO cursor_rules (
        name, display_name, description, description_zh, author, language,
        content, source_url, stars, downloads, last_updated, version,
        official, license, scope, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(name) DO UPDATE SET
        display_name = excluded.display_name,
        description = excluded.description,
        description_zh = excluded.description_zh,
        content = excluded.content,
        stars = excluded.stars,
        downloads = excluded.downloads,
        last_updated = excluded.last_updated,
        version = excluded.version,
        updated_at = CURRENT_TIMESTAMP
    `)

    const info = stmt.run(
      rule.name,
      rule.displayName,
      rule.description,
      rule.descriptionZh,
      rule.author,
      rule.language,
      rule.content,
      rule.sourceUrl,
      rule.stars,
      rule.downloads,
      rule.lastUpdated,
      rule.version,
      rule.official ? 1 : 0,
      rule.license,
      rule.scope
    )

    return info.lastInsertRowid as number
  }

  /**
   * 批量插入规则（使用事务）
   */
  bulkUpsertRules(rules: CursorRule[]): number {
    const transaction = this.db.transaction((rules: CursorRule[]) => {
      for (const rule of rules) {
        this.upsertRule(rule)
        // 处理分类和标签
        this.upsertRuleCategories(rule)
        this.upsertRuleTags(rule)
      }
    })

    transaction(rules)
    return rules.length
  }

  /**
   * 搜索规则
   */
  searchRules(options: {
    query?: string
    category?: string
    language?: string
    sort?: 'stars' | 'updated' | 'created'
    page?: number
    perPage?: number
  }) {
    const {
      query = '',
      category = '',
      language = '',
      sort = 'stars',
      page = 1,
      perPage = 30
    } = options

    let sql = `
      SELECT DISTINCT r.* 
      FROM cursor_rules r
    `

    const conditions: string[] = []
    const params: any[] = []

    // 全文搜索
    if (query) {
      sql += `
        INNER JOIN rules_fts fts ON r.id = fts.rowid
      `
      conditions.push(`rules_fts MATCH ?`)
      params.push(query)
    }

    // 分类筛选
    if (category) {
      sql += `
        INNER JOIN rule_category_mappings rcm ON r.id = rcm.rule_id
        INNER JOIN rule_categories rc ON rcm.category_id = rc.id
      `
      conditions.push(`rc.name = ?`)
      params.push(category)
    }

    // 语言筛选
    if (language) {
      conditions.push(`r.language = ?`)
      params.push(language)
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ')
    }

    // 排序
    switch (sort) {
      case 'stars':
        sql += ` ORDER BY r.stars DESC`
        break
      case 'updated':
        sql += ` ORDER BY r.last_updated DESC`
        break
      case 'created':
        sql += ` ORDER BY r.created_at DESC`
        break
    }

    // 分页
    const offset = (page - 1) * perPage
    sql += ` LIMIT ? OFFSET ?`
    params.push(perPage, offset)

    // 执行查询
    const rules = this.db.prepare(sql).all(...params)

    // 查询总数
    const countSql =
      `SELECT COUNT(DISTINCT r.id) as total FROM cursor_rules r` +
      (query ? ` INNER JOIN rules_fts fts ON r.id = fts.rowid` : '') +
      (category
        ? ` INNER JOIN rule_category_mappings rcm ON r.id = rcm.rule_id
                     INNER JOIN rule_categories rc ON rcm.category_id = rc.id`
        : '') +
      (conditions.length > 0 ? ` WHERE ` + conditions.join(' AND ') : '')

    const countParams = params.slice(0, -2) // 去掉 LIMIT 和 OFFSET 参数
    const { total } = this.db.prepare(countSql).get(...countParams) as { total: number }

    return {
      total,
      page,
      perPage,
      items: rules
    }
  }

  /**
   * 获取规则详情
   */
  getRuleById(id: number): CursorRule | null {
    const rule = this.db.prepare('SELECT * FROM cursor_rules WHERE id = ?').get(id)

    if (!rule) return null

    // 获取分类和标签
    const categories = this.getRuleCategories(id)
    const tags = this.getRuleTags(id)

    return {
      ...rule,
      category: categories.map(c => c.name),
      tags: tags.map(t => t.name)
    } as CursorRule
  }

  /**
   * 记录已安装的规则
   */
  recordInstallation(rule: CursorRule, installPath: string, installType: string) {
    const stmt = this.db.prepare(`
      INSERT INTO installed_rules (rule_id, install_path, install_type)
      VALUES (?, ?, ?)
    `)

    stmt.run(rule.id, installPath, installType)
  }

  /**
   * 获取已安装的规则列表
   */
  getInstalledRules(): InstalledRule[] {
    return this.db
      .prepare(
        `
        SELECT 
          ir.*,
          r.name as rule_name,
          r.display_name
        FROM installed_rules ir
        JOIN cursor_rules r ON ir.rule_id = r.id
        ORDER BY ir.installed_at DESC
      `
      )
      .all() as InstalledRule[]
  }

  /**
   * 记录同步日志
   */
  logSync(sourceName: string, sourceUrl: string, status: string, count: number, error?: string) {
    const stmt = this.db.prepare(`
      INSERT INTO sync_logs (source_name, source_url, sync_status, rules_count, error_message)
      VALUES (?, ?, ?, ?, ?)
    `)

    stmt.run(sourceName, sourceUrl, status, count, error || null)
  }

  /**
   * 关闭数据库
   */
  close() {
    this.db.close()
  }

  // ... 其他辅助方法
}
```

#### 3. 定期同步服务（集成 SQLite）

```typescript
// electron/main/services/rules-sync-service.ts
import { RulesDatabase } from './rules-database'
import { RulesSyncService } from './rules-sync'

export class RulesRegistryService {
  private syncInterval: NodeJS.Timer | null = null
  private syncService: RulesSyncService
  private database: RulesDatabase

  // 实际可用的数据源配置
  private readonly DATA_SOURCES = {
    // 方案 C: 自建规则库（主要数据源，最稳定）
    ownDatabase: {
      name: 'TT Cursor Rules Database',
      url: 'https://raw.githubusercontent.com/YOUR_ORG/cursor-rules-database/main/rules.json',
      type: 'json',
      enabled: true
    },
    // 方案 B: GitHub API 搜索（动态发现，需要 Token）
    githubSearch: {
      name: 'GitHub Search API',
      url: 'https://api.github.com/search/code?q=filename:.cursorrules&per_page=100',
      type: 'api',
      enabled: false, // 需要配置 GitHub Token 后启用
      requiresToken: true
    },
    // 方案 A: Cursor Directory（备用，需要爬虫）
    cursorDirectory: {
      name: 'Cursor Directory',
      url: 'https://cursor.directory/rules',
      type: 'scrape',
      enabled: false // 暂时禁用，需要实现爬虫逻辑
    }
  }

  constructor() {
    this.syncService = new RulesSyncService()
    this.database = new RulesDatabase()
  }

  /**
   * 启动自动同步（每24小时）
   */
  startAutoSync(intervalHours: number = 24) {
    // 立即执行一次同步
    this.syncRules()

    // 设置定时同步
    this.syncInterval = setInterval(() => this.syncRules(), intervalHours * 60 * 60 * 1000)
  }

  /**
   * 从多个数据源同步规则到 SQLite
   */
  async syncRules() {
    console.log('开始同步 Cursor Rules...')

    let totalSynced = 0
    const errors: string[] = []

    // 遍历所有启用的数据源
    for (const [key, source] of Object.entries(this.DATA_SOURCES)) {
      if (!source.enabled) {
        console.log(`跳过禁用的数据源: ${source.name}`)
        continue
      }

      console.log(`正在同步: ${source.name}...`)

      try {
        let rules: CursorRule[] = []

        // 根据不同类型处理数据源
        switch (source.type) {
          case 'json':
            rules = await this.fetchJsonRules(source.url)
            break
          case 'api':
            rules = await this.fetchFromGitHubAPI(source.url)
            break
          case 'scrape':
            rules = await this.scrapeWebsite(source.url)
            break
          default:
            console.warn(`未知的数据源类型: ${source.type}`)
            continue
        }

        if (rules.length === 0) {
          console.warn(`从 ${source.name} 获取到 0 条规则`)
          continue
        }

        // 批量写入数据库（使用事务）
        const count = this.database.bulkUpsertRules(rules)
        totalSynced += count

        // 记录成功日志
        this.database.logSync(source.name, source.url, 'success', count)

        console.log(`✓ ${source.name}: ${count} 条规则`)
      } catch (error: any) {
        console.error(`✗ ${source.name} 同步失败:`, error.message)
        errors.push(`${source.name}: ${error.message}`)

        // 记录失败日志
        this.database.logSync(source.name, source.url, 'failed', 0, error.message)
      }
    }

    if (totalSynced === 0 && errors.length > 0) {
      throw new Error(`所有数据源同步失败:\n${errors.join('\n')}`)
    }

    console.log(`\n同步完成，共 ${totalSynced} 条规则`)
    return totalSynced
  }

  /**
   * 从 JSON URL 获取规则
   */
  private async fetchJsonRules(url: string): Promise<CursorRule[]> {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'tt-mcp-manager' }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return data.rules || []
  }

  /**
   * 从 GitHub Search API 获取规则
   */
  private async fetchFromGitHubAPI(url: string): Promise<CursorRule[]> {
    const headers: any = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'tt-mcp-manager'
    }

    // 如果配置了 GitHub Token
    const githubToken = process.env.GITHUB_TOKEN
    if (githubToken) {
      headers.Authorization = `Bearer ${githubToken}`
    }

    const response = await fetch(url, { headers })

    if (!response.ok) {
      throw new Error(`GitHub API 失败: ${response.status}`)
    }

    const data = await response.json()
    const rules: CursorRule[] = []

    // 解析搜索结果
    for (const item of data.items || []) {
      try {
        const content = await fetch(item.download_url).then(r => r.text())
        const rule = this.parseRuleFromContent(content, item)
        rules.push(rule)
      } catch (error) {
        console.warn(`解析规则失败: ${item.path}`, error)
      }
    }

    return rules
  }

  /**
   * 爬取网站获取规则（待实现）
   */
  private async scrapeWebsite(url: string): Promise<CursorRule[]> {
    // TODO: 实现 cursor.directory 爬虫逻辑
    throw new Error('网站爬虫功能暂未实现')
  }

  /**
   * 解析规则内容
   */
  private parseRuleFromContent(content: string, fileInfo: any): CursorRule {
    // 从内容中提取元数据（如果有 frontmatter）
    const metadata = this.extractMetadata(content)

    return {
      id: Date.now() + Math.random(),
      name: fileInfo.name.replace('.cursorrules', '').replace(/[^a-z0-9-]/gi, '-'),
      displayName: metadata.title || fileInfo.name,
      description: metadata.description || '',
      descriptionZh: metadata.descriptionZh || '',
      author: fileInfo.repository?.owner?.login || 'Unknown',
      language: metadata.language || 'General',
      category: metadata.category || ['通用'],
      tags: metadata.tags || [],
      content: content,
      sourceUrl: fileInfo.html_url,
      stars: fileInfo.repository?.stargazers_count || 0,
      downloads: 0,
      lastUpdated: new Date().toISOString(),
      version: metadata.version || '1.0.0',
      official: false,
      license: metadata.license || 'MIT',
      scope: 'project'
    }
  }

  /**
   * 提取 frontmatter 元数据
   */
  private extractMetadata(content: string): any {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/
    const match = content.match(frontmatterRegex)

    if (!match) return {}

    const frontmatter = match[1]
    const metadata: any = {}

    frontmatter.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split(':')
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim()
        metadata[key.trim()] = value
      }
    })

    return metadata
  }

  /**
   * 搜索规则（从数据库）
   */
  searchRules(options: any) {
    return this.database.searchRules(options)
  }

  /**
   * 停止自动同步
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }
}
```

### SQLite 方案的优势

#### 1. 性能对比

| 操作       | JSON 文件        | SQLite               |
| ---------- | ---------------- | -------------------- |
| 全文搜索   | O(n) 线性扫描    | O(log n) FTS5 索引   |
| 按字段筛选 | O(n) 遍历        | O(log n) B-tree 索引 |
| 分页查询   | 需要加载全部数据 | 直接返回指定范围     |
| 数据更新   | 重写整个文件     | 只更新变化的记录     |
| 并发访问   | 需要手动加锁     | 内置 ACID 事务       |

#### 2. 扩展性

SQLite 方案方便未来扩展：

- ✅ 用户评分和评论
- ✅ 规则使用统计
- ✅ 版本历史记录
- ✅ 规则依赖关系
- ✅ 自定义规则组合

#### 3. 数据迁移

如果已有 JSON 数据，可以轻松迁移：

```typescript
async function migrateJsonToSqlite() {
  const jsonData = await fs.readFile('cursor-rules.json', 'utf-8')
  const { rules } = JSON.parse(jsonData)

  const db = new RulesDatabase()
  db.bulkUpsertRules(rules)
  console.log(`迁移完成：${rules.length} 条规则`)
}
```

### 实施建议

1. **初始阶段**：使用 SQLite + 手工准备的规则种子数据
2. **第一次同步**：从推荐源拉取规则填充数据库
3. **定时更新**：每24小时自动同步一次
4. **离线支持**：本地数据库确保离线可用

---

## 十一、总结

本设计文档提供了三个不同层次的解决方案：

- **方案一（推荐）**：完全复用 MCP 架构，功能完整，实现稳妥
- **方案二**：统一市场架构，更加优雅，但需要重构
- **方案三**：轻量级集成，快速上线，功能基础

### 数据存储推荐

**强烈推荐使用 SQLite 数据库方案**：

- ✅ 性能更优
- ✅ 支持复杂查询和全文搜索
- ✅ 易于扩展和维护
- ✅ 数据完整性更好

### 数据源总结

**✅ 最终方案：本地数据 + SQLite 数据库**

```typescript
// 数据来源
const LOCAL_DATA_SOURCE = {
  directories: [
    'src/data/rules/', // 1062个规则文件
    'src/data/rules-new/' // 18个精选规则
  ],
  format: 'MDC/MD', // Markdown with frontmatter
  totalRules: ~1080,
  storage: 'SQLite', // 高性能本地数据库
  syncRequired: false // 不需要调用第三方API
}
```

### 最终实施方案

**采用方案一 + SQLite数据库 + 本地数据导入**：

**核心优势：**

1. ✅ **无网络依赖**：所有数据本地化，启动即可用
2. ✅ **高性能查询**：SQLite + 全文搜索索引（FTS5）
3. ✅ **数据丰富**：1080+ 条社区精选规则
4. ✅ **稳定可靠**：无需维护API，无限流问题
5. ✅ **完全可控**：数据质量有保证，可随时更新

**实施时间线：**

- **Day 1-2**: 实现文件解析器和数据导入
- **Day 3-4**: 完成 SQLite 数据库和全文搜索
- **Day 5-6**: 实现前端 UI 和交互
- **Day 7**: 测试和优化

**总工期：7个工作日**

---

## 附录：性能对比

| 指标         | 本地数据+SQLite | 远程API+JSON | 说明                        |
| ------------ | --------------- | ------------ | --------------------------- |
| 首次加载速度 | <100ms          | 2-5s         | SQLite 索引查询 vs 网络请求 |
| 搜索性能     | <10ms           | 500ms+       | FTS5 全文搜索 vs 线性扫描   |
| 离线可用性   | ✅              | ❌           | 完全本地化 vs 依赖网络      |
| 维护成本     | 低              | 高           | 无需维护API vs 需要监控     |
| 数据更新     | 手动更新文件    | 自动同步     | 可控性 vs 实时性            |

如果需要更详细的技术细节或有任何疑问，请随时反馈！
