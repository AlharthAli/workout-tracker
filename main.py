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

#creating api and adding routes
@app.get("/")
def tes():
    return {"hello":"world"}

