import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { EXIDX } from '../lib/exercises.js'
import { effectiveRoutines, effectiveRoutineIds } from '../lib/history.js'
import { fmtDate, todayISO } from '../lib/format.js'
import { t, exerciseNameFor } from '../lib/i18n.js'
import { bwSheet, startFlow } from '../sheets.jsx'
import { computeDayTotals } from '../lib/nutrition/totals.js'
import { FoodSearchSheet } from './FoodSearchSheet.jsx'
import { PhotoEstimateSheet } from './PhotoEstimateSheet.jsx'
import { ActivityLogSheet } from './ActivityLogSheet.jsx'
import { Button } from './ui.jsx'
import Icon from './Icon.jsx'
import {
  estimateWorkoutBurn,
  getDailyBurnTarget,
  getDayBurnSummary,
  getWeightGoalSummary
} from '../lib/focus-mode.js'

export const MEAL_SECTIONS = [
  { key: 'breakfast', label: 'Breakfast', icon: 'sunrise' },
  { key: 'lunch', label: 'Lunch', icon: 'utensils' },
  { key: 'snacks', label: 'Snack', icon: 'apple' },
  { key: 'dinner', label: 'Dinner', icon: 'moon' }
]

export function WeightTargetCard({ S }) {
  const weightGoal = getWeightGoalSummary(S)
  return (
    <section className="fmode-card fmode-weight-card" aria-label={t('Your main target')}>
      <div className="fmode-row-between">
        <span className="fmode-eyebrow">{t('Your main target')}</span>
        <strong className="fmode-accent-pct">{weightGoal.pct}%</strong>
      </div>
      <h2>{t('{0}% of the way to {1} {2}', weightGoal.pct, weightGoal.targetW, weightGoal.unit)}</h2>
      <div className="fmode-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={weightGoal.pct}>
        <span style={{ width: `${weightGoal.pct}%` }} />
      </div>
      <div className="fmode-row-between fmode-card-foot">
        <span>
          {t('{0} {1} now · {2} {1} to go', weightGoal.currentW, weightGoal.unit, weightGoal.toGo)}
        </span>
        <button type="button" className="fmode-inline-link" onClick={() => bwSheet()}>
          {t('Log today’s weight')}
        </button>
      </div>
    </section>
  )
}

