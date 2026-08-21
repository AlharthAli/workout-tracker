import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { api } from '../api'
import BarbellViz from '../components/BarbellViz'

const ALL_GROUPS = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core']

function weekStartStr() {
  const d = new Date()
  const day = d.getDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day  // back to Monday
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
}

export default function DashboardScreen() {
  const { user, exercises, setTab, logout } = useApp()
  const [selectedEx, setSelectedEx]   = useState(null)
  const [rec, setRec]                 = useState(null)
  const [recLoading, setRecLoading]   = useState(false)

  // Weekly summary
  const [weekSessions, setWeekSessions]   = useState(null)  // null = loading
  const [weekSets, setWeekSets]           = useState(null)
  const [trainedGroups, setTrainedGroups] = useState(null)

  // Auto-select first exercise
  useEffect(() => {
    if (exercises.length && !selectedEx) setSelectedEx(exercises[0])
  }, [exercises])

  // Load recommendation when exercise changes
  useEffect(() => {
    if (!selectedEx) return
    setRec(null)
    setRecLoading(true)
    api.getRecommendation(selectedEx.id)
      .then(data => setRec(data))
      .catch(() => setRec({ message: 'No history yet — log some sets first!' }))
      .finally(() => setRecLoading(false))
  }, [selectedEx])

  // Load weekly summary
  useEffect(() => {
    if (!user || exercises.length === 0) return

    const wStart = weekStartStr()

    Promise.all([
      api.getWorkoutsByUser(user.user_id),
      api.getSets(),
    ])
      .then(([workouts, allSets]) => {
        const weekWorkouts = (workouts || []).filter(w => {
          const d = Array.isArray(w) ? w[2] : w.date
          return String(d) >= wStart
        })
        const weekWorkoutIds = new Set(weekWorkouts.map(w => Array.isArray(w) ? w[0] : w.id))

        const weeklySets = (allSets || []).filter(s => {
          const wid = Array.isArray(s) ? s[1] : s.workout_id
          return weekWorkoutIds.has(wid)
        })

        const exMap = Object.fromEntries(exercises.map(e => [e.id, e.muscle_group]))
        const trained = new Set(
          weeklySets.map(s => {
            const eid = Array.isArray(s) ? s[2] : s.exercise_id
            return exMap[eid]
          }).filter(Boolean)
        )

        setWeekSessions(weekWorkouts.length)
        setWeekSets(weeklySets.length)
        setTrainedGroups(trained)
      })
      .catch(() => {
        setWeekSessions(0)
        setWeekSets(0)
        setTrainedGroups(new Set())
      })
  }, [user, exercises])

  const weight = rec?.recommended_weight

  return (
    <div className="screen">
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            fontSize: '30px',
            letterSpacing: '0.04em',
            color: 'var(--text)',
            lineHeight: 1,
          }}>
            IRON LOG
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
            <span style={{ color: 'var(--faint)', fontSize: '13px' }}>{user?.name}</span>
            <button
              onClick={logout}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--faint)',
                fontSize: '11px',
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                padding: '0',
                textDecoration: 'underline',
                textUnderlineOffset: '2px',
              }}
            >
              Sign out
            </button>
          </div>
        </div>
        <button
          onClick={() => setTab('log')}
          style={{
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '9px 16px',
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            letterSpacing: '0.02em',
            flexShrink: 0,
          }}
        >
          + Log Set
        </button>
      </div>

      {/* ── This Week Summary ─────────────────────────────────────────────────── */}
      <div className="label" style={{ marginBottom: '10px' }}>This Week</div>
      <div className="card" style={{ marginBottom: '24px' }}>
        {weekSessions === null ? (
          <div style={{ color: 'var(--faint)', fontSize: '13px', padding: '4px 0' }}>Loading…</div>
        ) : (
          <>
            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '14px' }}>
              {[
                { label: 'Sessions', value: weekSessions },
                { label: 'Sets',     value: weekSets },
              ].map(({ label, value }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '36px',
                    fontWeight: 700,
                    color: value > 0 ? 'var(--text)' : 'var(--faint)',
                    lineHeight: 1,
                  }}>
                    {value}
                  </div>
                  <div style={{
                    color: 'var(--faint)',
                    fontSize: '10px',
                    marginTop: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    fontFamily: 'var(--font-body)',
                    fontWeight: '600',
                  }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {/* Muscle group coverage */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {ALL_GROUPS.map(g => {
                  const hit = trainedGroups?.has(g)
                  return (
                    <span
                      key={g}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontFamily: 'var(--font-body)',
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        background: hit ? 'rgba(90,154,90,0.15)' : 'var(--raised)',
                        color: hit ? '#5A9A5A' : 'var(--faint)',
                        border: `1px solid ${hit ? 'rgba(90,154,90,0.35)' : 'var(--border)'}`,
                      }}
                    >
                      {hit ? '✓ ' : ''}{g}
                    </span>
                  )
                })}
              </div>
              {trainedGroups && trainedGroups.size < ALL_GROUPS.length && (
                <div style={{
                  marginTop: '10px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--faint)',
                }}>
                  {ALL_GROUPS.filter(g => !trainedGroups.has(g)).join(', ')} not trained this week
                </div>
              )}
              {trainedGroups && trainedGroups.size === ALL_GROUPS.length && (
                <div style={{ marginTop: '10px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#5A9A5A' }}>
                  All muscle groups trained this week ✓
                </div>
              )}
              {weekSessions === 0 && (
                <div style={{ marginTop: '8px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--faint)' }}>
                  No sessions this week yet.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Recommendation ───────────────────────────────────────────────────── */}
      <div className="label" style={{ marginBottom: '8px' }}>Next Lift</div>

      {/* Exercise chips */}
      <div className="chip-row" style={{ marginBottom: '16px' }}>
        {exercises.length === 0
          ? <span style={{ color: 'var(--faint)', fontSize: '13px' }}>Loading…</span>
          : exercises.map(ex => (
            <button
              key={ex.id}
              className={`chip${selectedEx?.id === ex.id ? ' active' : ''}`}
              onClick={() => setSelectedEx(ex)}
            >
              {ex.name}
            </button>
          ))
        }
      </div>

      {selectedEx && (
        <div className="card">
          {/* Exercise name + muscle group */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px' }}>
            <div>
              <div style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '22px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                color: 'var(--text)',
              }}>
                {selectedEx.name.toUpperCase()}
              </div>
              <div style={{ color: 'var(--faint)', fontSize: '12px', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {selectedEx.muscle_group}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="label">Target</div>
              <div style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '56px',
                fontWeight: 700,
                color: weight ? 'var(--accent)' : 'var(--faint)',
                lineHeight: 1,
                letterSpacing: '-0.01em',
              }}>
                {recLoading ? '—' : weight ?? '—'}
              </div>
              {weight && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--faint)', marginTop: '1px' }}>
                  LB
                </div>
              )}
            </div>
          </div>

          {/* Barbell visualization */}
          {weight
            ? (
              <div style={{
                background: 'var(--raised)',
                borderRadius: '10px',
                padding: '16px 12px 12px',
                marginBottom: rec?.reason ? '14px' : '0',
              }}>
                <BarbellViz targetWeight={weight} />
              </div>
            )
            : rec?.message && (
              <div style={{
                background: 'var(--raised)',
                borderRadius: '10px',
                padding: '16px',
                color: 'var(--faint)',
                fontSize: '14px',
                textAlign: 'center',
              }}>
                {rec.message}
              </div>
            )
          }

          {/* Algorithm reasoning */}
          {rec?.reason && (
            <div style={{
              background: 'var(--raised)',
              borderRadius: '8px',
              padding: '12px 14px',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--muted)',
              lineHeight: '1.65',
            }}>
              {rec.reason}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
