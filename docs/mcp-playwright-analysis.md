# MCP-Playwright 项目实现思路深度解读

## 📋 项目概览

**mcp-playwright** 是一个将 Playwright 浏览器自动化能力通过 Model Context Protocol (MCP) 暴露给 LLM 的服务器实现。它让 AI 助手能够像人类一样操作浏览器、执行 API 请求和生成测试代码。

## 🏗️ 核心架构设计

### 1. 四层架构模式

```
┌─────────────────────────────────────┐
│   MCP Client (Claude/Cursor)       │
├─────────────────────────────────────┤
│   MCP Protocol Layer (SDK)          │
├─────────────────────────────────────┤
│   Business Logic Layer              │
│   - Request Handler                 │
│   - Tool Handler                    │
│   - Tool Implementations            │
├─────────────────────────────────────┤
│   Playwright Engine                 │
│   - Browser Control                 │
│   - API Requests                    │
└─────────────────────────────────────┘
```

## 💡 核心实现思路

### 1️⃣ **入口设计 (`index.ts`)**

#### 关键思路：简洁的服务器初始化

```typescript
// 创建 MCP 服务器实例
const server = new Server(
  {
    name: 'playwright-mcp',
    version: '1.0.6'
  },
  {
    capabilities: {
      resources: {}, // 支持资源读取（日志、截图）
      tools: {} // 支持工具调用（浏览器操作）
    }
  }
)

// 通过 stdio 进行进程间通信
const transport = new StdioServerTransport()
await server.connect(transport)
```

**设计亮点：**

- ✅ 使用 **stdio 传输**，与 Claude Desktop 等客户端无缝集成
- ✅ **优雅的关闭机制**，监听 SIGINT/SIGTERM 信号
- ✅ **全局错误捕获**，确保异常不会导致进程崩溃

---

### 2️⃣ **工具定义 (`tools.ts`)**

#### 关键思路：声明式工具清单

项目将所有工具分为三类：

```typescript
// 1. 浏览器工具 - 需要浏览器实例
export const BROWSER_TOOLS = [
  'playwright_navigate',
  'playwright_screenshot',
  'playwright_click'
  // ... 更多浏览器操作
]

// 2. API 工具 - 只需要 HTTP 请求上下文
export const API_TOOLS = [
  'playwright_get',
  'playwright_post'
  // ... REST API 操作
]

// 3. 代码生成工具 - 录制并生成测试代码
export const CODEGEN_TOOLS = [
  'start_codegen_session',
  'end_codegen_session'
  // ... 代码生成相关
]
```

**设计亮点：**

- ✅ **工具分类管理**，按需初始化浏览器/API 上下文
- ✅ **详细的 JSON Schema**，为每个工具定义清晰的参数结构
- ✅ **描述信息完善**，帮助 LLM 理解工具用途和参数

**示例工具定义：**

```typescript
{
  name: "playwright_screenshot",
  description: "Take a screenshot of the current page or a specific element",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Name for the screenshot"
      },
      selector: {
        type: "string",
        description: "CSS selector for element to screenshot"
      },
      fullPage: {
        type: "boolean",
        description: "Store screenshot of the entire page (default: false)"
      },
      // ... 更多参数
    },
    required: ["name"],
  },
}
```

---

### 3️⃣ **请求处理器 (`requestHandler.ts`)**

#### 关键思路：MCP 协议适配层

这个文件是 MCP 协议和业务逻辑的桥梁：

```typescript
export function setupRequestHandlers(server: Server, tools: Tool[]) {
  // 1. 列出所有可用资源（日志、截图）
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: 'console://logs',
        mimeType: 'text/plain',
        name: 'Browser console logs'
      },
      // 动态添加截图资源
      ...Array.from(getScreenshots().keys()).map(name => ({
        uri: `screenshot://${name}`,
        mimeType: 'image/png',
        name: `Screenshot: ${name}`
      }))
    ]
  }))

  // 2. 读取指定资源
  server.setRequestHandler(ReadResourceRequestSchema, async request => {
    const uri = request.params.uri.toString()
    if (uri === 'console://logs') {
      return { contents: [{ uri, text: getConsoleLogs().join('\n') }] }
    }
    // ... 处理截图读取
  })

  // 3. 列出所有可用工具
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools
  }))

  // 4. 执行工具调用
  server.setRequestHandler(CallToolRequestSchema, async request =>
    handleToolCall(request.params.name, request.params.arguments ?? {}, server)
  )
}
```

**设计亮点：**

- ✅ **资源动态注册**，截图自动作为资源暴露
- ✅ **统一的协议接口**，符合 MCP 规范
- ✅ **清晰的职责分离**，请求路由和业务逻辑解耦

---

### 4️⃣ **工具处理器 (`toolHandler.ts`)** ⭐ 核心

#### 关键思路：懒加载 + 状态管理 + 错误恢复

这是整个项目最复杂、最核心的部分。

#### 🎯 设计亮点 1：全局浏览器状态管理

```typescript
// 全局变量：单例模式管理浏览器实例
let browser: Browser | undefined
let page: Page | undefined
let currentBrowserType: 'chromium' | 'firefox' | 'webkit' = 'chromium'

