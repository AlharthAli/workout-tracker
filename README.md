# Adaptive Workout Tracker

A REST API that tracks workout history and generates personalized weight/rep
recommendations using a double-progression algorithm — instead of logging
sets into a static spreadsheet, the app tells you what to lift next based on
how your last session actually went.

## How it works

1. Log a workout session (`POST /workout`)
2. Log each set within that session — exercise, reps, weight, completed or not (`POST /sets`)
3. Ask for a recommendation for any exercise (`GET /exercises/{id}/recommendation`)

The algorithm looks at your **most recent full session** for that exercise
(not just the last logged set, which can be misleading if it was your
hardest set of the day) and applies three rules, in order:

- **Plateau check** — if the weight hasn't changed across the last 3 sessions,
  flag it and suggest a deload or exercise swap.
- **Progression** — if every set in the last session hit the top of the
  target rep range (8–10 reps), recommend increasing the weight.
- **Hold** — otherwise, keep the same weight and keep working within the
  rep range.

This is a "double progression" approach: reps increase first, within a
fixed range, and weight only increases once the top of that range is
hit consistently — closer to how a real coach would program it than a
flat "add 5lbs every week" rule.

## Tech stack

- **Python 3** / **FastAPI** — REST API
- **SQLite** — persistent relational storage
- **Pydantic** — request validation
- **Git/GitHub** — version control

## Database schema

Four related tables, connected via foreign keys:

```
users      (id, name, email, password_hash, created_at)
exercises  (id, name, muscle_group)
workouts   (id, user_id → users, date)
sets       (id, workout_id → workouts, exercise_id → exercises,
            set_number, reps, weight, completed)
```

One user has many workouts. One workout has many sets. Each set
references one exercise.

## API endpoints

| Method | Path                                  | Description                          |
|--------|----------------------------------------|---------------------------------------|
| POST   | `/exercise`                           | Add an exercise to the catalog        |
| GET    | `/exercises`                          | List all exercises                    |
| POST   | `/workout`                            | Start a new workout session           |
| GET    | `/workouts`                           | List all workout sessions             |
| POST   | `/sets`                               | Log a set                             |
| GET    | `/sets`                               | List all logged sets                  |
| GET    | `/exercises/{id}/history`             | Full set history for one exercise     |
| GET    | `/exercises/{id}/recommendation`      | Get the next weight/rep recommendation |

Interactive docs available at `/docs` once the server is running.

## Running locally

```bash
pip3 install fastapi uvicorn --break-system-packages
python3 create_db.py        # one-time: creates workout.db
uvicorn main:app --reload
```

Then open `http://127.0.0.1:8000/docs`.

## Roadmap

- [ ] User signup with hashed passwords
- [ ] Docker containerization
- [ ] Deployment (AWS ECS/RDS)
- [ ] React frontend
