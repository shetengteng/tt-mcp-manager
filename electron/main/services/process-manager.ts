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
    if (this.isRunning(config.id)) {
      throw new Error(`服务器 ${config.id} 已在运行`)
    }

    console.log(`启动服务器: ${config.name} (${config.id})`)

    // 使用 spawn 启动子进程
    const process = spawn(config.command, config.args, {
      cwd: config.workingDirectory,
      env: { ...process.env, ...config.env },
      stdio: ['pipe', 'pipe', 'pipe']
    })

    // 创建进程记录
    const mcpProcess: MCPServerProcess = {
      id: config.id,
      config,
      process,
      status: 'running',
      startTime: new Date(),
      restartCount: 0,
      pid: process.pid
    }

    // 存储进程
    this.processes.set(config.id, mcpProcess)

    // 监听标准输出
    process.stdout?.on('data', (data: Buffer) => {
      this.handleServerOutput(config.id, data)
    })

    // 监听错误输出
    process.stderr?.on('data', (data: Buffer) => {
      this.handleServerError(config.id, data)
    })

    // 监听进程退出
    process.on('exit', (code: number | null) => {
      this.handleProcessExit(config.id, code)
    })

    // 监听进程错误
    process.on('error', (error: Error) => {
      console.error(`进程错误 [${config.id}]:`, error)
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
      throw new Error(`服务器 ${serverId} 不存在`)
    }

    console.log(`停止服务器: ${serverId}`)

    const process = mcpProcess.process

    // 先发送 SIGTERM 信号
    process.kill('SIGTERM')

    // 等待 5 秒
    await new Promise<void>(resolve => {
      const timeout = setTimeout(() => {
        // 如果还没退出，强制终止
        if (!process.killed) {
          console.log(`强制终止进程: ${serverId}`)
          process.kill('SIGKILL')
        }
        resolve()
      }, 5000)

      // 如果进程已退出，清除超时
      process.once('exit', () => {
        clearTimeout(timeout)
        resolve()
      })
    })

    // 更新状态
    this.updateStatus(serverId, 'stopped')
    this.processes.delete(serverId)

    // 触发停止事件
    this.emit('server:status', {
      serverId,
      status: 'stopped',
      timestamp: new Date()
    })
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
      return { status: 'stopped' }
    }

    const uptime = Date.now() - mcpProcess.startTime.getTime()
    return {
      status: mcpProcess.status,
      uptime,
      pid: mcpProcess.pid
    }
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

    console.error(`[${serverId}] stderr:`, message)

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
    if (!mcpProcess) return

    console.log(`进程退出 [${serverId}]: code=${code}`)

    // 如果是异常退出且启用了自动重启
    if (code !== 0 && mcpProcess.config.autoRestart) {
      const restartCount = mcpProcess.restartCount + 1

      // 检查是否超过最大重启次数
      if (restartCount <= mcpProcess.config.maxRestarts) {
        console.log(`自动重启服务器 [${serverId}] (${restartCount}/${mcpProcess.config.maxRestarts})`)

        // 更新重启次数
        mcpProcess.restartCount = restartCount
        mcpProcess.status = 'restarting'

        // 延迟 2 秒后重启
        setTimeout(() => {
          this.startServer(mcpProcess.config).catch(error => {
            console.error(`重启失败 [${serverId}]:`, error)
            this.updateStatus(serverId, 'error')
          })
        }, 2000)

        return
      } else {
        console.error(`达到最大重启次数 [${serverId}]`)
        this.updateStatus(serverId, 'error')
      }
    }

    // 清理进程
    this.processes.delete(serverId)
    this.updateStatus(serverId, 'stopped')

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

