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
  // 存储错误服务器的状态（即使进程已退出也保留）
  private errorStates: Map<string, { status: 'error'; timestamp: Date; reason?: string }> = new Map()

  /**
   * 启动 MCP Server
   */
  async startServer(config: ServerConfig): Promise<void> {
    console.log(`[ProcessManager] ========== 启动请求 ==========`)
    console.log(`[ProcessManager] 服务器 ID: ${config.id}`)
    console.log(`[ProcessManager] 当前进程 Map 大小: ${this.processes.size}`)
    console.log(`[ProcessManager] Map 中的所有进程 ID:`, Array.from(this.processes.keys()))
    
    // 检查进程是否已经在运行
    const existingProcess = this.processes.get(config.id)
    console.log(`[ProcessManager] 检查现有进程:`, existingProcess ? '存在' : '不存在')
    
    if (existingProcess) {
      // 检查进程是否真的还活着
      const isAlive = existingProcess.process && !existingProcess.process.killed
      console.log(`[ProcessManager] 进程是否存活:`, isAlive)
      console.log(`[ProcessManager] 进程详情:`, {
        pid: existingProcess.pid,
        killed: existingProcess.process?.killed,
        status: existingProcess.status
      })
      
      if (isAlive) {
        console.error(`[ProcessManager] ❌ 拒绝启动: 服务器已在运行`)
        throw new Error(`服务器 ${config.id} 已在运行`)
      } else {
        // 进程已死亡但记录还在，清理它
        console.log(`[ProcessManager] 清理僵尸进程记录: ${config.id}`)
        this.processes.delete(config.id)
      }
    }

    // 清除之前的错误状态（如果有）
    if (this.errorStates.has(config.id)) {
      this.errorStates.delete(config.id)
      console.log(`[ProcessManager] 清除之前的错误状态: ${config.id}`)
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
    console.log(`[ProcessManager] ========== 停止请求 ==========`)
    console.log(`[ProcessManager] 服务器 ID: ${serverId}`)
    console.log(`[ProcessManager] 当前进程 Map 大小: ${this.processes.size}`)
    console.log(`[ProcessManager] Map 中的所有进程 ID:`, Array.from(this.processes.keys()))
    
    // 清除错误状态（如果有）
    if (this.errorStates.has(serverId)) {
      this.errorStates.delete(serverId)
      console.log(`[ProcessManager] 清除错误状态: ${serverId}`)
    }
    
    const mcpProcess = this.processes.get(serverId)
    if (!mcpProcess) {
      console.log(`[ProcessManager] ⚠️ 服务器 ${serverId} 不存在或已停止，跳过`)
      return // 不抛出错误，直接返回
    }

    console.log(`[ProcessManager] 停止服务器: ${serverId}`)
    console.log(`[ProcessManager] 进程信息:`, {
      pid: mcpProcess.pid,
      status: mcpProcess.status,
      killed: mcpProcess.process?.killed
    })

    const process = mcpProcess.process

    // 立即从 Map 中删除，防止重复操作
    this.processes.delete(serverId)
    console.log(`[ProcessManager] ✅ 已从 Map 中删除进程，剩余进程数: ${this.processes.size}`)
    console.log(`[ProcessManager] 剩余进程 ID:`, Array.from(this.processes.keys()))

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
    // 首先检查是否有错误状态
    const errorState = this.errorStates.get(serverId)
    if (errorState) {
      console.log(`[ProcessManager] 服务器 ${serverId} 处于错误状态`)
      return { status: 'error' }
    }

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
   * 测试 MCP Server 功能
   */
  async testServer(serverId: string): Promise<{
    success: boolean
    capabilities?: {
      tools?: string[]
      resources?: string[]
      prompts?: string[]
    }
    error?: string
  }> {
    const mcpProcess = this.processes.get(serverId)
    if (!mcpProcess || mcpProcess.status !== 'running') {
      return {
        success: false,
        error: '服务器未运行'
      }
    }

    try {
      console.log(`[ProcessManager] 测试服务器: ${serverId}`)
      
      // 发送 tools/list 请求
      const toolsRequest = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/list',
        params: {}
      }

      // 创建响应 Promise
      const responsePromise = new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          clearTimeout(timeout)
          mcpProcess.process.stdout?.removeListener('data', onData)
          reject(new Error('测试超时（10秒）'))
        }, 10000)

        // 累积的数据缓冲区
        let buffer = ''

        // 监听一次性响应
        const onData = (data: Buffer) => {
          try {
            // 将新数据追加到缓冲区
            buffer += data.toString()
            
            // 尝试从缓冲区提取完整的 JSON 行
            const lines = buffer.split('\n')
            
            // 保留最后一个不完整的行
            buffer = lines.pop() || ''
            
            // 处理完整的行
            for (const line of lines) {
              const trimmedLine = line.trim()
              if (!trimmedLine) continue
              
              try {
                const response = JSON.parse(trimmedLine)
                // 检查是否是我们期待的响应
                if (response.id === toolsRequest.id) {
                  clearTimeout(timeout)
                  mcpProcess.process.stdout?.removeListener('data', onData)
                  resolve(response)
                  return
                }
              } catch (e) {
                // 忽略非 JSON 行
                console.log(`[ProcessManager] 忽略非 JSON 行: ${trimmedLine.substring(0, 100)}...`)
              }
            }
          } catch (error) {
            console.error(`[ProcessManager] 处理响应数据时出错:`, error)
          }
        }

        mcpProcess.process.stdout?.on('data', onData)
      })

      // 发送请求
      mcpProcess.process.stdin?.write(JSON.stringify(toolsRequest) + '\n')

      // 等待响应
      const response = await responsePromise

      console.log(`[ProcessManager] 测试响应:`, response)

      if (response.error) {
        return {
          success: false,
          error: response.error.message || '服务器返回错误'
        }
      }

      // 解析功能
      const capabilities: any = {}

      if (response.result?.tools) {
        capabilities.tools = response.result.tools.map((t: any) => t.name || t)
      }

      if (response.result?.resources) {
        capabilities.resources = response.result.resources.map((r: any) => r.name || r)
      }

      if (response.result?.prompts) {
        capabilities.prompts = response.result.prompts.map((p: any) => p.name || p)
      }

      return {
        success: true,
        capabilities
      }
    } catch (error: any) {
      console.error(`[ProcessManager] 测试失败 [${serverId}]:`, error)
      return {
        success: false,
        error: error.message || '测试请求失败'
      }
    }
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

    // 智能判断日志级别
    // 很多 MCP Server 的正常日志也会输出到 stderr
    const level = this.determineLogLevel(message)
    
    if (level === 'error') {
      console.error(`[ProcessManager] ❌ [${serverId}] stderr:`, message)
    } else if (level === 'warn') {
      console.warn(`[ProcessManager] ⚠️ [${serverId}] stderr:`, message)
    } else {
      console.log(`[ProcessManager] ℹ️ [${serverId}] stderr:`, message)
    }

    // 触发日志事件
    this.emit('log:new', {
      serverId,
      timestamp: new Date(),
      level,
      message,
      source: 'stderr'
    })
  }

  /**
   * 根据消息内容判断日志级别
   */
  private determineLogLevel(message: string): 'info' | 'warn' | 'error' {
    const lowerMessage = message.toLowerCase()

    // 正常信息的关键词
    const infoKeywords = [
      'running on stdio',
      'server started',
      'listening on',
      'connected',
      'initialized',
      'ready',
      'starting'
    ]

    // 错误的关键词
    const errorKeywords = [
      'error:',
      'failed:',
      'exception:',
      'fatal:',
      'uncaught',
      'unhandled',
      'cannot',
      'not found',
      'enoent',
      'eacces',
      'permission denied'
    ]

    // 检查是否是错误
    if (errorKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'error'
    }

    // 检查是否是正常信息
    if (infoKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'info'
    }

    // 默认作为警告
    return 'warn'
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

        // 更新重启次数（关键：在重启前更新，而不是在新进程中重置）
        mcpProcess.restartCount = restartCount
        mcpProcess.status = 'restarting'

        // 延迟 2 秒后重启
        setTimeout(() => {
          // 保存重启次数
          const savedRestartCount = mcpProcess.restartCount
          // 先删除旧进程记录
          this.processes.delete(serverId)
          // 重新启动，并传递重启次数
          const config = { ...mcpProcess.config }
          this.startServer(config).then(() => {
            // 启动成功后，恢复重启次数
            const newProcess = this.processes.get(serverId)
            if (newProcess) {
              newProcess.restartCount = savedRestartCount
            }
          }).catch(error => {
            console.error(`[ProcessManager] 重启失败 [${serverId}]:`, error)
          })
        }, 2000)

        return
      } else {
        console.error(`[ProcessManager] ❌ 达到最大重启次数 [${serverId}]，停止自动重启`)
        // 设置为错误状态
        mcpProcess.status = 'error'
      }
    }

    // 决定最终状态
    const finalStatus = mcpProcess.status === 'error' ? 'error' : (code !== 0 ? 'error' : 'stopped')
    
    // 如果是错误状态，保存到 errorStates
    if (finalStatus === 'error') {
      this.errorStates.set(serverId, {
        status: 'error',
        timestamp: new Date(),
        reason: `进程异常退出，退出码: ${code}`
      })
      console.log(`[ProcessManager] 保存错误状态: ${serverId}`)
    }
    
    // 清理进程（如果还在 Map 中）
    if (this.processes.has(serverId)) {
      this.processes.delete(serverId)
      console.log(`[ProcessManager] 已清理进程记录: ${serverId}，最终状态: ${finalStatus}`)
    }

    // 触发退出事件
    this.emit('server:status', {
      serverId,
      status: finalStatus,
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
    // 清除所有错误状态
    this.errorStates.clear()
  }
}

