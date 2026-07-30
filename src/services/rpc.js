export function rpc(functionName, ...args) {
  if (window.__LOG_STEP) window.__LOG_STEP(`RPC: Requesting '${functionName}'...`)
  return new Promise((resolve, reject) => {
    let attempts = 0
    let resolved = false

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true
        if (window.__LOG_STEP) window.__LOG_STEP(`RPC: Timeout (5s) for '${functionName}'`, true)
        reject(new Error('RPC call timeout.'))
      }
    }, 5000)

    const checkAndRun = () => {
      if (globalThis.google?.script?.run) {
        if (window.__LOG_STEP) window.__LOG_STEP(`RPC: Native google.script.run available. Triggering '${functionName}'...`)
        globalThis.google.script.run
          .withSuccessHandler(res => {
            if (!resolved) {
              resolved = true
              clearTimeout(timeout)
              if (window.__LOG_STEP) window.__LOG_STEP(`RPC: Success for '${functionName}'`)
              resolve(res)
            }
          })
          .withFailureHandler(error => {
            if (!resolved) {
              resolved = true
              clearTimeout(timeout)
              const errMsg = error?.message || String(error)
              if (window.__LOG_STEP) window.__LOG_STEP(`RPC: Server Error for '${functionName}': ${errMsg}`, true)
              reject(new Error(errMsg))
            }
          })
          [functionName](...args)
      } else if (attempts < 30) {
        attempts++
        setTimeout(checkAndRun, 50)
      } else {
        if (!resolved) {
          resolved = true
          clearTimeout(timeout)
          if (window.__LOG_STEP) window.__LOG_STEP(`RPC: google.script.run not available after 30 attempts`, true)
          reject(new Error('RPC GAS tidak tersedia.'))
        }
      }
    }
    checkAndRun()
  })
}

export const adminArgs = (...args) => [sessionStorage.getItem('googleIdToken') || sessionStorage.getItem('adminKey') || '', ...args]

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const result = String(reader.result || '')
      const base64 = result.slice(result.indexOf(',') + 1)
      resolve(base64)
    }
    reader.onerror = error => reject(error)
  })
}