// 重置浏览器状态
export function resetBrowserState() {
  browser = undefined
  page = undefined
  currentBrowserType = 'chromium'
}

// 更新全局页面
export function setGlobalPage(newPage: Page): void {
  page = newPage
  page.bringToFront() // 自动聚焦新标签页
}
```

**为什么这样设计？**

- 避免重复启动浏览器，提高性能
- 多个工具调用共享同一个浏览器会话
- 支持跨工具的状态保持（如导航后截图）

#### 🎯 设计亮点 2：智能的浏览器生命周期管理

```typescript
export async function ensureBrowser(browserSettings?: BrowserSettings) {
  // 1. 检测浏览器是否断连
  if (browser && !browser.isConnected()) {
    console.error('Browser exists but is disconnected. Cleaning up...')
    await browser.close().catch(() => {})
    resetBrowserState()
  }

  // 2. 按需启动浏览器
  if (!browser) {
    const { browserType = 'chromium', headless = false } = browserSettings ?? {}

    // 支持三种浏览器引擎
    let browserInstance = chromium
    switch (browserType) {
      case 'firefox':
        browserInstance = firefox
        break
      case 'webkit':
        browserInstance = webkit
        break
    }

    browser = await browserInstance.launch({ headless })

    // 监听断连事件，自动清理
    browser.on('disconnected', () => {
      console.error('Browser disconnected event triggered')
      resetBrowserState()
    })

    // 创建浏览器上下文和页面
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
      // ... 其他配置
    })
    page = await context.newPage()

    // 注册控制台日志监听
    await registerConsoleMessage(page)
  }

  // 3. 验证页面是否有效
  if (!page || page.isClosed()) {
    page = await browser.contexts()[0].newPage()
    await registerConsoleMessage(page)
  }

  return page!
}
```

**为什么这样设计？**

- ✅ **按需启动**：只有当工具需要浏览器时才启动
- ✅ **自动恢复**：检测到断连后自动清理并重启
- ✅ **灵活配置**：支持不同浏览器、视口大小、User-Agent
- ✅ **错误隔离**：单个工具失败不影响整个浏览器实例

#### 🎯 设计亮点 3：控制台日志捕获

```typescript
async function registerConsoleMessage(page) {
  // 捕获控制台消息
  page.on('console', msg => {
    const type = msg.type()
    const text = msg.text()
    consoleLogsTool.registerConsoleMessage(type, text)
  })

  // 捕获页面错误（未捕获的异常）
  page.on('pageerror', error => {
    consoleLogsTool.registerConsoleMessage('exception', `${error.message}\n${error.stack}`)
  })

  // 捕获未处理的 Promise 拒绝
  await page.addInitScript(() => {
    window.addEventListener('unhandledrejection', event => {
      const reason = event.reason
      const message =
        typeof reason === 'object' ? reason.message || JSON.stringify(reason) : String(reason)
      console.error(`[Playwright][Unhandled Rejection] ${message}`)
    })
  })
}
```

**为什么这样设计？**

- ✅ 让 LLM 能够看到浏览器中的错误信息
- ✅ 帮助调试和问题诊断
- ✅ 全面捕获：控制台日志、页面错误、Promise 拒绝

#### 🎯 设计亮点 4：工具路由和执行

```typescript
export async function handleToolCall(
  name: string,
  args: any,
  server: any
): Promise<CallToolResult> {
  // 1. 初始化所有工具实例（单例模式）
  initializeTools(server);

  try {
    // 2. 特殊处理代码生成工具
    if (name.startsWith('codegen_')) {
      // 直接调用代码生成处理器
      return await handleCodegenResult(...);
    }

    // 3. 记录操作（用于代码生成）
    const recorder = ActionRecorder.getInstance();
    if (recorder.getActiveSession()) {
      recorder.recordAction(name, args);
    }

    // 4. 准备执行上下文
    const context: ToolContext = { server };

    // 5. 按需初始化浏览器或 API 上下文
    if (BROWSER_TOOLS.includes(name)) {
      context.page = await ensureBrowser({
        viewport: { width: args.width, height: args.height },
        headless: args.headless,
        browserType: args.browserType || 'chromium'
      });
      context.browser = browser;
    }

    if (API_TOOLS.includes(name)) {
      context.apiContext = await ensureApiContext(args.url);
    }

    // 6. 路由到具体工具实现
    switch (name) {
      case "playwright_navigate":
        return await navigationTool.execute(args, context);
      case "playwright_screenshot":
        return await screenshotTool.execute(args, context);
      // ... 更多工具
      default:
        return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (error) {
    // 7. 统一错误处理
    console.error(`Error handling tool ${name}:`, error);

    // 检测浏览器连接错误，自动重置
    if (errorMessage.includes("Target closed") ||
        errorMessage.includes("Browser has been disconnected")) {
      resetBrowserState();
      return {
        content: [{ type: "text", text: `Browser connection error. Please try again.` }],
        isError: true,
      };
    }

    return { content: [{ type: "text", text: error.message }], isError: true };
  }
}
```

**为什么这样设计？**

- ✅ **懒加载工具实例**：提高启动速度
- ✅ **上下文注入**：工具不直接访问全局变量，通过上下文传递
- ✅ **统一错误处理**：捕获所有异常并格式化返回
- ✅ **智能恢复**：检测到浏览器断连自动重置状态

---

### 5️⃣ **工具实现模式**

项目中的每个工具都遵循统一的类模式：

```typescript
export class ScreenshotTool {
  private server: any
  private screenshots: Map<string, string> = new Map()

  constructor(server: any) {
    this.server = server
  }

  async execute(
    args: { name: string; selector?: string; fullPage?: boolean },
    context: ToolContext
  ): Promise<CallToolResult> {
    try {
      const { page } = context

      // 执行 Playwright 操作
      const screenshot = args.selector
        ? await page.locator(args.selector).screenshot({ encoding: 'base64' })
        : await page.screenshot({
            encoding: 'base64',
            fullPage: args.fullPage
          })

      // 存储截图
      this.screenshots.set(args.name, screenshot)

      // 返回结果
      return {
        content: [
          {
            type: 'image',
            data: screenshot,
            mimeType: 'image/png'
          }
        ],
        isError: false
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: error.message }],
        isError: true
      }
    }
  }

  getScreenshots(): Map<string, string> {
    return this.screenshots
  }
}
```

**设计亮点：**

- ✅ **面向对象**：每个工具是独立的类
- ✅ **状态封装**：工具内部维护自己的状态（如截图缓存）
- ✅ **统一接口**：所有工具都实现 `execute(args, context)` 方法
- ✅ **依赖注入**：通过构造函数和上下文传递依赖

---

## 🔥 核心创新点

### 1. **按需资源分配**

```typescript
// 只有需要浏览器的工具才启动浏览器
if (BROWSER_TOOLS.includes(name)) {
  context.page = await ensureBrowser(browserSettings)
}

