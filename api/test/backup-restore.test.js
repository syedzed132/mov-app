import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runBackup } from '../../scripts/backup-data.mjs';
import { runRestore } from '../../scripts/restore-data.mjs';

test('Backup & Restore: roundtrips database, state, and nutrition documents losslessly', async (t) => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nxtform-backup-test-'));
  const dataDir = path.join(tmpRoot, 'data');
  const backupDir = path.join(tmpRoot, 'backups');
  const restoreDir = path.join(tmpRoot, 'restored');

  fs.mkdirSync(dataDir, { recursive: true });

  t.after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  // Seed sample data in dataDir
  const dbData = { users: [{ id: 'u_test_1', name: 'Tester' }], creds: [], subs: [] };
  const stateData = { unit: 'kg', workouts: [{ id: 'w1', name: 'Push' }] };
  const nutritionData = { month: '2026-10', days: { '2026-10-28': { entries: [{ name: 'Oats' }] } } };

  fs.writeFileSync(path.join(dataDir, 'secret'), 'test-secret-key-12345', { mode: 0o600 });
  fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify(dbData));
  fs.writeFileSync(path.join(dataDir, 'state-u_test_1.json'), JSON.stringify(stateData));
  fs.writeFileSync(path.join(dataDir, 'nutrition-u_test_1-2026-10.json'), JSON.stringify(nutritionData));

  // 1. Run backup
  const backupRes = runBackup({ dataDir, backupDir, retentionDays: 7 });
  assert.equal(backupRes.ok, true);
  assert.ok(fs.existsSync(backupRes.archive));
  assert.ok(fs.existsSync(`${backupRes.archive}.sha256`));

  // 2. Run restore into fresh directory
  const restoreRes = runRestore(backupRes.archive, restoreDir);
  assert.equal(restoreRes.ok, true);
  assert.equal(restoreRes.hasDb, true);
  assert.equal(restoreRes.hasSecret, true);

  // 3. Verify restored files match original contents verbatim
  const restoredDb = JSON.parse(fs.readFileSync(path.join(restoreDir, 'db.json'), 'utf8'));
  assert.deepEqual(restoredDb, dbData);

  const restoredState = JSON.parse(fs.readFileSync(path.join(restoreDir, 'state-u_test_1.json'), 'utf8'));
  assert.deepEqual(restoredState, stateData);

  const restoredNut = JSON.parse(fs.readFileSync(path.join(restoreDir, 'nutrition-u_test_1-2026-10.json'), 'utf8'));
  assert.deepEqual(restoredNut, nutritionData);
});
