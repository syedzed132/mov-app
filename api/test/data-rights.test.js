import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { boundPort } from './helpers.mjs';

const API = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SECRET = crypto.randomBytes(32).toString('hex');

function mintSession(uid, sv = 0) {
  const payload = `${uid}:${Date.now() + 86400000}:${sv}`;
  return payload + '.' + crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
}

const UID_A = 'u_user_a';
const UID_B = 'u_user_b';
const ADMIN_UID = 'u_admin';

function reqJson(baseUrl, pathUrl, method = 'GET', headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(pathUrl, baseUrl);
    const req = http.request(u, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode, headers: res.headers, body: json, text: data });
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function startServer(t) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gym-data-rights-'));
  fs.writeFileSync(path.join(dataDir, 'secret'), SECRET, { mode: 0o600 });
  fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify({
    users: [
      { id: ADMIN_UID, name: 'Admin', admin: true, created: new Date().toISOString() },
      { id: UID_A, name: 'Alice', created: new Date().toISOString() },
      { id: UID_B, name: 'Bob', created: new Date().toISOString() }
    ],
    creds: [],
    subs: [],
    invites: []
  }));

  const child = spawn(process.execPath, ['server.js'], {
    cwd: API,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: '0', DATA_DIR: dataDir, ORIGIN: 'http://localhost:8080', RP_ID: 'localhost' }
  });

  const h = { api: '', log: '', dataDir };
  child.stdout.on('data', d => h.log += d);
  child.stderr.on('data', d => h.log += d);

  t.after(() => {
    child.kill('SIGKILL');
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  const port = await boundPort(child, () => h.log);
  h.api = `http://127.0.0.1:${port}`;
  return h;
}

test('Data Rights: Unauthenticated nutrition access is rejected with 401', async (t) => {
  const srv = await startServer(t);

  const getRes = await reqJson(srv.api, '/api/nutrition/2026-10', 'GET');
  assert.equal(getRes.status, 401);
  assert.equal(getRes.body.error, 'not signed in');

  const putRes = await reqJson(srv.api, '/api/nutrition/2026-10', 'PUT', {}, { month: '2026-10', days: {} });
  assert.equal(putRes.status, 401);
  assert.equal(putRes.body.error, 'not signed in');
});

test('Data Rights: Cross-user isolation (User B cannot access User A nutrition)', async (t) => {
  const srv = await startServer(t);
  const cookieA = { Cookie: `gymsid=${mintSession(UID_A)}` };
  const cookieB = { Cookie: `gymsid=${mintSession(UID_B)}` };

  // User A saves private nutrition log
  const putA = await reqJson(srv.api, '/api/nutrition/2026-10', 'PUT', cookieA, {
    month: '2026-10',
    days: {
      '2026-10-28': {
        entries: [{ name: 'Secret Protein Oats', kcal: 450 }]
      }
    }
  });
  assert.equal(putA.status, 200);

  // User A can read their own log
  const getA = await reqJson(srv.api, '/api/nutrition/2026-10', 'GET', cookieA);
  assert.equal(getA.status, 200);
  assert.ok(getA.body.days['2026-10-28']);
  assert.equal(getA.body.days['2026-10-28'].entries[0].name, 'Secret Protein Oats');

  // User B reads 2026-10 -> User B sees empty log, NOT User A's data!
  const getB = await reqJson(srv.api, '/api/nutrition/2026-10', 'GET', cookieB);
  assert.equal(getB.status, 200);
  assert.deepEqual(getB.body.days, {});
});

test('Data Rights: Account deletion deletes all user nutrition documents', async (t) => {
  const srv = await startServer(t);
  const cookieA = { Cookie: `gymsid=${mintSession(UID_A)}` };
  const adminCookie = { Cookie: `gymsid=${mintSession(ADMIN_UID)}` };

  // Save two nutrition months for Alice
  await reqJson(srv.api, '/api/nutrition/2026-09', 'PUT', cookieA, { month: '2026-09', days: {} });
  await reqJson(srv.api, '/api/nutrition/2026-10', 'PUT', cookieA, { month: '2026-10', days: {} });

  const f1 = path.join(srv.dataDir, `nutrition-${UID_A}-2026-09.json`);
  const f2 = path.join(srv.dataDir, `nutrition-${UID_A}-2026-10.json`);

  assert.ok(fs.existsSync(f1), 'Month 2026-09 document should exist before delete');
  assert.ok(fs.existsSync(f2), 'Month 2026-10 document should exist before delete');

  // Admin deletes Alice's account
  const delRes = await reqJson(srv.api, '/api/admin/user/delete', 'POST', adminCookie, { id: UID_A });
  assert.equal(delRes.status, 200);

  // Nutrition documents must be completely removed from disk
  assert.equal(fs.existsSync(f1), false, 'Month 2026-09 document must be deleted');
  assert.equal(fs.existsSync(f2), false, 'Month 2026-10 document must be deleted');
});
