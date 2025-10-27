# API 设计文档

## 🌐 RESTful API 接口

### 基础信息

```
Base URL: http://localhost:9999/api
Content-Type: application/json
```

### 服务器管理 API

#### 1. 获取所有服务器

```http
GET /api/servers
```

**响应示例**：
```json
{
  "success": true,
  "data": [
    {
      "id": "fs-001",
      "name": "Filesystem MCP",
      "type": "npm",
      "status": "running",
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "/Users/xxx/Documents"],
      "env": {},
      "workingDirectory": "/Users/xxx/Documents",
      "autoStart": true,
      "autoRestart": true,
      "maxRestarts": 3,
      "restartCount": 0,
      "startTime": "2024-01-01T12:00:00Z",
      "uptime": 7200
    }
  ]
}
```

#### 2. 创建服务器

```http
POST /api/servers
```

**请求体**：
```json
{
  "name": "My Filesystem Server",
  "type": "npm",
  "command": "npx",
  "args": ["@modelcontextprotocol/server-filesystem", "/path/to/dir"],
  "env": {},
  "workingDirectory": "/path/to/dir",
  "autoStart": false,
  "autoRestart": true,
  "maxRestarts": 3
}
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "id": "fs-002",
    "name": "My Filesystem Server",
    "status": "stopped",
    ...
  }
}
```

#### 3. 获取单个服务器

```http
GET /api/servers/:id
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "id": "fs-001",
    "name": "Filesystem MCP",
    "status": "running",
    ...
  }
}
```

#### 4. 更新服务器

```http
PUT /api/servers/:id
```

**请求体**：
```json
{
  "name": "Updated Name",
  "autoStart": true
}
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "id": "fs-001",
    "name": "Updated Name",
    ...
  }
}
```

#### 5. 删除服务器

```http
DELETE /api/servers/:id
```

**响应示例**：
```json
{
  "success": true,
  "message": "Server deleted successfully"
}
```

#### 6. 启动服务器

```http
POST /api/servers/:id/start
```

**响应示例**：
```json
{
  "success": true,
  "message": "Server started successfully",
  "data": {
    "id": "fs-001",
    "status": "running",
    "startTime": "2024-01-01T12:00:00Z"
  }
}
```

#### 7. 停止服务器

```http
POST /api/servers/:id/stop
```

**响应示例**：
```json
{
  "success": true,
  "message": "Server stopped successfully",
  "data": {
    "id": "fs-001",
    "status": "stopped"
  }
}
```

#### 8. 重启服务器

```http
POST /api/servers/:id/restart
```

**响应示例**：
```json
{
  "success": true,
  "message": "Server restarted successfully"
}
```

### 日志管理 API

#### 9. 获取服务器日志

```http
GET /api/servers/:id/logs?level=info&limit=100&offset=0
```

**查询参数**：
- `level`: 日志级别（all/info/warn/error/debug）
- `limit`: 返回数量（默认 100）
- `offset`: 偏移量（默认 0）
- `search`: 搜索关键词

