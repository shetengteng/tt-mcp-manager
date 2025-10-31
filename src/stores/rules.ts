import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  CursorRule,
  RuleSearchOptions,
  RuleSearchResult,
  InstalledRule
} from '@/types/electron'

/**
 * Cursor Rules Store
 * 管理规则的搜索、筛选和安装状态
 */
export const useRulesStore = defineStore('rules', () => {
  // 状态
  const items = ref<CursorRule[]>([])
  const total = ref(0)
  const currentPage = ref(1)
  const loading = ref(false)
  const selectedRule = ref<CursorRule | null>(null)
  const installedRules = ref<InstalledRule[]>([])

  // 搜索选项
  const searchOptions = ref<RuleSearchOptions>({
    query: '',
    category: '',
    language: '',
    fileType: '',
    sort: 'stars',
    page: 1,
    perPage: 30
  })

  /**
   * 搜索规则
   */
  async function search(options?: Partial<RuleSearchOptions>) {
    loading.value = true
    try {
      // 合并搜索选项
      const mergedOptions = { ...searchOptions.value, ...options }
      searchOptions.value = mergedOptions

      const result: RuleSearchResult = await window.electronAPI.rules.search(mergedOptions)
      items.value = result.items
      total.value = result.total
      currentPage.value = result.page
    } catch (error) {
      console.error('搜索规则失败:', error)
    } finally {
      loading.value = false
    }
  }

  /**
   * 加载更多
   */
  async function loadMore() {
    const nextPage = currentPage.value + 1
    await search({ ...searchOptions.value, page: nextPage })
  }

  /**
   * 根据ID获取规则详情
   */
  async function getById(id: number) {
    try {
      return await window.electronAPI.rules.getById(id)
    } catch (error) {
      console.error('获取规则详情失败:', error)
      throw error
    }
  }

  /**
   * 安装规则
   */
  async function install(ruleId: number, config: any) {
    try {
      const result = await window.electronAPI.rules.install(ruleId, config)
      if (result.success) {
        // 刷新已安装列表
        await loadInstalled()
      }
      return result
    } catch (error) {
      console.error('安装规则失败:', error)
      throw error
    }
  }

  /**
   * 卸载规则
   */
  async function uninstall(installId: number) {
    try {
      const result = await window.electronAPI.rules.uninstall(installId)
      if (result.success) {
        // 刷新已安装列表
        await loadInstalled()
      }
      return result
    } catch (error) {
      console.error('卸载规则失败:', error)
      throw error
    }
  }

  /**
   * 切换规则启用状态
   */
  async function toggle(installId: number, enabled: boolean) {
    try {
      const result = await window.electronAPI.rules.toggle(installId, enabled)
      if (result.success) {
        // 更新本地状态
        const rule = installedRules.value.find(r => r.id === installId)
        if (rule) {
          rule.enabled = enabled
        }
      }
      return result
    } catch (error) {
      console.error('切换规则状态失败:', error)
      throw error
    }
  }

  /**
   * 加载已安装的规则
   */
  async function loadInstalled() {
    try {
      installedRules.value = await window.electronAPI.rules.getInstalled()
    } catch (error) {
      console.error('加载已安装规则失败:', error)
    }
  }

  /**
   * 导入本地规则
   */
  async function importLocalRules() {
    try {
      return await window.electronAPI.rules.importLocalRules()
    } catch (error) {
      console.error('导入本地规则失败:', error)
      throw error
    }
  }

  /**
   * 选择规则
   */
  function selectRule(rule: CursorRule | null) {
    selectedRule.value = rule
  }

  /**
   * 设置搜索查询
   */
  function setSearchQuery(query: string) {
    searchOptions.value.query = query
  }

  /**
   * 设置分类
   */
  function setCategory(category: string) {
    searchOptions.value.category = category
  }

  /**
   * 设置语言
   */
  function setLanguage(language: string) {
    searchOptions.value.language = language
  }

  /**
   * 设置排序
   */
  function setSort(sort: 'stars' | 'updated' | 'downloads' | 'created') {
    searchOptions.value.sort = sort
  }

  /**
   * 设置文件类型
   */
  function setFileType(fileType: 'cursorrules' | 'mdc' | '') {
    searchOptions.value.fileType = fileType
  }

  return {
    // 状态
    items,
    total,
    currentPage,
    loading,
    selectedRule,
    installedRules,
    searchOptions,
    // 方法
    search,
    loadMore,
    getById,
    install,
    uninstall,
    toggle,
    loadInstalled,
    importLocalRules,
    selectRule,
    setSearchQuery,
    setCategory,
    setLanguage,
    setSort,
    setFileType
  }
})
