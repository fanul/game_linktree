import { createApp } from 'vue'
import App from './App.vue'
import router from './router.js'
import './styles.css'

const app = createApp(App)

app.config.errorHandler = (err) => {
  console.error('Vue Error:', err)
  const el = document.getElementById('app')
  if (el) {
    el.innerHTML = `<div style="padding: 40px; color: #ff4d6d; font-family: monospace; background: #0b1a27; min-height: 100vh;">VUE ERROR: ${err?.message || String(err)}</div>`
  }
}

window.addEventListener('error', (e) => {
  console.error('Global Error:', e)
  const el = document.getElementById('app')
  if (el) {
    el.innerHTML = `<div style="padding: 40px; color: #ff4d6d; font-family: monospace; background: #0b1a27; min-height: 100vh;">SCRIPT ERROR: ${e.message || String(e)}</div>`
  }
})

try {
  app.use(router).mount('#app')
} catch (err) {
  console.error('Mount Error:', err)
  const el = document.getElementById('app')
  if (el) {
    el.innerHTML = `<div style="padding: 40px; color: #ff4d6d; font-family: monospace; background: #0b1a27; min-height: 100vh;">MOUNT ERROR: ${err?.message || String(err)}</div>`
  }
}
