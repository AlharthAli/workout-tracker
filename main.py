import os
import psycopg2
from dotenv import load_dotenv
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
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

# Centralized connection helper — every route calls this instead of
# repeating the same psycopg2.connect(...) block everywhere
def get_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )

class User(BaseModel):
    name: str
    email: str
    password: str  # plain password from the request; hashed before storage, never stored raw

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
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO exercises (name, muscle_group) VALUES (%s, %s)",
        (exercise.name, exercise.muscle_group)
    )
    conn.commit()
    conn.close()
    return {"message": "Exercise added successfully"}

@app.get("/exercises")
def list_excercises():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM exercises")
    rows = cursor.fetchall()
    conn.close()
    return rows

@app.post("/workout")
def create_workout(workout: Workout):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO workouts (user_id, date) VALUES (%s, %s)",
        (workout.user_id, workout.date)
    )
    conn.commit()
    conn.close()
    return {"message": "Workout added successfully"}

@app.get("/workouts")
def list_workouts():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM workouts")
    rows = cursor.fetchall()
    conn.close()
    return rows

@app.post("/sets")
def create_set(set_data: Set):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO sets (workout_id, exercise_id, set_number, reps, weight, completed) VALUES (%s, %s, %s, %s, %s, %s)",
        (set_data.workout_id, set_data.exercise_id, set_data.set_number, set_data.reps, set_data.weight, set_data.completed)
    )
    conn.commit()
    conn.close()
    return {"message": "Set added successfully"}

@app.get("/sets")
def list_set():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sets")
    rows = cursor.fetchall()
    conn.close()
    return rows

@app.get("/exercises/{exercise_id}/history")
def get_exercise_history(exercise_id: int):
    # Joins sets with workouts to pull each set's date, since sets
    # only stores workout_id, not the date itself
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT sets.reps, sets.weight, sets.completed, workouts.date
        FROM sets
        JOIN workouts ON sets.workout_id = workouts.id
        WHERE sets.exercise_id = %s
        ORDER BY workouts.date
    """, (exercise_id,))
    rows = cursor.fetchall()
    conn.close()
    return rows

REP_RANGE_MIN = 8
REP_RANGE_MAX = 10
PLATEAU_SESSION_COUNT = 3

@app.get("/exercises/{exercise_id}/recommendation")
def get_recommendation(exercise_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT sets.reps, sets.weight, sets.completed, workouts.date
        FROM sets
        JOIN workouts ON sets.workout_id = workouts.id
        WHERE sets.exercise_id = %s
        ORDER BY workouts.date
    """, (exercise_id,))
    history = cursor.fetchall()
    conn.close()

    if not history:
        return {"message": "No history yet — log a set to get started"}

    # Evaluate the whole most-recent session, not just the last row —
    # the last logged set could be the hardest set of the day and
    # misrepresent how the session actually went
    latest_date = history[-1][3]
    latest_session_sets = [s for s in history if s[3] == latest_date]
    current_weight = latest_session_sets[0][1]

    # Plateau check runs first: 3+ sessions at the same weight overrides
    # a simple progression recommendation
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

    # Double progression: only increase weight once every set in the
    # session hits the top of the rep range
    all_hit_max = all(s[0] >= REP_RANGE_MAX for s in latest_session_sets)
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
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO users (name, email, password_hash, created_at) VALUES (%s, %s, %s, %s)",
        (user.name, user.email, hashed_password, str(date.today()))
    )
    conn.commit()
    conn.close()
    return {"message": "User created successfully"}

@app.post("/login")
def login(credentials: LoginRequest):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, password_hash FROM users WHERE email = %s", (credentials.email,))
    user = cursor.fetchone()
    conn.close()

    if user is None:
        return {"message": "Invalid email or password"}

    stored_hash = user[1]
    if pwd_context.verify(credentials.password, stored_hash):
        return {"message": "Login successful", "user_id": user[0]}
    else:
        return {"message": "Invalid email or password"}