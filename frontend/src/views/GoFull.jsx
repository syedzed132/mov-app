import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { Brand } from '../components/Brand.jsx'
import { PlayerBadge } from '../components/PlayerProgress.jsx'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import { getFocusMode, getInviteCode, setFocusModeInDraft } from '../lib/focus-mode.js'
import './focus-modes.css'

export function InviteFriendsCard() {
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const toast = useUI(s => s.toast)
  const code = getInviteCode(S, user)
  const counted = Math.max(0, Math.min(5, Number(S?.inviteFriendsCount) || 0))

  const handleShare = async () => {
    const shareText = t('Join me on MOV with code {0} for 20% off your first month.', code)
    try {
      if (navigator.share) {
        await navigator.share({ title: 'MOV', text: shareText, url: window.location.origin })
        return
      }
    } catch {
      // Fall back to clipboard
    }
    try {
      await navigator.clipboard?.writeText(shareText)
      toast(t('Invite code {0} copied to clipboard', code))
    } catch {
      toast(t('Invite code: {0}', code))
    }
  }

  return (
    <section className="fmode-card fmode-invite-card" aria-label={t('Invite friends')}>
      <div className="fmode-invite-head">
        <span className="fmode-invite-icon">
          <Icon name="sparkles" />
        </span>
        <div>
          <h2>{t('Invite 5 friends, get 50% off your first month')}</h2>
          <p>{t('Your friends get 20% off their first payment.')}</p>
        </div>
      </div>
      <div className="fmode-invite-segments" role="progressbar" aria-valuemin={0} aria-valuemax={5} aria-valuenow={counted}>
        {[1, 2, 3, 4, 5].map(idx => (
          <span key={idx} className={idx <= counted ? 'on' : ''} />
        ))}
      </div>
      <div className="fmode-invite-meta">
        <span>{t('{0} of 5 friends counted', counted)}</span>
        <span>{t('Code {0}', code)}</span>
      </div>
      <Button variant="secondary" icon="share" className="fmode-full-btn" onClick={handleShare}>
        {t('Share my invite')}
      </Button>
    </section>
  )
}

export default function GoFull() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const pushState = useStore(s => s.pushState)
  const toast = useUI(s => s.toast)
  const [planTier, setPlanTier] = useState('annual')

  const focusMode = getFocusMode(S)
  const isCalories = focusMode === 'calories'

  const benefits = isCalories
    ? [
        t('Workout plans built for your level and schedule'),
        t('Daily calorie burn target with games and sports'),
        t('Day, week and month plan for food and training'),
        t('Muscle balance, body maps and strength progress')
      ]
    : [
        t('Daily calorie and macro targets for your goal'),
        t('Meal logging with photo, voice and food search'),
        t('Day, week and month plan for food and training'),
        t('Combined calories eaten and burned on one screen')
      ]

  const switchMode = nextMode => {
    update(draft => {
      setFocusModeInDraft(draft, nextMode)
    })
    Promise.resolve(pushState()).catch(() => {})
    toast(
      nextMode === 'full'
        ? t('Full routine unlocked.')
        : nextMode === 'exercise'
          ? t('Switched to Exercise focus.')
          : t('Switched to Calorie count focus.')
    )
    nav('/home')
  }

  return (
    <div className="simple-home home-refined fmode-page">
      <div className="home-app-bar">
        <Brand />
        <PlayerBadge />
      </div>

      <header className="simple-home-header">
        <div>
          <p>
            {isCalories
              ? t('Your plan: Calorie count')
              : focusMode === 'exercise'
                ? t('Your plan: Exercise')
                : t('Your plan: Full routine')}
          </p>
          <h1 className="home-plan-title">
            {t('Go full')}<span>.</span>
          </h1>
        </div>
      </header>

      <section className="fmode-hero-card">
        <div className="fmode-hero-pill">
          <Icon name="sparkles" />
          <span>{t('FULL ROUTINE')}</span>
        </div>
        <h2>{t('Food and training in one plan.')}</h2>
        <ul className="fmode-benefit-list">
          {benefits.map(item => (
            <li key={item}>
              <Icon name="checkCircle" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="fmode-pricing-grid" role="radiogroup" aria-label={t('Choose billing cycle')}>
          <button
            type="button"
            className={'fmode-price-option' + (planTier === 'annual' ? ' selected' : '')}
            aria-pressed={planTier === 'annual'}
            onClick={() => setPlanTier('annual')}
          >
            <span className="fmode-price-badge">{t('Best value')}</span>
            <span className="fmode-price-name">{t('Annual')}</span>
            <strong className="fmode-price-amount">$49.99</strong>
            <small>{t('$4.17/mo · 7 days free')}</small>
          </button>
          <button
            type="button"
            className={'fmode-price-option' + (planTier === 'monthly' ? ' selected' : '')}
            aria-pressed={planTier === 'monthly'}
            onClick={() => setPlanTier('monthly')}
          >
            <span className="fmode-price-name">{t('Monthly')}</span>
            <strong className="fmode-price-amount">$9.99</strong>
            <small>{t('per month · cancel anytime')}</small>
          </button>
        </div>

        <Button
          variant="primary"
          trailingIcon="arrowRight"
          className="fmode-full-btn fmode-trial-btn"
          onClick={() => switchMode('full')}
        >
          {t('Start 14-day free trial')}
        </Button>

        <p className="fmode-hero-footnote">
          {t('Payment is not connected in this build yet. The trial switches your app to the full routine.')}
        </p>
      </section>

      <section className="fmode-card fmode-switch-card">
        <div>
          <h2>{t('Rather switch focus?')}</h2>
          <p>
            {isCalories
              ? t('Move to workouts and calorie burn without food logging.')
              : t('Move to daily meals and calorie tracking without workout plans.')}
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => switchMode(isCalories ? 'exercise' : 'calories')}
        >
          {isCalories ? t('Switch to Exercise') : t('Switch to Calorie count')}
        </Button>
      </section>

      <InviteFriendsCard />
    </div>
  )
}