// API 工具使用轻量级 HTTP 客户端
if (API_TOOLS.includes(name)) {
  context.apiContext = await request.newContext({ baseURL: url })
}
```

**优势：**

- 节省资源：不需要浏览器的 API 调用不启动浏览器
- 提高性能：避免不必要的浏览器开销

### 2. **代码生成能力（Codegen）**

项目最亮眼的功能之一：记录用户操作并生成 Playwright 测试代码。

```typescript
// 开始录制会话
start_codegen_session({ outputPath: './tests' })

// 执行操作（自动记录）
playwright_navigate({ url: 'https://example.com' })
playwright_fill({ selector: '#username', value: 'admin' })
playwright_click({ selector: '#submit' })

// 结束会话，生成测试文件
end_codegen_session({ sessionId })
```

**生成的代码：**

```typescript
import { test, expect } from '@playwright/test'

test('GeneratedTest_1234', async ({ page }) => {
  await page.goto('https://example.com')
  await page.fill('#username', 'admin')
  await page.click('#submit')
})
```

### 3. **资源暴露机制**

通过 MCP 的 Resources 功能，将运行时数据暴露给 LLM：

```typescript
// 列出资源
{
  resources: [
    { uri: 'console://logs', name: 'Browser console logs' },
    { uri: 'screenshot://homepage', name: 'Screenshot: homepage' },
    { uri: 'screenshot://result', name: 'Screenshot: result' }
  ]
}

