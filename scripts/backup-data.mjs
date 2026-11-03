#!/usr/bin/env node
// backup-data.mjs — Automated off-server backup script for NXT FORM DATA_DIR
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';

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

  // Take valid SQLite snapshots while the app is running. Copying a live db/wal
  // pair at different moments can create an archive that cannot be restored.
  const backupRoot = fs.realpathSync(backupDir);
  const stage = fs.mkdtempSync(path.join(backupRoot, '.snapshot-'));
  try {
    fs.cpSync(dataDir, stage, { recursive: true, filter: file => !/\.(?:db|db-wal|db-shm)$/.test(file) });
    for (const name of fs.readdirSync(dataDir).filter(name => name.endsWith('.db'))) {
      const db = new DatabaseSync(path.join(dataDir, name), { readOnly: true });
      try { db.exec('PRAGMA busy_timeout=5000'); db.prepare('VACUUM INTO ?').run(path.join(stage, name)); }
      finally { db.close(); }
    }
    execFileSync('tar', ['-czf', archivePath, '-C', stage, '.'], { stdio: 'pipe' });
  } finally {
    const resolved = fs.realpathSync(stage);
    if (!resolved.startsWith(backupRoot + path.sep) || !path.basename(resolved).startsWith('.snapshot-')) throw new Error('Unsafe backup staging path');
    fs.rmSync(resolved, { recursive: true, force: true });
  }

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
