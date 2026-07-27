const headers = { 'content-type': 'text/html; charset=UTF-8', 'x-gas-route-mode': 'full_proxy', 'x-gas-runtime': 'worker-native-rpc', 'cache-control': 'no-store' }

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (!env.GAS_URL) return new Response('GAS_URL secret belum diatur.', { status: 500 })
    if (request.method === 'POST' && url.searchParams.get('__gas_rpc') === '1') return relayRpc(request, env.GAS_URL)
    if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 })
    const source = new URL(env.GAS_URL)
    source.searchParams.set('__full_proxy_html', '1')
    const response = await fetch(source, { redirect: 'follow' })
    const payload = await response.json()
    if (!payload.ok || typeof payload.html !== 'string') return new Response('Bundle GAS tidak valid.', { status: 502 })
    return new Response(injectShim(payload.html, url.pathname), { status: 200, headers })
  }
}

async function relayRpc(request, gasUrl) {
  const body = await request.text()
  if (body.length > 100000) return json({ ok: false, error: 'Payload terlalu besar.' }, 413)
  let response = await fetch(gasUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body, redirect: 'manual' })
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location')
    if (!allowedEcho(location)) return json({ ok: false, error: 'Redirect GAS ditolak.' }, 502)
    response = await fetch(location, { method: 'GET', redirect: 'error' })
  }
  return new Response(await response.text(), { status: response.ok ? 200 : 502, headers: { 'content-type': 'application/json; charset=UTF-8', 'x-gas-route-mode': 'full_proxy', 'x-gas-runtime': 'worker-native-rpc', 'cache-control': 'no-store' } })
}

function allowedEcho(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'script.googleusercontent.com' && url.pathname === '/macros/echo' } catch { return false }
}

function injectShim(html, pathname) {
  const endpoint = `${pathname}?__gas_rpc=1`
  const shim = `<script>(()=>{const endpoint=${JSON.stringify(endpoint)};function chain(ok,fail){return new Proxy({}, {get(_,name){if(name==='withSuccessHandler')return fn=>chain(fn,fail);if(name==='withFailureHandler')return fn=>chain(ok,fn);return(...args)=>fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({functionName:String(name),args})}).then(r=>r.json()).then(x=>{if(!x.ok)throw new Error(x.error||'RPC gagal');return x.result}).then(v=>ok&&ok(v)).catch(e=>fail?fail(e):console.error(e))}})};globalThis.google={script:{run:chain(),host:{close(){}}}}})();<\/script>`
  return html.replace(/<head([^>]*)>/i, `<head$1>${shim}`)
}

function json(body, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=UTF-8', 'x-gas-route-mode': 'full_proxy', 'x-gas-runtime': 'worker-native-rpc' } }) }

export { allowedEcho, injectShim }
