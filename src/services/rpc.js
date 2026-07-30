export function rpc(functionName, ...args) {
  return new Promise((resolve, reject) => {
    let attempts = 0
    let resolved = false

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true
        reject(new Error('RPC call timeout.'))
      }
    }, 5000)

    const checkAndRun = () => {
      if (globalThis.google?.script?.run) {
        globalThis.google.script.run
          .withSuccessHandler(res => {
            if (!resolved) {
              resolved = true
              clearTimeout(timeout)
              resolve(res)
            }
          })
          .withFailureHandler(error => {
            if (!resolved) {
              resolved = true
              clearTimeout(timeout)
              reject(new Error(error?.message || String(error)))
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
