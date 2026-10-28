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

function parseCookie(resHeaders) {
  const sc = resHeaders['set-cookie'];
  if (!sc) return '';
  const first = Array.isArray(sc) ? sc[0] : sc;
  return first.split(';')[0];
}

test('E2E MVP Journey: Full lifecycle from sign-up, food logging, workouts, and account deletion', async (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nxtform-e2e-'));
  fs.writeFileSync(path.join(dataDir, 'secret'), SECRET, { mode: 0o600 });
  fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify({
    users: [],
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

  // 1. User Registration via Password
  const regRes = await reqJson(h.api, '/api/register/password', 'POST', {}, {
    name: 'Champion Lifter',
    password: 'SuperSecretPassword123!'
  });
  assert.equal(regRes.status, 200, `Registration should succeed: ${regRes.text}`);
  assert.ok(regRes.body.user);
  assert.equal(regRes.body.user.name, 'Champion Lifter');

  const uid = regRes.body.user.id;
  const cookieStr = parseCookie(regRes.headers);
  assert.ok(cookieStr.includes('gymsid='), 'Session cookie must be returned');
  const authHeaders = { Cookie: cookieStr };

  // 2. Onboarding Targets & State Persistence
  const initialTargets = {
    unit: 'kg',
    targets: {
      dailyCalories: 2250,
      macros: { proteinG: 165, carbsG: 230, fatG: 70 },
      waterMl: 3000,
      goal: 'muscle_building'
    },
    workouts: [],
    bodyweight: [{ d: '2026-10-28', w: 82.5 }]
  };

  const putState = await reqJson(h.api, '/api/data', 'PUT', authHeaders, { state: initialTargets });
  assert.equal(putState.status, 200);

  const getState = await reqJson(h.api, '/api/data', 'GET', authHeaders);
  assert.equal(getState.status, 200);
  assert.equal(getState.body.state.targets.dailyCalories, 2250);
  assert.equal(getState.body.state.bodyweight[0].w, 82.5);

  // 3. Nutrition Food Search (Pantry Staples & Fast Lookup)
  const searchEgg = await reqJson(h.api, '/api/food/search?q=egg', 'GET', authHeaders);
  assert.equal(searchEgg.status, 200);
  assert.ok(Array.isArray(searchEgg.body.foods));
  assert.ok(searchEgg.body.foods.length > 0);

  const eggItem = searchEgg.body.foods[0];
  assert.ok(eggItem.per100g.kcal > 0);

  // 4. Natural Language Meal Text Parsing
  const nlpRes = await reqJson(h.api, '/api/food/parse-text', 'POST', authHeaders, {
    text: '2 eggs and 1 banana'
  });
  assert.equal(nlpRes.status, 200);
  assert.equal(nlpRes.body.items.length, 2);
  assert.ok(nlpRes.body.totals.calories > 150);

  // 5. Food Diary Logging (Monthly Document Sync)
  const monthKey = '2026-10';
  const foodDayData = {
    month: monthKey,
    days: {
      '2026-10-28': {
        entries: [
          {
            id: 'entry_1',
            meal: 'breakfast',
            name: eggItem.name,
            qty: 2,
            unit: 'item',
            weightGrams: 100,
            nutrients: { calories: 143, protein: 12.6, carbs: 0.7, fat: 9.5 }
          }
        ],
        waterMl: 2500
      }
    }
  };

  const putNut = await reqJson(h.api, `/api/nutrition/${monthKey}`, 'PUT', authHeaders, foodDayData);
  assert.equal(putNut.status, 200);

  const getNut = await reqJson(h.api, `/api/nutrition/${monthKey}`, 'GET', authHeaders);
  assert.equal(getNut.status, 200);
  assert.ok(getNut.body.days['2026-10-28']);
  assert.equal(getNut.body.days['2026-10-28'].entries[0].name, eggItem.name);
  assert.equal(getNut.body.days['2026-10-28'].waterMl, 2500);

  // 6. Workout Execution & Personal Record Logging
  const workoutData = {
    ...getState.body.state,
    workouts: [
      {
        id: 'w_e2e_1',
        d: '2026-10-28',
        name: 'Full Body Power',
        entries: [
          {
            id: '0025', // Barbell Bench Press
            sets: [
              { w: 80, r: 8, done: true },
              { w: 90, r: 6, done: true }
            ]
          },
          {
            id: '3666', // Cardio Treadmill
            sets: [
              { min: 20, speed: 10.0, incline: 2, done: true }
            ]
          }
        ]
      }
    ]
  };

  const putWk = await reqJson(h.api, '/api/data', 'PUT', authHeaders, { state: workoutData });
  assert.equal(putWk.status, 200);

  const getWk = await reqJson(h.api, '/api/data', 'GET', authHeaders);
  assert.equal(getWk.body.state.workouts.length, 1);
  assert.equal(getWk.body.state.workouts[0].name, 'Full Body Power');

  // 7. Data Rights: Account Deletion removes all data cleanly
  const nutFile = path.join(h.dataDir, `nutrition-${uid}-${monthKey}.json`);
  const stateFile = path.join(h.dataDir, `state-${uid}.json`);
  assert.ok(fs.existsSync(nutFile), 'Nutrition document should exist before delete');
  assert.ok(fs.existsSync(stateFile), 'State document should exist before delete');

  const delRes = await reqJson(h.api, '/api/account/delete', 'POST', authHeaders, {
    name: 'Champion Lifter',
    current: 'SuperSecretPassword123!'
  });
  assert.equal(delRes.status, 200, `Account deletion should succeed: ${delRes.text}`);

  assert.equal(fs.existsSync(nutFile), false, 'Nutrition document must be wiped');
  assert.equal(fs.existsSync(stateFile), false, 'State document must be wiped');

  // Subsequent request with the same session cookie must be refused with 401
  const afterDelGet = await reqJson(h.api, '/api/data', 'GET', authHeaders);
  assert.equal(afterDelGet.status, 401);
});
