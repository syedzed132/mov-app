// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import {
  ACTIVITIES,
  ACTIVITY_CATEGORIES,
  getAllActivities,
  calculateActivityCalories,
  calculateActivityXp
} from './activities.js'
import { calculateCharacterStats } from './gamification/stats.js'
import { calculateTotalUserXp } from './gamification/xp.js'

describe('Activities & Sports Catalogue', () => {
  it('includes all requested sports: padel, cricket, pickleball, tennis, swimming, sauna', () => {
    const ids = ACTIVITIES.map(a => a.id)
    expect(ids).toContain('padel')
    expect(ids).toContain('cricket')
    expect(ids).toContain('pickleball')
    expect(ids).toContain('tennis')
    expect(ids).toContain('swimming_laps')
    expect(ids).toContain('sauna_traditional')
    expect(ids).toContain('soccer')
    expect(ids).toContain('basketball')
    expect(ids).toContain('cold_plunge')
  })

  it('merges custom user-created activities into the catalogue', () => {
    const custom = [{ id: 'custom_fencing', name: 'Fencing', category: 'combat', met: 7.0, stat: 'agility', defaultDur: 45 }]
    const all = getAllActivities(custom)
    expect(all[0].id).toBe('custom_fencing')
    expect(all.some(a => a.id === 'cricket')).toBe(true)
  })

  it('has valid categories, MET values, and primary RPG stats for each activity', () => {
    ACTIVITIES.forEach(act => {
      expect(act.id).toBeTruthy()
      expect(act.name).toBeTruthy()
      expect(act.met).toBeGreaterThan(1.0)
      expect(['agility', 'endurance', 'vitality', 'strength', 'discipline']).toContain(act.stat)
      expect(act.defaultDur).toBeGreaterThan(0)
    })
  })

  it('calculates calories burned dynamically based on MET, user body weight, duration, and intensity', () => {
    const padel = ACTIVITIES.find(a => a.id === 'padel') // MET 7.5
    // 75 kg * 7.5 MET * (60 min / 60) * 1.0 = ~563 kcal
    const cal60m = calculateActivityCalories(padel, 60, 75, 'moderate')
    expect(cal60m).toBe(563)

    // Intense match scales by 1.35x
    const calIntense = calculateActivityCalories(padel, 60, 75, 'intense')
    expect(calIntense).toBe(Math.round(7.5 * 75 * 1.35))

    // 30 min session is half
    const cal30m = calculateActivityCalories(padel, 30, 75, 'moderate')
    expect(cal30m).toBe(Math.round(7.5 * 75 * 0.5))
  })

  it('calculates XP earned from activity duration and intensity', () => {
    const swim = ACTIVITIES.find(a => a.id === 'swimming_laps')
    const xp45m = calculateActivityXp(swim, 45, 'moderate')
    expect(xp45m).toBe(Math.round(45 * 1.6))
    expect(xp45m).toBeGreaterThan(50)
  })

  it('boosts Agility when logging racquet and team sports (padel, pickleball, soccer)', () => {
    const statsWithout = calculateCharacterStats({
      workouts: [],
      activities: []
    })

    const statsWithAgility = calculateCharacterStats({
      workouts: [],
      activities: [
        { id: '1', name: 'Padel', stat: 'agility', durationMin: 60 },
        { id: '2', name: 'Soccer', stat: 'agility', durationMin: 60 }
      ]
    })

    expect(statsWithAgility.agility).toBeGreaterThan(statsWithout.agility)
  })

  it('boosts Vitality when logging sauna, cold plunge, and thermal recovery', () => {
    const statsWithout = calculateCharacterStats({
      workouts: [],
      activities: []
    })

    const statsWithSauna = calculateCharacterStats({
      workouts: [],
      activities: [
        { id: '1', name: 'Sauna', stat: 'vitality', category: 'recovery', durationMin: 20 },
        { id: '2', name: 'Cold Plunge', stat: 'vitality', category: 'recovery', durationMin: 5 }
      ]
    })

    expect(statsWithSauna.vitality).toBeGreaterThan(statsWithout.vitality)
  })

  it('adds activities XP into cumulative lifetime user XP', () => {
    const S = {
      workouts: [],
      bodyweight: [],
      activities: [
        { id: '1', name: 'Padel', xpEarned: 75 },
        { id: '2', name: 'Sauna', xpEarned: 35 }
      ]
    }
    const xp = calculateTotalUserXp(S, {})
    expect(xp).toBe(110)
  })
})
