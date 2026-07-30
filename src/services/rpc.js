export function rpc(functionName, ...args) {
  return new Promise((resolve, reject) => {
    let attempts = 0
    const checkAndRun = () => {
      if (globalThis.google?.script?.run) {
        globalThis.google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(error => reject(new Error(error?.message || String(error))))
          [functionName](...args)
      } else if (attempts < 50) {
        attempts++
        setTimeout(checkAndRun, 50)
      } else {
        reject(new Error('RPC GAS tidak tersedia.'))
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
