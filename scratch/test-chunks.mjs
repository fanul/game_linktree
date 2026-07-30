import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

const html = fs.readFileSync('dist/index.html', 'utf8')
const jsPath = html.match(/<script[^>]+src="\.\/(assets\/[^"]+)"/)[1]
const jsRaw = fs.readFileSync(path.join('dist', jsPath), 'utf8')
const jsSafe = jsRaw.replaceAll('</', '<\\/').replaceAll('<!--', '<\\!--')

const mid = Math.floor(jsSafe.length / 2)
let splitIdx = jsSafe.lastIndexOf(';', mid)
if (splitIdx === -1 || splitIdx < mid - 10000) splitIdx = mid

const chunk1 = jsSafe.slice(0, splitIdx + 1)
const chunk2 = jsSafe.slice(splitIdx + 1)

console.log('jsSafe length:', jsSafe.length)
console.log('chunk1 length:', chunk1.length)
console.log('chunk2 length:', chunk2.length)

try {
  new vm.Script(chunk1 + chunk2)
  console.log('Chunk combination syntax check: PASSED 100%!')
} catch (e) {
  console.error('Chunk syntax error:', e)
}
