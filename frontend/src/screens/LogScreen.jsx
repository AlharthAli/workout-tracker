import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { api } from '../api'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const GROUP_ORDER = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core']

export default function LogScreen() {
  const { user, exercises, activeWorkout, setActiveWorkout, logout } = useApp()
  const [sets, setSets]               = useState([])
  const [exId, setExId]               = useState('')
  const [reps, setReps]               = useState('')
  const [weight, setWeight]           = useState('')
  const [completed, setCompleted]     = useState(true)
  const [submitting, setSubmitting]   = useState(false)
  const [starting, setStarting]       = useState(false)
  const [error, setError]             = useState('')
  const [lastSet, setLastSet]         = useState(null)  // { exId, exName, reps, weight }

  // Group exercises by muscle group
  const grouped = GROUP_ORDER.reduce((acc, g) => {
    acc[g] = exercises.filter(e => e.muscle_group === g)
    return acc
  }, {})
  // Catch-all for exercises with unexpected muscle_group
  const ungrouped = exercises.filter(e => !GROUP_ORDER.includes(e.muscle_group))

  const loadSets = useCallback(async () => {
    if (!activeWorkout) return
    try {
      const all = await api.getSets()
      setSets((all || []).filter(s => s[1] === parseInt(activeWorkout.id, 10)))
    } catch { /* silent */ }
  }, [activeWorkout])

  useEffect(() => { loadSets() }, [loadSets])

  const startWorkout = async () => {
    setStarting(true)
    setError('')
    try {
      const data = await api.startWorkout(user.user_id, todayStr())
      let rawId = Array.isArray(data) ? data[0] : (data.id ?? data.workout_id)
      if (rawId == null || !Number.isInteger(parseInt(rawId, 10))) {
        const workouts = await api.getWorkoutsByUser(user.user_id)
        const today = todayStr()
        const mine = (workouts || []).filter(w => {
          const wDate = Array.isArray(w) ? w[2] : w.date
          return String(wDate).startsWith(today)
        })
        if (!mine.length) throw new Error('Could not determine workout ID')
        const latest = mine[0]  // already sorted DESC
        rawId = Array.isArray(latest) ? latest[0] : (latest.id ?? latest.workout_id)
      }
      const parsedId = parseInt(rawId, 10)
      if (!Number.isInteger(parsedId)) throw new Error('Could not determine workout ID')
      setActiveWorkout({ id: parsedId, date: todayStr() })
    } catch (err) {
      // FK violation on user_id means the account no longer exists in the DB
      if (err.message && err.message.includes('user_id')) {
        logout()
        return
      }
      setError(err.message || 'Failed to start workout')
    } finally {
      setStarting(false)
    }
  }

  const nextSetNum = () => {
    if (!exId) return 1
    return sets.filter(s => s[2] === Number(exId)).length + 1
  }

  const handleLog = async (e) => {
    e.preventDefault()
    if (!activeWorkout || !exId || !reps || !weight) return
    setSubmitting(true)
    setError('')
    try {
      await api.logSet(
        parseInt(activeWorkout.id, 10),
        parseInt(exId, 10),
        nextSetNum(),
        Number(reps),
        parseFloat(weight),
        Boolean(completed),
      )
      const ex = exercises.find(e => e.id === Number(exId))
      setLastSet({ exId, exName: ex?.name ?? `#${exId}`, reps, weight })
      setReps('')
      setWeight('')
      await loadSets()
    } catch (err) {
      setError(err.message || 'Failed to log set')
    } finally {
      setSubmitting(false)
    }
  }

  const applyRepeat = () => {
    if (!lastSet) return
    setExId(lastSet.exId)
    setReps(lastSet.reps)
    setWeight(lastSet.weight)
  }

  const exName = (id) => exercises.find(e => e.id === id)?.name ?? `#${id}`

  // ── No active workout ────────────────────────────────────────────────────────
  if (!activeWorkout) {
    return (
      <div className="screen" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70dvh',
        textAlign: 'center',
        gap: '20px',
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '36px',
            fontWeight: 700,
            color: 'var(--text)',
            letterSpacing: '0.04em',
            lineHeight: 1,
          }}>
            NO ACTIVE SESSION
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            color: 'var(--faint)',
            marginTop: '8px',
          }}>
            {todayStr()}
          </div>
        </div>

        {error && <div className="error-text" role="alert">{error}</div>}

        <button
          className="btn-primary"
          onClick={startWorkout}
          disabled={starting}
          style={{ maxWidth: '260px' }}
        >
          {starting ? 'Starting…' : 'Start Workout'}
        </button>
      </div>
    )
  }

  // ── Active workout ───────────────────────────────────────────────────────────
  return (
    <div className="screen">
      {/* Session header */}
      <div style={{ marginBottom: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="label">Active Session</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--muted)' }}>
              {activeWorkout.date} · #{activeWorkout.id}
            </div>
          </div>
          <button
            onClick={() => { setActiveWorkout(null); setLastSet(null) }}
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              color: 'var(--faint)',
              borderRadius: '6px',
              padding: '5px 12px',
              fontSize: '12px',
              fontFamily: 'var(--font-body)',
              cursor: 'pointer',
            }}
          >
            End Session
          </button>
        </div>
        <div style={{ marginTop: '10px', width: '36px', height: '2px', background: 'var(--accent)', borderRadius: '1px' }} />
      </div>

      {/* Log set form */}
      <div className="card" style={{ marginBottom: '22px' }}>
        <div className="label" style={{ marginBottom: '14px' }}>Log a Set</div>

        {/* Repeat last set shortcut */}
        {lastSet && (
          <button
            type="button"
            onClick={applyRepeat}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              background: 'rgba(193,68,45,0.10)',
              border: '1px solid rgba(193,68,45,0.30)',
              borderRadius: '8px',
              padding: '9px 12px',
              cursor: 'pointer',
              marginBottom: '14px',
              textAlign: 'left',
            }}
          >
            <span style={{
              fontFamily: 'var(--font-body)',
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--accent)',
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              flexShrink: 0,
            }}>
              Repeat
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {lastSet.exName} · {lastSet.weight} lb × {lastSet.reps}
            </span>
          </button>
        )}

        <form onSubmit={handleLog} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Exercise picker — grouped by muscle */}
          <div>
            <div className="label" style={{ marginBottom: '10px' }}>Exercise</div>
            {GROUP_ORDER.map(group => {
              const exs = grouped[group]
              if (!exs || exs.length === 0) return null
              return (
                <div key={group} style={{ marginBottom: '10px' }}>
                  <div style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: 'var(--faint)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: '5px',
                  }}>
                    {group}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {exs.map(ex => (
                      <button
                        key={ex.id}
                        type="button"
                        className={`chip${String(exId) === String(ex.id) ? ' active' : ''}`}
                        onClick={() => setExId(String(ex.id))}
                        style={{ fontSize: '12px', padding: '5px 11px' }}
                      >
                        {ex.name}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
            {ungrouped.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <div style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: 'var(--faint)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: '5px',
                }}>
                  Other
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {ungrouped.map(ex => (
                    <button
                      key={ex.id}
                      type="button"
                      className={`chip${String(exId) === String(ex.id) ? ' active' : ''}`}
                      onClick={() => setExId(String(ex.id))}
                      style={{ fontSize: '12px', padding: '5px 11px' }}
                    >
                      {ex.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!exId && (
              <p style={{ fontSize: '12px', color: 'var(--faint)', marginTop: '4px' }}>
                Select an exercise above
              </p>
            )}
          </div>

          {/* Reps + Weight */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <div className="label">Reps</div>
              <input
                type="number"
                inputMode="numeric"
                value={reps}
                onChange={e => setReps(e.target.value)}
                placeholder="10"
                min="1"
                required
              />
            </div>
            <div>
              <div className="label">Weight (lb)</div>
              <input
                type="number"
                inputMode="decimal"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                placeholder="135"
                min="0"
                step="2.5"
                required
              />
            </div>
          </div>

          {/* Completed + set number */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={completed}
              onChange={e => setCompleted(e.target.checked)}
            />
            <span style={{ fontSize: '14px', color: 'var(--muted)' }}>Completed</span>
            {exId && (
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--faint)' }}>
                Set {nextSetNum()}
              </span>
            )}
          </label>

          {error && <div className="error-text" role="alert">{error}</div>}

          <button type="submit" className="btn-primary" disabled={submitting || !exId}>
            {submitting ? 'Logging…' : 'Log Set'}
          </button>
        </form>
      </div>

      {/* Running set list */}
      <div className="label" style={{ marginBottom: '10px' }}>
        Today's Sets{sets.length > 0 ? ` (${sets.length})` : ''}
      </div>

      {sets.length === 0
        ? (
          <div style={{ color: 'var(--faint)', fontSize: '14px', padding: '32px 0', textAlign: 'center' }}>
            No sets yet — let's get to work.
          </div>
        )
        : (
          <div className="card">
            <table className="mono-table">
              <thead>
                <tr>
                  <th>Exercise</th>
                  <th style={{ textAlign: 'right' }}>Set</th>
                  <th style={{ textAlign: 'right' }}>Reps</th>
                  <th style={{ textAlign: 'right' }}>Weight</th>
                  <th style={{ textAlign: 'center' }}>✓</th>
                </tr>
              </thead>
              <tbody>
                {sets.map((s, i) => {
                  const [sid, , eid, setNum, setReps, setWeight, setDone] = s
                  return (
                    <tr key={sid ?? i}>
                      <td style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)', fontSize: '13px', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {exName(eid)}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--faint)' }}>{setNum}</td>
                      <td style={{ textAlign: 'right', color: 'var(--text)' }}>{setReps}</td>
                      <td style={{ textAlign: 'right', color: 'var(--accent)', fontWeight: 500 }}>{setWeight} lb</td>
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
      }
    </div>
  )
}