export function MealRowsList({ date, entries = [] }) {
  const openSheet = useUI(s => s.openSheet)

  const openMealSearch = mealKey => {
    openSheet(close => <FoodSearchSheet meal={mealKey} date={date} close={close} />)
  }

  return (
    <div className="fmode-meals-list">
      {MEAL_SECTIONS.map(meal => {
        const mealEntries = entries.filter(e =>
          meal.key === 'snacks' ? e.meal === 'snacks' || e.meal === 'snack' : e.meal === meal.key
        )
        const mealTotals = computeDayTotals(mealEntries)
        const mealKcal = Math.round(mealTotals.calories || mealTotals.kcal || 0)
        const summary = mealEntries.length
          ? mealEntries.map(e => e.name).join(' · ')
          : t('Tap to add food')

        return (
          <button
            key={meal.key}
            type="button"
            className="fmode-meal-row"
            onClick={() => openMealSearch(meal.key)}
          >
            <span className="fmode-meal-icon">
              <Icon name={meal.icon} />
            </span>
            <span className="fmode-meal-copy">
              <strong>{t(meal.label)}</strong>
              <small>{summary}</small>
            </span>
            {mealKcal > 0 ? (
              <strong className="fmode-meal-kcal">{mealKcal.toLocaleString()} kcal</strong>
            ) : (
              <span className="fmode-meal-add">{t('Add')}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function OpenPhotoEstimateButton({ date, meal = 'lunch', variant = 'primary', className = '' }) {
  const openSheet = useUI(s => s.openSheet)
  const openPhoto = () => {
    openSheet(close => <PhotoEstimateSheet meal={meal} date={date} close={close} />)
  }
  if (variant === 'inline') {
    return (
      <button type="button" className={'fmode-inline-link ' + className} onClick={openPhoto}>
        <Icon name="camera" />
        <span>{t('Log with a photo')}</span>
      </button>
    )
  }
  return (
    <Button
      variant="primary"
      icon="camera"
      className={'fmode-full-btn fmode-photo-btn ' + className}
      onClick={openPhoto}
    >
      {t('Log with a photo')}
    </Button>
  )
}

export function CalorieBurnCard({ S, date, showEntries = false }) {
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)
  const burnTarget = getDailyBurnTarget(S)
  const burn = getDayBurnSummary(S, date)
  const pct = Math.min(100, Math.round((burn.totalBurn / burnTarget) * 100))

  const removeActivity = act => {
    update(draft => {
      draft.activities = (draft.activities || []).filter(a => a.id !== act.id)
    })
    toast(t('{0} removed', act.name))
  }

  return (
    <section className="fmode-card fmode-burn-card" aria-label={t('Calorie burn')}>
      <div className="fmode-row-between">
        <div>
          <span className="fmode-eyebrow">{t('Calorie burn')}</span>
          <h2 className="fmode-burn-number">
            {burn.totalBurn.toLocaleString()} <small>/ {burnTarget.toLocaleString()} kcal</small>
          </h2>
        </div>
        <span className="fmode-flame-badge" aria-hidden="true">
          <Icon name="flame" />
        </span>
      </div>

      <div className="fmode-track burn" role="progressbar" aria-valuemin={0} aria-valuemax={burnTarget} aria-valuenow={Math.min(burn.totalBurn, burnTarget)}>
        <span style={{ width: `${pct}%` }} />
      </div>

      <div className="fmode-row-between fmode-card-foot">
        <span>
          {burn.totalBurn >= burnTarget
            ? t('Burn target reached')
            : t('{0} kcal to reach target', Math.max(0, burnTarget - burn.totalBurn).toLocaleString())}
        </span>
        <span>
          {t('Workouts {0} · Games {1}', burn.workoutBurn.toLocaleString(), burn.gamesBurn.toLocaleString())}
        </span>
      </div>

      {showEntries && (burn.workouts.length > 0 || burn.activities.length > 0) && (
        <div className="fmode-burn-entries">
          {burn.workouts.map(w => (
            <div key={w.id} className="fmode-burn-entry">
              <span className="fmode-burn-entry-icon">
                <Icon name="dumbbell" />
              </span>
              <div className="fmode-burn-entry-copy">
                <strong>{w.name || t('Workout')}</strong>
                <small>{t('{0} kcal burned', estimateWorkoutBurn(w))}</small>
              </div>
            </div>
          ))}
          {burn.activities.map(act => (
            <div key={act.id} className="fmode-burn-entry">
              <span className="fmode-burn-entry-icon">
                <Icon name={act.icon || 'trophy'} />
              </span>
              <div className="fmode-burn-entry-copy">
                <strong>{act.name}</strong>
                <small>{act.durationMin} min · {act.calories} kcal</small>
              </div>
              <button
                type="button"
                className="iconbtn sm"
                aria-label={t('Remove {0}', act.name)}
                onClick={() => removeActivity(act)}
              >
                <Icon name="xmark" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export function LogSportButton({ label }) {
  const openSheet = useUI(s => s.openSheet)
  const openActivityLog = () => {
    openSheet(close => <ActivityLogSheet close={close} initialCategory="all" />)
  }
  return (
    <button type="button" className="fmode-sport-cta" onClick={openActivityLog}>
      <Icon name="trophy" />
      <span>{label || t('Log a game or sport')}</span>
    </button>
  )
}

export function DayTrainingCard({ S, date, eyebrowLabel, onEditPlan }) {
  const routines = effectiveRoutines(S, date)
  const routineName = routines.map(r => r.name).join(' + ')
  const exercises = routines.flatMap(r => r.ex || [])
  const hasExercises = exercises.length > 0
  const today = todayISO()

  const formatExName = id => {
    const found = EXIDX[id]
    if (found) return exerciseNameFor(found)
    return String(id || '')
  }

  return (
    <section className="fmode-card fmode-training-card" aria-label={t('Training')}>
      <div className="fmode-row-between">
        <div>
          <span className="fmode-eyebrow">
            {eyebrowLabel || (date === today ? t('Today') : fmtDate(date, { weekday: 'long', month: 'short', day: 'numeric' }))}
          </span>
          <h2>{hasExercises ? routineName : t('Rest day')}</h2>
        </div>
        {onEditPlan && (
          <button type="button" className="fmode-inline-link" onClick={onEditPlan}>
            <span>{t('Edit plan')}</span>
            <Icon name="chevronRight" />
          </button>
        )}
      </div>

      {hasExercises ? (
        <>
          <div className="fmode-exercise-list">
            {exercises.map((ex, idx) => (
              <div key={`${ex.id}-${idx}`} className="fmode-exercise-row">
                <span className="fmode-exercise-num">{idx + 1}</span>
                <span className="fmode-exercise-name">{formatExName(ex.id)}</span>
                <span className="fmode-exercise-sets">
                  {ex.sets || 3} × {ex.reps || '8–10'}
                </span>
              </div>
            ))}
          </div>
          <Button
            variant="primary"
            trailingIcon="arrowRight"
            className="fmode-full-btn"
            onClick={() => startFlow(effectiveRoutineIds(S, date))}
          >
            {t('Start workout')}
          </Button>
        </>
      ) : (
        <p className="fmode-muted-copy">
          {t('Recovery is part of the plan. Walk, stretch or log a game below.')}
        </p>
      )}
    </section>
  )
}
