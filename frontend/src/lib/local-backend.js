// Persistent browser-backed API engine for static Vercel deployments ($0/month tier)
// when no external backend server is present.
const ACCOUNTS_KEY = 'mov_accounts_v1'
const SESSION_KEY = 'mov_session_uid_v1'
const CHALLENGES_KEY = 'mov_challenges_v1'
const DATA_PREFIX = 'mov_userdata_v1_'
const NUTRITION_PREFIX = 'mov_nutrition_v1_'

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch {
    /* ignore quota errors */
  }
}

function getAccounts() {
  return readJson(ACCOUNTS_KEY, [])
}

function saveAccounts(accounts) {
  writeJson(ACCOUNTS_KEY, accounts)
}

function getSessionUid() {
  try {
    return localStorage.getItem(SESSION_KEY) || null
  } catch {
    return null
  }
}

function setSessionUid(uid) {
  try {
    if (uid) localStorage.setItem(SESSION_KEY, uid)
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}

function randomB64u(bytes = 16) {
  const arr = new Uint8Array(bytes)
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(arr)
  } else {
    for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256)
  }
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function normKey(s) {
  return String(s || '').normalize('NFKC').trim().toLowerCase()
}

function publicUser(acc) {
  if (!acc) return null
  return {
    id: acc.id,
    name: acc.name,
    admin: !!acc.admin,
    email: acc.email || undefined,
  }
}

function httpError(status, message, code, extra = {}) {
  const body = { error: message, ...(code ? { code } : {}), ...extra }
  const err = new Error(message)
  err.status = status
  err.code = code || 'http'
  err.data = body
  return err
}

function getCurrentAccount() {
  const uid = getSessionUid()
  if (!uid) return null
  const accounts = getAccounts()
  return accounts.find(a => a.id === uid) || null
}

function requireAccount() {
  const acc = getCurrentAccount()
  if (!acc) throw httpError(401, 'unauthorized', 'unauthorized')
  return acc
}

function parseBody(init) {
  if (!init || !init.body) return {}
  if (typeof init.body === 'string') {
    try { return JSON.parse(init.body) } catch { return {} }
  }
  if (typeof init.body === 'object') return init.body
  return {}
}

export function createLocalPasskeyProfile(name) {
  const cleanName = String(name || 'Athlete').trim() || 'Athlete'
  const accounts = getAccounts()
  const key = normKey(cleanName)
  let acc = accounts.find(a => normKey(a.name) === key)
  if (!acc) {
    acc = {
      id: 'usr_' + randomB64u(10),
      name: cleanName,
      email: '',
      password: '',
      admin: accounts.length === 0,
      createdAt: new Date().toISOString(),
      passkeys: [{
        id: 'pk_' + randomB64u(12),
        name: 'This device',
        created_at: new Date().toISOString(),
        last_used_at: new Date().toISOString(),
        transports: ['internal'],
      }],
    }
    accounts.push(acc)
    saveAccounts(accounts)
  }
  setSessionUid(acc.id)
  return publicUser(acc)
}

export function signInLocalDefaultProfile() {
  const accounts = getAccounts()
  let acc = getCurrentAccount() || accounts[0]
  if (!acc) {
    return createLocalPasskeyProfile('Athlete')
  }
  setSessionUid(acc.id)
  return publicUser(acc)
}

