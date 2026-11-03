import { build } from 'vite'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

try {
  await build()
  console.log('MOV Frontend Vite build completed successfully.')
} catch (err) {
  console.error('Vite build failed with error:', err)
  mkdirSync('dist', { recursive: true })
  writeFileSync(
    join('dist', 'index.html'),
    `<!DOCTYPE html><html><body style="background:#0a0a0a;color:#ff6a13;font-family:monospace;padding:24px;"><pre style="white-space:pre-wrap;">=== FRONTEND VITE BUILD ERROR ===\n\n${err?.stack || err?.message || String(err)}</pre></body></html>`,
    'utf8'
  )
}
