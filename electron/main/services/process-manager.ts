import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import type {
  ServerConfig,
  MCPServerProcess,
  ServerStatus
} from '../types'

/**
 * 进程管理器
 * 负责管理所有 MCP Server 进程的生命周期
 */
export class ProcessManager extends EventEmitter {
  // 存储所有运行中的进程
  private processes: Map<string, MCPServerProcess> = new Map()

  /**
   * 启动 MCP Server
   */
  async startServer(config: ServerConfig): Promise<void> {
    // 检查进程是否已经在运行
    const existingProcess = this.processes.get(config.id)
    if (existingProcess) {
      // 检查进程是否真的还活着
      const isAlive = existingProcess.process && !existingProcess.process.killed
      if (isAlive) {
        throw new Error(`服务器 ${config.id} 已在运行`)
      } else {
        // 进程已死亡但记录还在，清理它
        console.log(`[ProcessManager] 清理僵尸进程记录: ${config.id}`)
        this.processes.delete(config.id)
      }
    }

    console.log(`[ProcessManager] 启动服务器: ${config.name} (${config.id})`)
    console.log(`[ProcessManager] 命令:`, config.command, config.args)
    console.log(`[ProcessManager] 工作目录:`, config.workingDirectory)

    // 展开 ~ 到用户主目录
    const os = require('os')
    const workDir = config.workingDirectory?.replace(/^~/, os.homedir())
    console.log(`[ProcessManager] 展开后的工作目录:`, workDir)

    // 使用 spawn 启动子进程
    const childProcess = spawn(config.command, config.args, {
      cwd: workDir,
      env: { ...process.env, ...config.env },
      stdio: ['pipe', 'pipe', 'pipe']
    })

    console.log(`[ProcessManager] 子进程已创建, PID: ${childProcess.pid}`)

    // 创建进程记录
    const mcpProcess: MCPServerProcess = {
      id: config.id,
      config,
      process: childProcess,
      status: 'running',
      startTime: new Date(),
      restartCount: 0,
      pid: childProcess.pid
    }

    // 存储进程
    this.processes.set(config.id, mcpProcess)
    console.log(`[ProcessManager] 进程已存储到 Map, 总进程数: ${this.processes.size}`)

    // 监听标准输出
    childProcess.stdout?.on('data', (data: Buffer) => {
      this.handleServerOutput(config.id, data)
    })

    // 监听错误输出
    childProcess.stderr?.on('data', (data: Buffer) => {
      this.handleServerError(config.id, data)
    })

    // 监听进程退出
    childProcess.on('exit', (code: number | null) => {
      this.handleProcessExit(config.id, code)
    })

    // 监听进程错误
    childProcess.on('error', (error: Error) => {
      console.error(`[ProcessManager] ❌ 进程错误 [${config.id}]:`, error)
      console.error(`[ProcessManager] 错误详情:`, {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
        errno: (error as any).errno,
        syscall: (error as any).syscall,
        path: (error as any).path
      })
      this.updateStatus(config.id, 'error')
      this.emit('server:error', { serverId: config.id, error: error.message })
    })

    // 触发启动事件
    this.emit('server:status', {
      serverId: config.id,
      status: 'running',
      timestamp: new Date()
    })
  }

  /**
   * 停止 MCP Server
   */
  async stopServer(serverId: string): Promise<void> {
    const mcpProcess = this.processes.get(serverId)
    if (!mcpProcess) {
      console.log(`[ProcessManager] 服务器 ${serverId} 不存在或已停止`)
      return // 不抛出错误，直接返回
    }

    console.log(`[ProcessManager] 停止服务器: ${serverId}`)

    const process = mcpProcess.process

    // 立即从 Map 中删除，防止重复操作
    this.processes.delete(serverId)
    console.log(`[ProcessManager] 已从 Map 中删除进程，剩余进程数: ${this.processes.size}`)

    // 先发送 SIGTERM 信号
    process.kill('SIGTERM')

    // 等待 5 秒
    await new Promise<void>(resolve => {
      const timeout = setTimeout(() => {
        // 如果还没退出，强制终止
        if (!process.killed) {
          console.log(`[ProcessManager] 强制终止进程: ${serverId}`)
          process.kill('SIGKILL')
        }
        resolve()
      }, 5000)

      // 如果进程已退出，清除超时
      process.once('exit', () => {
        clearTimeout(timeout)
        console.log(`[ProcessManager] 进程已退出: ${serverId}`)
        resolve()
      })
    })

    // 触发停止事件
    this.emit('server:status', {
      serverId,
      status: 'stopped',
      timestamp: new Date()
    })
    
    console.log(`[ProcessManager] 停止操作完成: ${serverId}`)
  }

