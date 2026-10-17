
from flashcard_routes import router as flashcard_router

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import assemblyai as aai
from google import genai
from dotenv import load_dotenv
import os

from auth.routes import router as auth_router
from database import Base, engine
import models
# Load environment variables from .env
load_dotenv()

# AssemblyAI API key
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
aai.settings.api_key = ASSEMBLYAI_API_KEY

# Gemini API key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

# Create FastAPI application
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://10.10.103.128:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
Base.metadata.create_all(bind=engine)
app.include_router(auth_router)
app.include_router(flashcard_router)

# Register authentication routes once
app.include_router(auth_router)


@app.get("/")
def home():
    return {"message": "Audio Flash Backend is working!"}


@app.get("/test-gemini")
def test_gemini():
    if client is None:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is missing from .env"
        )

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents="Say hello to Audio Flash in one short sentence."
    )

    return {"response": response.text}


@app.post("/api/audio/upload")
async def upload_audio(file: UploadFile = File(...)):
    return {
        "message": "Audio file received successfully",
        "filename": file.filename,
        "content_type": file.content_type
    }


@app.post("/api/audio/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    # Check the file extension
    allowed_extensions = (".ogg", ".mp3", ".wav", ".m4a")
    filename = (file.filename or "").lower()

    if not filename.endswith(allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload an OGG, MP3, WAV, or M4A file."
        )

    # Read the uploaded audio
    audio_data = await file.read()

    # Reject empty files
    if not audio_data:
        raise HTTPException(
            status_code=400,
            detail="The uploaded audio file is empty."
        )

    if not ASSEMBLYAI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="ASSEMBLYAI_API_KEY is missing from .env"
        )

    if client is None:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is missing from .env"
        )

    try:
        # Transcribe audio using AssemblyAI
        aai.settings.api_key = ASSEMBLYAI_API_KEY
        transcriber = aai.Transcriber()
        transcript = transcriber.transcribe(audio_data)

        if not transcript.text:
            raise HTTPException(
                status_code=422,
                detail="No speech could be transcribed from this audio."
            )

        # Translate Hindi text into English using Gemini
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=f"""
Translate the following Hindi text into natural English.
Return only the English translation.
Do not explain anything.

Hindi text:
{transcript.text}
"""
        )

        translated_text = response.text or transcript.text

        return {
            "filename": file.filename,
            "status": "completed",
            "text": translated_text
        }

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Audio processing failed. Please check your API keys and try again."
        )

