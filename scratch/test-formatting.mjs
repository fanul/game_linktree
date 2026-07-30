import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

const html = fs.readFileSync('dist/index.html', 'utf8')
const jsPath = html.match(/<script[^>]+src="\.\/(assets\/[^"]+)"/)[1]
const jsRaw = fs.readFileSync(path.join('dist', jsPath), 'utf8')
const jsSafe = jsRaw.replaceAll('</', '<\\/').replaceAll('<!--', '<\\!--')

// Insert line breaks safely after }; and }, and function boundaries
const jsFormatted = jsSafe.replaceAll('};', '};\n').replaceAll('},{', '},\n{')

const lines = jsFormatted.split('\n')
const maxLineLength = Math.max(...lines.map(l => l.length))

console.log('Total lines:', lines.length)
console.log('Max line length:', maxLineLength)

try {
  new vm.Script(jsFormatted)
  console.log('Formatted JS Syntax Check: PASSED 100%!')
} catch (e) {
  console.error('Syntax error:', e)
}
