import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useNutrition } from '../store/useNutrition.js'
import { workoutDay } from '../lib/history.js'
import { todayISO } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { Brand } from '../components/Brand.jsx'
import { PlayerBadge } from '../components/PlayerProgress.jsx'
import { Segmented } from '../components/ui.jsx'
import { getFocusMode } from '../lib/focus-mode.js'
import { InviteFriendsCard } from './GoFull.jsx'
import './focus-modes.css'

const SAMPLE_FRIENDS = [
  { id: 'maya', name: 'Maya', initial: 'M', pct: 88 },
  { id: 'omar', name: 'Omar', initial: 'O', pct: 81 },
  { id: 'ali', name: 'Ali', initial: 'A', pct: 74 },
  { id: 'tom', name: 'Tom', initial: 'T', pct: 68 },
  { id: 'zara', name: 'Zara', initial: 'Z', pct: 66 }
]

const SAMPLE_FAMILY = [
  { id: 'dad', name: 'Dad', initial: 'D', pct: 84 },
  { id: 'hina', name: 'Hina', initial: 'H', pct: 76 },
  { id: 'mom', name: 'Mom', initial: 'M', pct: 61 }
]

export default function Group() {
  const S = useStore(s => s.S)
  const nutritionDays = useNutrition(s => s.days)
  const [tab, setTab] = useState('friends')
  const focusMode = getFocusMode(S)

  const monthStats = useMemo(() => {
    const today = todayISO()
    const ym = today.slice(0, 7)
    const dayOfMonth = Math.max(1, Number(today.slice(8, 10)) || 8)

    const foodDates = new Set(
      Object.entries(nutritionDays || {})
        .filter(([d, data]) => d.startsWith(ym) && Array.isArray(data?.entries) && data.entries.length > 0)
        .map(([d]) => d)
    )
    const workoutDates = new Set(
      (S?.workouts || [])
        .map(w => workoutDay(w) || w.d)
        .filter(d => typeof d === 'string' && d.startsWith(ym))
    )
    const activityDates = new Set(
      (S?.activities || [])
        .map(a => a.d)
        .filter(d => typeof d === 'string' && d.startsWith(ym))
    )
    const moveDates = new Set([...workoutDates, ...activityDates])
    const allActiveDates = new Set([...foodDates, ...moveDates])

    if (focusMode === 'calories') {
      const done = foodDates.size
      const targetDays = dayOfMonth
      const pct = Math.min(100, Math.round((done / targetDays) * 100))
      return {
        done,
        targetDays,
        pct,
        label: t('{0} of {1} days with food logged', done, targetDays)
      }
    }

    if (focusMode === 'exercise') {
      const plannedPerWeek = Number(S?.targetHistory?.at(-1)?.inputs?.trainingDaysPerWeek) || 4
      const targetDays = Math.max(1, Math.round((dayOfMonth / 7) * plannedPerWeek))
      const done = moveDates.size
      const pct = Math.min(100, Math.round((done / targetDays) * 100))
      return {
        done,
        targetDays,
        pct,
        label: t('{0} of {1} training days', done, targetDays)
      }
    }

    const done = allActiveDates.size
    const targetDays = dayOfMonth
    const pct = Math.min(100, Math.round((done / targetDays) * 100))
    return {
      done,
      targetDays,
      pct,
      label: t('{0} of {1} active days', done, targetDays)
    }
  }, [S, nutritionDays, focusMode])

  const rankedMembers = useMemo(() => {
    const base = tab === 'family' ? SAMPLE_FAMILY : SAMPLE_FRIENDS
    const youEntry = { id: 'you', name: t('You'), initial: 'Y', pct: monthStats.pct, isYou: true }
    const combined = [...base, youEntry].sort((a, b) => b.pct - a.pct || (a.isYou ? -1 : 1))
    return combined.map((member, idx) => ({ ...member, rank: idx + 1 }))
  }, [tab, monthStats.pct])

  const youMember = rankedMembers.find(m => m.isYou) || { rank: rankedMembers.length, pct: monthStats.pct }
  const aboveMember = rankedMembers.find(m => m.rank === youMember.rank - 1)
  const belowMember = rankedMembers.find(m => m.rank === youMember.rank + 1)

  const nudgeCopy = useMemo(() => {
    if (tab === 'family') {
      if (belowMember) {
        return t('{0} in your family is rank {1}. Keep your lead.', belowMember.name, belowMember.rank)
      }
      if (aboveMember) {
        const diff = Math.max(1, aboveMember.pct - youMember.pct)
        return t('{0} in your family is rank {1}. {2}% to catch up.', aboveMember.name, aboveMember.rank, diff)
      }
      return t('You are leading your family this month.')
    }
    if (aboveMember) {
      const diff = Math.max(1, aboveMember.pct - youMember.pct)
      return t('Your friend {0} is rank {1}. {2}% to catch up.', aboveMember.name, aboveMember.rank, diff)
    }
    if (belowMember) {
      return t('Your friend {0} is rank {1}. Keep your lead.', belowMember.name, belowMember.rank)
    }
    return t('You are leading your friends this month.')
  }, [tab, aboveMember, belowMember, youMember.pct])

  const podiumOrder = [
    rankedMembers.find(m => m.rank === 2),
    rankedMembers.find(m => m.rank === 1),
    rankedMembers.find(m => m.rank === 3)
  ].filter(Boolean)

  return (
    <div className="simple-home home-refined fmode-page">
      <div className="home-app-bar">
        <Brand />
        <PlayerBadge />
      </div>

      <header className="simple-home-header">
        <div>
          <p>{t('Show up. Rise together.')}</p>
          <h1 className="home-plan-title">
            {t('Your group')}<span>.</span>
          </h1>
        </div>
      </header>

      <Segmented
        className="fmode-group-seg"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'friends', label: t('Friends') },
          { value: 'family', label: t('Family') }
        ]}
      />

      <section className="fmode-group-banner" aria-label={t('Monthly progress')}>
        <div className="fmode-group-eyebrow">{t('THIS MONTH')}</div>
        <h2>{t('You have achieved {0}% of your target', monthStats.pct)}</h2>
        <div className="fmode-group-progress">
          <span style={{ width: `${monthStats.pct}%` }} />
        </div>
        <div className="fmode-group-meta">
          <span>{monthStats.label}</span>
          <span>{t('Rank {0} of {1}', youMember.rank, rankedMembers.length)}</span>
        </div>
        <p className="fmode-group-nudge">{nudgeCopy}</p>
      </section>

      <section className="fmode-card fmode-group-board" aria-label={t('Group rankings')}>
        <div className="fmode-podium">
          {podiumOrder.map(member => (
            <div
              key={member.id}
              className={'fmode-podium-col rank-' + member.rank + (member.isYou ? ' is-you' : '')}
            >
              <span className="fmode-podium-avatar">{member.initial}</span>
              <strong className="fmode-podium-name">{member.name}</strong>
              <div className="fmode-podium-pedestal">
                <span className="fmode-podium-rank">{member.rank}</span>
                <small className="fmode-podium-pct">{member.pct}%</small>
              </div>
            </div>
          ))}
        </div>

        <div className="fmode-rank-list">
          {rankedMembers.map(member => (
            <div
              key={member.id}
              className={'fmode-rank-row' + (member.isYou ? ' is-you' : '')}
            >
              <span className="fmode-rank-num">{member.rank}</span>
              <span className="fmode-rank-avatar">{member.initial}</span>
              <div className="fmode-rank-main">
                <div className="fmode-rank-name">{member.name}</div>
                <div className="fmode-rank-bar">
                  <span style={{ width: `${member.pct}%` }} />
                </div>
              </div>
              <strong className="fmode-rank-pct">{member.pct}%</strong>
            </div>
          ))}
        </div>

        <p className="fmode-group-footnote">
          {t('Ranked on active days, never on weight. Your group sees your percentage and rank only, not your weight or food. Sample members are shown until your friends and family join.')}
        </p>
      </section>

      <InviteFriendsCard />
    </div>
  )
}
