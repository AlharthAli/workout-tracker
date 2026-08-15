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
                
    
    



