import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue')
  },
  {
    path: '/marketplace',
    name: 'Marketplace',
    component: () => import('@/views/Marketplace.vue')
  },
  {
    path: '/templates',
    name: 'Templates',
    component: () => import('@/views/Templates.vue')
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/Settings.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router

