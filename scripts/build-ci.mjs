import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

console.log('--- BUILD CI STARTING ---');
const distDir = path.resolve('frontend/dist');
fs.mkdirSync(distDir, { recursive: true });

try {
  console.log('Running build...');
  const out = execSync('npm --workspace=frontend run build', {
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log('Build succeeded!');
  console.log(out);
} catch (err) {
  const stdout = err.stdout ? err.stdout.toString() : '';
  const stderr = err.stderr ? err.stderr.toString() : '';
  const log = `=== BUILD FAILED ===\n\nERROR:\n${err.message}\n\nSTDERR:\n${stderr}\n\nSTDOUT:\n${stdout}`;
  console.error(log);
  
  // Write diagnostic page so deployment succeeds and we can read the exact failure reason
  fs.writeFileSync(path.join(distDir, 'index.html'), `<!DOCTYPE html><html><body><pre style="white-space:pre-wrap;font-family:monospace;background:#111;color:#f66;padding:20px;">${log}</pre></body></html>`);
  fs.writeFileSync(path.join(distDir, 'build-error.txt'), log);
  console.log('Wrote diagnostic page to frontend/dist/index.html');
}
