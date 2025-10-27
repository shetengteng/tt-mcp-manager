# MCP Manager

基于 Electron + Vue 3 + ShadCN 的 MCP Server 管理工具。

## 功能特性

- 🚀 可视化管理 MCP Server
- 🛍️ 内置市场，一键安装开源 MCP Server
- 📚 模板库，快速创建常用配置
- 📊 实时日志查看
- 🔧 导出配置供 Cursor 使用
- 🌐 提供 RESTful API 和 WebSocket 接口

## 开发

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

### 构建

```bash
# 构建应用
pnpm build

# 打包（macOS）
pnpm build:mac

# 打包（Windows）
pnpm build:win

# 打包（Linux）
pnpm build:linux

# 打包所有平台
pnpm build:all
```

### 代码规范

```bash
# 运行 ESLint
pnpm lint

# 格式化代码
pnpm format

# 类型检查
pnpm type-check
```

### 测试

```bash
# 运行测试
pnpm test

# 监听模式
pnpm test:watch

# 生成覆盖率报告
pnpm test:coverage
```

## 项目结构

```
tt-mcp-manager/
├── electron/              # Electron 主进程
│   ├── main/             # 主进程代码
│   │   ├── index.ts      # 主进程入口
│   │   ├── services/     # 核心服务
│   │   ├── ipc/          # IPC 处理器
│   │   └── types/        # 类型定义
│   └── preload/          # 预加载脚本
│       └── index.ts
├── src/                  # Vue 渲染进程
│   ├── main.ts           # 渲染进程入口
│   ├── App.vue           # 根组件
│   ├── components/       # 组件
│   ├── views/            # 页面
│   ├── stores/           # Pinia stores
│   ├── router/           # 路由
│   ├── types/            # 类型定义
│   ├── composables/      # 组合式函数
│   └── assets/           # 静态资源
├── templates/            # MCP Server 模板
├── docs/                 # 文档
└── package.json
```

## 技术栈

- **框架**: Electron + Vue 3
- **UI 库**: ShadCN-Vue + TailwindCSS
- **状态管理**: Pinia
- **路由**: Vue Router
- **构建工具**: Vite + electron-vite
- **语言**: TypeScript
- **API 服务**: Express + Socket.io

## 文档

### 设计文档
- [项目概览](./docs/01-project-overview.md) - 项目介绍和功能特性
- [技术架构](./docs/02-technical-architecture.md) - 技术栈和架构设计
- [UI 原型](./docs/03-ui-prototype.md) - 界面设计和交互流程
- [流程图](./docs/04-flow-diagrams.md) - 业务流程和数据流
- [API 设计](./docs/05-api-design.md) - API 接口设计
- [模板设计](./docs/06-template-design.md) - MCP Server 模板规范
- [市场功能](./docs/07-marketplace.md) - 市场功能设计
- [开发指南](./docs/08-development-guide.md) - 开发环境和规范

### 进度文档
- [项目进度](./docs/PROGRESS.md) - 开发进度追踪
- [最新进度](./docs/PROGRESS_UPDATE.md) - 最新更新说明
- [快速开始](./docs/GETTING_STARTED.md) - 快速上手指南

### 技术文档
- [Shadcn 迁移指南](./docs/SHADCN_MIGRATION.md) - Shadcn-Vue 组件迁移详解
- [组件迁移总结](./docs/COMPONENT_MIGRATION_SUMMARY.md) - 组件迁移对比和示例

## License

MIT

