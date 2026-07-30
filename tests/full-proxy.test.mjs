import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import fs from 'node:fs'

const root = new URL('../', import.meta.url)
const gas = fs.readFileSync(new URL('gas/Code.js', root), 'utf8')
const worker = fs.readFileSync(new URL('worker/src/index.js', root), 'utf8')

function loadGas(source = gas) {
  const outputs = []
  const sandbox = {
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput(text) { const out = { text, setMimeType() { return out } }; outputs.push(out); return out } },
    HtmlService: { XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' }, createHtmlOutputFromFile() { return { getContent: () => '<!doctype html><div id="app"></div>', setTitle() { return this }, setXFrameOptionsMode() { return this } } } },
    Utilities: { getUuid: () => 'uuid' },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty() {} }) },
    Session: { getActiveUser: () => ({ getEmail: () => 'fanul.doang@gmail.com' }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    DriveApp: {}, SpreadsheetApp: {}, XmlService: {}, MimeType: { XML: 'xml' }, console
  }
  vm.runInNewContext(`${source}\nthis.__handlers = FULL_PROXY_RPC_HANDLERS`, sandbox)
  sandbox.FULL_PROXY_RPC_HANDLERS = sandbox.__handlers
  return sandbox
}

function post(ctx, functionName, args = []) {
  return JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify({ functionName, args }) } }).text)
}

test('native doGet returns HTML and full-proxy returns JSON', () => {
  const ctx = loadGas()
  const native = ctx.doGet({ parameter: {} })
  assert.match(native.getContent(), /id="app"/)
  const result = JSON.parse(ctx.doGet({ parameter: { __full_proxy_html: '1' } }).text)
  assert.equal(result.ok, true)
  assert.match(result.html, /id="app"/)
})

test('RPC rejects blank function names and non-array args', () => {
  const ctx = loadGas()
  for (const request of [{ functionName: ' ', args: [] }, { functionName: 'getPublicData', args: {} }]) {
    const result = JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(request) } }).text)
    assert.equal(result.ok, false)
    assert.equal(result.error, 'Request RPC tidak valid.')
  }
})



test('allowlisted function succeeds and arguments are unchanged', () => {
  const ctx = loadGas()
  ctx.echoForTest = value => value
  ctx.FULL_PROXY_RPC_HANDLERS.echoForTest = ctx.echoForTest
  assert.deepEqual(post(ctx, 'echoForTest', [{ nested: ['x', 2] }]).result, { nested: ['x', 2] })
})

test('random function is rejected', () => assert.equal(post(loadGas(), 'eval').ok, false))

test('errors are serialized safely', () => {
  const ctx = loadGas()
  ctx.failForTest = () => { throw new Error('safe failure') }
  ctx.FULL_PROXY_RPC_HANDLERS.failForTest = ctx.failForTest
  assert.deepEqual(post(ctx, 'failForTest'), { ok: false, error: 'safe failure' })
})

test('worker shim keeps custom URL and supports success/failure chains', async () => {
  assert.match(worker, /x-gas-route-mode[^\n]+full_proxy/)
  assert.match(worker, /x-gas-runtime[^\n]+worker-native-rpc/)
  assert.doesNotMatch(worker, /wardeninit|iframe|script\.google\.com[^'"`]*redirect/i)
  const { injectShim } = await import('../worker/src/index.js')
  const html = injectShim('<!doctype html><head></head><body></body>', '/game-linktree')
  const script = html.slice(html.indexOf('<script>') + 8, html.indexOf('</script>'))
  const calls = []
  const sandbox = {
    console,
    fetch: async (url, options) => {
      calls.push({ url, body: JSON.parse(options.body) })
      return { json: async () => calls.length === 1 ? { ok: true, result: 'saved' } : { ok: false, error: 'denied' } }
    }
  }
  vm.runInNewContext(script, sandbox)
  const success = await new Promise(resolve => sandbox.google.script.run.withSuccessHandler(resolve).withFailureHandler(assert.fail).saveData({ x: 1 }))
  assert.equal(success, 'saved')
  const failure = await new Promise(resolve => sandbox.google.script.run.withSuccessHandler(assert.fail).withFailureHandler(error => resolve(error.message)).saveData())
  assert.equal(failure, 'denied')
  assert.deepEqual(calls[0], { url: '/game-linktree?__gas_rpc=1', body: { functionName: 'saveData', args: [{ x: 1 }] } })
})
