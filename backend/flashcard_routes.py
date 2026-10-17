
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
import os
import json
from google import genai
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from database import get_db
from models import Flashcard
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None


router = APIRouter(
    prefix="/api/flashcards",
    tags=["Flashcards"]
)
class TranscriptRequest(BaseModel):
    transcript: str = Field(min_length=1, max_length=50000)

class FlashcardCreate(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    answer: str = Field(min_length=1, max_length=5000)
    category: str = Field(
        default="concept",
        min_length=1,
        max_length=50
    )


@router.post("/", status_code=201)
def create_flashcard(
    card: FlashcardCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    question = card.question.strip()
    answer = card.answer.strip()
    category = card.category.strip().lower()

    if not question or not answer:
        raise HTTPException(
            status_code=422,
            detail="Question and answer cannot be empty."
        )

    if category not in {"concept", "formula", "definition"}:
        raise HTTPException(
            status_code=422,
            detail="Category must be concept, formula, or definition."
        )

    new_card = Flashcard(
        user_id=current_user.id,
        question=question,
        answer=answer,
        category=category
    )

    try:
        db.add(new_card)
        db.commit()
        db.refresh(new_card)

        return {
            "message": "Flashcard created successfully.",
            "id": new_card.id,
            "question": new_card.question,
            "answer": new_card.answer,
            "category": new_card.category
        }

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not save the flashcard."
        )




@router.get("/")
def get_flashcards(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    flashcards = (
        db.query(Flashcard)
        .filter(Flashcard.user_id == current_user.id)
        .order_by(Flashcard.id)
        .all()
    )

    return [
        {
            "id": card.id,
            "question": card.question,
            "answer": card.answer,
            "category": card.category
        }
        for card in flashcards
    ]


@router.post("/generate")
def generate_flashcards(
    request: TranscriptRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    transcript = request.transcript.strip()

    if not transcript:
        raise HTTPException(
            status_code=422,
            detail="Lecture transcript cannot be empty."
        )

    if client is None:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is missing from .env"
        )

    try:
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=f"""
Create 5 useful study flashcards from this lecture transcript.

Return ONLY a valid JSON array.
Each item must contain:
- "question": a clear question
- "answer": a short, accurate answer
- "category": one of "concept", "formula", or "definition"

Example:
[
  {{
    "question": "What is active recall?",
    "answer": "Retrieving information from memory without looking at notes.",
    "category": "definition"
  }}
]

Lecture transcript:
{transcript}
"""
        )

        if not response.text:
            raise HTTPException(
                status_code=502,
                detail="Gemini returned an empty response."
            )

        generated_cards = json.loads(response.text)

        if not isinstance(generated_cards, list) or not generated_cards:
            raise HTTPException(
                status_code=502,
                detail="Gemini did not return a valid flashcard list."
            )

        saved_cards = []

        for item in generated_cards:
            question = str(item.get("question", "")).strip()
            answer = str(item.get("answer", "")).strip()
            category = str(item.get("category", "concept")).strip().lower()

            if not question or not answer:
                continue

            if category not in {"concept", "formula", "definition"}:
                category = "concept"

            new_card = Flashcard(
                user_id=current_user.id,
                question=question[:2000],
                answer=answer[:5000],
                category=category
            )

            db.add(new_card)
            saved_cards.append(new_card)

        if not saved_cards:
            raise HTTPException(
                status_code=502,
                detail="No valid flashcards could be generated."
            )

        db.commit()

        for card in saved_cards:
            db.refresh(card)

        return {
            "message": "Flashcards generated and saved successfully.",
            "count": len(saved_cards),
            "flashcards": [
                {
                    "id": card.id,
                    "question": card.question,
                    "answer": card.answer,
                    "category": card.category
                }
                for card in saved_cards
            ]
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=502,
            detail="Flashcard generation failed. Check the Gemini model, API key, and response."
        )
