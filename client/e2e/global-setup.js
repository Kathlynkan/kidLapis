import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverDir = path.resolve(__dirname, '../../server')

export default async function globalSetup() {
  execSync('pnpm seed', { cwd: serverDir, stdio: 'inherit' })
}
