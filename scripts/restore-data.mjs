#!/usr/bin/env node
// restore-data.mjs — Automated restore script for NXT FORM DATA_DIR
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

export function runRestore(archivePath, targetDir) {
  if (!archivePath || !fs.existsSync(archivePath)) {
    throw new Error(`Archive not found: ${archivePath}`);
  }
  if (!targetDir) {
    throw new Error('Target directory must be specified');
  }

  // 1. Verify checksum if .sha256 file exists alongside archive
  const checksumFile = `${archivePath}.sha256`;
  if (fs.existsSync(checksumFile)) {
    const expectedHash = fs.readFileSync(checksumFile, 'utf8').trim().split(/\s+/)[0];
    const actualHash = crypto.createHash('sha256').update(fs.readFileSync(archivePath)).digest('hex');
    if (expectedHash !== actualHash) {
      throw new Error(`Checksum mismatch! Expected: ${expectedHash}, got: ${actualHash}`);
    }
  }

  // 2. Prepare target directory
  fs.mkdirSync(targetDir, { recursive: true });

  // 3. Extract tar.gz into targetDir
  const cmd = `tar -xzf "${archivePath}" -C "${targetDir}"`;
  execSync(cmd, { stdio: 'pipe' });

  // 4. Validate essential files were restored
  const hasDb = fs.existsSync(path.join(targetDir, 'db.json'));
  const hasSecret = fs.existsSync(path.join(targetDir, 'secret'));

  return {
    ok: true,
    targetDir,
    hasDb,
    hasSecret
  };
}

// Direct CLI invocation
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('restore-data.mjs')) {
  const [,, archive, target] = process.argv;
  if (!archive || !target) {
    console.error('Usage: node restore-data.mjs <archive.tar.gz> <target_data_dir>');
    process.exit(1);
  }

  try {
    const res = runRestore(archive, target);
    console.log(`[Restore Success] Extracted to ${res.targetDir}`);
  } catch (err) {
    console.error(`[Restore Error] ${err.message}`);
    process.exit(1);
  }
}
