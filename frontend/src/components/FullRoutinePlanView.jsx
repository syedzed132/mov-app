import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useNutrition } from '../store/useNutrition.js'
import { effectiveRoutines } from '../lib/history.js'
import { DAYS, fmtDate, isoOf, todayISO } from '../lib/format.js'
import { dateLocale, t } from '../lib/i18n.js'
import { computeDayTotals } from '../lib/nutrition/totals.js'
import { getActiveTargets } from '../lib/targets.js'
import { getDailyBurnTarget, getDayBurnSummary } from '../lib/focus-mode.js'
import { Brand } from './Brand.jsx'
import { PlayerBadge } from './PlayerProgress.jsx'
import { Segmented } from './ui.jsx'
import Icon from './Icon.jsx'
import {
  CalorieBurnCard,
  DayTrainingCard,
  LogSportButton,
  MealRowsList
} from './FocusModeCards.jsx'

function parseISODate(iso) {
  const [y, m, d] = String(iso || todayISO()).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export default function FullRoutinePlanView({ onEditRoutines }) {
  const S = useStore(s => s.S)
  const nutritionDays = useNutrition(s => s.days)
  const today = todayISO()
  const [scope, setScope] = useState('day')
  const [selectedDate, setSelectedDate] = useState(today)

  const targets = getActiveTargets(S)
  const burnTarget = getDailyBurnTarget(S)

  const dayNutrition = nutritionDays[selectedDate] || { entries: [], waterMl: 0 }
  const dayTotals = computeDayTotals(dayNutrition.entries || [])
  const eatenKcal = Math.round(dayTotals.calories || 0)
  const dayBurn = getDayBurnSummary(S, selectedDate)
  const netBudget = targets.dailyCalories + dayBurn.totalBurn
  const netLeft = netBudget - eatenKcal
  const netPct = Math.min(100, Math.round((eatenKcal / Math.max(1, netBudget)) * 100))

  const shiftDay = delta => {
    const d = parseISODate(selectedDate)
    d.setDate(d.getDate() + delta)
    setSelectedDate(isoOf(d))
  }

  const shiftMonth = delta => {
    const d = parseISODate(selectedDate)
    d.setMonth(d.getMonth() + delta, 1)
    setSelectedDate(isoOf(d))
  }

  // Monday-based week containing selectedDate
  const weekData = useMemo(() => {
    const d = parseISODate(selectedDate)
    const dow = d.getDay()
    const mondayOffset = dow === 0 ? -6 : 1 - dow
    const monday = new Date(d)
    monday.setDate(d.getDate() + mondayOffset)

    const label = `${monday.getDate()} ${monday.toLocaleDateString(dateLocale(), { month: 'short' })}`
    const rows = []
    for (let i = 0; i < 7; i++) {
      const cur = new Date(monday)
      cur.setDate(monday.getDate() + i)
      const iso = isoOf(cur)
      const nDay = nutritionDays[iso] || { entries: [] }
      const nTotals = computeDayTotals(nDay.entries || [])
      const eaten = Math.round(nTotals.calories || 0)
      const burn = getDayBurnSummary(S, iso).totalBurn
      const routines = effectiveRoutines(S, iso)
      const routineName = routines.filter(r => (r.ex || []).length > 0).map(r => r.name).join(' + ')

      rows.push({
        iso,
        weekday: t(DAYS[cur.getDay()]),
        dayNum: cur.getDate(),
        routineName: routineName || t('Rest'),
        eatenKcal: eaten,
        burnKcal: burn,
        eatenPct: Math.min(100, Math.round((eaten / Math.max(1, targets.dailyCalories)) * 100)),
        burnPct: Math.min(100, Math.round((burn / Math.max(1, burnTarget)) * 100))
      })
    }
    return { label, rows }
  }, [selectedDate, nutritionDays, S, targets.dailyCalories, burnTarget])

  // Month grid for selectedDate's month
  const monthData = useMemo(() => {
    const d = parseISODate(selectedDate)
    const year = d.getFullYear()
    const month = d.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const leadingBlanks = (firstDay.getDay() + 6) % 7 // Monday = 0
    const title = firstDay.toLocaleDateString(dateLocale(), { month: 'long', year: 'numeric' })

    const cells = []
    for (let i = 0; i < leadingBlanks; i++) {
      cells.push({ blank: true, key: `blank-${i}` })
    }
    for (let dayNum = 1; dayNum <= lastDay.getDate(); dayNum++) {
      const cur = new Date(year, month, dayNum)
      const iso = isoOf(cur)
      const hasFood = (nutritionDays[iso]?.entries || []).length > 0
      const burn = getDayBurnSummary(S, iso)
      const hasBurn = burn.totalBurn > 0
      cells.push({
        blank: false,
        key: iso,
        iso,
        dayNum,
        hasFood,
        hasBurn
      })
    }
    return { title, cells }
  }, [selectedDate, nutritionDays, S])

  return (
    <div className="simple-home home-refined fmode-page">
      <div className="home-app-bar">
        <Brand />
        <PlayerBadge />
      </div>

      <header className="simple-home-header">
        <div>
          <p>{t('Food and training, one plan')}</p>
          <h1 className="home-plan-title">
            {t('Plan')}<span>.</span>
          </h1>
        </div>
      </header>

      <Segmented
        className="fmode-plan-seg"
        value={scope}
        onChange={setScope}
        options={[
          { value: 'day', label: t('Day') },
          { value: 'week', label: t('Week') },
          { value: 'month', label: t('Month') }
        ]}
      />

      {scope === 'day' && (
        <>
          <div className="fmode-date-nav">
            <button
              type="button"
              className="iconbtn"
              aria-label={t('Previous day')}
              onClick={() => shiftDay(-1)}
            >
              <Icon name="chevronLeft" />
            </button>
            <div className="fmode-date-nav-center">
              <strong>
                {selectedDate === today
                  ? t('Today')
                  : fmtDate(selectedDate, { month: 'short', day: 'numeric' })}
              </strong>
              <small>{fmtDate(selectedDate, { weekday: 'long', month: 'short', day: 'numeric' })}</small>
            </div>
            <button
              type="button"
              className="iconbtn"
              aria-label={t('Next day')}
              onClick={() => shiftDay(1)}
            >
              <Icon name="chevronRight" />
            </button>
          </div>

          <section className="fmode-card fmode-cal-card" aria-label={t('Daily net calories')}>
            <div className="fmode-cal-hero">
              <strong>{Math.abs(netLeft).toLocaleString()}</strong>
              <span>{netLeft >= 0 ? t('kcal left') : t('kcal over')}</span>
            </div>
            <div className="fmode-track" role="progressbar" aria-valuemin={0} aria-valuemax={netBudget} aria-valuenow={Math.min(eatenKcal, netBudget)}>
              <span style={{ width: `${netPct}%` }} />
            </div>
            <div className="fmode-row-between fmode-card-foot">
              <span>{t('{0} eaten', eatenKcal.toLocaleString())}</span>
              <span>
                {t(
                  'Target {0} + {1} burned',
                  targets.dailyCalories.toLocaleString(),
                  dayBurn.totalBurn.toLocaleString()
                )}
              </span>
            </div>
          </section>

          <div className="fmode-section-head">
            <h3>{t('Meals')}</h3>
          </div>
          <MealRowsList date={selectedDate} entries={dayNutrition.entries || []} />

          <DayTrainingCard
            S={S}
            date={selectedDate}
            eyebrowLabel={t('Training')}
            onEditPlan={onEditRoutines}
          />

          <CalorieBurnCard S={S} date={selectedDate} showEntries />
          <LogSportButton />
        </>
      )}

      {scope === 'week' && (
        <>
          <div className="fmode-date-nav">
            <button
              type="button"
              className="iconbtn"
              aria-label={t('Previous week')}
              onClick={() => shiftDay(-7)}
            >
              <Icon name="chevronLeft" />
            </button>
            <div className="fmode-date-nav-center">
              <strong>{t('Week of {0}', weekData.label)}</strong>
            </div>
            <button
              type="button"
              className="iconbtn"
              aria-label={t('Next week')}
              onClick={() => shiftDay(7)}
            >
              <Icon name="chevronRight" />
            </button>
          </div>

          <div className="fmode-week-list">
            {weekData.rows.map(row => (
              <button
                key={row.iso}
                type="button"
                className={'fmode-week-row' + (row.iso === selectedDate ? ' selected' : '')}
                onClick={() => {
                  setSelectedDate(row.iso)
                  setScope('day')
                }}
              >
                <div className="fmode-week-daycol">
                  <span>{row.weekday}</span>
                  <strong>{row.dayNum}</strong>
                </div>
                <div className="fmode-week-midcol">
                  <div className="fmode-week-routine">{row.routineName}</div>
                  <div className="fmode-week-bars">
                    <div className="fmode-track sm">
                      <span style={{ width: `${row.eatenPct}%` }} />
                    </div>
                    <div className="fmode-track burn sm">
                      <span style={{ width: `${row.burnPct}%` }} />
                    </div>
                  </div>
                </div>
                <div className="fmode-week-kcalcol">
                  <strong className="eaten">
                    {row.eatenKcal > 0 ? `${row.eatenKcal.toLocaleString()} kcal` : '—'}
                  </strong>
                  <small className="burned">
                    {row.burnKcal > 0 ? `-${row.burnKcal.toLocaleString()}` : '0'}
                  </small>
                </div>
              </button>
            ))}
          </div>

          <div className="fmode-legend">
            <span>
              <i className="dot eaten" />
              {t('Eaten (target {0})', targets.dailyCalories.toLocaleString())}
            </span>
            <span>
              <i className="dot burned" />
              {t('Burned (target {0})', burnTarget.toLocaleString())}
            </span>
            <span className="hint">{t('Tap a day to open it')}</span>
          </div>
        </>
      )}

      {scope === 'month' && (
        <>
          <div className="fmode-date-nav">
            <button
              type="button"
              className="iconbtn"
              aria-label={t('Previous month')}
              onClick={() => shiftMonth(-1)}
            >
              <Icon name="chevronLeft" />
            </button>
            <div className="fmode-date-nav-center">
              <strong>{monthData.title}</strong>
            </div>
            <button
              type="button"
              className="iconbtn"
              aria-label={t('Next month')}
              onClick={() => shiftMonth(1)}
            >
              <Icon name="chevronRight" />
            </button>
          </div>

          <section className="fmode-card fmode-month-card" aria-label={monthData.title}>
            <div className="fmode-month-weekdays">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <div className="fmode-month-grid">
              {monthData.cells.map(cell =>
                cell.blank ? (
                  <div key={cell.key} className="fmode-month-cell blank" aria-hidden="true" />
                ) : (
                  <button
                    key={cell.key}
                    type="button"
                    className={
                      'fmode-month-cell' +
                      (cell.iso === selectedDate ? ' selected' : '') +
                      (cell.iso === today ? ' today' : '')
                    }
                    onClick={() => {
                      setSelectedDate(cell.iso)
                      setScope('day')
                    }}
                  >
                    <span>{cell.dayNum}</span>
                    <span className="fmode-month-dots">
                      {cell.hasFood && <i className="dot eaten" />}
                      {cell.hasBurn && <i className="dot burned" />}
                    </span>
                  </button>
                )
              )}
            </div>

            <div className="fmode-legend" style={{ marginTop: 14 }}>
              <span>
                <i className="dot eaten" />
                {t('Food logged')}
              </span>
              <span>
                <i className="dot burned" />
                {t('Trained or played')}
              </span>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
