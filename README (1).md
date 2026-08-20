# Adaptive Workout Tracker

A deployed REST API that tracks workout history and generates personalized
weight/rep recommendations using a double-progression algorithm — instead of
logging sets into a static spreadsheet, the app tells you what to lift next
based on how your last session actually went.

**Live API:** `http://3.143.205.91:8000/docs`

## How it works

1. Sign up and log a workout session (`POST /users`, `POST /workout`)
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
- **PostgreSQL** (AWS RDS) — persistent relational storage
- **Pydantic** — request validation
- **Passlib / bcrypt** — password hashing for user auth
- **Docker** — containerization
- **AWS ECS (Fargate)** — container orchestration and hosting
- **AWS ECR** — Docker image registry
- **Git/GitHub** — version control

## Architecture

```
Client (browser / future frontend)
        │
        ▼
AWS ECS (Fargate) — runs the Dockerized FastAPI app, publicly reachable
        │
        ▼
AWS RDS (PostgreSQL) — persistent storage, private, only reachable by the app
```

The app and database run as separate AWS resources. The database is only
reachable from within AWS's network (not the public internet), while the
app itself is publicly reachable on port 8000. Credentials are passed to
the container via environment variables and never committed to source
control.

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

| Method | Path                                  | Description                            |
|--------|----------------------------------------|-----------------------------------------|
| POST   | `/users`                              | Sign up (password hashed with bcrypt)   |
| POST   | `/login`                              | Log in, verifies password hash          |
| POST   | `/exercise`                           | Add an exercise to the catalog          |
| GET    | `/exercises`                          | List all exercises                      |
| POST   | `/workout`                            | Start a new workout session             |
| GET    | `/workouts`                           | List all workout sessions               |
| POST   | `/sets`                               | Log a set                               |
| GET    | `/sets`                               | List all logged sets                    |
| GET    | `/exercises/{id}/history`             | Full set history for one exercise       |
| GET    | `/exercises/{id}/recommendation`      | Get the next weight/rep recommendation  |

Interactive docs available at `/docs` on both the live deployment and locally.

## Running locally

```bash
pip3 install -r requirements.txt
python3 create_db.py        # one-time: creates tables in the connected database
uvicorn main:app --reload
```

Requires a `.env` file (not committed) with:
```
DB_HOST=...
DB_PORT=5432
DB_NAME=...
DB_USER=...
DB_PASSWORD=...
```

Then open `http://127.0.0.1:8000/docs`.

## Running with Docker

```bash
docker build -t workout-tracker .
docker run -p 8000:8000 --env-file .env workout-tracker
```

## Roadmap

- [x] User signup with hashed passwords
- [x] Docker containerization
- [x] Deployment to AWS (ECS + RDS)
- [ ] React frontend
