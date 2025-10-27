import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './assets/styles/index.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// 全局错误处理
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue 错误:', err)
  console.error('错误信息:', info)
}

app.mount('#app')

