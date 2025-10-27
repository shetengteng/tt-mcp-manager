# 模板设计文档

## 📚 模板库概述

模板库提供预配置的 MCP Server 模板，让用户快速创建常用服务器，无需手动配置复杂参数。

### 设计原则

1. **开箱即用**：最少的配置步骤
2. **最佳实践**：经过验证的配置
3. **清晰说明**：详细的使用指南
4. **安全优先**：包含安全提示和警告

## 📋 模板结构

### 标准模板格式

```json
{
  "id": "template-filesystem",
  "name": "文件系统 MCP Server",
  "description": "提供对本地文件系统的安全访问，支持读写文件和目录操作",
  "icon": "📁",
  "category": "文件系统",
  "tags": ["filesystem", "files", "directories"],
  "popularity": 5,
  "difficulty": "simple",
  
  "install": {
    "type": "npm",
    "package": "@modelcontextprotocol/server-filesystem",
    "version": "latest",
    "command": "npm install -g @modelcontextprotocol/server-filesystem"
  },
  
  "config": {
    "command": "npx",
    "args": [
      "@modelcontextprotocol/server-filesystem",
      "${workingDirectory}"
    ],
    "env": {
      "NODE_ENV": "production"
    },
    "autoStart": false,
    "autoRestart": true,
    "maxRestarts": 3
  },
  
  "requiredConfig": [
    {
      "key": "workingDirectory",
      "label": "工作目录",
      "type": "directory",
      "required": true,
      "description": "MCP Server 可以访问的目录路径",
      "defaultValue": "${homeDir}/Documents",
      "placeholder": "/Users/xxx/Documents",
      "validation": {
        "mustExist": true,
        "mustBeAbsolute": true,
        "mustBeDirectory": true
      }
    }
  ],
  
  "features": [
    "读取文件内容",
    "写入文件",
    "列出目录",
    "创建/删除文件和目录",
    "获取文件元数据"
  ],
  
  "useCases": [
    {
      "title": "访问项目文档",
      "description": "让 AI 读取和修改项目文档",
      "example": {
        "workingDirectory": "/Users/xxx/MyProject"
      }
    },
    {
      "title": "管理下载文件",
      "description": "整理和分析下载的文件",
      "example": {
        "workingDirectory": "/Users/xxx/Downloads"
      }
    }
  ],
  
  "security": {
    "warning": "该 MCP Server 可以读写指定目录内的所有文件，请谨慎选择工作目录",
    "recommendations": [
      "不要将根目录 (/) 设为工作目录",
      "避免授权访问包含敏感信息的目录",
      "建议为每个项目创建单独的服务器实例"
    ]
  },
  
  "documentation": {
    "readme": "https://github.com/modelcontextprotocol/servers/blob/main/src/filesystem/README.md",
    "homepage": "https://modelcontextprotocol.org",
    "support": "https://github.com/modelcontextprotocol/servers/issues"
  }
}
```

## 🎯 内置模板列表

### 1. 文件系统 MCP (Filesystem)

**文件**：`templates/filesystem.json`

```json
{
  "id": "template-filesystem",
  "name": "文件系统 MCP Server",
  "description": "提供对本地文件系统的安全访问，支持读写文件和目录操作",
  "icon": "📁",
  "category": "文件系统",
  "tags": ["filesystem", "files", "directories", "basic"],
  "popularity": 5,
  "difficulty": "simple",
  
  "install": {
    "type": "npm",
    "package": "@modelcontextprotocol/server-filesystem",
    "version": "latest",
    "command": "npm install -g @modelcontextprotocol/server-filesystem"
  },
  
  "config": {
    "command": "npx",
    "args": ["@modelcontextprotocol/server-filesystem", "${workingDirectory}"],
    "env": {},
    "autoStart": false,
    "autoRestart": true,
    "maxRestarts": 3
  },
  
  "requiredConfig": [
    {
      "key": "workingDirectory",
      "label": "工作目录",
      "type": "directory",
      "required": true,
      "description": "MCP Server 可以访问的目录路径",
      "defaultValue": "${homeDir}/Documents",
      "validation": {
        "mustExist": true,
        "mustBeAbsolute": true,
        "mustBeDirectory": true
      }
    }
  ],
  
  "features": [
    "读取文件内容",
    "写入文件",
    "列出目录",
    "创建/删除文件",
    "获取文件信息"
  ],
  
  "security": {
    "warning": "该 MCP Server 可以读写指定目录内的所有文件",
    "recommendations": [
      "不要将根目录 (/) 设为工作目录",
      "避免授权访问包含敏感信息的目录"
    ]
  }
}
```

### 2. Git 操作 MCP

**文件**：`templates/git.json`

