import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

console.log('--- FRONTEND BUILD STARTING ---');
const distDir = path.resolve('dist');
fs.mkdirSync(distDir, { recursive: true });

try {
  console.log('Running vite build...');
  const out = execSync('npx vite build', {
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log('Build succeeded!');
  console.log(out);
} catch (err) {
  const stdout = err.stdout ? err.stdout.toString() : '';
  const stderr = err.stderr ? err.stderr.toString() : '';
  const log = `=== FRONTEND VITE BUILD ERROR ===\n\nERROR MESSAGE:\n${err.message}\n\nSTDERR:\n${stderr}\n\nSTDOUT:\n${stdout}`;
  console.error(log);

  // Write diagnostic page so deployment completes and we can read it live
  fs.writeFileSync(path.join(distDir, 'index.html'), `<!DOCTYPE html><html><body style="background:#0a0a0a;color:#ff6a13;font-family:monospace;padding:24px;"><pre style="white-space:pre-wrap;">${log}</pre></body></html>`);
  fs.writeFileSync(path.join(distDir, 'build-error.txt'), log);
  console.log('Wrote diagnostic page to dist/index.html');
}
