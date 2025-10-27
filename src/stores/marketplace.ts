import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MarketItem, SearchOptions } from '@/types/electron'

/**
 * 市场状态管理
 */
export const useMarketplaceStore = defineStore('marketplace', () => {
  // 状态
  const items = ref<MarketItem[]>([])
  const total = ref(0)
  const currentPage = ref(1)
  const loading = ref(false)
  const selectedItem = ref<MarketItem | null>(null)

  // 搜索选项
  const searchOptions = ref<SearchOptions>({
    query: '',
    category: '',
    language: '',
    sort: 'stars',
    page: 1,
    perPage: 30
  })

  // 操作
  async function search(options?: Partial<SearchOptions>) {
    loading.value = true
    try {
      // 合并搜索选项
      const mergedOptions = { ...searchOptions.value, ...options }
      searchOptions.value = mergedOptions

      const result = await window.electronAPI.marketplace.search(mergedOptions)
      items.value = result.items
      total.value = result.total
      currentPage.value = result.page
    } catch (error) {
      console.error('搜索市场失败:', error)
    } finally {
      loading.value = false
    }
  }

  async function loadMore() {
    const nextPage = currentPage.value + 1
    await search({ ...searchOptions.value, page: nextPage })
  }

  async function getDetails(repoFullName: string) {
    try {
      return await window.electronAPI.marketplace.getDetails(repoFullName)
    } catch (error) {
      console.error('获取详情失败:', error)
      throw error
    }
  }

  async function getReadme(repoFullName: string) {
    try {
      return await window.electronAPI.marketplace.getReadme(repoFullName)
    } catch (error) {
      console.error('获取 README 失败:', error)
      throw error
    }
  }

  async function install(item: MarketItem, config: any) {
    try {
      // 转换为普通对象，避免响应式代理无法通过 IPC 传递
      const plainItem = JSON.parse(JSON.stringify(item))
      const plainConfig = JSON.parse(JSON.stringify(config))
      const result = await window.electronAPI.marketplace.install(plainItem, plainConfig)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.serverId
    } catch (error) {
      console.error('安装失败:', error)
      throw error
    }
  }

  function selectItem(item: MarketItem | null) {
    selectedItem.value = item
  }

  function setSearchQuery(query: string) {
    searchOptions.value.query = query
  }

  function setCategory(category: string) {
    searchOptions.value.category = category
  }

  function setLanguage(language: string) {
    searchOptions.value.language = language
  }

  function setSort(sort: 'stars' | 'updated' | 'created') {
    searchOptions.value.sort = sort
  }

  return {
    // 状态
    items,
    total,
    currentPage,
    loading,
    selectedItem,
    searchOptions,
    // 操作
    search,
    loadMore,
    getDetails,
    getReadme,
    install,
    selectItem,
    setSearchQuery,
    setCategory,
    setLanguage,
    setSort
  }
})