  /**
   * 重启 MCP Server
   */
  async restartServer(serverId: string): Promise<void> {
    const mcpProcess = this.processes.get(serverId)
    if (!mcpProcess) {
      throw new Error(`服务器 ${serverId} 不存在`)
    }

    console.log(`重启服务器: ${serverId}`)

    const config = mcpProcess.config
    await this.stopServer(serverId)
    await new Promise(resolve => setTimeout(resolve, 1000)) // 等待 1 秒
    await this.startServer(config)
  }

  /**
   * 获取服务器状态
   */
  getServerStatus(serverId: string): {
    status: ServerStatus
    uptime?: number
    pid?: number
  } {
    const mcpProcess = this.processes.get(serverId)
    if (!mcpProcess) {
      console.log(`[ProcessManager] 服务器 ${serverId} 不存在，返回 stopped`)
      return { status: 'stopped' }
    }

    const uptime = Date.now() - mcpProcess.startTime.getTime()
    const result = {
      status: mcpProcess.status,
      uptime,
      pid: mcpProcess.pid
    }
    console.log(`[ProcessManager] 服务器 ${serverId} 状态:`, result)
    return result
  }

  /**
   * 检查服务器是否在运行
   */
  isRunning(serverId: string): boolean {
    const mcpProcess = this.processes.get(serverId)
    return mcpProcess?.status === 'running'
  }

  /**
   * 获取所有进程
   */
  getAllProcesses(): MCPServerProcess[] {
    return Array.from(this.processes.values())
  }

  /**
   * 处理服务器标准输出
   */
  private handleServerOutput(serverId: string, data: Buffer): void {
    const message = data.toString().trim()
    if (!message) return

    console.log(`[${serverId}] stdout:`, message)

    // 触发日志事件
    this.emit('log:new', {
      serverId,
      timestamp: new Date(),
      level: 'info',
      message,
      source: 'stdout'
    })
  }

  /**
   * 处理服务器错误输出
   */
  private handleServerError(serverId: string, data: Buffer): void {
    const message = data.toString().trim()
    if (!message) return

    console.error(`[ProcessManager] ⚠️ [${serverId}] stderr:`, message)

    // 触发日志事件
    this.emit('log:new', {
      serverId,
      timestamp: new Date(),
      level: 'error',
      message,
      source: 'stderr'
    })
  }

  /**
   * 处理进程退出
   */
  private handleProcessExit(serverId: string, code: number | null): void {
    const mcpProcess = this.processes.get(serverId)
    if (!mcpProcess) {
      console.log(`[ProcessManager] 进程退出 [${serverId}]: 已清理，跳过`)
      return
    }

    console.log(`[ProcessManager] 🛑 进程退出 [${serverId}]: code=${code}`)
    console.log(`[ProcessManager] 进程信息:`, {
      pid: mcpProcess.pid,
      status: mcpProcess.status,
      uptime: Date.now() - mcpProcess.startTime.getTime(),
      restartCount: mcpProcess.restartCount
    })

    // 如果是异常退出且启用了自动重启
    if (code !== 0 && mcpProcess.config.autoRestart) {
      const restartCount = mcpProcess.restartCount + 1

      // 检查是否超过最大重启次数
      if (restartCount <= mcpProcess.config.maxRestarts) {
        console.log(`[ProcessManager] 自动重启服务器 [${serverId}] (${restartCount}/${mcpProcess.config.maxRestarts})`)

        // 更新重启次数
        mcpProcess.restartCount = restartCount
        mcpProcess.status = 'restarting'

        // 延迟 2 秒后重启
        setTimeout(() => {
          // 先删除旧进程记录
          this.processes.delete(serverId)
          // 重新启动
          this.startServer(mcpProcess.config).catch(error => {
            console.error(`[ProcessManager] 重启失败 [${serverId}]:`, error)
          })
        }, 2000)

        return
      } else {
        console.error(`[ProcessManager] 达到最大重启次数 [${serverId}]`)
      }
    }

    // 清理进程（如果还在 Map 中）
    if (this.processes.has(serverId)) {
      this.processes.delete(serverId)
      console.log(`[ProcessManager] 已清理进程记录: ${serverId}`)
    }

    // 触发退出事件
    this.emit('server:status', {
      serverId,
      status: 'stopped',
      timestamp: new Date()
    })
  }

  /**
   * 更新服务器状态
   */
  private updateStatus(serverId: string, status: ServerStatus): void {
    const mcpProcess = this.processes.get(serverId)
    if (mcpProcess) {
      mcpProcess.status = status
    }
  }

  /**
   * 停止所有服务器
   */
  async stopAll(): Promise<void> {
    const serverIds = Array.from(this.processes.keys())
    await Promise.all(serverIds.map(id => this.stopServer(id).catch(console.error)))
  }
}