// LLM 可以读取这些资源
const logs = await readResource('console://logs')
const screenshot = await readResource('screenshot://homepage')
```

**优势：**

- LLM 能够"看到"浏览器中发生的事情
- 帮助 LLM 做出更智能的决策
- 支持调试和问题诊断

### 4. **健壮的错误恢复**

项目在多个层面实现了错误恢复：

```typescript
// 1. 浏览器断连自动重启
browser.on('disconnected', () => {
  resetBrowserState()
})

// 2. 检测僵尸浏览器
if (browser && !browser.isConnected()) {
  await browser.close().catch(() => {})
  resetBrowserState()
}

// 3. 页面失效自动创建新页面
if (!page || page.isClosed()) {
  page = await browser.contexts()[0].newPage()
}

// 4. 工具执行失败不影响服务器
try {
  return await tool.execute(args, context)
} catch (error) {
  return { content: [{ type: 'text', text: error.message }], isError: true }
}
```

---

## 📊 工具分类详解

### 🌐 浏览器操作工具（23个）

| 分类     | 工具                                                                | 功能                  |
| -------- | ------------------------------------------------------------------- | --------------------- |
| 导航     | `navigate`, `go_back`, `go_forward`                                 | 页面跳转和历史管理    |
| 交互     | `click`, `fill`, `select`, `hover`, `drag`, `press_key`             | 元素交互              |
| 特殊交互 | `iframe_click`, `iframe_fill`, `upload_file`                        | 复杂场景处理          |
| 捕获     | `screenshot`, `save_as_pdf`, `get_visible_text`, `get_visible_html` | 内容捕获              |
| 执行     | `evaluate`, `console_logs`                                          | JavaScript 执行和日志 |
| 响应     | `expect_response`, `assert_response`                                | API 响应验证          |
| 其他     | `custom_user_agent`, `close`, `click_and_switch_tab`                | 高级功能              |

### 🔌 API 工具（5个）

- `playwright_get` - GET 请求
- `playwright_post` - POST 请求（支持 Bearer Token）
- `playwright_put` - PUT 请求
- `playwright_patch` - PATCH 请求
- `playwright_delete` - DELETE 请求

### 🎬 代码生成工具（4个）

- `start_codegen_session` - 开始录制
- `end_codegen_session` - 结束并生成代码
- `get_codegen_session` - 查询会话状态
- `clear_codegen_session` - 清除会话

---

## 🛠️ 技术栈

```json
{
  "核心依赖": {
    "@modelcontextprotocol/sdk": "MCP 协议实现",
    "playwright": "浏览器自动化引擎",
    "@playwright/browser-chromium": "Chromium 浏览器",
    "@playwright/browser-firefox": "Firefox 浏览器",
    "@playwright/browser-webkit": "WebKit 浏览器"
  },
  "开发工具": {
    "typescript": "类型安全",
    "jest": "单元测试",
    "@types/node": "Node.js 类型定义"
  },
  "部署支持": {
    "docker": "容器化部署",
    "npm": "包管理和发布"
  }
}
```

---

## 🎓 核心设计模式总结

### 1. **单例模式 (Singleton)**

- 浏览器实例全局唯一
- 工具类实例复用

### 2. **工厂模式 (Factory)**

- `createToolDefinitions()` 创建工具清单
- `ensureBrowser()` 按需创建浏览器

### 3. **策略模式 (Strategy)**

- 不同工具有不同的执行策略
- 支持多种浏览器引擎切换

### 4. **观察者模式 (Observer)**

- 监听浏览器 `disconnected` 事件
- 监听页面 `console` 和 `pageerror` 事件

### 5. **适配器模式 (Adapter)**

- `requestHandler.ts` 将 MCP 协议适配到业务逻辑

### 6. **命令模式 (Command)**

- 每个工具调用都是一个命令
- 支持录制和重放（代码生成）

---

## 💡 值得借鉴的设计思想

### 1. **渐进式资源分配**

不要一开始就初始化所有资源，而是按需分配：

```typescript
// ❌ 不好的做法
const browser = await chromium.launch() // 启动时就创建

