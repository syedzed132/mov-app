import React, { useState, useMemo } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { todayISO } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import { Button, SearchField, Segmented, TextField, NumberField } from './ui.jsx'
import { quickExerciseSheet } from '../sheets.jsx'
import {
  ACTIVITY_CATEGORIES,
  INTENSITY_LEVELS,
  getAllActivities,
  calculateActivityCalories,
  calculateActivityXp
} from '../lib/activities.js'
import './ActivityLogSheet.css'

const STAT_OPTIONS = [
  { value: 'agility', label: 'Agility', met: 7.0, icon: 'tennis' },
  { value: 'endurance', label: 'Endurance', met: 8.5, icon: 'figureRun' },
  { value: 'strength', label: 'Strength', met: 7.5, icon: 'dumbbell' },
  { value: 'vitality', label: 'Vitality', met: 3.0, icon: 'flame' },
  { value: 'discipline', label: 'Discipline', met: 5.0, icon: 'shield' }
]

export function ActivityLogSheet({ close, initialCategory = 'all' }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)

  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(initialCategory)
  const [selectedActivity, setSelectedActivity] = useState(null)
  const [creatingCustom, setCreatingCustom] = useState(false)

  // Custom activity form state
  const [customName, setCustomName] = useState('')
  const [customCategory, setCustomCategory] = useState('ball')
  const [customStat, setCustomStat] = useState('agility')

  // Session form state
  const [durationMin, setDurationMin] = useState(45)
  const [intensity, setIntensity] = useState('moderate')
  const [date, setDate] = useState(todayISO())
  const [notes, setNotes] = useState('')

  // Determine user weight in kg for realistic MET calorie formula
  const userWeightKg = useMemo(() => {
    const latestBw = (S.bodyweight || []).at(-1)?.w || (S.bodyweight || []).at(-1)?.bw
    if (latestBw && latestBw > 30) {
      return S.unit === 'lb' ? latestBw * 0.453592 : latestBw
    }
    return 75
  }, [S.bodyweight, S.unit])

  const allActivities = useMemo(
    () => getAllActivities(S.customActivities),
    [S.customActivities]
  )

  // Filter activities
  const filteredActivities = useMemo(() => {
    let list = allActivities
    if (selectedCategory !== 'all') {
      list = list.filter(a => a.category === selectedCategory)
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        (a.desc && a.desc.toLowerCase().includes(q))
      )
    }
    return list
  }, [allActivities, selectedCategory, search])

  const handleSelectActivity = act => {
    setCreatingCustom(false)
    setSelectedActivity(act)
    setDurationMin(act.defaultDur || 45)
  }

  const handleStartCustom = () => {
    setCustomName(search.trim())
    setCustomCategory(selectedCategory !== 'all' ? selectedCategory : 'ball')
    setCreatingCustom(true)
    setSelectedActivity(null)
  }

  const handleCreateCustomActivity = () => {
    const name = customName.trim()
    if (!name) {
      toast(t('Enter an activity name'))
      return
    }
    const statMeta = STAT_OPTIONS.find(o => o.value === customStat) || STAT_OPTIONS[0]
    const catMeta = ACTIVITY_CATEGORIES.find(c => c.id === customCategory) || ACTIVITY_CATEGORIES[2]
    const customAct = {
      id: 'custom_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + Date.now().toString(36),
      name,
      category: customCategory,
      met: statMeta.met,
      stat: customStat,
      secondaryStat: customStat === 'agility' ? 'endurance' : 'agility',
      icon: catMeta.icon || statMeta.icon || 'trophy',
      defaultDur: Number(durationMin) || 45,
      desc: t('Custom {0} activity · {1} focus', catMeta.name, statMeta.label),
      isCustom: true
    }

    update(s => {
      if (!Array.isArray(s.customActivities)) s.customActivities = []
      const exists = s.customActivities.some(a => a.name.toLowerCase() === name.toLowerCase())
      if (!exists) s.customActivities.unshift(customAct)
    })

    setCreatingCustom(false)
    setSelectedActivity(customAct)
  }

  // Live computed values
  const estimatedCalories = useMemo(() => {
    if (!selectedActivity) return 0
    return calculateActivityCalories(selectedActivity, durationMin, userWeightKg, intensity)
  }, [selectedActivity, durationMin, userWeightKg, intensity])

  const earnedXp = useMemo(() => {
    if (!selectedActivity) return 0
    return calculateActivityXp(selectedActivity, durationMin, intensity)
  }, [selectedActivity, durationMin, intensity])

  // Save activity (optionally stay open to log another)
  const handleLogActivity = (addAnother = false) => {
    if (!selectedActivity) return

    const newActivity = {
      id: 'act_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      d: date,
      activityId: selectedActivity.id,
      name: selectedActivity.name,
      category: selectedActivity.category,
      icon: selectedActivity.icon || 'trophy',
      durationMin: Number(durationMin) || 30,
      intensity,
      calories: estimatedCalories,
      stat: selectedActivity.stat,
      secondaryStat: selectedActivity.secondaryStat,
      xpEarned: earnedXp,
      notes: notes.trim(),
      createdAt: Date.now()
    }

    update(s => {
      if (!Array.isArray(s.activities)) s.activities = []
      s.activities.unshift(newActivity)
    })

    if (navigator.vibrate) {
      try { navigator.vibrate([18, 35, 18]) } catch {}
    }

    const statName = selectedActivity.stat.toUpperCase()
    toast(t('{0} logged · +{1} XP ({2})', selectedActivity.name, earnedXp, statName))

    if (addAnother) {
      setSelectedActivity(null)
      setNotes('')
      setSearch('')
    } else {
      close?.()
    }
  }

  const handleOpenQuickExercise = () => {
    close?.()
    setTimeout(() => quickExerciseSheet(), 60)
  }

  const DURATION_PRESETS = [15, 20, 30, 45, 60, 90, 120]

  return (
    <div className="activity-log-sheet" aria-label={t('Log Sport or Activity')}>
      {/* Native MOV Sheet Header */}
      <div className="simple-sheet-header activity-sheet-top">
        <div className="row" style={{ gap: 10, alignItems: 'center', minWidth: 0 }}>
          {(selectedActivity || creatingCustom) ? (
            <button
              type="button"
              className="iconbtn"
              onClick={() => { setSelectedActivity(null); setCreatingCustom(false) }}
              aria-label={t('Back to activities')}
            >
              <Icon name="chevronLeft" />
            </button>
          ) : (
            <span className="daily-icon">
              <Icon name="trophy" />
            </span>
          )}
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0 }}>
              {creatingCustom
                ? t('Add custom activity')
                : selectedActivity
                  ? selectedActivity.name
                  : t('Sports & Activities')}
            </h3>
          </div>
        </div>
        <button type="button" className="iconbtn" onClick={close} aria-label={t('Close')}>
          <Icon name="xmark" />
        </button>
      </div>

      {/* Screen 1: Browse & Search Activities */}
      {!selectedActivity && !creatingCustom && (
        <div className="activity-browse-view">
          <div className="meal-entry-intro" style={{ marginBottom: 4 }}>
            <p className="muted" style={{ margin: 0 }}>
              {t('Log padel, cricket, pickleball, tennis, swimming, sauna or any sport. Calculates burned calories from your body weight and boosts your character stats.')}
            </p>
          </div>

          <SearchField
            placeholder={t('Search cricket, padel, swimming, sauna...')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onClear={() => setSearch('')}
            aria-label={t('Search activities')}
          />

          {/* Quick Action Strip: Add Custom Activity OR Log Gym Exercise */}
          <div className="activity-quick-actions">
            <button type="button" className="activity-action-pill" onClick={handleStartCustom}>
              <span className="lrow-i"><Icon name="plus" /></span>
              <div className="grow">
                <b>{search.trim() ? t('Add "{0}"', search.trim()) : t('Custom activity')}</b>
                <small>{t('Any sport or class')}</small>
              </div>
              <Icon name="chevronRight" className="chev" />
            </button>
            <button type="button" className="activity-action-pill" onClick={handleOpenQuickExercise}>
              <span className="lrow-i"><Icon name="dumbbell" /></span>
              <div className="grow">
                <b>{t('Log an exercise')}</b>
                <small>{t('Weights, sets & reps')}</small>
              </div>
              <Icon name="chevronRight" className="chev" />
            </button>
          </div>

          {/* Category Filter Chips (Native .chips/.chip) */}
          <div className="chips activity-chips-scroll" role="tablist">
            {ACTIVITY_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={selectedCategory === cat.id}
                className={'chip nocap' + (selectedCategory === cat.id ? ' on' : '')}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.icon && <Icon name={cat.icon} style={{ width: 13, height: 13 }} />}
                <span>{t(cat.name)}</span>
              </button>
            ))}
          </div>

          {/* Native MOV List Rows */}
          <div className="list activity-list-scroll">
            {filteredActivities.map(act => (
              <div
                key={act.id}
                className="item activity-list-item"
                role="button"
                tabIndex={0}
                onClick={() => handleSelectActivity(act)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleSelectActivity(act) }}
              >
                <span className="lrow-i activity-row-icon">
                  <Icon name={act.icon || 'trophy'} />
                </span>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="tt">{act.name}</div>
                  <div className="ss">
                    ~{act.defaultDur} min · {act.met} MET
                  </div>
                </div>
                <span className={`tag activity-stat-badge stat-${act.stat}`}>
                  {act.stat.toUpperCase()}
                </span>
                <Icon name="chevronRight" className="chev" />
              </div>
            ))}

            {filteredActivities.length === 0 && (
              <div className="empty" style={{ padding: '20px 12px' }}>
                <div className="muted small" style={{ marginBottom: 10 }}>
                  {t('No matching sport found for "{0}".', search)}
                </div>
                <Button size="sm" variant="primary" icon="plus" onClick={handleStartCustom}>
                  {t('Create "{0}"', search.trim() || t('Custom activity'))}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Screen 1B: Create Custom Activity */}
      {creatingCustom && (
        <div className="activity-config-view">
          <div className="card" style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div className="sect-h" style={{ marginBottom: 6 }}>{t('Activity name')}</div>
              <TextField
                placeholder={t('e.g. Indoor Cricket, Padel Doubles, Fencing')}
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                autoFocus
              />
            </div>

            <div>
              <div className="sect-h" style={{ marginBottom: 6 }}>{t('Category')}</div>
              <div className="chips">
                {ACTIVITY_CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    className={'chip nocap' + (customCategory === cat.id ? ' on' : '')}
                    onClick={() => setCustomCategory(cat.id)}
                  >
                    <Icon name={cat.icon || 'trophy'} style={{ width: 13, height: 13 }} />
                    <span>{t(cat.name)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="sect-h" style={{ marginBottom: 6 }}>{t('Primary stat boost')}</div>
              <div className="chips">
                {STAT_OPTIONS.map(st => (
                  <button
                    key={st.value}
                    type="button"
                    className={'chip nocap' + (customStat === st.value ? ' on' : '')}
                    onClick={() => setCustomStat(st.value)}
                  >
                    <Icon name={st.icon} style={{ width: 13, height: 13 }} />
                    <span>{t(st.label)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="sect-h" style={{ marginBottom: 6 }}>{t('Default duration (minutes)')}</div>
              <div className="chips">
                {DURATION_PRESETS.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    className={'chip' + (durationMin === preset ? ' on' : '')}
                    onClick={() => setDurationMin(preset)}
                  >
                    {preset}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Button variant="primary" icon="check" onClick={handleCreateCustomActivity}>
            {t('Continue to log session')}
          </Button>
        </div>
      )}

      {/* Screen 2: Activity Details & Duration Configurator */}
      {selectedActivity && (
        <div className="activity-config-view">
          {/* Selected Activity Summary Card */}
          <div className="card activity-summary-card" style={{ margin: 0 }}>
            <div className="row" style={{ gap: 12, alignItems: 'center' }}>
              <span className="daily-icon activity-hero-icon">
                <Icon name={selectedActivity.icon || 'trophy'} />
              </span>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="row" style={{ gap: 6, alignItems: 'center', marginBottom: 3 }}>
                  <span className={`tag activity-stat-badge stat-${selectedActivity.stat}`}>
                    {selectedActivity.stat.toUpperCase()}
                  </span>
                  {selectedActivity.secondaryStat && (
                    <span className="tag">+{selectedActivity.secondaryStat.toUpperCase()}</span>
                  )}
                </div>
                <p className="small muted" style={{ margin: 0, lineHeight: 1.45 }}>
                  {selectedActivity.desc}
                </p>
              </div>
            </div>

            {/* Live Studio Metrics */}
            <div className="activity-studio-metrics">
              <div className="activity-studio-metric">
                <div className="activity-studio-label">
                  <Icon name="flame" />
                  <span>{t('Burned')}</span>
                </div>
                <div className="activity-studio-val">
                  {estimatedCalories}<small> kcal</small>
                </div>
              </div>
              <div className="activity-studio-metric">
                <div className="activity-studio-label">
                  <Icon name="clock" />
                  <span>{t('Duration')}</span>
                </div>
                <div className="activity-studio-val">
                  {durationMin}<small> min</small>
                </div>
              </div>
              <div className="activity-studio-metric">
                <div className="activity-studio-label">
                  <Icon name="bolt" />
                  <span>{t('Reward')}</span>
                </div>
                <div className="activity-studio-val">
                  +{earnedXp}<small> XP</small>
                </div>
              </div>
            </div>
          </div>

          {/* Duration Selector */}
          <div className="activity-section">
            <div className="sect-h">{t('Duration')}</div>
            <div className="chips">
              {DURATION_PRESETS.map(preset => (
                <button
                  key={preset}
                  type="button"
                  className={'chip' + (durationMin === preset ? ' on' : '')}
                  onClick={() => setDurationMin(preset)}
                >
                  {preset}m
                </button>
              ))}
            </div>
            <div className="activity-stepper-row">
              <Button variant="secondary" size="sm" onClick={() => setDurationMin(d => Math.max(5, (Number(d) || 30) - 5))}>
                − 5 min
              </Button>
              <div className="activity-duration-box">
                <NumberField
                  decimal={false}
                  value={durationMin}
                  onChange={v => setDurationMin(Math.max(1, Math.min(480, v || 1)))}
                  aria-label={t('Duration in minutes')}
                />
                <span>min</span>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setDurationMin(d => Math.min(480, (Number(d) || 30) + 5))}>
                + 5 min
              </Button>
            </div>
          </div>

          {/* Intensity Selector using Native Segmented */}
          <div className="activity-section">
            <div className="sect-h">{t('Intensity')}</div>
            <Segmented
              value={intensity}
              onChange={setIntensity}
              options={INTENSITY_LEVELS.map(lvl => ({ value: lvl.id, label: t(lvl.label) }))}
            />
          </div>

          {/* Date & Notes */}
          <div className="activity-section-row">
            <div className="activity-field-col">
              <div className="sect-h">{t('Date')}</div>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="field"
                aria-label={t('Session date')}
              />
            </div>
            <div className="activity-field-col" style={{ flex: 1.8 }}>
              <div className="sect-h">{t('Notes (optional)')}</div>
              <TextField
                placeholder={t('Score, court, sets or notes...')}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                aria-label={t('Session notes')}
              />
            </div>
          </div>

          {/* Primary Log + Log & Add Another */}
          <div className="activity-submit-group">
            <Button
              variant="primary"
              icon="check"
              onClick={() => handleLogActivity(false)}
            >
              {t('Log {0} · +{1} XP', selectedActivity.name, earnedXp)}
            </Button>
            <div className="activity-secondary-actions">
              <Button
                variant="secondary"
                size="sm"
                icon="plus"
                onClick={() => handleLogActivity(true)}
              >
                {t('Save & log another activity')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon="dumbbell"
                onClick={() => {
                  handleLogActivity(false)
                  setTimeout(() => quickExerciseSheet(), 80)
                }}
              >
                {t('Save & log gym exercise')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
