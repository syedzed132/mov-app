/* db-sqlite.js — Native embedded SQLite database for NXT FORM
 * Uses Node.js 22+ built-in node:sqlite (zero external dependencies).
 * Powers user queries, XP indexing, and multi-tier leaderboards.
 */
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

let sqliteDb = null;

export function xpToNextLevel(level) {
  const lvl = Math.max(1, Number(level) || 1);
  return Math.round(100 * Math.pow(lvl, 1.5));
}

export function getLevelAndForm(totalXp = 0) {
  const xp = Math.max(0, Number(totalXp) || 0);
  let level = 1;
  let cumulative = 0;

  while (true) {
    const cost = xpToNextLevel(level);
    if (xp >= cumulative + cost) {
      cumulative += cost;
      level++;
    } else {
      break;
    }
  }

  let title = 'Rookie';
  if (level >= 90) title = 'Mythic';
  else if (level >= 70) title = 'Legend';
  else if (level >= 50) title = 'Champion';
  else if (level >= 35) title = 'Elite';
  else if (level >= 20) title = 'Contender';
  else if (level >= 10) title = 'Athlete';
  else if (level >= 5) title = 'Trainee';

  let formId = 'form_1', formName = 'Novice', formIcon = 'sparkles';
  if (level >= 90) { formId = 'form_8'; formName = 'MOV'; formIcon = 'star'; }
  else if (level >= 70) { formId = 'form_7'; formName = 'Mythic Champion'; formIcon = 'sword'; }
  else if (level >= 50) { formId = 'form_6'; formName = 'Ascended Beast'; formIcon = 'crown'; }
  else if (level >= 35) { formId = 'form_5'; formName = 'Apex Striker'; formIcon = 'lightning'; }
  else if (level >= 20) { formId = 'form_4'; formName = 'Titan Vanguard'; formIcon = 'shield'; }
  else if (level >= 10) { formId = 'form_3'; formName = 'Iron Adept'; formIcon = 'fire'; }
  else if (level >= 5) { formId = 'form_2'; formName = 'Apprentice'; formIcon = 'dumbbell'; }

  return { level, title, formId, formName, formIcon };
}

