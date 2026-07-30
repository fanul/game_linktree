import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

const html = fs.readFileSync('dist/index.html', 'utf8')
const jsPath = html.match(/<script[^>]+src="\.\/(assets\/[^"]+)"/)[1]
const jsRaw = fs.readFileSync(path.join('dist', jsPath), 'utf8')
const jsSafe = jsRaw.replaceAll('</', '<\\/').replaceAll('<!--', '<\\!--')
const jsFormatted = jsSafe.replaceAll('};', '};\n').replaceAll('},{', '},\n{')

const htmlHeader = '<!doctype html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pale Meka Future</title></head><body><div id="app"></div><script>\n'
const htmlFooter = '\n</script></body></html>'

const output = htmlHeader + jsFormatted + htmlFooter

// Extract JS from output
const jsStart = output.indexOf('<script>\n') + '<script>\n'.length
const jsEnd = output.lastIndexOf('\n</script>')
const extractedJs = output.slice(jsStart, jsEnd)

try {
  new vm.Script(extractedJs)
  console.log('Concatenated JS Syntax Check: PASSED 100% cleanly!')
} catch (e) {
  console.error('Syntax error:', e)
}
