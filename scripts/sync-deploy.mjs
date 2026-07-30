import { execSync } from 'node:child_process'

console.log('\n🚀 Starting Clasp Push (--force)...')
try {
  execSync('clasp push --force', { stdio: 'inherit' })
  console.log('✅ Clasp push successful!')
} catch (err) {
  console.error('❌ Clasp push failed:', err && err.message ? err.message : err)
}

console.log('\n🚀 Starting GitHub Push...')
try {
  execSync('git add .', { stdio: 'inherit' })
  try {
    execSync('git commit -m "build: auto-update bundle, clasp sync and deploy"', { stdio: 'inherit' })
  } catch (e) {
    console.log('ℹ️  No new changes to commit to Git working tree.')
  }
  execSync('git push', { stdio: 'inherit' })
  console.log('✅ GitHub push successful!')
} catch (err) {
  console.error('❌ GitHub push failed:', err && err.message ? err.message : err)
}
