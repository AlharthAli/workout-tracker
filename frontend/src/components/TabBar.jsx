import { useApp } from '../context/AppContext'

function IconDashboard({ active }) {
  const c = active ? 'var(--accent)' : 'var(--faint)'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
}

function IconLog({ active }) {
  const c = active ? 'var(--accent)' : 'var(--faint)'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="5" r="1" fill={c} stroke="none"/>
      <circle cx="12" cy="19" r="1" fill={c} stroke="none"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
      <line x1="12" y1="5" x2="12" y2="19"/>
    </svg>
  )
}

function IconHistory({ active }) {
  const c = active ? 'var(--accent)' : 'var(--faint)'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )
}

const TABS = [
  { id: 'dashboard', label: 'Dashboard', Icon: IconDashboard },
  { id: 'log',       label: 'Log',       Icon: IconLog },
  { id: 'history',   label: 'History',   Icon: IconHistory },
]

export default function TabBar() {
  const { tab, setTab } = useApp()

  return (
    <nav
      aria-label="Main navigation"
      style={{
        display: 'flex',
        height: 'var(--tab-h)',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg)',
        position: 'sticky',
        bottom: 0,
        zIndex: 200,
        paddingBottom: 'env(safe-area-inset-bottom)',
        flexShrink: 0,
      }}
    >
      {TABS.map(({ id, label, Icon }) => {
        const active = tab === id
        return (
          <button
            key={id}
            onClick={() => setTab(id)}
            aria-current={active ? 'page' : undefined}
            aria-label={label}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: active ? 'var(--accent)' : 'var(--faint)',
              fontSize: '9px',
              fontFamily: 'var(--font-body)',
              fontWeight: '600',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '6px 0 4px',
              transition: 'color 0.15s',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Icon active={active} />
            <span>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
