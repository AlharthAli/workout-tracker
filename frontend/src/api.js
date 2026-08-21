const BASE = 'http://workout-tracker-alb-1218280969.us-east-2.elb.amazonaws.com'

async function req(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const res = await fetch(`${BASE}${path}`, opts)
  let data
  try { data = await res.json() } catch { data = {} }
  if (!res.ok) {
    console.error('API error', res.status, res.url, data)
    const detail = data?.detail
    const msg = Array.isArray(detail)
      ? detail.map(e => {
          const field = Array.isArray(e.loc) ? e.loc.filter(x => x !== 'body').join('.') : null
          return field ? `${field}: ${e.msg}` : (e.msg || JSON.stringify(e))
        }).join('; ')
      : data?.message || detail || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return data
}

export const api = {
  signup:            (name, email, password)  => req('POST', '/users',  { name, email, password }),
  login:             (email, password)         => req('POST', '/login',  { email, password }),
  getExercises:      ()                        => req('GET',  '/exercises'),
  seedExercise:      (name, muscle_group)      => req('POST', '/exercise', { name, muscle_group }),
  getRecommendation: (id)                      => req('GET',  `/exercises/${id}/recommendation`),
  getHistory:        (id)                      => req('GET',  `/exercises/${id}/history`),
  getWorkouts:       ()                        => req('GET',  '/workouts'),
  getWorkoutsByUser: (user_id)                 => req('GET',  `/workouts?user_id=${user_id}`),
  getWorkoutSets:    (workout_id)              => req('GET',  `/workouts/${workout_id}/sets`),
  startWorkout:      (user_id, date)           => req('POST', '/workout', { user_id, date }),
  getSets:           ()                        => req('GET',  '/sets'),
  logSet:            (workout_id, exercise_id, set_number, reps, weight, completed) =>
                       req('POST', '/sets', { workout_id, exercise_id, set_number, reps, weight, completed }),
}
