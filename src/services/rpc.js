export function rpc(functionName, ...args) {
  return new Promise((resolve, reject) => {
    if (!globalThis.google?.script?.run) return reject(new Error('RPC GAS tidak tersedia.'))
    globalThis.google.script.run.withSuccessHandler(resolve).withFailureHandler(error => reject(new Error(error?.message || String(error))))[functionName](...args)
  })
}

export const adminArgs = (...args) => [sessionStorage.getItem('adminKey') || '', ...args]
