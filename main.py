from fastapi import FastAPI

app = FastAPI()
#creating api and adding routes
@app.get("/")
def tes():
    return {"hello":"world"}