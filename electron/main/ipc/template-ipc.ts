import { ipcMain } from 'electron'
import { templateManager } from '../services'

/**
 * 设置模板相关的 IPC 处理器
 */
export function setupTemplateIpc(): void {
  // 获取所有模板
  ipcMain.handle('template:getAll', async () => {
    try {
      const templates = templateManager.getAllTemplates()
      return { success: true, data: templates }
    } catch (error: any) {
      console.error('获取模板列表失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 获取单个模板
  ipcMain.handle('template:get', async (_event, name: string) => {
    try {
      const template = templateManager.getTemplate(name)
      if (!template) {
        return { success: false, error: '模板不存在' }
      }
      return { success: true, data: template }
    } catch (error: any) {
      console.error('获取模板失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 根据分类获取模板
  ipcMain.handle('template:getByCategory', async (_event, category: string) => {
    try {
      const templates = templateManager.getTemplatesByCategory(category)
      return { success: true, data: templates }
    } catch (error: any) {
      console.error('根据分类获取模板失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 搜索模板
  ipcMain.handle('template:search', async (_event, query: string) => {
    try {
      const templates = templateManager.searchTemplates(query)
      return { success: true, data: templates }
    } catch (error: any) {
      console.error('搜索模板失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 获取所有分类
  ipcMain.handle('template:getCategories', async () => {
    try {
      const categories = templateManager.getCategories()
      return { success: true, data: categories }
    } catch (error: any) {
      console.error('获取分类列表失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 从模板创建配置
  ipcMain.handle(
    'template:createConfig',
    async (_event, templateName: string, values: Record<string, string>) => {
      try {
        const config = templateManager.createConfigFromTemplate(templateName, values)
        if (!config) {
          return { success: false, error: '创建配置失败' }
        }
        return { success: true, data: config }
      } catch (error: any) {
        console.error('从模板创建配置失败:', error)
        return { success: false, error: error.message }
      }
    }
  )

  // 添加自定义模板
  ipcMain.handle('template:add', async (_event, template: any) => {
    try {
      const success = await templateManager.addTemplate(template)
      if (success) {
        return { success: true }
      } else {
        return { success: false, error: '添加模板失败' }
      }
    } catch (error: any) {
      console.error('添加模板失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 删除模板
  ipcMain.handle('template:remove', async (_event, name: string) => {
    try {
      const success = await templateManager.removeTemplate(name)
      if (success) {
        return { success: true }
      } else {
        return { success: false, error: '删除模板失败' }
      }
    } catch (error: any) {
      console.error('删除模板失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 重新加载模板
  ipcMain.handle('template:reload', async () => {
    try {
      await templateManager.reload()
      return { success: true }
    } catch (error: any) {
      console.error('重新加载模板失败:', error)
      return { success: false, error: error.message }
    }
  })

  console.log('✓ 模板 IPC 处理器已设置')
}

