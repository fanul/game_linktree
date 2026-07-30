import fs from 'node:fs'
import path from 'node:path'

const html = fs.readFileSync('dist/index.html', 'utf8')
const jsPath = html.match(/<script[^>]+src="\.\/(assets\/[^"]+)"/)[1]
const cssPath = html.match(/<link[^>]+href="\.\/(assets\/[^"]+\.css)"/)[1]
const js = fs.readFileSync(path.join('dist', jsPath), 'utf8').replaceAll('</script>', '<\\/script>')
const css = fs.readFileSync(path.join('dist', cssPath), 'utf8')

const googleFonts = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">'

const output = `<!doctype html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pale Meka Future</title>${googleFonts}<style>${css}</style></head><body><div id="app"></div><script>${js}</script></body></html>`
fs.writeFileSync('gas/index.html', output)
console.log(`gas/index.html ${output.length} bytes`)
