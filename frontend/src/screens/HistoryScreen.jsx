import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { api } from '../api'

// Format date string nicely: "2026-08-20" → "Aug 20, 2026"
function fmtDate(str) {
  if (!str) return str
  const [y, m, d] = str.split('-').map(Number)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[m - 1]} ${d}, ${y}`
}

// Group array by a key function
function groupBy(arr, keyFn) {
  const out = {}
  for (const item of arr) {
    const k = keyFn(item)
    if (!out[k]) out[k] = []
    out[k].push(item)
  }
  return out
}

export default function HistoryScreen() {
  const { user, exercises } = useApp()

  // ── Session list state ──────────────────────────────────────────────────────
  const [sessions, setSessions]       = useState([])
  const [loadingSessions, setLoadingSessions] = useState(false)

  // ── Session detail state ────────────────────────────────────────────────────
  const [detail, setDetail]           = useState(null)   // workout row
  const [detailSets, setDetailSets]   = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    if (!user) return
    setLoadingSessions(true)
    api.getWorkoutsByUser(user.user_id)
      .then(rows => setSessions(rows || []))
      .catch(() => setSessions([]))
      .finally(() => setLoadingSessions(false))
  }, [user])

  const openDetail = async (workout) => {
    setDetail(workout)
    setDetailSets([])
    setLoadingDetail(true)
    try {
      const rows = await api.getWorkoutSets(workout[0])
      setDetailSets(rows || [])
    } catch {
      setDetailSets([])
    } finally {
      setLoadingDetail(false)
    }
  }

  // ── Session detail view ─────────────────────────────────────────────────────
  if (detail) {
    const workoutId = detail[0]
    const date      = detail[2]

    // Row format from GET /workouts/{id}/sets:
    // [id, workout_id, exercise_id, exercise_name, set_number, reps, weight, completed]
    const byExercise = groupBy(detailSets, r => r[3]) // key = exercise_name

    return (
      <div className="screen">
        {/* Back button */}
        <button
          onClick={() => setDetail(null)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: 'var(--faint)',
            cursor: 'pointer',
            padding: '0',
            marginBottom: '20px',
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          All Sessions
        </button>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            fontSize: '28px',
            color: 'var(--text)',
            letterSpacing: '0.04em',
            lineHeight: 1,
          }}>
            {fmtDate(date).toUpperCase()}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--faint)', marginTop: '4px' }}>
            Session #{workoutId}
          </div>
          <div style={{ marginTop: '10px', width: '36px', height: '2px', background: 'var(--accent)', borderRadius: '1px' }} />
        </div>

        {/* Stats row */}
        {!loadingDetail && detailSets.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '22px' }}>
            {[
              { label: 'Exercises', value: Object.keys(byExercise).length },
              { label: 'Sets',      value: detailSets.length },
              { label: 'Volume',    value: Math.round(detailSets.reduce((sum, r) => sum + r[5] * r[6], 0)).toLocaleString() },
            ].map(({ label, value }) => (
              <div key={label} className="card" style={{ textAlign: 'center', padding: '14px 8px' }}>
                <div style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '28px',
                  fontWeight: 700,
                  color: 'var(--text)',
                  lineHeight: 1,
                }}>
                  {value}
                </div>
                {label === 'Volume' && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--faint)', marginTop: '2px' }}>lb</div>
                )}
                <div style={{
                  color: 'var(--faint)',
                  fontSize: '10px',
                  marginTop: '5px',
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
        )}

        {loadingDetail ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--faint)' }}>Loading…</div>
        ) : detailSets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--faint)', fontSize: '14px' }}>
            No sets logged this session.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Object.entries(byExercise).map(([exName, exSets]) => {
              const bestWeight = Math.max(...exSets.map(r => Number(r[6])))
              return (
                <div key={exName} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
                    <div style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '17px',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      color: 'var(--text)',
                    }}>
                      {exName.toUpperCase()}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--faint)' }}>
                      {exSets.length} set{exSets.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <table className="mono-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'center', paddingRight: '16px' }}>Set</th>
                        <th style={{ textAlign: 'right', paddingRight: '16px' }}>Reps</th>
                        <th style={{ textAlign: 'right', paddingRight: '16px' }}>Weight</th>
                        <th style={{ textAlign: 'center' }}>✓</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exSets.map((r) => {
                        // [id, workout_id, exercise_id, name, set_number, reps, weight, completed]
                        const [, , , , setNum, setReps, setWeight, setDone] = r
                        const isPR = Number(setWeight) === bestWeight
                        return (
                          <tr key={r[0]}>
                            <td style={{ textAlign: 'center', paddingRight: '16px', color: 'var(--faint)' }}>{setNum}</td>
                            <td style={{ textAlign: 'right', paddingRight: '16px', color: 'var(--text)' }}>{setReps}</td>
                            <td style={{ textAlign: 'right', paddingRight: '16px' }}>
                              <span style={{ color: isPR ? 'var(--accent)' : 'var(--text)', fontWeight: isPR ? 600 : 400 }}>
                                {setWeight} lb
                              </span>
                            </td>
                            <td style={{ textAlign: 'center', fontSize: '14px' }}>
                              {setDone ? <span style={{ color: '#5A9A5A' }}>✓</span> : <span style={{ color: 'var(--faint)' }}>○</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── Session list view ───────────────────────────────────────────────────────
  // Group sessions by date to show day-of counts
  const byDate = groupBy(sessions, r => r[2])

  return (
    <div className="screen">
      {/* Header */}
      <div style={{
        fontFamily: 'var(--font-heading)',
        fontWeight: 700,
        fontSize: '30px',
        color: 'var(--text)',
        letterSpacing: '0.04em',
        marginBottom: '4px',
      }}>
        HISTORY
      </div>
      <div style={{ color: 'var(--faint)', fontSize: '13px', marginBottom: '24px' }}>
        {sessions.length} session{sessions.length !== 1 ? 's' : ''} total
      </div>

      {loadingSessions ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--faint)' }}>Loading…</div>
      ) : sessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--faint)', fontSize: '14px' }}>
          No sessions yet. Start a workout to log your first session.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sessions.map((w) => {
            // w = [id, user_id, date]
            const [wId, , wDate] = w
            const dayCount = byDate[wDate]?.length ?? 1
            const dayIdx   = (byDate[wDate] ?? []).findIndex(x => x[0] === wId) + 1

            return (
              <button
                key={wId}
                onClick={() => openDetail(w)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--muted)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div>
                  <div style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '17px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    color: 'var(--text)',
                    lineHeight: 1,
                  }}>
                    {fmtDate(wDate).toUpperCase()}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--faint)',
                    marginTop: '4px',
                  }}>
                    #{wId}{dayCount > 1 ? ` · Session ${dayIdx} of ${dayCount}` : ''}
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