```json
{
  "id": "template-git",
  "name": "Git 操作 MCP Server",
  "description": "提供 Git 仓库管理和版本控制功能",
  "icon": "🔧",
  "category": "开发工具",
  "tags": ["git", "version-control", "development"],
  "popularity": 4,
  "difficulty": "simple",
  
  "install": {
    "type": "python",
    "package": "mcp-server-git",
    "version": "latest",
    "command": "pip install mcp-server-git"
  },
  
  "config": {
    "command": "python",
    "args": ["-m", "mcp_server_git", "--repo", "${repositoryPath}"],
    "env": {},
    "autoStart": false,
    "autoRestart": true,
    "maxRestarts": 3
  },
  
  "requiredConfig": [
    {
      "key": "repositoryPath",
      "label": "Git 仓库路径",
      "type": "directory",
      "required": true,
      "description": "Git 仓库的根目录",
      "defaultValue": "${homeDir}/Projects/my-repo",
      "validation": {
        "mustExist": true,
        "mustBeAbsolute": true,
        "mustContain": [".git"]
      }
    }
  ],
  
  "features": [
    "查看提交历史",
    "创建分支",
    "提交更改",
    "查看文件差异",
    "合并分支"
  ],
  
  "security": {
    "warning": "该 MCP Server 可以执行 Git 操作，包括提交和推送",
    "recommendations": [
      "确保 Git 凭据配置正确",
      "谨慎使用自动提交功能"
    ]
  }
}
```

### 3. 网络搜索 MCP

**文件**：`templates/web-search.json`

```json
{
  "id": "template-web-search",
  "name": "网络搜索 MCP Server",
  "description": "提供实时网络搜索功能，获取最新信息",
  "icon": "🌐",
  "category": "Web服务",
  "tags": ["search", "web", "internet", "realtime"],
  "popularity": 5,
  "difficulty": "simple",
  
  "install": {
    "type": "npm",
    "package": "@exa-labs/exa-mcp-server",
    "version": "latest",
    "command": "npm install -g @exa-labs/exa-mcp-server"
  },
  
  "config": {
    "command": "npx",
    "args": ["@exa-labs/exa-mcp-server"],
    "env": {
      "EXA_API_KEY": "${exaApiKey}"
    },
    "autoStart": false,
    "autoRestart": true,
    "maxRestarts": 3
  },
  
  "requiredConfig": [
    {
      "key": "exaApiKey",
      "label": "Exa API Key",
      "type": "password",
      "required": true,
      "description": "从 https://exa.ai 获取的 API 密钥",
      "placeholder": "exa_xxxxxxxxxxxxx",
      "validation": {
        "minLength": 10,
        "pattern": "^exa_"
      }
    }
  ],
  
  "features": [
    "实时网络搜索",
    "网页内容抓取",
    "搜索结果摘要",
    "相关链接发现"
  ],
  
  "security": {
    "warning": "需要 Exa API Key，请妥善保管",
    "recommendations": [
      "从 https://exa.ai 注册获取 API Key",
      "注意 API 使用配额"
    ]
  }
}
```

### 4. 数据库 MCP

**文件**：`templates/database.json`

```json
{
  "id": "template-database",
  "name": "数据库 MCP Server",
  "description": "提供 SQL 数据库查询和操作功能",
  "icon": "🗄️",
  "category": "数据平台",
  "tags": ["database", "sql", "query"],
  "popularity": 3,
  "difficulty": "medium",
  
  "install": {
    "type": "npm",
    "package": "@modelcontextprotocol/server-postgres",
    "version": "latest",
    "command": "npm install -g @modelcontextprotocol/server-postgres"
  },
  
  "config": {
    "command": "npx",
    "args": ["@modelcontextprotocol/server-postgres"],
    "env": {
      "DATABASE_URL": "${databaseUrl}"
    },
    "autoStart": false,
    "autoRestart": true,
    "maxRestarts": 3
  },
  
  "requiredConfig": [
    {
      "key": "databaseUrl",
      "label": "数据库连接字符串",
      "type": "password",
      "required": true,
      "description": "PostgreSQL 数据库连接 URL",
      "placeholder": "postgresql://user:password@localhost:5432/dbname",
      "validation": {
        "pattern": "^postgresql://"
      }
    }
  ],
  
  "features": [
    "执行 SQL 查询",
    "查看表结构",
    "数据库迁移",
    "数据分析"
  ],
  
  "security": {
    "warning": "该 MCP Server 可以访问和修改数据库",
    "recommendations": [
      "使用只读账户进行查询操作",
      "谨慎执行修改操作",
      "定期备份数据库"
    ]
  }
}
```

### 5. HTTP 请求 MCP

**文件**：`templates/http.json`