**响应示例**：
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "timestamp": "2024-01-01T12:00:00Z",
        "level": "info",
        "message": "Server started successfully",
        "source": "stdout"
      }
    ],
    "total": 1500,
    "limit": 100,
    "offset": 0
  }
}
```

#### 10. 清空日志

```http
DELETE /api/servers/:id/logs
```

**响应示例**：
```json
{
  "success": true,
  "message": "Logs cleared successfully"
}
```

#### 11. 导出日志

```http
GET /api/servers/:id/logs/export
```

**响应**：文件下载（text/plain）

### 模板管理 API

#### 12. 获取所有模板

```http
GET /api/templates
```

**响应示例**：
```json
{
  "success": true,
  "data": [
    {
      "id": "template-filesystem",
      "name": "文件系统 MCP Server",
      "description": "提供对本地文件系统的安全访问",
      "icon": "📁",
      "category": "文件系统",
      "install": {
        "type": "npm",
        "package": "@modelcontextprotocol/server-filesystem"
      },
      "config": {
        "command": "npx",
        "args": ["@modelcontextprotocol/server-filesystem", "${workingDirectory}"]
      },
      "requiredConfig": [
        {
          "key": "workingDirectory",
          "label": "工作目录",
          "type": "directory",
          "required": true
        }
      ]
    }
  ]
}
```

#### 13. 从模板创建服务器

```http
POST /api/templates/:templateId/create
```

**请求体**：
```json
{
  "name": "My Server",
  "config": {
    "workingDirectory": "/path/to/dir"
  }
}
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "id": "fs-003",
    "name": "My Server",
    ...
  }
}
```

### 市场 API

#### 14. 搜索 MCP Server

```http
GET /api/marketplace/search?q=filesystem&category=文件系统&sort=stars&page=1
```

**查询参数**：
- `q`: 搜索关键词
- `category`: 分类
- `language`: 编程语言
- `sort`: 排序方式（stars/updated/created）
- `page`: 页码
- `perPage`: 每页数量

**响应示例**：
```json
{
  "success": true,
  "data": {
    "total": 100,
    "page": 1,
    "perPage": 30,
    "items": [
      {
        "id": 896335270,
        "name": "awesome-mcp-servers",
        "fullName": "punkpeye/awesome-mcp-servers",
        "description": "A collection of MCP servers",
        "stars": 73671,
        "forks": 6164,
        "language": "TypeScript",
        "topics": ["ai", "mcp"],
        "githubUrl": "https://github.com/punkpeye/awesome-mcp-servers",
        "homepage": "https://glama.ai/mcp/servers",
        "license": "MIT License",
        "createdAt": "2024-11-30T04:49:10Z",
        "updatedAt": "2025-10-27T08:40:28Z",
        "npmPackage": "@modelcontextprotocol/server-filesystem",
        "downloadCount": 1200000,
        "category": ["文件系统"],
        "installType": "npm"
      }
    ]
  }
}
```

#### 15. 获取服务器详情

```http
GET /api/marketplace/servers/:owner/:repo
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "repository": {...},
    "readme": "# Filesystem MCP Server\n\n...",
    "packageInfo": {
      "name": "@modelcontextprotocol/server-filesystem",
      "version": "1.0.0",
      "description": "...",
      "dependencies": {...}
    },
    "installCommand": "npm install -g @modelcontextprotocol/server-filesystem"
  }
}
```

#### 16. 安装市场服务器

```http
POST /api/marketplace/install
```

**请求体**：
```json
{
  "repository": "modelcontextprotocol/servers",
  "packageName": "@modelcontextprotocol/server-filesystem",
  "type": "npm",
  "config": {
    "name": "My Filesystem Server",
    "workingDirectory": "/path/to/dir"
  }
}
```

**响应示例**：
```json
{
  "success": true,
  "message": "Server installed successfully",
  "data": {
    "id": "fs-004",
    "name": "My Filesystem Server",
    ...
  }
}
```

### 配置管理 API

#### 17. 导出 Cursor 配置

```http
GET /api/config/export
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "mcpServers": {
      "filesystem": {
        "command": "npx",
        "args": ["@modelcontextprotocol/server-filesystem", "/path/to/dir"]
      },
      "git": {
        "command": "python",
        "args": ["-m", "mcp_server_git"]
      }
    }
  }
}
```

#### 18. 获取应用设置

```http
GET /api/settings
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "general": {
      "autoStart": true,
      "minimizeToTray": true,
      "language": "zh-CN",
      "theme": "light"
    },
    "api": {
      "enabled": true,
      "port": 9999
    },
    "github": {
      "token": "ghp_xxx..."
    }
  }
}
```

#### 19. 更新应用设置

```http
PUT /api/settings
```

**请求体**：
```json
{
  "general": {
    "autoStart": false
  }
}
```

### 错误响应

所有错误响应遵循统一格式：

```json
{
  "success": false,
  "error": {
    "code": "SERVER_NOT_FOUND",
    "message": "Server with id 'fs-001' not found",
    "details": {}
  }
}
```

**错误码列表**：

| 错误码 | HTTP状态 | 说明 |
|--------|----------|------|
| `SERVER_NOT_FOUND` | 404 | 服务器不存在 |
| `SERVER_ALREADY_RUNNING` | 400 | 服务器已在运行 |
| `SERVER_NOT_RUNNING` | 400 | 服务器未运行 |
| `INVALID_CONFIG` | 400 | 配置无效 |
| `INSTALL_FAILED` | 500 | 安装失败 |
| `START_FAILED` | 500 | 启动失败 |
| `STOP_FAILED` | 500 | 停止失败 |
| `GITHUB_API_ERROR` | 503 | GitHub API 错误 |
| `RATE_LIMIT_EXCEEDED` | 429 | API 限流 |

## 🔌 WebSocket 接口

### 连接

```javascript
const socket = io('http://localhost:9999')
```

### 事件列表

#### 1. 服务器状态变化

**事件名**：`server:status`

**数据格式**：
```json
{
  "serverId": "fs-001",
  "status": "running",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**状态值**：
- `running` - 运行中
- `stopped` - 已停止
- `error` - 错误
- `restarting` - 重启中

#### 2. 新日志消息

**事件名**：`server:log`

**数据格式**：
```json
{
  "serverId": "fs-001",
  "timestamp": "2024-01-01T12:00:00Z",
  "level": "info",
  "message": "Request received",
  "source": "stdout"
}
```

#### 3. 服务器错误

**事件名**：`server:error`

**数据格式**：
```json
{
  "serverId": "fs-001",
  "timestamp": "2024-01-01T12:00:00Z",
  "error": {
    "code": "PROCESS_CRASHED",
    "message": "Process exited with code 1"
  }
}
```

#### 4. 安装进度

**事件名**：`install:progress`

**数据格式**：
```json
{
  "packageName": "@modelcontextprotocol/server-filesystem",
  "stage": "downloading",
  "progress": 45,
  "message": "Downloading package..."
}
```

**阶段值**：
- `checking` - 检查依赖
- `downloading` - 下载中
- `installing` - 安装中
- `configuring` - 配置中
- `completed` - 完成
- `failed` - 失败

### 客户端示例

```javascript
const socket = io('http://localhost:9999')

// 监听服务器状态变化
socket.on('server:status', (data) => {
  console.log(`Server ${data.serverId} status: ${data.status}`)
})

// 监听新日志
socket.on('server:log', (data) => {
  console.log(`[${data.level}] ${data.message}`)
})

// 监听错误
socket.on('server:error', (data) => {
  console.error(`Server ${data.serverId} error:`, data.error)
})

// 断开连接
socket.on('disconnect', () => {
  console.log('Disconnected from server')
})
```

## 🔒 认证和安全

### API Token（可选）

如果启用 API 认证，需要在请求头中包含 token：

```http
Authorization: Bearer <your-api-token>
```

### CORS 配置

默认允许 localhost 和 127.0.0.1 访问。

### 速率限制

- 未认证：60 请求/分钟
- 已认证：300 请求/分钟

## 📊 健康检查

### Ping

```http
GET /api/ping
```

**响应**：
```json
{
  "success": true,
  "message": "pong",
  "timestamp": "2024-01-01T12:00:00Z",
  "version": "1.0.0"
}
```

### 健康状态

```http
GET /api/health
```

**响应**：
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 86400,
    "servers": {
      "total": 5,
      "running": 3,
      "stopped": 2,
      "error": 0
    },
    "resources": {
      "memory": {
        "used": 150000000,
        "total": 8000000000
      },
      "cpu": 15.5
    }
  }
}
```

