from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def home():
    return {"message": "Audio Flash Backend is Running!"}
