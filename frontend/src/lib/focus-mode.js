import { lastBW, workoutDay } from './history.js'
import { convertBodyWeight } from './units.js'

export const FOCUS_MODES = [
  {
    value: 'calories',
    label: 'Daily calorie count',
    planLabel: 'Calorie count',
    detail: 'Log meals and photos. Stay under your target.',
    icon: 'utensils'
  },
  {
    value: 'exercise',
    label: 'Fitness exercises',
    planLabel: 'Exercise',
    detail: 'Workouts for your level and a daily burn target.',
    icon: 'dumbbell'
  },
  {
    value: 'full',
    label: 'Full routine',
    planLabel: 'Full routine',
    detail: 'Food, workouts and games in one daily plan.',
    icon: 'calendar'
  }
]

export function getFocusMode(S) {
  const mode = S?.focusMode || S?.profile?.focusMode
  if (mode === 'calories' || mode === 'exercise' || mode === 'full') return mode
  return 'full'
}

export function setFocusModeInDraft(draft, mode) {
  const valid = mode === 'calories' || mode === 'exercise' || mode === 'full' ? mode : 'full'
  draft.focusMode = valid
  draft.profile = {
    ...(draft.profile || {}),
    focusMode: valid
  }
}

export function getRecommendedFocus({
  goal = 'fat_loss',
  activityLevel = 'moderate',
  trainingDays = 4,
  useSuggestedWorkouts = true
} = {}) {
  const days = Number(trainingDays) || 0
  if (!useSuggestedWorkouts && days <= 2) {
    return {
      mode: 'calories',
      reason: 'Start by logging your meals and staying under your daily target.'
    }
  }
  if (goal === 'maintenance' && activityLevel === 'active' && days >= 4) {
    return {
      mode: 'exercise',
      reason: 'Your activity is high, so focus on structured workouts and daily burn.'
    }
  }
  return {
    mode: 'full',
    reason: 'You already train, so add your meals and see the full picture.'
  }
}

export function calculateDailyBurnTarget({
  activityLevel = 'moderate',
  trainingDays = 4
} = {}) {
  const days = Number(trainingDays) || 4
  if (activityLevel === 'active' || days >= 5) return 600
  if (activityLevel === 'sedentary' && days <= 2) return 350
  if (days === 3 && activityLevel === 'sedentary') return 400
  return 500
}

export function getDailyBurnTarget(S) {
  const explicit = Number(S?.targets?.dailyBurn || S?.dailyTargets?.burnCalories)
  if (Number.isFinite(explicit) && explicit > 0) return explicit
  return 500
}

export function estimateWorkoutBurn(workout) {
  if (!workout) return 0
  if (Number.isFinite(Number(workout.calories)) && Number(workout.calories) > 0) {
    return Math.round(Number(workout.calories))
  }
  const entries = Array.isArray(workout.entries) ? workout.entries : []
  const doneSets = entries.reduce(
    (sum, entry) => sum + (Array.isArray(entry.sets) ? entry.sets.filter(s => s?.done).length : 0),
    0
  )
  if (doneSets > 0) return Math.round(doneSets * 18)
  if (entries.length > 0) return Math.round(entries.length * 55)
  return 180
}

export function getDayBurnSummary(S, dateISO) {
  const dayWorkouts = (S?.workouts || []).filter(w => (workoutDay(w) || w.d) === dateISO)
  const dayActivities = (S?.activities || []).filter(a => a.d === dateISO)

  const workoutBurn = dayWorkouts.reduce((sum, w) => sum + estimateWorkoutBurn(w), 0)
  const gamesBurn = dayActivities.reduce((sum, a) => sum + (Number(a.calories) || 0), 0)
  const totalBurn = workoutBurn + gamesBurn

  return {
    totalBurn,
    workoutBurn,
    gamesBurn,
    workouts: dayWorkouts,
    activities: dayActivities
  }
}

export function getWeightGoalSummary(S) {
  const unit = S?.unit === 'lb' ? 'lb' : 'kg'
  const latestInput = S?.targetHistory?.at(-1)?.inputs || {}
  const rawStartKg = Number(latestInput.weightKg) || 80
  const rawTargetKg = Number(S?.goal?.targetWeightKg || latestInput.targetWeightKg) || 75

  const startFromHistory = unit === 'lb' ? convertBodyWeight(rawStartKg, 'kg', 'lb') : rawStartKg
  const targetFromGoal = S?.targetW != null
    ? Number(S.targetW)
    : (unit === 'lb' ? convertBodyWeight(rawTargetKg, 'kg', 'lb') : rawTargetKg)

  const firstBw = S?.bodyweight?.[0]?.w
  const startW = Number(firstBw || startFromHistory || (unit === 'lb' ? 176 : 80))
  const last = lastBW(S)
  const currentW = Number(last?.w ?? startW)
  const targetW = Number(targetFromGoal || (unit === 'lb' ? 165 : 75))

  const totalSpan = Math.abs(startW - targetW)
  const coveredSpan = startW >= targetW
    ? Math.max(0, startW - currentW)
    : Math.max(0, currentW - startW)

  const pct = totalSpan > 0.05
    ? Math.max(0, Math.min(100, Math.round((coveredSpan / totalSpan) * 100)))
    : (Math.abs(currentW - targetW) < 0.1 ? 100 : 0)

  const toGo = Math.max(0, Math.round(Math.abs(currentW - targetW) * 10) / 10)
  const nowRounded = Math.round(currentW * 10) / 10
  const targetRounded = Math.round(targetW * 10) / 10

  return {
    unit,
    startW: Math.round(startW * 10) / 10,
    currentW: nowRounded,
    targetW: targetRounded,
    pct,
    toGo
  }
}

export function getInviteCode(S, user) {
  if (S?.inviteCode) return S.inviteCode
  const seed = String(user?.id || user?.name || S?.onboardedAt || '326825')
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 900000
  }
  const num = String(100000 + Math.abs(hash)).slice(0, 6)
  return `MOV-${num}`
}
