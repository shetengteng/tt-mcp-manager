import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/dashboard/index.vue')
  },
  {
    path: '/marketplace',
    name: 'Marketplace',
    component: () => import('@/views/marketplace/index.vue')
  },
  {
    path: '/rules',
    name: 'Rules',
    component: () => import('@/views/rules/index.vue')
  },
  {
    path: '/templates',
    name: 'Templates',
    component: () => import('@/views/templates/index.vue')
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/settings/index.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
