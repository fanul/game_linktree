import { createApp } from 'vue'
import App from './App.vue'
import router from './router.js'
import './styles.css'

const logStep = (msg, isErr = false) => {
  if (typeof window !== 'undefined' && typeof window.__LOG_STEP === 'function') {
    try {
      window.__LOG_STEP(msg, isErr)
    } catch (e) {
      console.log(`[LOG] ${msg}`)
    }
  } else {
    console.log(`[LOG] ${msg}`)
  }
}

logStep('1. Script main.js executing')

const app = createApp(App)

app.config.errorHandler = (err) => {
  console.error('Vue Error:', err)
  logStep('VUE ERROR: ' + (err?.message || String(err)), true)
}

window.addEventListener('error', (e) => {
  console.error('Global Error:', e)
  logStep('GLOBAL SCRIPT ERROR: ' + (e.message || String(e)), true)
})

try {
  logStep('2. Mounting Vue App to #app with Memory Router...')
  app.use(router).mount('#app')
  logStep('3. Vue App successfully mounted to #app!')
} catch (err) {
  console.error('Mount Error:', err)
  logStep('MOUNT EXCEPTION: ' + (err?.message || String(err)), true)
}
