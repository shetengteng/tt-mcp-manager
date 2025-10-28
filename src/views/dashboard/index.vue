<script setup lang="ts">
// Dashboard 主页面 - 轻量级组件编排，业务逻辑已下沉到各子组件
import { ref, onMounted, onUnmounted } from 'vue'
import { useServerStore } from '@/stores/servers'
import { useLogStore } from '@/stores/logs'
import StatisticsCards from './components/StatisticsCards.vue'
import QuickActions from './components/QuickActions.vue'
import ServerList from './components/ServerList.vue'
import DeleteDialog from './components/DeleteDialog.vue'
import LogsDialog from './components/LogsDialog.vue'
import ExportDialog from './components/ExportDialog.vue'
import TestDialog from './components/TestDialog.vue'

// 使用 stores
const serverStore = useServerStore()
const logStore = useLogStore()

// 对话框状态管理
const deleteDialogState = ref({
  open: false,
  serverId: null as string | null,
  serverName: ''
})

const logsDialogState = ref({
  open: false,
  serverId: null as string | null,
  serverName: ''
})

const exportDialogState = ref({
  open: false,
  config: ''
})

const testDialogState = ref({
  open: false,
  serverId: null as string | null,
  serverName: ''
})

// 定时器变量
let refreshInterval: ReturnType<typeof setInterval> | null = null

// 初始化：加载数据和订阅日志
onMounted(async () => {
  await serverStore.loadServers()
  logStore.subscribeToLogs()
  
  // 定时刷新服务器状态（每5秒）
  refreshInterval = setInterval(async () => {
    if (!serverStore.loading) {
      await serverStore.refreshStatuses()
    }
  }, 5000)
})

// 清理：停止定时器和取消订阅
onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
  logStore.unsubscribeFromLogs()
})

// 对话框控制方法
function openDeleteDialog(serverId: string, serverName: string) {
  deleteDialogState.value = {
    open: true,
    serverId,
    serverName
  }
}

function openLogsDialog(serverId: string, serverName: string) {
  logsDialogState.value = {
    open: true,
    serverId,
    serverName
  }
}

function openTestDialog(serverId: string, serverName: string) {
  testDialogState.value = {
    open: true,
    serverId,
    serverName
  }
}

function openExportDialog(config: string) {
  exportDialogState.value = {
    open: true,
    config
  }
}
</script>

<template>
  <div class="flex flex-col">
    <!-- 统计卡片 -->
    <StatisticsCards />

    <!-- 快速操作 -->
    <QuickActions @open-export-dialog="openExportDialog" />

    <!-- 服务器列表 -->
    <ServerList
      @open-delete-dialog="openDeleteDialog"
      @open-logs-dialog="openLogsDialog"
      @open-test-dialog="openTestDialog"
      @open-export-dialog="openExportDialog"
    />

    <!-- 删除确认对话框 -->
    <DeleteDialog
      v-model:open="deleteDialogState.open"
      :server-id="deleteDialogState.serverId"
      :server-name="deleteDialogState.serverName"
    />

    <!-- 日志查看对话框 -->
    <LogsDialog
      v-model:open="logsDialogState.open"
      :server-id="logsDialogState.serverId"
      :server-name="logsDialogState.serverName"
    />

    <!-- 导出配置对话框 -->
    <ExportDialog
      v-model:open="exportDialogState.open"
      :config="exportDialogState.config"
    />

    <!-- 测试结果对话框 -->
    <TestDialog
      v-model:open="testDialogState.open"
      :server-id="testDialogState.serverId"
      :server-name="testDialogState.serverName"
      @open-logs-dialog="openLogsDialog"
    />
  </div>
</template>
