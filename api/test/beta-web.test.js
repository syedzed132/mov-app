import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import { once } from 'node:events'
import { createBetaWeb } from '../../scripts/beta-web.mjs'

test('the tester web server serves only the built app, proxies accounts, and refuses source/private files', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mov-beta-web-'))
  const root = path.join(directory, 'dist'); fs.mkdirSync(root)
  fs.writeFileSync(path.join(root, 'index.html'), '<h1>MOV test app</h1>')
  fs.writeFileSync(path.join(directory, '.food.local.json'), 'private fixture')
  const api = http.createServer((req, res) => { res.setHeader('Content-Type', 'application/json'); res.setHeader('Set-Cookie', 'test=session; HttpOnly'); res.end(JSON.stringify({ path: req.url, forwarded: req.headers['x-forwarded-for'] })) })
  api.listen(0, '127.0.0.1'); await once(api, 'listening')
  const web = createBetaWeb({ root, apiPort: api.address().port, publicOrigin: () => 'https://test.trycloudflare.com' })
  web.listen(0, '127.0.0.1'); await once(web, 'listening')
  const url = `http://127.0.0.1:${web.address().port}`
  t.after(async () => {
    await Promise.all([new Promise(resolve => web.close(resolve)), new Promise(resolve => api.close(resolve))])
    assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep))
    await fs.promises.rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 30 })
  })
  assert.match(await (await fetch(url)).text(), /MOV test app/)
  for (const resource of ['/@fs/api/.food.local.json', '/api/.food.local.json', '/data/db.json', '/.env', '/scripts/beta-web.mjs']) {
    const response = await fetch(url + resource)
    assert.ok(!(await response.text()).includes('private fixture'))
  }
  const proxy = await fetch(url + '/api/me', { headers: { 'X-Forwarded-For': 'spoofed' } })
  assert.equal(proxy.headers.get('set-cookie'), 'test=session; HttpOnly')
  const result = await proxy.json()
  assert.equal(result.path, '/api/me')
  assert.equal(result.forwarded, '127.0.0.1')
  const foreignStatus = await new Promise((resolve, reject) => {
    const request = http.get(url, { headers: { Host: 'attacker.example' } }, response => { response.resume(); resolve(response.statusCode) })
    request.on('error', reject)
  })
  assert.equal(foreignStatus, 421)
})
