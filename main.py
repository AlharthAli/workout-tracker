import sqlite3
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class User(BaseModel):
    name: str
    email: str
    password: str

class Exercise(BaseModel):
    name: str
    muscle_group: str
    
class Workout(BaseModel):
    user_id : int
    date : str
    
class Set(BaseModel):
    workout_id : int
    exercise_id : int
    set_number : int
    reps : int
    weight : float
    completed : bool = True
    
@app.post("/exercise")
def create_exercise(exercise: Exercise):
    conn = sqlite3.connect("workout.db")
    cursor = conn.cursor()

    cursor.execute(
        "INSERT INTO exercises (name, muscle_group) VALUES (?, ?)",
        (exercise.name, exercise.muscle_group)
    )

    conn.commit()
    conn.close()
    return {"message": "Exercise added successfully"}

@app.get("/exercises")
def list_excercises():
    conn = sqlite3.connect("workout.db")
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM exercises")
    rows = cursor.fetchall()
    conn.close()
    return rows

@app.post("/workout")
def create_workout(workout: Workout):
    conn = sqlite3.connect("workout.db")
    cursor = conn.cursor()
    
    cursor.execute(
        "INSERT INTO workouts (user_id,date) VALUES (?, ?)",
        (workout.user_id, workout.date)
    )
    
    conn.commit()
    conn.close()
    return {"message": "Workout added successfully"}

@app.get("/workouts")
def list_workouts():
    conn = sqlite3.connect("workout.db")
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM workouts")
    rows = cursor.fetchall()
    conn.close()
    return rows

@app.post("/sets")
def create_set(set_data: Set):
    conn = sqlite3.connect("workout.db")
    cursor = conn.cursor()
    
    cursor.execute(
        "INSERT INTO sets (workout_id,exercise_id,set_number,reps,weight,completed) VALUES (?, ?, ?, ?, ?, ?)",
        (set_data.workout_id, set_data.exercise_id, set_data.set_number, set_data.reps, set_data.weight, set_data.completed)
    )
    
    conn.commit()
    conn.close()
    return {"message": "Set added successfully"}

@app.get("/sets")
def list_set():
    conn  = sqlite3.connect("workout.db")
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM sets")
    rows = cursor.fetchall()
    conn.close()
    return rows

@app.get("/exercises/{exercise_id}/history")
def get_exercise_history(exercise_id: int):
    conn = sqlite3.connect("workout.db")
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT sets.reps, sets.weight, sets.completed, workouts.date
        FROM sets
        JOIN workouts ON sets.workout_id = workouts.id
        WHERE sets.exercise_id = ?
        ORDER BY workouts.date
    """, (exercise_id,))
    
    rows = cursor.fetchall()
    conn.close()
    return rows

REP_RANGE_MIN = 8
REP_RANGE_MAX = 10

@app.get("/exercises/{exercise_id}/recommendation")
def get_recommendation(exercise_id: int):
    conn = sqlite3.connect("workout.db")
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT sets.reps, sets.weight, sets.completed, workouts.date
        FROM sets
        JOIN workouts ON sets.workout_id = workouts.id
        WHERE sets.exercise_id = ?
        ORDER BY workouts.date
    """, (exercise_id,))
    
    history = cursor.fetchall()
    conn.close()
    
    if not history:
        return {"message": "No history yet — log a set to get started"}
    
    # Pull out every set from the most recent session (same date as the last logged set)
    latest_date = history[-1][3]
    latest_session_sets = [s for s in history if s[3] == latest_date]
    
    current_weight = latest_session_sets[0][1]
    
    # Double progression: only increase weight once every set hits the top of the rep range
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
    
    



