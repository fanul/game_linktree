import fs from 'node:fs'
import path from 'node:path'

const html = fs.readFileSync('dist/index.html', 'utf8')
const jsPath = html.match(/<script[^>]+src="\.\/(assets\/[^"]+)"/)[1]
const cssPath = html.match(/<link[^>]+href="\.\/(assets\/[^"]+\.css)"/)[1]

const jsRaw = fs.readFileSync(path.join('dist', jsPath), 'utf8')
const jsSafe = jsRaw.replaceAll('</', '<\\/').replaceAll('<!--', '<\\!--')
// Safely insert line breaks at statement boundaries so no single line exceeds line-length limits
const jsFormatted = jsSafe.replaceAll('};', '};\n').replaceAll('},{', '},\n{')

const css = fs.readFileSync(path.join('dist', cssPath), 'utf8')

const googleFonts = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">'

const debugScript = `<script>
(function(){
  window.__LOGS = [];
  window.__LOG_STEP = function(msg, isErr) {
    try {
      var time = new Date().toLocaleTimeString() + '.' + String(Date.now() % 1000).padStart(3, '0');
      var text = '[STEP ' + time + '] ' + msg;
      console.log(text);
      var parent = document.body || document.documentElement;
      if (!parent) return;
      var box = document.getElementById('meka-debug-box');
      if (!box) {
        box = document.createElement('div');
        box.id = 'meka-debug-box';
        box.style.cssText = 'position:fixed;bottom:10px;left:10px;right:10px;max-height:240px;overflow-y:auto;background:rgba(10,25,40,0.95);border:1px solid #1ac6ff;color:#a5c8e1;font-family:monospace;font-size:11px;padding:12px;z-index:999999;box-shadow:0 0 20px rgba(0,0,0,0.8);border-radius:6px;';
        parent.appendChild(box);
      }
      var line = document.createElement('div');
      if (isErr) line.style.color = '#ff4d6d';
      line.textContent = text;
      box.appendChild(line);
      box.scrollTop = box.scrollHeight;
    } catch(e) {
      console.error(e);
    }
  };
  window.__LOG_STEP('0. HTML Document parsed. Debugger initialized.');
})();
</script>`

const fallbackShell = `<div class="meka-page"><div class="meka-content"><section class="meka-hero-split"><div class="meka-hero-left"><h1 class="meka-hero-title">PALE MEKA FUTURE</h1><div class="meka-underline-mark"></div><p class="meka-hero-bio">Precise, airy, and high-tech digital artifacts portal framed within a monolithic sky-city aesthetic.</p><p style="font-family:var(--font-mono);font-size:12px;color:var(--color-navy-cyan);margin-top:24px;">❖ INITIALIZING SYSTEM MODULES...</p></div></section></div></div>`

// Clean up any extra html files in gas/ to avoid template scriptlet issues
const extraFiles = ['gas/css.html', 'gas/debug.html', 'gas/fallback.html', 'gas/javascript.html', 'gas/js1.html', 'gas/js2.html']
extraFiles.forEach(f => {
  if (fs.existsSync(f)) fs.unlinkSync(f)
})

const head = '<!doctype html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pale Meka Future</title>' + googleFonts + '<style>' + css + '</style>' + debugScript + '</head><body><div id="app">' + fallbackShell + '</div><script>\n'
const foot = '\n</script></body></html>'

const output = head + jsFormatted + foot

fs.writeFileSync('gas/index.html', output)
console.log(`gas/index.html generated with verbatim JS bundle (${output.length} bytes).`)
