import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(
    host=os.getenv("DB_HOST"),
    port=os.getenv("DB_PORT"),
    dbname=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD")
)
cursor = conn.cursor()

cursor.execute("""
    CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
""")

cursor.execute("""
    CREATE TABLE exercises (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        muscle_group TEXT
    )
""")

cursor.execute("""
    CREATE TABLE workouts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
""")

cursor.execute("""
    CREATE TABLE sets (
        id SERIAL PRIMARY KEY,
        workout_id INTEGER NOT NULL,
        exercise_id INTEGER NOT NULL,
        set_number INTEGER NOT NULL,
        reps INTEGER NOT NULL,
        weight REAL NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (workout_id) REFERENCES workouts(id),
        FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    )
""")

conn.commit()
conn.close()
print("Tables created successfully")