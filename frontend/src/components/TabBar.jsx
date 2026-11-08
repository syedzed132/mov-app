import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import { Brand } from './Brand.jsx'
import { useConnectionTrouble } from './SyncBanner.jsx'
import { getFocusMode } from '../lib/focus-mode.js'

function Tab({ active, icon, label, onClick, dot }) {
  return (
    <button className={active ? 'on' : ''} onClick={onClick} aria-label={dot ? label + ', ' + t('Connection problem') : undefined}>
      <span className="tab-ic"><Icon name={icon} />{dot && <span className="tab-dot" aria-hidden="true" />}</span><span>{label}</span>
    </button>
  )
}

export default function TabBar() {
  const nav = useNavigate()
  const loc = useLocation()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const isGuest = useStore(s => s.isGuest())
  const trouble = useConnectionTrouble()
  if (!user && !isGuest) return null
  const cur = loc.pathname.split('/')[1] || 'home'
  const focusMode = getFocusMode(S)
  const PARENT = {
    history: 'stats',
    'structural-balance': 'stats',
    'progress-photos': 'stats',
    measurements: 'stats',
    settings: 'home',
    checkin: 'home',
    muscles: 'library',
    library: 'library',
    food: 'home',
    workout: 'home',
    plan: focusMode === 'full' ? 'plan' : 'home'
  }
  const parent = cur === 'muscles' && loc.state?.from === '/stats' ? 'stats' : PARENT[cur]
  const on = k => cur === k || parent === k

  const switchTab = path => {
    if (loc.pathname !== path || loc.search) nav(path, { replace: true })
  }

  return (
    <nav id="tabbar" className="simple-nav" aria-label={t('Main navigation')}>
      <div className="desktop-brand"><Brand /></div>
      <Tab active={on('home')} icon="house" label={t('Home')} dot={trouble} onClick={() => switchTab('/home')} />
      {focusMode === 'full' && (
        <Tab active={on('plan')} icon="calendar" label={t('Plan')} onClick={() => switchTab('/plan')} />
      )}
      <Tab active={on('stats')} icon="chart" label={t('Stats')} onClick={() => switchTab('/stats')} />
      <Tab active={on('library')} icon="dumbbell" label={t('Exercises')} onClick={() => switchTab('/library')} />
      {focusMode !== 'full' && (
        <Tab active={on('go-full')} icon="rocket" label={t('Go Full')} onClick={() => switchTab('/go-full')} />
      )}
      <Tab active={on('group')} icon="trophy" label={t('Group')} onClick={() => switchTab('/group')} />
    </nav>
  )
}
