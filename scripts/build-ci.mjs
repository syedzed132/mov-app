import { execSync } from 'node:child_process';

console.log('--- BUILD CI STARTING ---');
console.log('Node version:', process.version);
console.log('Platform:', process.platform, process.arch);
console.log('Current directory:', process.cwd());

try {
  console.log('Executing: npm --workspace=frontend run build');
  const out = execSync('npm --workspace=frontend run build', {
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log('--- BUILD SUCCEEDED ---');
  console.log(out);
} catch (err) {
  const stdout = err.stdout ? err.stdout.toString() : '';
  const stderr = err.stderr ? err.stderr.toString() : '';
  const combined = (stderr + '\n' + stdout).trim();
  console.error('--- BUILD FAILED ---');
  console.error(combined);
  // Throw an error with the last 200 characters so Vercel errorMessage captures it
  const excerpt = combined.slice(-250).replace(/\r?\n/g, ' -- ');
  throw new Error(`FAIL: ${excerpt}`);
}
