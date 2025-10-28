# 在 Cursor 中使用 MCP Manager

本文档介绍如何将 MCP Manager 中配置的服务器集成到 Cursor 编辑器中。

## 📋 前提条件

1. 已在 MCP Manager 中安装并配置好 MCP 服务器
2. 服务器已成功启动（状态显示为"运行中"）
3. Cursor 编辑器已安装（版本支持 MCP）

---

## 🚀 方法一：导出配置（推荐）

### 步骤 1：导出配置

1. 在 MCP Manager 的 Dashboard 页面
2. 点击"**导出 Cursor 配置**"按钮
3. 配置将自动复制到剪贴板

### 步骤 2：配置 Cursor

1. 打开 Cursor 编辑器
2. 打开设置：`Cmd/Ctrl + Shift + P` → 输入 `settings`
3. 选择 "**Preferences: Open Settings (JSON)**"
4. 在 JSON 配置文件中添加或更新 `mcpServers` 字段：

```json
{
  // ... 其他设置 ...
  "mcpServers": {
    // 粘贴从 MCP Manager 复制的配置
    "github-server": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"]
    },
    "filesystem-server": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/你的用户名/Documents"]
    }
    // ... 更多服务器 ...
  }
}
```

### 步骤 3：重启 Cursor

保存设置文件后，重启 Cursor 以使配置生效。

---

## 📝 方法二：手动配置

如果您只想配置特定的服务器，可以手动添加：

### 1. 查看服务器信息

在 MCP Manager 的 Dashboard 中，找到您想要配置的服务器，记录：
- **命令** (command)：例如 `npx`
- **参数** (args)：例如 `["-y", "@modelcontextprotocol/server-github"]`
- **工作目录** (working directory)：某些服务器需要

### 2. 添加到 Cursor 配置

```json
{
  "mcpServers": {
    "your-server-name": {
      "command": "npx",
      "args": ["-y", "package-name", "additional-args"],
      "env": {
        // 可选：环境变量
        "API_KEY": "your-api-key"
      }
    }
  }
}
```

---

## 🎯 配置示例

### GitHub MCP Server

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxx"
      }
    }
  }
}
```

### Filesystem MCP Server

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/username/Documents",
        "/Users/username/Projects"
      ]
    }
  }
}
```

### PostgreSQL MCP Server

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "postgresql://user:pass@localhost:5432/dbname"
      }
    }
  }
}
```

---

## 🔍 验证配置

配置完成后，在 Cursor 中：

1. 打开一个项目或文件
2. 观察底部状态栏，应该能看到 MCP 相关的提示
3. 尝试使用 AI 助手，它应该能够访问配置的 MCP 服务器提供的功能

---

## ⚠️ 常见问题

### Q1: 配置后没有生效

**解决方案：**
- 确保 JSON 格式正确（没有多余的逗号或语法错误）
- 重启 Cursor 编辑器
- 检查 Cursor 的开发者工具（`Help` → `Toggle Developer Tools`）查看错误信息

### Q2: 服务器无法连接

**解决方案：**
- 确保服务器在 MCP Manager 中处于"运行中"状态
- 检查服务器的工作目录和环境变量是否正确
- 查看 MCP Manager 中的日志输出

### Q3: npx 命令找不到

**解决方案：**
- 确保已安装 Node.js（版本 18 或更高）
- 在终端中运行 `which npx` 确认 npx 可用
- 如果使用 nvm，确保在 Cursor 配置中使用完整路径

---

## 🛠️ 高级配置

### 使用完整路径

如果您使用 nvm 或其他版本管理工具，可能需要指定 npx 的完整路径：

```json
{
  "mcpServers": {
    "github": {
      "command": "/Users/username/.nvm/versions/node/v20.0.0/bin/npx",
      "args": ["-y", "@modelcontextprotocol/server-github"]
    }
  }
}
```

### 设置工作目录

某些服务器需要特定的工作目录：

```json
{
  "mcpServers": {
    "custom-server": {
      "command": "npx",
      "args": ["-y", "your-package"],
      "cwd": "/path/to/working/directory"
    }
  }
}
```

---

## 📚 相关资源

- [Model Context Protocol 官方文档](https://modelcontextprotocol.io/)
- [Cursor 编辑器文档](https://cursor.sh/docs)
- [MCP Servers GitHub 仓库](https://github.com/modelcontextprotocol/servers)

---

## 💡 提示

1. **定期更新**：MCP 服务器包会定期更新，使用 `npx` 的好处是始终使用最新版本
2. **环境变量**：敏感信息（如 API 密钥）应该通过环境变量配置，不要直接写在配置文件中
3. **测试**：在添加多个服务器前，先测试单个服务器是否工作正常
4. **日志**：如果遇到问题，查看 MCP Manager 中的日志可以帮助诊断问题

---

**享受 MCP 带来的强大功能！** 🎉

