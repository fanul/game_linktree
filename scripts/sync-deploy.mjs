import { execSync } from 'node:child_process'

const run = command => execSync(command, { stdio: 'inherit' })
const deploymentId = process.env.GAS_DEPLOYMENT_ID || 'AKfycbxp_QO_hg1BZvOvpWLPDwEi-4lbqPE7vsllyP7ClaSz6BpX1wUJX8tSQKKYEB-EGKYSGg'

run('clasp push --force')
run(`clasp deploy --deploymentId ${deploymentId} --description "roll_back_fix build"`)
run('git add .')
try {
  run('git diff --cached --quiet')
} catch {
  run('git commit -m "build: update bundle and sync GAS"')
}
run('git push')
