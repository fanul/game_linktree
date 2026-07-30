import { execSync } from 'node:child_process'

const run = command => execSync(command, { stdio: 'inherit' })

run('clasp push --force')
run('git add .')
try {
  run('git diff --cached --quiet')
} catch {
  run('git commit -m "build: update bundle and sync GAS"')
}
run('git push')
