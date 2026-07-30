import { createApp } from 'vue'
import App from './App.vue'
import router from './router.js'
import './styles.css'

if (typeof window !== 'undefined') {
  window.__LOG_STEP = function (msg, isErr = false) {
    const time = new Date().toLocaleTimeString() + '.' + String(Date.now() % 1000).padStart(3, '0')
    const text = `[STEP ${time}] ${msg}`
    console.log(text)
    
    const updateUI = () => {
      let box = document.getElementById('meka-debug-box')
      if (!box) {
        box = document.createElement('div')
        box.id = 'meka-debug-box'
        box.style.cssText = 'position:fixed;bottom:10px;left:10px;right:10px;max-height:240px;overflow-y:auto;background:rgba(10,25,40,0.95);border:1px solid #1ac6ff;color:#a5c8e1;font-family:monospace;font-size:11px;padding:12px;z-index:999999;box-shadow:0 0 20px rgba(0,0,0,0.8);border-radius:6px;'
        if (document.body) document.body.appendChild(box)
      }
      if (box) {
        const line = document.createElement('div')
        if (isErr) line.style.color = '#ff4d6d'
        line.textContent = text
        box.appendChild(line)
        box.scrollTop = box.scrollHeight
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', updateUI)
    } else {
      updateUI()
    }
  }
  window.__LOG_STEP('1. Script main.js loaded and executing')
}

const app = createApp(App)

app.config.errorHandler = (err) => {
  console.error('Vue Error:', err)
  if (window.__LOG_STEP) window.__LOG_STEP('VUE ERROR: ' + (err?.message || String(err)), true)
}

window.addEventListener('error', (e) => {
  console.error('Global Error:', e)
  if (window.__LOG_STEP) window.__LOG_STEP('GLOBAL SCRIPT ERROR: ' + (e.message || String(e)), true)
})

try {
  if (window.__LOG_STEP) window.__LOG_STEP('2. Initializing Vue Router and mounting Vue App to #app...')
  app.use(router).mount('#app')
  if (window.__LOG_STEP) window.__LOG_STEP('3. Vue App successfully mounted to #app!')
} catch (err) {
  console.error('Mount Error:', err)
  if (window.__LOG_STEP) window.__LOG_STEP('MOUNT EXCEPTION: ' + (err?.message || String(err)), true)
}
