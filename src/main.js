import { createApp } from 'vue'
import App from './App.vue'
import router from './router.js'
import './styles.css'

const app = createApp(App)

app.config.errorHandler = (err) => {
  console.error('Vue Error:', err)
  const el = document.getElementById('app')
  if (el && (!el.children || !el.children.length)) {
    el.innerHTML = `<div style="padding: 40px; color: #ff4d6d; font-family: monospace;">VUE ERROR: ${err?.message || String(err)}</div>`
  }
}

window.addEventListener('error', (e) => {
  console.error('Global Error:', e)
  const el = document.getElementById('app')
  if (el && (!el.children || !el.children.length)) {
    el.innerHTML = `<div style="padding: 40px; color: #ff4d6d; font-family: monospace;">SCRIPT ERROR: ${e.message}</div>`
  }
})

app.use(router).mount('#app')
