import os
import psycopg2
from contextlib import contextmanager
from dotenv import load_dotenv
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException
from passlib.context import CryptContext
from datetime import date

load_dotenv()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )

# Context manager so every route gets automatic commit/rollback/close
# and any DB error becomes a 422 HTTPException (CORS-safe JSON) instead
# of a raw 500 text/plain that the browser can't read cross-origin.
@contextmanager
def db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except psycopg2.Error as e:
        conn.rollback()
        raise HTTPException(status_code=422, detail=str(e).strip())
    finally:
        conn.close()


class User(BaseModel):
    name: str
    email: str
    password: str  # plain — hashed before storage

class Exercise(BaseModel):
    name: str
    muscle_group: str

class Workout(BaseModel):
    user_id: int
    date: str

class Set(BaseModel):
    workout_id: int
    exercise_id: int
    set_number: int
    reps: int
    weight: float
    completed: bool = True

class LoginRequest(BaseModel):
    email: str
    password: str


@app.post("/exercise")
def create_exercise(exercise: Exercise):
    with db() as conn:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO exercises (name, muscle_group) VALUES (%s, %s)",
            (exercise.name, exercise.muscle_group)
        )
    return {"message": "Exercise added successfully"}

@app.get("/exercises")
def list_exercises():
    with db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM exercises ORDER BY muscle_group, name")
        rows = cur.fetchall()
    return rows

@app.post("/workout")
def create_workout(workout: Workout):
    with db() as conn:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO workouts (user_id, date) VALUES (%s, %s) RETURNING id",
            (workout.user_id, workout.date)
        )
        workout_id = cur.fetchone()[0]
    return {"message": "Workout added successfully", "id": workout_id}

@app.get("/workouts")
def list_workouts(user_id: int = None):
    with db() as conn:
        cur = conn.cursor()
        if user_id is not None:
            cur.execute(
                "SELECT * FROM workouts WHERE user_id = %s ORDER BY date DESC, id DESC",
                (user_id,)
            )
        else:
            cur.execute("SELECT * FROM workouts ORDER BY date DESC, id DESC")
        rows = cur.fetchall()
    return rows

@app.get("/workouts/{workout_id}/sets")
def get_workout_sets(workout_id: int):
    with db() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT sets.id, sets.workout_id, sets.exercise_id, exercises.name,
                   sets.set_number, sets.reps, sets.weight, sets.completed
            FROM sets
            JOIN exercises ON sets.exercise_id = exercises.id
            WHERE sets.workout_id = %s
            ORDER BY sets.exercise_id, sets.set_number
        """, (workout_id,))
        rows = cur.fetchall()
    return rows

@app.post("/sets")
def create_set(set_data: Set):
    with db() as conn:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO sets (workout_id, exercise_id, set_number, reps, weight, completed) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (set_data.workout_id, set_data.exercise_id, set_data.set_number,
             set_data.reps, set_data.weight, set_data.completed)
        )
    return {"message": "Set added successfully"}

@app.get("/sets")
def list_sets():
    with db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM sets")
        rows = cur.fetchall()
    return rows

@app.get("/exercises/{exercise_id}/history")
def get_exercise_history(exercise_id: int):
    with db() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT sets.reps, sets.weight, sets.completed, workouts.date
            FROM sets
            JOIN workouts ON sets.workout_id = workouts.id
            WHERE sets.exercise_id = %s
            ORDER BY workouts.date
        """, (exercise_id,))
        rows = cur.fetchall()
    return rows

REP_RANGE_MIN = 8
REP_RANGE_MAX = 10
PLATEAU_SESSION_COUNT = 3

@app.get("/exercises/{exercise_id}/recommendation")
def get_recommendation(exercise_id: int):
    with db() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT sets.reps, sets.weight, sets.completed, workouts.date
            FROM sets
            JOIN workouts ON sets.workout_id = workouts.id
            WHERE sets.exercise_id = %s
            ORDER BY workouts.date
        """, (exercise_id,))
        history = cur.fetchall()

    if not history:
        return {"message": "No history yet — log a set to get started"}

    latest_date = history[-1][3]
    latest_session_sets = [s for s in history if s[3] == latest_date]
    current_weight = latest_session_sets[0][1]

    all_dates = sorted(set(s[3] for s in history))
    if len(all_dates) >= PLATEAU_SESSION_COUNT:
        last_three_dates = all_dates[-PLATEAU_SESSION_COUNT:]
        weights_used = [
            next(s[1] for s in history if s[3] == d)
            for d in last_three_dates
        ]
        if len(set(weights_used)) == 1:
            return {
                "recommended_weight": current_weight,
                "reason": f"Plateau detected — weight unchanged for {PLATEAU_SESSION_COUNT} sessions. Consider a deload or exercise swap."
            }

    all_hit_max  = all(s[0] >= REP_RANGE_MAX for s in latest_session_sets)
    any_below_min = any(s[0] < REP_RANGE_MIN for s in latest_session_sets)

    if all_hit_max:
        return {
            "recommended_weight": current_weight + 5,
            "reason": f"Hit {REP_RANGE_MAX}+ reps on every set — time to increase weight"
        }
    elif any_below_min:
        return {
            "recommended_weight": current_weight,
            "reason": f"Fell below {REP_RANGE_MIN} reps on at least one set — hold weight, focus on hitting the range"
        }
    else:
        return {
            "recommended_weight": current_weight,
            "reason": "Still progressing within the rep range — keep the same weight"
        }

@app.post("/users")
def create_user(user: User):
    hashed_password = pwd_context.hash(user.password)
    with db() as conn:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO users (name, email, password_hash, created_at) VALUES (%s, %s, %s, %s)",
            (user.name, user.email, hashed_password, str(date.today()))
        )
    return {"message": "User created successfully"}

@app.post("/login")
def login(credentials: LoginRequest):
    with db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, password_hash FROM users WHERE email = %s", (credentials.email,))
        user = cur.fetchone()

    if user is None:
        return {"message": "Invalid email or password"}

    if pwd_context.verify(credentials.password, user[1]):
        return {"message": "Login successful", "user_id": user[0]}
    return {"message": "Invalid email or password"}