```json
{
  "id": "template-http",
  "name": "HTTP 请求 MCP Server",
  "description": "提供 HTTP 请求功能，调用外部 API",
  "icon": "🌍",
  "category": "Web服务",
  "tags": ["http", "api", "rest", "webhook"],
  "popularity": 4,
  "difficulty": "simple",
  
  "install": {
    "type": "npm",
    "package": "@modelcontextprotocol/server-fetch",
    "version": "latest",
    "command": "npm install -g @modelcontextprotocol/server-fetch"
  },
  
  "config": {
    "command": "npx",
    "args": ["@modelcontextprotocol/server-fetch"],
    "env": {},
    "autoStart": false,
    "autoRestart": true,
    "maxRestarts": 3
  },
  
  "requiredConfig": [],
  
  "features": [
    "发送 HTTP 请求（GET/POST/PUT/DELETE）",
    "自定义请求头",
    "处理响应数据",
    "支持认证"
  ],
  
  "security": {
    "warning": "该 MCP Server 可以访问互联网上的任何 API",
    "recommendations": [
      "注意 API 密钥安全",
      "避免发送敏感信息"
    ]
  }
}
```

## 🔧 模板字段说明

### 基本信息

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 模板唯一标识 |
| `name` | string | ✅ | 模板名称 |
| `description` | string | ✅ | 模板描述 |
| `icon` | string | ✅ | Emoji 图标 |
| `category` | string | ✅ | 分类 |
| `tags` | string[] | ❌ | 标签数组 |
| `popularity` | number | ❌ | 热度（1-5） |
| `difficulty` | string | ❌ | 难度（simple/medium/hard） |

### 安装配置

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `install.type` | string | ✅ | 安装类型（npm/python/git） |
| `install.package` | string | ✅ | 包名 |
| `install.version` | string | ❌ | 版本号 |
| `install.command` | string | ✅ | 安装命令 |

### 运行配置

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `config.command` | string | ✅ | 启动命令 |
| `config.args` | string[] | ✅ | 命令参数 |
| `config.env` | object | ❌ | 环境变量 |
| `config.autoStart` | boolean | ❌ | 自动启动 |
| `config.autoRestart` | boolean | ❌ | 自动重启 |
| `config.maxRestarts` | number | ❌ | 最大重启次数 |

### 用户配置

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `requiredConfig[].key` | string | ✅ | 配置键名 |
| `requiredConfig[].label` | string | ✅ | 显示标签 |
| `requiredConfig[].type` | string | ✅ | 输入类型 |
| `requiredConfig[].required` | boolean | ✅ | 是否必填 |
| `requiredConfig[].description` | string | ❌ | 说明文字 |
| `requiredConfig[].defaultValue` | string | ❌ | 默认值 |
| `requiredConfig[].placeholder` | string | ❌ | 占位符 |
| `requiredConfig[].validation` | object | ❌ | 验证规则 |

### 输入类型

- `text`: 普通文本输入
- `password`: 密码输入（隐藏显示）
- `directory`: 目录选择器
- `file`: 文件选择器
- `number`: 数字输入
- `select`: 下拉选择
- `checkbox`: 复选框
- `textarea`: 多行文本

### 验证规则

```typescript
{
  "mustExist": boolean,          // 路径必须存在
  "mustBeAbsolute": boolean,     // 必须是绝对路径
  "mustBeDirectory": boolean,    // 必须是目录
  "mustBeFile": boolean,         // 必须是文件
  "mustContain": string[],       // 必须包含的文件/目录
  "minLength": number,           // 最小长度
  "maxLength": number,           // 最大长度
  "pattern": string,             // 正则表达式
  "min": number,                 // 最小值（数字）
  "max": number,                 // 最大值（数字）
  "custom": function            // 自定义验证函数
}
```

## 🎨 变量替换

模板支持以下变量：

| 变量 | 说明 | 示例 |
|------|------|------|
| `${homeDir}` | 用户主目录 | `/Users/xxx` |
| `${workingDirectory}` | 用户输入的工作目录 | `/path/to/dir` |
| `${key}` | 用户配置的任意键 | 用户输入的值 |

## 📝 使用示例

### 在代码中加载模板

```typescript
import fs from 'fs/promises'
import path from 'path'

class TemplateManager {
  private templatesDir: string
  
  async loadTemplate(templateId: string) {
    const filePath = path.join(this.templatesDir, `${templateId}.json`)
    const content = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(content)
  }
  
  async getAllTemplates() {
    const files = await fs.readdir(this.templatesDir)
    const templates = []
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const template = await this.loadTemplate(
          file.replace('.json', '')
        )
        templates.push(template)
      }
    }
    
    return templates
  }
  
  // 从模板创建服务器配置
  createServerFromTemplate(template: Template, userConfig: any) {
    const config = { ...template.config }
    
    // 替换变量
    config.args = config.args.map(arg => 
      this.replaceVariables(arg, userConfig)
    )
    
    // 替换环境变量
    for (const key in config.env) {
      config.env[key] = this.replaceVariables(
        config.env[key],
        userConfig
      )
    }
    
    return {
      id: generateId(),
      name: userConfig.name || template.name,
      type: template.install.type,
      ...config
    }
  }
  
  private replaceVariables(str: string, config: any) {
    return str.replace(/\$\{(\w+)\}/g, (match, key) => {
      if (key === 'homeDir') {
        return os.homedir()
      }
      return config[key] || match
    })
  }
}
```