export function calculateUserStats(state = {}, nutritionDocs = {}) {
  let totalXp = 0;
  let weeklyXp = 0;
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 86400000;

  const workouts = Array.isArray(state?.workouts) ? state.workouts : [];
  const workoutsByDay = {};

  for (const w of workouts) {
    const d = w.d || 'unknown';
    if (!workoutsByDay[d]) workoutsByDay[d] = [];
    workoutsByDay[d].push(w);
  }

  for (const [dayStr, dayWorkouts] of Object.entries(workoutsByDay)) {
    let dayXp = 0;
    if (dayWorkouts.length > 0) {
      dayXp += 40;
      if (dayWorkouts.length > 1) dayXp += 20;
    }
    for (const w of dayWorkouts) {
      if (Array.isArray(w.prs) && w.prs.length) {
        dayXp += Math.min(3, w.prs.length) * 15;
      }
    }
    totalXp += dayXp;

    const dayTs = new Date(dayStr + 'T12:00:00Z').getTime();
    if (dayTs >= sevenDaysAgo) {
      weeklyXp += dayXp;
    }
  }

  // Nutrition XP
  const targets = state?.targets || state?.dailyTargets || {};
  const targetCal = targets.dailyCalories || targets.calories || 2000;
  const targetProt = targets.proteinGrams || targets.proteinG || 150;
  const targetWater = targets.waterMl || 3000;

  for (const [_, doc] of Object.entries(nutritionDocs)) {
    const days = doc?.days || {};
    for (const [dayStr, dayData] of Object.entries(days)) {
      let nutXp = 0;
      const entries = dayData?.entries || [];
      if (entries.length > 0) {
        nutXp += 10;
        const meals = new Set(entries.map(e => String(e.meal || '').toLowerCase()));
        if (meals.has('breakfast') && meals.has('lunch') && meals.has('dinner')) {
          nutXp += 15;
        }
        let cals = 0;
        let prot = 0;
        for (const e of entries) {
          cals += e.nutrients?.calories ?? e.nutrients?.kcal ?? 0;
          prot += e.nutrients?.protein ?? e.nutrients?.proteinG ?? 0;
        }
        if (cals >= targetCal * 0.9 && cals <= targetCal * 1.1) nutXp += 20;
        if (prot >= targetProt) nutXp += 15;
      }
      if ((dayData?.waterMl || 0) >= targetWater) nutXp += 10;

      totalXp += nutXp;
      const dayTs = new Date(dayStr + 'T12:00:00Z').getTime();
      if (dayTs >= sevenDaysAgo) {
        weeklyXp += nutXp;
      }
    }
  }

  // Weigh-ins XP
  const bws = Array.isArray(state?.bodyweight) ? state.bodyweight : [];
  totalXp += bws.length * 5;
  for (const b of bws) {
    const bTs = new Date((b.d || '') + 'T12:00:00Z').getTime();
    if (bTs >= sevenDaysAgo) weeklyXp += 5;
  }

  // Calculate active streak
  const activeDaysSet = new Set([
    ...Object.keys(workoutsByDay),
    ...bws.map(b => b.d).filter(Boolean)
  ]);
  const sortedDays = Array.from(activeDaysSet).sort().reverse();
  let streak = 0;
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (sortedDays.includes(today) || sortedDays.includes(yesterday)) {
    let checkDate = sortedDays.includes(today) ? new Date() : new Date(Date.now() - 86400000);
    while (true) {
      const iso = checkDate.toISOString().slice(0, 10);
      if (activeDaysSet.has(iso)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  const { level, title, formId, formName, formIcon } = getLevelAndForm(totalXp);

  return {
    level,
    totalXp,
    weeklyXp,
    formId,
    formName,
    formIcon,
    title,
    streakDays: streak,
    workoutsCompleted: workouts.length
  };
}

export function initSqlite(dataDir) {
  if (sqliteDb) return sqliteDb;

  const movPath = path.join(dataDir, 'mov.db');
  const nxtPath = path.join(dataDir, 'nxtform.db');
  let dbPath = movPath;
  if (!fs.existsSync(movPath) && fs.existsSync(nxtPath)) {
    try {
      fs.copyFileSync(nxtPath, movPath);
    } catch (_) {
      dbPath = nxtPath;
    }
  }

  sqliteDb = new DatabaseSync(dbPath);

  // WAL mode for high concurrency
  sqliteDb.exec('PRAGMA journal_mode = WAL;');
  sqliteDb.exec('PRAGMA synchronous = NORMAL;');

  // Schema: Leaderboard & User Leveling Metrics
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS leaderboard (
      user_id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      total_xp INTEGER DEFAULT 0,
      weekly_xp INTEGER DEFAULT 0,
      form_id TEXT DEFAULT 'form_1',
      form_name TEXT DEFAULT 'Novice',
      form_icon TEXT DEFAULT 'sparkles',
      title TEXT DEFAULT 'Rookie',
      streak_days INTEGER DEFAULT 0,
      workouts_completed INTEGER DEFAULT 0,
      last_active_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_leaderboard_xp ON leaderboard (total_xp DESC);
    CREATE INDEX IF NOT EXISTS idx_leaderboard_weekly ON leaderboard (weekly_xp DESC);
    CREATE INDEX IF NOT EXISTS idx_leaderboard_streak ON leaderboard (streak_days DESC);
  `);

  return sqliteDb;
}

export function getSqliteDb() {
  return sqliteDb;
}

export function upsertLeaderboard(userId, username, stats) {
  if (!sqliteDb) return null;

  const stmt = sqliteDb.prepare(`
    INSERT INTO leaderboard (
      user_id, username, level, total_xp, weekly_xp, form_id, form_name, form_icon, title, streak_days, workouts_completed, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      username = excluded.username,
      level = excluded.level,
      total_xp = excluded.total_xp,
      weekly_xp = excluded.weekly_xp,
      form_id = excluded.form_id,
      form_name = excluded.form_name,
      form_icon = excluded.form_icon,
      title = excluded.title,
      streak_days = excluded.streak_days,
      workouts_completed = excluded.workouts_completed,
      updated_at = datetime('now')
  `);

  stmt.run(
    userId,
    username,
    stats.level || 1,
    stats.totalXp || 0,
    stats.weeklyXp || 0,
    stats.formId || 'form_1',
    stats.formName || 'Novice',
    stats.formIcon || 'sparkles',
    stats.title || 'Rookie',
    stats.streakDays || 0,
    stats.workoutsCompleted || 0
  );
}

export function deleteUserLeaderboard(userId) {
  if (!sqliteDb) return;
  const stmt = sqliteDb.prepare('DELETE FROM leaderboard WHERE user_id = ?');
  stmt.run(userId);
}

export function getLeaderboard({ type = 'all_time', limit = 50, currentUserId = null } = {}) {
  if (!sqliteDb) return { entries: [], userRank: null, type };

  let orderClause = 'total_xp DESC';
  if (type === 'weekly') orderClause = 'weekly_xp DESC, total_xp DESC';
  else if (type === 'streaks') orderClause = 'streak_days DESC, total_xp DESC';

  const rows = sqliteDb.prepare(`
    SELECT
      user_id as id,
      username,
      level,
      total_xp as totalXp,
      weekly_xp as weeklyXp,
      form_id as formId,
      form_name as formName,
      form_icon as formIcon,
      title,
      streak_days as streakDays,
      workouts_completed as workoutsCompleted,
      updated_at as updatedAt
    FROM leaderboard
    ORDER BY ${orderClause}
    LIMIT ?
  `).all(Math.min(100, Math.max(1, limit)));

  const entries = rows.map((r, idx) => ({
    rank: idx + 1,
    ...r
  }));

  let userRank = null;
  if (currentUserId) {
    const existingIndex = entries.findIndex(e => e.id === currentUserId);
    if (existingIndex >= 0) {
      userRank = entries[existingIndex];
    } else {
      // User is outside the top limit, query their specific rank
      const scoreField = type === 'weekly' ? 'weekly_xp' : type === 'streaks' ? 'streak_days' : 'total_xp';
      const userRow = sqliteDb.prepare(`
        SELECT user_id as id, username, level, total_xp as totalXp, weekly_xp as weeklyXp, form_id as formId, form_name as formName, form_icon as formIcon, title, streak_days as streakDays, workouts_completed as workoutsCompleted
        FROM leaderboard WHERE user_id = ?
      `).get(currentUserId);

      if (userRow) {
        const higherCount = sqliteDb.prepare(`
          SELECT COUNT(*) as cnt FROM leaderboard WHERE ${scoreField} > (SELECT ${scoreField} FROM leaderboard WHERE user_id = ?)
        `).get(currentUserId);
        userRank = {
          rank: (higherCount?.cnt || 0) + 1,
          ...userRow
        };
      }
    }
  }

  return { entries, userRank, type };
}

export function syncAllUsersFromDisk(dataDir, usersList = []) {
  if (!sqliteDb) return;

  for (const u of usersList) {
    try {
      const statePath = path.join(dataDir, `state-${u.id}.json`);
      let state = {};
      if (fs.existsSync(statePath)) {
        state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      }

      // Read any nutrition docs
      const nutritionDocs = {};
      const files = fs.readdirSync(dataDir);
      for (const f of files) {
        if (f.startsWith(`nutrition-${u.id}-`) && f.endsWith('.json')) {
          try {
            nutritionDocs[f] = JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8'));
          } catch { /* ignore corrupted */ }
        }
      }

      const stats = calculateUserStats(state, nutritionDocs);
      upsertLeaderboard(u.id, u.name || 'Athlete', stats);
    } catch (e) {
      console.warn(`Could not sync leaderboard for user ${u.id}:`, e.message);
    }
  }
}

export function getDatabaseStats() {
  if (!sqliteDb) return { ok: false, error: 'Database not initialized' };
  const userCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM leaderboard').get()?.count || 0;
  const topLifter = sqliteDb.prepare('SELECT username, level, total_xp FROM leaderboard ORDER BY total_xp DESC LIMIT 1').get() || null;
  return {
    ok: true,
    engine: 'SQLite (node:sqlite native)',
    userCount,
    topLifter
  };
}
