import { useMemo, useState } from 'react'
import { useNutrition } from '../store/useNutrition.js'
import { DAYS, isoOf, todayISO } from '../lib/format.js'
import { dateLocale, t } from '../lib/i18n.js'
import { computeDayTotals } from '../lib/nutrition/totals.js'
import { getActiveTargets } from '../lib/targets.js'
import { getDailyBurnTarget, getDayBurnSummary, getFocusMode } from '../lib/focus-mode.js'
import { Segmented } from './ui.jsx'

function parseISO(iso) {
  const [y, m, d] = String(iso || todayISO()).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function computeFoodLoggingStats(nutritionDays) {
  const today = todayISO()
  const ym = today.slice(0, 7)
  const yr = today.slice(0, 4)

  const loggedDates = Object.entries(nutritionDays || {})
    .filter(([, data]) => Array.isArray(data?.entries) && data.entries.length > 0)
    .map(([d]) => d)
    .sort()

  const loggedSet = new Set(loggedDates)
  const totalDays = loggedDates.length
  const monthDays = loggedDates.filter(d => d.startsWith(ym)).length
  const yearDays = loggedDates.filter(d => d.startsWith(yr)).length

  // Consecutive day streak ending today or yesterday
  let streak = 0
  const cursor = parseISO(today)
  if (!loggedSet.has(isoOf(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
  }
  while (loggedSet.has(isoOf(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  return {
    totalDays,
    monthDays,
    yearDays,
    streak
  }
}

export default function FocusStatsChartCard({ S }) {
  const nutritionDays = useNutrition(s => s.days)
  const [period, setPeriod] = useState('daily')
  const focusMode = getFocusMode(S)
  const targets = getActiveTargets(S)
  const calTarget = targets.dailyCalories
  const burnTarget = getDailyBurnTarget(S)

  const chartData = useMemo(() => {
    const today = parseISO(todayISO())
    const buckets = []

    if (period === 'daily') {
      // Monday-to-Sunday of current week (or last 7 days ending today)
      const dow = today.getDay()
      const mondayOffset = dow === 0 ? -6 : 1 - dow
      const monday = new Date(today)
      monday.setDate(today.getDate() + mondayOffset)

      for (let i = 0; i < 7; i++) {
        const d = new Date(monday)
        d.setDate(monday.getDate() + i)
        const iso = isoOf(d)
        const entries = nutritionDays[iso]?.entries || []
        const eaten = Math.round(computeDayTotals(entries).calories || 0)
        const burned = getDayBurnSummary(S, iso).totalBurn
        buckets.push({
          key: iso,
          label: t(DAYS[d.getDay()]),
          eaten,
          burned
        })
      }
    } else if (period === 'weekly') {
      for (let w = 5; w >= 0; w--) {
        let sumEaten = 0
        let sumBurn = 0
        let daysCount = 0
        for (let dIdx = 0; dIdx < 7; dIdx++) {
          const d = new Date(today)
          d.setDate(today.getDate() - (w * 7 + dIdx))
          const iso = isoOf(d)
          const entries = nutritionDays[iso]?.entries || []
          const eaten = Math.round(computeDayTotals(entries).calories || 0)
          const burned = getDayBurnSummary(S, iso).totalBurn
          sumEaten += eaten
          sumBurn += burned
          daysCount++
        }
        buckets.push({
          key: `w-${w}`,
          label: w === 0 ? t('Now') : `-${w}w`,
          eaten: Math.round(sumEaten / Math.max(1, daysCount)),
          burned: Math.round(sumBurn / Math.max(1, daysCount))
        })
      }
    } else {
      for (let m = 5; m >= 0; m--) {
        const ref = new Date(today.getFullYear(), today.getMonth() - m, 1)
        const ym = isoOf(ref).slice(0, 7)
        const lbl = ref.toLocaleDateString(dateLocale(), { month: 'short' })
        const daysInMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate()
        let sumEaten = 0
        let sumBurn = 0
        for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
          const iso = `${ym}-${String(dayNum).padStart(2, '0')}`
          const entries = nutritionDays[iso]?.entries || []
          sumEaten += Math.round(computeDayTotals(entries).calories || 0)
          sumBurn += getDayBurnSummary(S, iso).totalBurn
        }
        buckets.push({
          key: ym,
          label: lbl,
          eaten: Math.round(sumEaten / Math.max(1, daysInMonth)),
          burned: Math.round(sumBurn / Math.max(1, daysInMonth))
        })
      }
    }

    const eatenBuckets = buckets.filter(b => b.eaten > 0)
    const burnBuckets = buckets.filter(b => b.burned > 0)

    const avgEaten = eatenBuckets.length
      ? Math.round(eatenBuckets.reduce((s, b) => s + b.eaten, 0) / eatenBuckets.length)
      : 0
    const avgBurned = burnBuckets.length
      ? Math.round(burnBuckets.reduce((s, b) => s + b.burned, 0) / burnBuckets.length)
      : 0

    const onTargetCount = buckets.filter(
      b => b.eaten > 0 && b.eaten <= calTarget * 1.08
    ).length
    const burnReachedCount = buckets.filter(b => b.burned >= burnTarget).length

    const maxVal = Math.max(
      focusMode === 'exercise' ? burnTarget * 1.25 : calTarget * 1.15,
      ...buckets.map(b => Math.max(b.eaten, b.burned)),
      1
    )

    return {
      buckets,
      avgEaten,
      avgBurned,
      onTargetCount,
      burnReachedCount,
      totalCount: buckets.length,
      maxVal
    }
  }, [period, nutritionDays, S, calTarget, burnTarget, focusMode])

  const cardTitle =
    focusMode === 'calories'
      ? t('Calories eaten')
      : focusMode === 'exercise'
        ? t('Calories burned')
        : t('Eaten and burned')

  const periodLabel =
    period === 'daily'
      ? t('Last 7 days')
      : period === 'weekly'
        ? t('Last 6 weeks')
        : t('Last 6 months')

  const unitWord =
    period === 'daily' ? t('days') : period === 'weekly' ? t('weeks') : t('months')

  const calTargetPct = Math.min(92, Math.max(8, Math.round((calTarget / chartData.maxVal) * 100)))
  const burnTargetPct = Math.min(92, Math.max(8, Math.round((burnTarget / chartData.maxVal) * 100)))

  return (
    <section className="card fmode-stats-chart-card" aria-label={cardTitle}>
      <div className="fmode-row-between" style={{ marginBottom: 10 }}>
        <h2 style={{ margin: 0 }}>{cardTitle}</h2>
        <span className="small muted">{periodLabel}</span>
      </div>

      <Segmented
        className="seg-range"
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'daily', label: t('Daily') },
          { value: 'weekly', label: t('Weekly') },
          { value: 'monthly', label: t('Monthly') }
        ]}
      />

      <div className="fmode-barchart">
        <div className="fmode-barchart-plot">
          {focusMode !== 'exercise' && (
            <div
              className="fmode-barchart-line eaten"
              style={{ bottom: `${calTargetPct}%` }}
            >
              <span>{t('Target {0}', calTarget)}</span>
            </div>
          )}
          {focusMode !== 'calories' && (
            <div
              className="fmode-barchart-line burn"
              style={{ bottom: `${burnTargetPct}%` }}
            >
              <span>{t('Burn {0}', burnTarget)}</span>
            </div>
          )}

          <div className="fmode-barchart-cols">
            {chartData.buckets.map(bucket => {
              const eatenH = Math.min(100, Math.round((bucket.eaten / chartData.maxVal) * 100))
              const burnH = Math.min(100, Math.round((bucket.burned / chartData.maxVal) * 100))
              return (
                <div key={bucket.key} className="fmode-barchart-col">
                  <div className="fmode-barchart-bars">
                    {focusMode !== 'exercise' && (
                      <span
                        className="fmode-bar eaten"
                        style={{ height: `${Math.max(bucket.eaten > 0 ? 6 : 2, eatenH)}%` }}
                        title={`${bucket.label}: ${bucket.eaten} kcal`}
                      />
                    )}
                    {focusMode !== 'calories' && (
                      <span
                        className="fmode-bar burn"
                        style={{ height: `${Math.max(bucket.burned > 0 ? 6 : 2, burnH)}%` }}
                        title={`${bucket.label}: ${bucket.burned} kcal`}
                      />
                    )}
                  </div>
                  <small className="fmode-barchart-lbl">{bucket.label}</small>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {focusMode === 'calories' && (
        <div className="fmode-stat-summary-grid cols-2">
          <div className="fmode-stat-box">
            <strong>{chartData.avgEaten.toLocaleString()} kcal</strong>
            <small>{t('avg eaten')}</small>
          </div>
          <div className="fmode-stat-box">
            <strong>
              {chartData.onTargetCount}/{chartData.totalCount} {unitWord}
            </strong>
            <small>{t('on target')}</small>
          </div>
        </div>
      )}

      {focusMode === 'exercise' && (
        <div className="fmode-stat-summary-grid cols-2">
          <div className="fmode-stat-box">
            <strong>{chartData.avgBurned.toLocaleString()} kcal</strong>
            <small>{t('avg burned')}</small>
          </div>
          <div className="fmode-stat-box">
            <strong>
              {chartData.burnReachedCount}/{chartData.totalCount} {unitWord}
            </strong>
            <small>{t('burn reached')}</small>
          </div>
        </div>
      )}

      {focusMode === 'full' && (
        <div className="fmode-stat-summary-grid cols-3">
          <div className="fmode-stat-box">
            <strong>{chartData.avgEaten.toLocaleString()} kcal</strong>
            <small>{t('avg eaten')}</small>
          </div>
          <div className="fmode-stat-box">
            <strong>{chartData.avgBurned.toLocaleString()} kcal</strong>
            <small>{t('avg burned')}</small>
          </div>
          <div className="fmode-stat-box">
            <strong>
              {chartData.onTargetCount}/{chartData.totalCount} {unitWord}
            </strong>
            <small>{t('on target')}</small>
          </div>
        </div>
      )}
    </section>
  )
}
