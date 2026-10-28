#!/usr/bin/env node
// backup-data.mjs — Automated off-server backup script for NXT FORM DATA_DIR
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

export function runBackup({
  dataDir = process.env.DATA_DIR || path.resolve('data'),
  backupDir = process.env.BACKUP_DIR || path.resolve('backups'),
  retentionDays = 14
} = {}) {
  if (!fs.existsSync(dataDir)) {
    throw new Error(`Data directory not found: ${dataDir}`);
  }

  fs.mkdirSync(backupDir, { recursive: true });

  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const archiveName = `nxtform-data-${timestamp}.tar.gz`;
  const archivePath = path.join(backupDir, archiveName);

  // Compress data directory into tar.gz
  const cmd = `tar -czf "${archivePath}" -C "${dataDir}" .`;
  execSync(cmd, { stdio: 'pipe' });

  // Compute SHA-256 checksum
  const fileBytes = fs.readFileSync(archivePath);
  const hash = crypto.createHash('sha256').update(fileBytes).digest('hex');
  const checksumPath = `${archivePath}.sha256`;
  fs.writeFileSync(checksumPath, `${hash}  ${archiveName}\n`);

  // Prune archives older than retentionDays
  const nowMs = Date.now();
  const maxAgeMs = retentionDays * 86400000;
  let pruned = 0;

  for (const file of fs.readdirSync(backupDir)) {
    if (file.startsWith('nxtform-data-') && (file.endsWith('.tar.gz') || file.endsWith('.sha256'))) {
      const filePath = path.join(backupDir, file);
      const stat = fs.statSync(filePath);
      if (nowMs - stat.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filePath);
        pruned++;
      }
    }
  }

  return {
    ok: true,
    archive: archivePath,
    checksum: hash,
    bytes: fileBytes.length,
    prunedFiles: pruned
  };
}

// Direct CLI invocation
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('backup-data.mjs')) {
  try {
    const res = runBackup();
    console.log(`[Backup Success] Created ${res.archive} (${Math.round(res.bytes / 1024)} KB)`);
    console.log(`SHA-256: ${res.checksum}`);
  } catch (err) {
    console.error(`[Backup Error] ${err.message}`);
    process.exit(1);
  }
}