// ✅ 好的做法
const browser = toolNeedsBrowser ? await ensureBrowser() : undefined
```

### 2. **防御性编程**

到处都有错误检查和恢复机制：

```typescript
if (browser && !browser.isConnected()) {
  await browser.close().catch(() => {})
  resetBrowserState()
}
```

### 3. **关注点分离**

- `tools.ts` - 工具定义（What）
- `toolHandler.ts` - 工具调度（How）
- `tools/*/` - 工具实现（Detail）

### 4. **声明式配置**

工具的 JSON Schema 既是文档，也是验证规则：

```typescript
{
  name: "playwright_screenshot",
  inputSchema: {
    properties: {
      name: { type: "string", description: "..." },
      // 描述即文档
    }
  }
}
```

---

## 🚀 如何应用到你的项目

### 1. **项目结构参考**

```
tt-mcp-manager/
├── electron/
│   └── main/
│       ├── index.ts              # 主进程入口
│       ├── ipc/                  # IPC 处理器
│       └── services/
│           ├── mcp-server.ts     # MCP 服务器管理
│           └── process-manager.ts # 进程管理
├── src/
│   ├── stores/
│   │   └── servers.ts            # 服务器状态管理
│   └── views/
│       └── dashboard/
│           └── components/
│               └── ServerList.vue # 服务器列表
```

### 2. **启动 MCP 服务器的方式**

```typescript
// 参考 mcp-playwright 的启动方式
import { spawn } from 'child_process'

export class MCPServerManager {
  private processes: Map<string, ChildProcess> = new Map()

  async startServer(config: ServerConfig) {
    const process = spawn('npx', ['-y', '@executeautomation/playwright-mcp-server'], {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    // 通过 stdin/stdout 进行 JSON-RPC 通信
    process.stdout.on('data', data => {
      const message = JSON.parse(data.toString())
      this.handleMCPMessage(message)
    })

    this.processes.set(config.id, process)
  }
}
```

### 3. **工具管理**

```typescript
// 在你的项目中管理 MCP 服务器提供的工具
export interface MCPTool {
  name: string
  description: string
  inputSchema: JSONSchema
}

export class ToolManager {
  async listTools(serverId: string): Promise<MCPTool[]> {
    const request = {
      jsonrpc: '2.0',
      method: 'tools/list',
      id: generateId()
    }
    return await this.sendRequest(serverId, request)
  }

  async callTool(serverId: string, toolName: string, args: any) {
    const request = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: toolName, arguments: args },
      id: generateId()
    }
    return await this.sendRequest(serverId, request)
  }
}
```

---

## 🔍 进阶主题

### Docker 部署

项目提供了 Docker 支持：

```dockerfile
FROM node:20-slim

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY dist ./dist

ENTRYPOINT ["node", "dist/index.js"]
```

### 测试策略

```typescript
// 使用 Jest 进行单元测试
describe('ToolHandler', () => {
  it('should handle browser tool calls', async () => {
    const result = await handleToolCall(
      'playwright_navigate',
      {
        url: 'https://example.com'
      },
      mockServer
    )

    expect(result.isError).toBe(false)
  })
})
```

---

## 📝 总结

**mcp-playwright** 的核心设计思想：

1. **按需加载**：避免不必要的资源消耗
2. **错误恢复**：多层防御，自动重试和重置
3. **声明式定义**：工具定义清晰，易于维护
4. **分层架构**：协议层、调度层、实现层清晰分离
5. **状态管理**：全局状态 + 工具内部状态相结合
6. **资源暴露**：通过 MCP Resources 让 LLM 能"看到"运行时数据

这些设计思想完全可以应用到你的 `tt-mcp-manager` 项目中：

- 管理多个 MCP 服务器进程
- 展示服务器提供的工具
- 执行工具调用并显示结果
- 查看运行时资源（日志、截图等）

---

## 🔗 参考资源

- [MCP 官方文档](https://modelcontextprotocol.io/docs)
- [Playwright 文档](https://playwright.dev/)
- [mcp-playwright GitHub](https://github.com/executeautomation/mcp-playwright)

---

**创建日期**: 2025-10-31  
**作者**: AI Assistant  
**项目**: tt-mcp-manager
