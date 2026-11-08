import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'
import { Button, Segmented, Switch, NumberField } from '../components/ui.jsx'
import { generatePersonalPlan, createTargetHistoryEntry } from '../lib/targets.js'
import { Brand } from '../components/Brand.jsx'
import WeightPicker from '../components/WeightPicker.jsx'
import BackgroundTexture from '../components/BackgroundTexture.jsx'
import './onboarding.css'
import { applyOnboardingWorkout, hasExistingTrainingPlan } from '../lib/onboarding-workout.js'
import '../training-flow.css'
import { MeasurementUnitChoice, rememberWeightUnit } from '../components/UnitChoice.jsx'
import { convertBodyWeight } from '../lib/units.js'
import { heightInFeet, heightInCm } from '../lib/height-units.js'
import { todayISO } from '../lib/format.js'
import {
  FOCUS_MODES,
  calculateDailyBurnTarget,
  getRecommendedFocus,
  setFocusModeInDraft
} from '../lib/focus-mode.js'

const inRange = (value, min, max) => Number.isFinite(value) && value >= min && value <= max

export default function Onboarding() {
  const navigate = useNavigate()
  const { S, update, pushState } = useStore()
  const isLb = S?.unit === 'lb'
  const previousInputs = S?.targetHistory?.at(-1)?.inputs || {}
  const firstSetup = !S?.profile?.onboardedAt && !S?.onboardedAt

  const [step, setStep] = useState(1) // 1: Stats, 2: Goal, 3: Activity, 4: Plan Review, 5: Focus
  const headingRef = useRef(null)
  useEffect(() => { window.scrollTo(0, 0); headingRef.current?.focus({ preventScroll: true }) }, [step])

  // Form inputs
  const [sex, setSex] = useState(S?.profile?.sex || previousInputs.sex || 'male') // 'male' | 'female' | 'other'
  const [age, setAge] = useState(S?.profile?.age || previousInputs.age || 30)
  const [heightCm, setHeightCm] = useState(S?.profile?.heightCm || previousInputs.heightCm || 175)
  const [heightFeet, setHeightFeet] = useState(() => heightInFeet(S?.profile?.heightCm || previousInputs.heightCm || 175).feet)
  const [heightInches, setHeightInches] = useState(() => heightInFeet(S?.profile?.heightCm || previousInputs.heightCm || 175).inches)
  // Keep editable weights in the displayed unit. Converting and rounding on every
  // keystroke loses empty fields and partial decimals, especially in pounds.
  const toDisplayWeight = kg => isLb ? Math.round(kg * 2.20462 * 10) / 10 : kg
  const [displayWeight, setDisplayWeight] = useState(() => toDisplayWeight(previousInputs.weightKg || (isLb ? 81.6 : 80)))
  const [displayTargetWeight, setDisplayTargetWeight] = useState(() => toDisplayWeight(S?.goal?.targetWeightKg || previousInputs.targetWeightKg || (isLb ? 74.8 : 75)))
  const weightKg = displayWeight == null ? null : isLb ? displayWeight / 2.20462 : displayWeight
  const targetWeightKg = displayTargetWeight == null ? null : isLb ? displayTargetWeight / 2.20462 : displayTargetWeight
  const [goal, setGoal] = useState(S?.goal?.type || previousInputs.goal || 'fat_loss')
  const [pace, setPace] = useState(S?.goal?.pace || previousInputs.pace || 'moderate')
  const [activityLevel, setActivityLevel] = useState(S?.goal?.activityLevel || previousInputs.activityLevel || 'moderate')
  const [trainingDays, setTrainingDays] = useState(previousInputs.trainingDays || 4)
  const [experience, setExperience] = useState(S?.goal?.experience || previousInputs.experience || 'intermediate')
  const [equipment, setEquipment] = useState(previousInputs.equipment || 'gym')
  const [dietPreference, setDietPreference] = useState(previousInputs.dietPreference || 'balanced')
  const existingTraining = hasExistingTrainingPlan(S)
  const [useSuggestedWorkouts, setUseSuggestedWorkouts] = useState(() => !hasExistingTrainingPlan(S))
  const recommendedFocus = useMemo(
    () => getRecommendedFocus({ goal, activityLevel, trainingDays, experience, useSuggestedWorkouts }),
    [goal, activityLevel, trainingDays, experience, useSuggestedWorkouts]
  )
  const [focusMode, setFocusMode] = useState(() => S?.focusMode || S?.profile?.focusMode || null)
  const selectedFocus = focusMode || recommendedFocus.mode
  const burnTarget = useMemo(
    () => calculateDailyBurnTarget({ activityLevel, trainingDays, goal }),
    [activityLevel, trainingDays, goal]
  )
  const [saving, setSaving] = useState(false)
  const [metricsChecked, setMetricsChecked] = useState(false)
  const [goalChecked, setGoalChecked] = useState(false)
  const weightUnit = isLb ? 'lb' : 'kg'
  const previousUnit = useRef(weightUnit)
  // Registration or another device can supply the preference after this screen mounted.
  // Convert editable drafts once, while keeping blank fields blank.
  useEffect(() => {
    const from = previousUnit.current
    if (from === weightUnit) return
    previousUnit.current = weightUnit
    setDisplayWeight(value => convertBodyWeight(value, from, weightUnit))
    setDisplayTargetWeight(value => convertBodyWeight(value, from, weightUnit))
    const imperial = heightInFeet(heightCm)
    setHeightFeet(imperial.feet); setHeightInches(imperial.inches)
  }, [weightUnit, heightCm])
  const minWeight = toDisplayWeight(30), maxWeight = toDisplayWeight(300)
  const validAge = inRange(age, 18, 99)
  const validHeight = inRange(heightCm, 120, 230) && (!isLb || (Number.isInteger(heightFeet) && inRange(heightInches, 0, 11.99)))
  const validWeight = inRange(displayWeight, minWeight, maxWeight)
  const validTarget = goal === 'maintenance' || inRange(displayTargetWeight, minWeight, maxWeight)
  const metricsError = !validAge ? t('Enter your age between 18 and 99.')
    : !validHeight ? isLb ? t('Check your height in feet and inches. Inches must be less than 12.') : t('Enter your height between 120 and 230 cm.')
      : !validWeight ? t('Enter your current weight between {0} and {1} {2}.', minWeight, maxWeight, weightUnit) : ''
  const goalError = validTarget ? '' : t('Enter your target weight between {0} and {1} {2}.', minWeight, maxWeight, weightUnit)

  const leaveSetup = () => {
    if (!firstSetup) { navigate('/settings'); return }
    update(draft => { draft.onboardedAt = new Date().toISOString(); draft.setupDeferred = true })
    Promise.resolve(pushState()).catch(() => {})
    navigate('/home')
    useUI.getState().toast(t('You can personalize your plan anytime in Settings.'))
  }

  // Real-time plan calculation
  const plan = useMemo(() => {
    return generatePersonalPlan({
      age: Number(age) || 25,
      sex: sex === 'other' ? null : sex,
      heightCm: Number(heightCm) || 170,
      weightKg: Number(weightKg) || 70,
      targetWeightKg: goal === 'maintenance' ? Number(weightKg) || 70 : Number(targetWeightKg) || 70,
      goal,
      pace,
      activityLevel,
      trainingDaysPerWeek: Number(trainingDays) || 3,
      experience,
      dietPreference,
      equipment
    })
  }, [age, sex, heightCm, weightKg, targetWeightKg, goal, pace, activityLevel, trainingDays, experience, dietPreference, equipment])

  const finishOnboarding = async () => {
    if (saving) return
    if (metricsError) { setMetricsChecked(true); setStep(1); return }
    if (goalError) { setGoalChecked(true); setStep(2); return }
    setSaving(true)
    const historyEntry = createTargetHistoryEntry(plan)
    const targetHistory = Array.isArray(S?.targetHistory) ? [...S.targetHistory, historyEntry] : [historyEntry]
    let workoutsAdded = false

    update(draft => {
      setFocusModeInDraft(draft, selectedFocus)
      draft.profile = {
        ...(draft.profile || {}),
        age: Number(age),
        sex,
        heightCm: Number(heightCm),
        focusMode: selectedFocus,
        onboardedAt: new Date().toISOString()
      }
      draft.goal = {
        type: goal,
        targetWeightKg: goal === 'maintenance' ? Number(weightKg) : Number(targetWeightKg),
        pace,
        activityLevel,
        experience,
        updatedAt: new Date().toISOString()
      }
      if (displayTargetWeight != null && goal !== 'maintenance') {
        draft.targetW = Number(displayTargetWeight)
      }
      if ((!Array.isArray(draft.bodyweight) || draft.bodyweight.length === 0) && Number.isFinite(Number(displayWeight))) {
        draft.bodyweight = [{ d: todayISO(), w: Number(displayWeight) }]
      }
      draft.targetHistory = targetHistory
      draft.targets = {
        dailyCalories: plan.calories,
        dailyBurn: burnTarget,
        proteinGrams: plan.macros.proteinG,
        carbsGrams: plan.macros.carbsG,
        fatGrams: plan.macros.fatG,
        waterMl: plan.health.waterMl,
        fiberGrams: plan.health.fibreG,
        macros: {
          proteinG: plan.macros.proteinG,
          carbsG: plan.macros.carbsG,
          fatG: plan.macros.fatG
        }
      }
      draft.dailyTargets = {
        calories: plan.calories,
        burnCalories: burnTarget,
        proteinG: plan.macros.proteinG,
        carbsG: plan.macros.carbsG,
        fatG: plan.macros.fatG,
        waterMl: plan.health.waterMl,
        fibreG: plan.health.fibreG
      }
      draft.onboardedAt = new Date().toISOString()
      delete draft.setupDeferred
      workoutsAdded = applyOnboardingWorkout(draft, plan, useSuggestedWorkouts)
    })

    try {
      await pushState()
      useUI.getState().toast(workoutsAdded ? t('Your workouts and daily targets are ready.') : t('Your daily targets are ready.'))
      navigate('/home')
    } catch {
      useUI.getState().toast(t('Your setup is saved on this device.'))
      navigate('/home')
    } finally { setSaving(false) }
  }

  const nextStep = () => {
    if (step === 1) { setMetricsChecked(true); if (metricsError) return }
    if (step === 2) { setGoalChecked(true); if (goalError) return }
    setStep(value => Math.min(5, value + 1))
  }
  const error = step === 1 && metricsChecked ? metricsError : step === 2 && goalChecked ? goalError : ''
  const metricInvalid = valid => metricsChecked && !valid ? 'true' : undefined
  const metricDescription = valid => metricsChecked && !valid ? 'setup-metrics-error' : undefined

  return <div className="narrow s-onboarding mov-setup">
    <div className="setup-map" aria-hidden="true"><BackgroundTexture /></div>
    <header className="setup-header">
      <div className="setup-topline"><Brand /><span className="setup-step-count">{t('Step {0} of 5', step)}</span></div>
      <div className="setup-progress" role="progressbar" aria-label={t('Plan setup')} aria-valuemin={1} aria-valuemax={5} aria-valuenow={step}>
        {[1, 2, 3, 4, 5].map(s => <span key={s} className={s <= step ? 'done' : ''} />)}
      </div>
      <div className="setup-intro" key={step}>
        <p className="setup-eyebrow">{[t('Your starting point'), t('Your direction'), t('Your routine'), t('Made for you'), t('Your focus')][step - 1]}</p>
        <h1 ref={headingRef} tabIndex={-1}>{[t('Built around you.'), t('What moves you?'), t('Find your rhythm.'), t('You’re ready to move.'), t('Pick your path.')][step - 1]}</h1>
        <p className="setup-description">{[t('A few details for your daily targets.'), t('Choose the goal that feels right for you.'), t('A plan that fits your everyday life.'), t('A starting point you can adjust anytime.'), t('Start with what matters most. You can switch anytime.')][step - 1]}</p>
      </div>
    </header>

    <div className="setup-content" key={step}>
      {step === 1 && <>
        <MeasurementUnitChoice compact value={weightUnit} onChange={unit => void rememberWeightUnit(unit)} />
        <div className="setup-field-heading"><span>{t('Sex for calorie estimates')}</span><small>{t('Optional')}</small></div>
        <div className="setup-sex-choices" role="group" aria-label={t('Sex used for calorie estimates (optional)')}>
          {[
            { value: 'male', label: t('Male'), icon: 'male' },
            { value: 'female', label: t('Female'), icon: 'female' },
            { value: 'other', label: t('Skip'), icon: 'person' }
          ].map(option => <button type="button" key={option.value} className={'setup-sex-card' + (sex === option.value ? ' selected' : '')} aria-pressed={sex === option.value} onClick={() => setSex(option.value)}>
            <span className="setup-sex-icon"><Icon name={option.icon} /></span><b>{option.label}</b><span className="setup-selection-dot" aria-hidden="true"><Icon name="check" /></span>
          </button>)}
        </div>

        <WeightPicker label={t('Current weight')} value={displayWeight} onChange={setDisplayWeight} unit={weightUnit} min={minWeight} max={maxWeight} ariaLabel={t('Current weight in {0}', weightUnit)} invalid={metricsChecked && !validWeight} describedBy={metricDescription(validWeight)} />

        <div className="setup-metrics-grid">
          <label className={'setup-number-card' + (metricsChecked && !validAge ? ' is-invalid' : '')}>
            <span>{t('Age')}</span><div><NumberField fit nullable decimal={false} value={age} aria-label={t('Age')} aria-required="true" aria-invalid={metricInvalid(validAge)} aria-describedby={metricDescription(validAge)} onChange={setAge} /><small>{t('years')}</small></div>
          </label>
          <div className={'setup-number-card' + (metricsChecked && !validHeight ? ' is-invalid' : '')}>
            <span>{t('Height')}</span>
            {isLb ? <div className="setup-height-imperial">
              <label><NumberField fit nullable decimal={false} value={heightFeet} aria-label={t('Height in feet')} aria-required="true" aria-invalid={metricInvalid(validHeight)} aria-describedby={metricDescription(validHeight)} onChange={value => { setHeightFeet(value); setHeightCm(heightInCm(value, heightInches)) }} /><small>ft</small></label>
              <label><NumberField fit nullable value={heightInches} aria-label={t('Height in inches')} aria-required="true" aria-invalid={metricInvalid(validHeight)} aria-describedby={metricDescription(validHeight)} onChange={value => { setHeightInches(value); setHeightCm(heightInCm(heightFeet, value)) }} /><small>in</small></label>
            </div> : <label className="setup-height-metric"><NumberField fit nullable value={heightCm} aria-label={t('Height in centimetres')} aria-required="true" aria-invalid={metricInvalid(validHeight)} aria-describedby={metricDescription(validHeight)} onChange={setHeightCm} /><small>cm</small></label>}
          </div>
        </div>
      </>}

      {step === 2 && <>
        <div className="setup-option-list" role="group" aria-label={t('Your Fitness Goal')}>
          {[
            { value: 'fat_loss', label: t('Fat Loss'), detail: t('Build habits. Feel lighter.'), icon: 'flame' },
            { value: 'muscle_gain', label: t('Muscle Gain'), detail: t('Get stronger, one session at a time.'), icon: 'dumbbell' },
            { value: 'maintenance', label: t('Maintain'), detail: t('Keep your balance. Keep moving.'), icon: 'target' }
          ].map(option => <SetupOption key={option.value} option={option} selected={goal === option.value} onClick={() => setGoal(option.value)} />)}
        </div>
        {goal !== 'maintenance' ? <>
          <WeightPicker label={t('Target weight')} value={displayTargetWeight} onChange={setDisplayTargetWeight} unit={weightUnit} min={minWeight} max={maxWeight} ariaLabel={t('Target weight in {0}', weightUnit)} invalid={goalChecked && !validTarget} describedBy={goalChecked && !validTarget ? 'setup-goal-error' : undefined} />
          <div className="setup-option-panel"><div className="setup-field-heading"><span>{t('Your pace')}</span></div>
            <Segmented value={pace} onChange={setPace} options={[{ value: 'relaxed', label: t('Relaxed') }, { value: 'moderate', label: t('Moderate') }, { value: 'aggressive', label: t('Faster') }]} />
          </div>
        </> : <div className="setup-note"><Icon name="heart" /><p>{t('We’ll use your current weight to estimate your daily targets.')}</p></div>}
      </>}

      {step === 3 && <>
        <div className="setup-field-heading"><span>{t('Activity outside the gym')}</span></div>
        <div className="setup-option-list" role="group" aria-label={t('Daily Activity Outside the Gym')}>
          {[
            { value: 'sedentary', label: t('Mostly sitting'), detail: t('Desk work, study or driving'), icon: 'chair' },
            { value: 'moderate', label: t('On my feet'), detail: t('Walking and moving through the day'), icon: 'figureWalk' },
            { value: 'active', label: t('Very active'), detail: t('Physical work or lots of daily movement'), icon: 'figureRun' }
          ].map(option => <SetupOption key={option.value} option={option} selected={activityLevel === option.value} onClick={() => setActivityLevel(option.value)} />)}
        </div>
        <div className="setup-days-card"><div className="setup-days-heading"><span>{t('Training days per week')}</span><strong>{trainingDays}<small>×</small></strong></div>
          <Segmented value={trainingDays} onChange={v => setTrainingDays(Number(v))} options={[2, 3, 4, 5].map(value => ({ value, label: t('{0} days', value) }))} />
        </div>
        <div className="setup-option-panel"><div className="setup-field-heading"><span>{t('Your experience')}</span></div>
          <Segmented value={experience} onChange={setExperience} options={[{ value: 'beginner', label: t('Beginner') }, { value: 'intermediate', label: t('Intermediate') }, { value: 'advanced', label: t('Advanced') }]} />
        </div>
        <details className="setup-more-options"><summary>{t('Equipment & nutrition')}<span>{t('Personalize')}<Icon name="chevronDown" /></span></summary>
          <div className="setup-option-panel"><div className="setup-field-heading"><span>{t('Available Equipment')}</span></div>
            <Segmented value={equipment} onChange={setEquipment} options={[{ value: 'gym', label: t('Full Gym') }, { value: 'dumbbells', label: t('Dumbbells') }, { value: 'bodyweight', label: t('Bodyweight') }]} />
          </div>
          <div className="setup-option-panel"><div className="setup-field-heading"><span>{t('Eating preference')}</span></div>
            <Segmented value={dietPreference} onChange={setDietPreference} options={[{ value: 'balanced', label: t('Balanced') }, { value: 'high_protein', label: t('High Protein') }, { value: 'low_carb', label: t('Low Carb') }]} />
          </div>
        </details>
      </>}

      {step === 4 && <>
        <div className="setup-ready-card"><span className="setup-ready-icon"><Icon name="check" /></span><div><b>{t('Your plan, your pace.')}</b><p>{t('Start small. Build from here.')}</p></div></div>
        <section className="setup-workout-card" aria-label={t('Your workout plan')}>
          <div className="setup-field-heading"><span><Icon name="dumbbell" />{t('Your workout plan')}</span><small>{t('{0} days per week', plan.workout.daysPerWeek)}</small></div>
          {existingTraining ? <p className="setup-existing-plan">{t('Your existing routines and schedule will stay as they are.')}</p> : <>
            <h2>{plan.workout.name}</h2><p>{plan.workout.description}</p>
            <div className="setup-workout-toggle"><div><b>{t('Add suggested workouts')}</b><p>{useSuggestedWorkouts ? t('Exercises and sets, ready to go.') : t('Choose your own exercises.')}</p></div><Switch checked={useSuggestedWorkouts} onChange={setUseSuggestedWorkouts} aria-label={t('Add suggested workouts')} /></div>
          </>}
        </section>
        <section className="setup-target-card" aria-label={t('Daily nutrition targets')}>
          <div className="setup-field-heading"><span>{t('Daily calorie target')}</span><small>{t('Estimate')}</small></div>
          <div className="setup-calorie-number">{plan.calories.toLocaleString()}<span>kcal</span></div>
          <div className="setup-macros">{[
            { label: t('Protein'), value: plan.macros.proteinG, tone: 'protein' },
            { label: t('Carbs'), value: plan.macros.carbsG, tone: 'carbs' },
            { label: t('Fat'), value: plan.macros.fatG, tone: 'fat' }
          ].map(macro => <div key={macro.tone} className={macro.tone}><span>{macro.label}</span><b>{macro.value}<small>g</small></b></div>)}</div>
        </section>
        <details className="setup-more-options"><summary>{t('How your targets add up')}<Icon name="chevronDown" /></summary>
          <dl className="setup-target-details">
            <div><dt>{t('BMR')}</dt><dd>{plan.bmr.toLocaleString()} kcal</dd></div>
            <div><dt>{t('Maintenance (TDEE)')}</dt><dd>{plan.tdee.toLocaleString()} kcal</dd></div>
            <div><dt>{t('Daily Burn Target')}</dt><dd>{burnTarget.toLocaleString()} kcal</dd></div>
            <div><dt>{t('Water Target')}</dt><dd>{(plan.health.waterMl / 1000).toFixed(1)} L</dd></div>
            <div><dt>{t('Fibre Target')}</dt><dd>{plan.health.fibreG} g</dd></div>
          </dl>
          {plan.estimatedWeeks > 0 && <p className="setup-timeline">{t('Projected Timeline: ~{0} weeks to reach {1} {2}', plan.estimatedWeeks, displayTargetWeight, weightUnit)}</p>}
          <p className="setup-timeline">{t('These are estimates. You can adjust your targets anytime.')}</p>
        </details>
      </>}

      {step === 5 && <>
        <div className="setup-ready-card">
          <span className="setup-ready-icon"><Icon name="flame" /></span>
          <div>
            <b>{t('Your daily target: {0} kcal', plan.calories.toLocaleString())}</b>
            <p>{t(recommendedFocus.reason)}</p>
          </div>
        </div>
        <div className="setup-option-list setup-focus-list" role="group" aria-label={t('Choose your focus')}>
          {FOCUS_MODES.map(option => {
            const isRecommended = option.value === recommendedFocus.mode
            return (
              <div key={option.value} className={'setup-focus-item' + (isRecommended ? ' is-recommended' : '')}>
                {isRecommended && (
                  <div className="setup-recommended-badge">
                    <Icon name="arrowDown" />
                    <span>{t('Recommended for you')}</span>
                  </div>
                )}
                <SetupOption
                  option={{
                    value: option.value,
                    label: t(option.label),
                    detail: t(option.detail),
                    icon: option.icon
                  }}
                  selected={selectedFocus === option.value}
                  onClick={() => setFocusMode(option.value)}
                />
              </div>
            )
          })}
        </div>
      </>}
    </div>

    <footer className="setup-footer">
      {error && <div id={step === 1 ? 'setup-metrics-error' : 'setup-goal-error'} role="alert" className="setup-error"><Icon name="xmark" /><span>{error}</span></div>}
      <div className="setup-footer-buttons">
        {step > 1 && <Button variant="secondary" onClick={() => setStep(value => value - 1)} disabled={saving}>{step === 4 ? t('Adjust') : t('Back')}</Button>}
        <Button variant="primary" trailingIcon={step === 5 ? 'check' : 'arrowRight'} onClick={step === 5 ? finishOnboarding : nextStep} disabled={saving}>
          {step === 5 ? (saving ? t('Saving…') : t('Let’s get moving')) : step === 4 ? t('Choose my focus') : step === 3 ? t('Review my plan') : t('Continue')}
        </Button>
      </div>
      <Button className="setup-skip" variant="ghost" onClick={leaveSetup} disabled={saving}>{firstSetup ? t('Skip setup and start logging') : t('Back to Settings')}</Button>
    </footer>
  </div>
}

function SetupOption({ option, selected, onClick }) {
  return <button type="button" className={'setup-option' + (selected ? ' selected' : '')} aria-label={option.label} aria-describedby={'setup-option-' + option.value} aria-pressed={selected} onClick={onClick}>
    <span className="setup-option-icon"><Icon name={option.icon} /></span>
    <span className="setup-option-copy"><b>{option.label}</b><small id={'setup-option-' + option.value}>{option.detail}</small></span>
    <span className="setup-option-check" aria-hidden="true">{selected && <Icon name="check" />}</span>
  </button>
}
