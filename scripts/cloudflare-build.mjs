import { existsSync } from 'node:fs'
import { rename } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const apiPath = path.join(root, 'app', 'api')
const hiddenApiPath = path.join(root, '.api-cloudflare-build')

function runNextBuild() {
  return new Promise((resolve, reject) => {
    const child = spawn('npx next build', {
      cwd: root,
      env: { ...process.env, CLOUDFLARE_STATIC_EXPORT: 'true' },
      stdio: 'inherit',
      shell: true,
    })

    child.on('error', reject)
    child.on('exit', code => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`next build exited with code ${code}`))
      }
    })
  })
}

if (existsSync(hiddenApiPath)) {
  throw new Error(`Refusing to build because ${hiddenApiPath} already exists.`)
}

let moved = false

try {
  if (existsSync(apiPath)) {
    await rename(apiPath, hiddenApiPath)
    moved = true
  }

  await runNextBuild()
} finally {
  if (moved && existsSync(hiddenApiPath)) {
    await rename(hiddenApiPath, apiPath)
  }
}
