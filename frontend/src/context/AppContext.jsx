import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../api'

const AppContext = createContext(null)

function fromStorage(key) {
  try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}

const SEED_EXERCISES = [
  { name: 'Bench Press',      muscle_group: 'chest' },
  { name: 'Dip',              muscle_group: 'chest' },
  { name: 'Squat',            muscle_group: 'legs' },
  { name: 'Leg Press',        muscle_group: 'legs' },
  { name: 'Leg Curl',         muscle_group: 'legs' },
  { name: 'Calf Raise',       muscle_group: 'legs' },
  { name: 'Hip Thrust',       muscle_group: 'legs' },
  { name: 'Deadlift',         muscle_group: 'back' },
  { name: 'Barbell Row',      muscle_group: 'back' },
  { name: 'Pull-up',          muscle_group: 'back' },
  { name: 'Lat Pulldown',     muscle_group: 'back' },
  { name: 'Overhead Press',   muscle_group: 'shoulders' },
  { name: 'Bicep Curl',       muscle_group: 'arms' },
  { name: 'Tricep Pushdown',  muscle_group: 'arms' },
  { name: 'Plank',            muscle_group: 'core' },
]

export function AppProvider({ children }) {
  const [user, setUserRaw]             = useState(() => fromStorage('il_user'))
  const [activeWorkout, setWorkoutRaw] = useState(() => {
    const w = fromStorage('il_workout')
    return (w && Number.isInteger(w.id)) ? w : null
  })
  const [exercises, setExercises]      = useState([])
  const [tab, setTab]                  = useState('dashboard')

  const setUser = (u) => {
    setUserRaw(u)
    if (u) localStorage.setItem('il_user', JSON.stringify(u))
    else   localStorage.removeItem('il_user')
  }

  const setActiveWorkout = (w) => {
    setWorkoutRaw(w)
    if (w) localStorage.setItem('il_workout', JSON.stringify(w))
    else   localStorage.removeItem('il_workout')
  }

  const logout = () => { setUser(null); setActiveWorkout(null) }

  // Validate stored session against live server on startup.
  // Clears stale workout if it no longer exists.
  // Logs out entirely if the user_id itself is gone from the DB (server migration).
  useEffect(() => {
    if (!user) return
    api.getWorkoutsByUser(user.user_id)
      .then(rows => {
        if (activeWorkout) {
          const ids = new Set((rows || []).map(r => Array.isArray(r) ? r[0] : r.id))
          if (!ids.has(activeWorkout.id)) setActiveWorkout(null)
        }
      })
      .catch(err => {
        // 422 with user_id in detail = user doesn't exist in DB → force re-signup
        if (err?.message?.includes('user_id')) {
          setUser(null)
          setWorkoutRaw(null)
          localStorage.removeItem('il_user')
          localStorage.removeItem('il_workout')
        }
      })
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return
    api.getExercises()
      .then(async rows => {
        if (!rows || rows.length === 0) {
          for (const ex of SEED_EXERCISES) {
            await api.seedExercise(ex.name, ex.muscle_group).catch(() => {})
          }
          return api.getExercises()
        }
        return rows
      })
      .then(rows => setExercises(
        (rows || []).map(r => ({ id: r[0], name: r[1], muscle_group: r[2] }))
      ))
      .catch(() => {})
  }, [user])

  return (
    <AppContext.Provider value={{ user, setUser, logout, activeWorkout, setActiveWorkout, exercises, tab, setTab }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
