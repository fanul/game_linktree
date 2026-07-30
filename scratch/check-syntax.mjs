import fs from 'node:fs'
import vm from 'node:vm'

const html = fs.readFileSync('gas/index.html', 'utf8')
const lastScriptStart = html.lastIndexOf('<script>')
const lastScriptEnd = html.lastIndexOf('</script>')

if (lastScriptStart === -1 || lastScriptEnd === -1 || lastScriptStart >= lastScriptEnd) {
  console.error('Could not find main bundle script tag!')
  process.exit(1)
}

const js = html.slice(lastScriptStart + '<script>'.length, lastScriptEnd)
console.log('Bundle script length:', js.length)

try {
  new vm.Script(js)
  console.log('BUNDLE SYNTAX CHECK: PASSED cleanly!')
} catch (e) {
  console.error('BUNDLE SYNTAX ERROR:', e.message)
  console.error(e.stack)
}