export async function localApi(rawPath, init = {}) {
  const method = String(init.method || 'GET').toUpperCase()
  const u = new URL(rawPath, 'https://mov.local')
  const path = u.pathname
  const body = parseBody(init)

  // 1. Config & Health
  if (path === '/api/config' && method === 'GET') {
    return {
      invite_only: false,
      allow_guest: true,
      password_login: true,
      media: false,
      coach: null,
    }
  }
  if (path === '/api/health' && method === 'GET') {
    return { ok: true }
  }

  // 2. Current session (/api/me)
  if (path === '/api/me' && method === 'GET') {
    const acc = requireAccount()
    return { user: publicUser(acc) }
  }

  // 3. Logout
  if ((path === '/api/logout' || path === '/api/logout/all') && method === 'POST') {
    setSessionUid(null)
    return { ok: true }
  }

  // 4. Password Registration
  if (path === '/api/register/password' && method === 'POST') {
    const name = String(body.name || '').trim()
    const password = String(body.password || '')
    const email = String(body.email || '').trim()
    if (!name) throw httpError(400, 'Enter a name', 'bad-name')
    if (!password) throw httpError(400, 'Enter a password', 'too-short')

    const accounts = getAccounts()
    const nKey = normKey(name)
    const eKey = email ? normKey(email) : ''

    const existing = accounts.find(a => normKey(a.name) === nKey || (eKey && a.email && normKey(a.email) === eKey))
    if (existing) {
      // Update/sign in seamlessly if re-registering on same browser
      existing.password = password
      if (email) existing.email = email
      saveAccounts(accounts)
      setSessionUid(existing.id)
      return { user: publicUser(existing) }
    }

    const acc = {
      id: 'usr_' + randomB64u(10),
      name,
      email: email || '',
      password,
      admin: accounts.length === 0,
      createdAt: new Date().toISOString(),
      passkeys: [],
    }
    accounts.push(acc)
    saveAccounts(accounts)
    setSessionUid(acc.id)
    return { user: publicUser(acc) }
  }

  // 5. Password Login (auto-provisions profile if signing in for the first time on this browser)
  if (path === '/api/login/password' && method === 'POST') {
    const nameOrEmail = String(body.name || '').trim()
    const password = String(body.password || '')
    if (!nameOrEmail || !password) {
      throw httpError(401, 'Wrong name, e-mail or password.', 'bad-credentials')
    }

    const accounts = getAccounts()
    const key = normKey(nameOrEmail)
    const isEmail = nameOrEmail.includes('@')

    let acc = accounts.find(a =>
      isEmail
        ? (a.email && normKey(a.email) === key) || normKey(a.name) === key
        : normKey(a.name) === key || (a.email && normKey(a.email) === key)
    )

    if (!acc) {
      // Auto-create account on first sign-in so the user is never locked out on a fresh browser
      const displayName = isEmail ? nameOrEmail.split('@')[0] : nameOrEmail
      acc = {
        id: 'usr_' + randomB64u(10),
        name: displayName || 'Athlete',
        email: isEmail ? nameOrEmail : '',
        password,
        admin: accounts.length === 0,
        createdAt: new Date().toISOString(),
        passkeys: [],
      }
      accounts.push(acc)
      saveAccounts(accounts)
      setSessionUid(acc.id)
      return { user: publicUser(acc) }
    }

    if (acc.password && acc.password !== password) {
      throw httpError(401, 'Wrong name, e-mail or password.', 'bad-credentials')
    }
    if (!acc.password) {
      acc.password = password
      saveAccounts(accounts)
    }

    setSessionUid(acc.id)
    return { user: publicUser(acc) }
  }

  // 6. Password Reset
  if (path === '/api/login/password-reset' && method === 'POST') {
    const nameOrEmail = String(body.name || '').trim()
    const next = String(body.next || '')
    if (!nameOrEmail || !next) throw httpError(400, 'Invalid reset request', 'reset-invalid')
    const accounts = getAccounts()
    const key = normKey(nameOrEmail)
    let acc = accounts.find(a => normKey(a.name) === key || (a.email && normKey(a.email) === key))
    if (!acc) {
      acc = {
        id: 'usr_' + randomB64u(10),
        name: nameOrEmail.includes('@') ? nameOrEmail.split('@')[0] : nameOrEmail,
        email: nameOrEmail.includes('@') ? nameOrEmail : '',
        password: next,
        admin: accounts.length === 0,
        createdAt: new Date().toISOString(),
        passkeys: [],
      }
      accounts.push(acc)
    } else {
      acc.password = next
    }
    saveAccounts(accounts)
    setSessionUid(acc.id)
    return { user: publicUser(acc) }
  }

  // 7. WebAuthn Passkey Registration Options & Verify
  if (path === '/api/register/options' && method === 'POST') {
    const name = String(body.name || 'Athlete').trim() || 'Athlete'
    const cid = 'cid_' + randomB64u(12)
    const userId = randomB64u(16)
    const challenge = randomB64u(32)
    const challenges = readJson(CHALLENGES_KEY, {})
    challenges[cid] = { type: 'register', name, userId, challenge, ts: Date.now() }
    writeJson(CHALLENGES_KEY, challenges)

    const rpId = globalThis.location?.hostname || 'localhost'
    return {
      cid,
      options: {
        challenge,
        rp: { name: 'MOV', id: rpId },
        user: { id: userId, name, displayName: name },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        timeout: 60000,
        attestation: 'none',
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
        excludeCredentials: [],
      },
    }
  }

  if (path === '/api/register/verify' && method === 'POST') {
    const { cid, credential } = body
    const challenges = readJson(CHALLENGES_KEY, {})
    const pending = challenges[cid] || { name: 'Athlete', userId: randomB64u(12) }
    delete challenges[cid]
    writeJson(CHALLENGES_KEY, challenges)

    const accounts = getAccounts()
    const key = normKey(pending.name)
    let acc = accounts.find(a => normKey(a.name) === key)
    const pkEntry = {
      id: credential?.id || credential?.rawId || ('pk_' + randomB64u(12)),
      name: 'Passkey',
      created_at: new Date().toISOString(),
      last_used_at: new Date().toISOString(),
      transports: credential?.response?.transports || ['internal'],
    }
    if (!acc) {
      acc = {
        id: 'usr_' + (pending.userId || randomB64u(10)),
        name: pending.name || 'Athlete',
        email: '',
        password: '',
        admin: accounts.length === 0,
        createdAt: new Date().toISOString(),
        passkeys: [pkEntry],
      }
      accounts.push(acc)
    } else {
      acc.passkeys = [...(acc.passkeys || []), pkEntry]
    }
    saveAccounts(accounts)
    setSessionUid(acc.id)
    return { user: publicUser(acc) }
  }

  // 8. WebAuthn Passkey Login Options & Verify
  if (path === '/api/login/options' && method === 'POST') {
    const cid = 'cid_' + randomB64u(12)
    const challenge = randomB64u(32)
    const challenges = readJson(CHALLENGES_KEY, {})
    challenges[cid] = { type: 'login', challenge, ts: Date.now() }
    writeJson(CHALLENGES_KEY, challenges)

    const accounts = getAccounts()
    const allowCredentials = []
    for (const a of accounts) {
      for (const pk of a.passkeys || []) {
        if (pk.id && !pk.id.startsWith('pk_')) {
          allowCredentials.push({
            id: pk.id,
            type: 'public-key',
            transports: pk.transports || ['internal'],
          })
        }
      }
    }

    const rpId = globalThis.location?.hostname || 'localhost'
    return {
      cid,
      options: {
        challenge,
        rpId,
        timeout: 60000,
        userVerification: 'preferred',
        ...(allowCredentials.length ? { allowCredentials } : {}),
      },
    }
  }

  if (path === '/api/login/verify' && method === 'POST') {
    const { cid, credential } = body
    const challenges = readJson(CHALLENGES_KEY, {})
    delete challenges[cid]
    writeJson(CHALLENGES_KEY, challenges)

    const credId = credential?.id || credential?.rawId
    const accounts = getAccounts()
    let acc = accounts.find(a => (a.passkeys || []).some(pk => pk.id === credId))
    if (!acc) acc = accounts[0]
    if (!acc) {
      const user = createLocalPasskeyProfile('Athlete')
      return { user }
    }
    setSessionUid(acc.id)
    return { user: publicUser(acc) }
  }

  // 9. Workout Data Sync (/api/data & /api/data/rev)
  if (path === '/api/data/rev' && method === 'GET') {
    const acc = requireAccount()
    const doc = readJson(DATA_PREFIX + acc.id, { state: null, rev: 0 })
    return { rev: doc.rev || 0 }
  }

  if (path === '/api/data' && method === 'GET') {
    const acc = requireAccount()
    const doc = readJson(DATA_PREFIX + acc.id, { state: null, rev: 0 })
    return { state: doc.state || null, rev: doc.rev || 0 }
  }

  if (path === '/api/data' && method === 'PUT') {
    const acc = requireAccount()
    const doc = readJson(DATA_PREFIX + acc.id, { state: null, rev: 0 })
    const nextRev = (doc.rev || 0) + 1
    const nextState = body && typeof body === 'object' && 'state' in body ? body.state : body
    writeJson(DATA_PREFIX + acc.id, { state: nextState, rev: nextRev })
    return { ok: true, rev: nextRev }
  }

  // 10. Nutrition Sync (/api/nutrition & /api/nutrition/:month)
  if (path === '/api/nutrition' && method === 'GET') {
    const acc = requireAccount()
    const index = readJson(NUTRITION_PREFIX + acc.id + '_index', {})
    return { months: index }
  }

  if (path.startsWith('/api/nutrition/')) {
    const acc = requireAccount()
    const month = decodeURIComponent(path.slice('/api/nutrition/'.length))
    const key = `${NUTRITION_PREFIX}${acc.id}_${month}`
    if (method === 'GET') {
      const doc = readJson(key, { data: { days: {} }, rev: 0 })
      return doc
    }
    if (method === 'PUT') {
      const doc = readJson(key, { data: { days: {} }, rev: 0 })
      const nextRev = (doc.rev || 0) + 1
      const nextData = body?.data || body || { days: {} }
      const saved = { data: nextData, rev: nextRev }
      writeJson(key, saved)
      const index = readJson(NUTRITION_PREFIX + acc.id + '_index', {})
      index[month] = nextRev
      writeJson(NUTRITION_PREFIX + acc.id + '_index', index)
      return { ok: true, rev: nextRev, data: nextData }
    }
  }

  // 11. Account Management (/api/account/*)
  if (path === '/api/account/passkeys' && method === 'GET') {
    const acc = requireAccount()
    return {
      passkeys: acc.passkeys || [],
      password: !!acc.password,
    }
  }

  if (path === '/api/account/passkeys' && method === 'DELETE') {
    const acc = requireAccount()
    const accounts = getAccounts()
    const target = accounts.find(a => a.id === acc.id)
    if (target) {
      target.passkeys = (target.passkeys || []).filter(pk => pk.id !== body.id)
      saveAccounts(accounts)
    }
    return { ok: true }
  }

  if (path === '/api/account/password' && method === 'GET') {
    const acc = requireAccount()
    return {
      set: !!acc.password,
      name: acc.name,
      email: acc.email || null,
      passkeys: (acc.passkeys || []).length,
      nameTaken: false,
    }
  }

  if (path === '/api/account/password' && method === 'POST') {
    const acc = requireAccount()
    const accounts = getAccounts()
    const target = accounts.find(a => a.id === acc.id)
    if (target && body.next) {
      target.password = String(body.next)
      saveAccounts(accounts)
    }
    return { ok: true }
  }

  if (path === '/api/account/password' && method === 'DELETE') {
    const acc = requireAccount()
    const accounts = getAccounts()
    const target = accounts.find(a => a.id === acc.id)
    if (target) {
      target.password = ''
      saveAccounts(accounts)
    }
    return { ok: true }
  }

  if (path === '/api/account/email' && method === 'POST') {
    const acc = requireAccount()
    const accounts = getAccounts()
    const target = accounts.find(a => a.id === acc.id)
    if (target) {
      target.email = String(body.email || '').trim()
      saveAccounts(accounts)
    }
    return { ok: true }
  }

  if (path === '/api/account/email' && method === 'DELETE') {
    const acc = requireAccount()
    const accounts = getAccounts()
    const target = accounts.find(a => a.id === acc.id)
    if (target) {
      target.email = ''
      saveAccounts(accounts)
    }
    return { ok: true }
  }

  if ((path === '/api/account/name' || path === '/api/me/name') && method === 'POST') {
    const acc = requireAccount()
    const nextName = String(body.name || '').trim()
    if (!nextName) throw httpError(400, 'Enter a name', 'bad-name')
    const accounts = getAccounts()
    const target = accounts.find(a => a.id === acc.id)
    if (target) {
      target.name = nextName
      saveAccounts(accounts)
    }
    return { ok: true, user: publicUser(target || acc) }
  }

  if (path === '/api/account/delete' && method === 'POST') {
    const acc = requireAccount()
    const accounts = getAccounts().filter(a => a.id !== acc.id)
    saveAccounts(accounts)
    setSessionUid(null)
    return { ok: true }
  }

  // 12. Leaderboard (/api/leaderboard)
  if (path === '/api/leaderboard' && method === 'GET') {
    const acc = getCurrentAccount()
    const accounts = getAccounts()
    const entries = accounts.map((a, idx) => {
      const doc = readJson(DATA_PREFIX + a.id, { state: null })
      const workoutsCount = Array.isArray(doc?.state?.W) ? doc.state.W.length : 0
      const totalXp = workoutsCount * 250 + 500
      return {
        id: a.id,
        rank: idx + 1,
        username: a.name,
        level: Math.max(1, Math.floor(totalXp / 500)),
        title: workoutsCount >= 10 ? 'Vanguard' : workoutsCount >= 3 ? 'Contender' : 'Rookie',
        formIcon: 'person',
        totalXp,
        weeklyXp: Math.min(totalXp, workoutsCount * 250 + 250),
        streakDays: Math.max(1, Math.min(workoutsCount, 14)),
      }
    })
    const userRank = acc ? entries.find(e => e.id === acc.id) || null : null
    return { entries, userRank }
  }

  // Default fallback for any other /api/* call
  return { ok: true }
}
