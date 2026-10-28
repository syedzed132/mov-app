import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  initSqlite,
  upsertLeaderboard,
  getLeaderboard,
  deleteUserLeaderboard,
  calculateUserStats,
  getLevelAndForm,
  getDatabaseStats
} from '../db-sqlite.js';

test('SQLite Leaderboard Database', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nxtform-sqlite-test-'));
  t.after(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  const db = initSqlite(tmpDir);
  assert.ok(db, 'SQLite instance initialized');

  // Test level and form calculations
  const novice = getLevelAndForm(0);
  assert.equal(novice.level, 1);
  assert.equal(novice.title, 'Rookie');
  assert.equal(novice.formName, 'Novice');

  const adept = getLevelAndForm(12000);
  assert.ok(adept.level >= 10, 'Level should be at least 10');
  assert.equal(adept.formName, 'Iron Adept');

  // Test user stats calculation
  const mockState = {
    workouts: [
      { d: new Date().toISOString().slice(0, 10), prs: [{ id: 'bench' }] },
      { d: new Date(Date.now() - 86400000).toISOString().slice(0, 10), prs: [] }
    ],
    bodyweight: [{ d: new Date().toISOString().slice(0, 10), w: 75 }]
  };
  const stats = calculateUserStats(mockState, {});
  assert.ok(stats.totalXp > 0, 'Total XP should be > 0');
  assert.equal(stats.workoutsCompleted, 2);
  assert.equal(stats.streakDays, 2);

  // Test upserting multiple users
  upsertLeaderboard('user_1', 'Alice', {
    level: 12,
    totalXp: 4500,
    weeklyXp: 350,
    formId: 'form_3',
    formName: 'Iron Adept',
    formIcon: 'fire',
    title: 'Athlete',
    streakDays: 14,
    workoutsCompleted: 25
  });

  upsertLeaderboard('user_2', 'Bob', {
    level: 25,
    totalXp: 15000,
    weeklyXp: 500,
    formId: 'form_4',
    formName: 'Titan Vanguard',
    formIcon: 'shield',
    title: 'Contender',
    streakDays: 30,
    workoutsCompleted: 60
  });

  upsertLeaderboard('user_3', 'Charlie', {
    level: 5,
    totalXp: 1200,
    weeklyXp: 800,
    formId: 'form_2',
    formName: 'Apprentice',
    formIcon: 'dumbbell',
    title: 'Trainee',
    streakDays: 5,
    workoutsCompleted: 8
  });

  // Query All-time
  const allTime = getLeaderboard({ type: 'all_time', currentUserId: 'user_1' });
  assert.equal(allTime.entries.length, 3);
  assert.equal(allTime.entries[0].username, 'Bob', 'Bob has highest total XP');
  assert.equal(allTime.entries[1].username, 'Alice');
  assert.equal(allTime.entries[2].username, 'Charlie');
  assert.equal(allTime.userRank.rank, 2, 'Alice should be rank #2');

  // Query Weekly
  const weekly = getLeaderboard({ type: 'weekly', currentUserId: 'user_3' });
  assert.equal(weekly.entries[0].username, 'Charlie', 'Charlie has highest weekly XP');
  assert.equal(weekly.userRank.rank, 1, 'Charlie should be rank #1 on weekly');

  // Query Streaks
  const streaks = getLeaderboard({ type: 'streaks' });
  assert.equal(streaks.entries[0].username, 'Bob', 'Bob has longest streak');

  // Test database stats
  const dbStats = getDatabaseStats();
  assert.equal(dbStats.userCount, 3);
  assert.equal(dbStats.topLifter.username, 'Bob');

  // Test deletion
  deleteUserLeaderboard('user_3');
  const afterDel = getLeaderboard({ type: 'all_time' });
  assert.equal(afterDel.entries.length, 2);
});
