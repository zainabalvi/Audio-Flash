
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = "http://127.0.0.1:8000";

type Flashcard = {
  id: number;
  question: string;
  answer: string;
  category: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [lectureText, setLectureText] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("Checking your account...");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [viewingId, setViewingId] = useState<number | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  const [editCategory, setEditCategory] = useState("concept");
  const [savingEdit, setSavingEdit] = useState(false);

  // Verify login
  useEffect(() => {
    const savedToken = localStorage.getItem("audio_flash_token");

    if (!savedToken) {
      router.replace("/login");
      return;
    }

    async function verifyLogin() {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
        });

        if (!response.ok) {
          localStorage.removeItem("audio_flash_token");
          router.replace("/login");
          return;
        }

        const user = await response.json();

        setToken(savedToken);
        setUsername(user.username || user.email || "Student");
        setMessage("Welcome to your learning space.");
        setReady(true);
      } catch {
        setMessage(
          "Cannot connect to the backend. Please check FastAPI and refresh."
        );
      }
    }

    verifyLogin();
  }, [router]);

  function logout() {
    localStorage.removeItem("audio_flash_token");
    router.replace("/login");
  }

  // Load saved flashcards
  async function loadFlashcards() {
    if (!token) {
      setMessage("Please log in again.");
      return;
    }

    setLoading(true);
    setMessage("Loading your flashcards...");

    try {
      const response = await fetch(`${API_URL}/api/flashcards/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(
          data?.detail ||
            `Could not load flashcards (HTTP ${response.status}).`
        );
        return;
      }

      if (!Array.isArray(data)) {
        setMessage("The backend returned an unexpected flashcard format.");
        return;
      }

      setCards(data);
      setMessage(`Loaded ${data.length} flashcard(s).`);
    } catch {
      setMessage("Could not connect to FastAPI. Check that it is running.");
    } finally {
      setLoading(false);
    }
  }

  // Generate flashcards from a transcript
  async function generateFromTranscript(transcript: string) {
    const response = await fetch(`${API_URL}/api/flashcards/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ transcript }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        data?.detail ||
          `Could not generate flashcards (HTTP ${response.status}).`
      );
    }

    // Refresh the saved cards after generation
    const cardsResponse = await fetch(`${API_URL}/api/flashcards/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const savedCards = await cardsResponse.json().catch(() => null);

    if (!cardsResponse.ok || !Array.isArray(savedCards)) {
      throw new Error(
        "Flashcards may have been generated, but the saved cards could not be reloaded. Click Load my flashcards."
      );
    }

    setCards(savedCards);

    return data;
  }

  // Generate from text pasted into the textarea
  async function generateFlashcards() {
    if (!lectureText.trim()) {
      setMessage("Please paste a lecture transcript first.");
      return;
    }

    if (!token) {
      setMessage("Please log in again.");
      return;
    }

    setLoading(true);
    setMessage("Generating flashcards...");

    try {
      const data = await generateFromTranscript(lectureText.trim());

      setMessage(
        `Successfully generated ${data?.count ?? "new"} flashcard(s)!`
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not generate flashcards."
      );
    } finally {
      setLoading(false);
    }
  }

  // Upload audio, transcribe it, and generate flashcards automatically
  async function uploadAudioAndGenerate() {
    if (!audioFile) {
      setMessage("Please select an audio file first.");
      return;
    }

    if (!token) {
      setMessage("Please log in again.");
      return;
    }

    const allowedExtensions = [".ogg", ".mp3", ".wav", ".m4a"];
    const filename = audioFile.name.toLowerCase();
    const isAllowed = allowedExtensions.some((extension) =>
      filename.endsWith(extension)
    );

    if (!isAllowed) {
      setMessage("Please choose an .ogg, .mp3, .wav, or .m4a audio file.");
      return;
    }

    if (audioFile.size === 0) {
      setMessage("The selected audio file is empty.");
      return;
    }

    setLoading(true);
    setMessage("Uploading audio and converting it into text...");

    try {
      const formData = new FormData();
      formData.append("file", audioFile);

      // Step 1: Send audio to your existing FastAPI transcription endpoint
      const transcriptionResponse = await fetch(
        `${API_URL}/api/audio/transcribe`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const transcriptionData = await transcriptionResponse
        .json()
        .catch(() => null);

      if (!transcriptionResponse.ok) {
        throw new Error(
          transcriptionData?.detail ||
            `Audio transcription failed (HTTP ${transcriptionResponse.status}).`
        );
      }

      const transcript = transcriptionData?.text;

      if (typeof transcript !== "string" || !transcript.trim()) {
        throw new Error(
          "No transcript was returned. Please try another audio file."
        );
      }

      // Display the transcript in the existing text box
      setLectureText(transcript);
      setMessage("Audio transcribed successfully. Generating flashcards...");

      // Step 2: Generate and save flashcards from the transcript
      const generationData = await generateFromTranscript(transcript.trim());

      setAudioFile(null);

      setMessage(
        `Audio transcribed successfully! Generated ${
          generationData?.count ?? "new"
        } flashcard(s). Your saved cards are displayed below.`
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Audio upload or flashcard generation failed."
      );
    } finally {
      setLoading(false);
    }
  }

  // Start editing
  function startEditing(card: Flashcard) {
    setViewingId(null);
    setEditingId(card.id);
    setEditQuestion(card.question);
    setEditAnswer(card.answer);
    setEditCategory(
      ["concept", "formula", "definition"].includes(card.category)
        ? card.category
        : "concept"
    );
    setMessage("Edit your flashcard below.");
  }

  // Cancel editing
  function cancelEditing() {
    setEditingId(null);
    setEditQuestion("");
    setEditAnswer("");
    setEditCategory("concept");
    setMessage("Editing cancelled.");
  }

  // Save edited flashcard
  async function saveEditedFlashcard(cardId: number) {
    if (!editQuestion.trim() || !editAnswer.trim()) {
      setMessage("Question and answer cannot be empty.");
      return;
    }

    if (!token) {
      setMessage("Please log in again.");
      return;
    }

    setSavingEdit(true);
    setMessage("Saving changes...");

    try {
      const response = await fetch(`${API_URL}/api/flashcards/${cardId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: editQuestion.trim(),
          answer: editAnswer.trim(),
          category: editCategory,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(
          data?.detail ||
            `Could not update flashcard (HTTP ${response.status}).`
        );
        return;
      }

      setCards((previous) =>
        previous.map((card) =>
          card.id === cardId
            ? {
                ...card,
                question: data.question ?? editQuestion.trim(),
                answer: data.answer ?? editAnswer.trim(),
                category: data.category ?? editCategory,
              }
            : card
        )
      );

      setEditingId(null);
      setEditQuestion("");
      setEditAnswer("");
      setEditCategory("concept");
      setMessage("Flashcard updated successfully.");
    } catch {
      setMessage("Could not connect to FastAPI. Check that it is running.");
    } finally {
      setSavingEdit(false);
    }
  }

  // Delete flashcard
  async function deleteFlashcard(cardId: number) {
    if (!token || !Number.isInteger(cardId) || cardId <= 0) {
      setMessage("This flashcard has no valid database ID. Reload your cards.");
      return;
    }

    if (
      !window.confirm("Are you sure you want to delete this flashcard?")
    ) {
      return;
    }

    setDeletingId(cardId);
    setMessage("Deleting flashcard...");

    try {
      const response = await fetch(`${API_URL}/api/flashcards/${cardId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(
          data?.detail ||
            `Could not delete flashcard (HTTP ${response.status}).`
        );
        return;
      }

      setCards((previous) =>
        previous.filter((card) => card.id !== cardId)
      );

      if (editingId === cardId) setEditingId(null);
      if (viewingId === cardId) setViewingId(null);

      setMessage("Flashcard deleted successfully.");
    } catch {
      setMessage("Could not connect to FastAPI. Check that it is running.");
    } finally {
      setDeletingId(null);
    }
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <p>{message}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
              AF
            </div>

            <div>
              <h1 className="text-xl font-bold text-indigo-700">
                Audio Flash
              </h1>
              <p className="text-xs text-slate-500">
                Your learning dashboard
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100"
          >
            Log out
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-5 py-10">
        <section className="rounded-3xl bg-gradient-to-r from-indigo-700 to-violet-800 p-8 text-white shadow-sm md:p-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-200">
            Student workspace
          </p>

          <h2 className="mt-3 text-3xl font-bold md:text-4xl">
            Welcome back, {username}!
          </h2>

          <p className="mt-3 max-w-2xl leading-7 text-indigo-100">
            Turn lecture audio or transcripts into useful study flashcards
            and make revision easier with active recall.
          </p>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Create flashcards */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold">Create flashcards</h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Upload lecture audio to create flashcards automatically, or
              paste a transcript below.
            </p>

            {/* Audio upload */}
            <div className="mt-5 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
              <label
                htmlFor="audio-upload"
                className="block font-semibold text-indigo-900"
              >
                Upload lecture audio
              </label>

              <p className="mt-1 text-sm text-slate-600">
                Supported formats: OGG, MP3, WAV, M4A
              </p>

              <input
                id="audio-upload"
                type="file"
                accept=".ogg,.mp3,.wav,.m4a,audio/ogg,audio/mpeg,audio/wav,audio/mp4"
                onChange={(event) =>
                  setAudioFile(event.target.files?.[0] ?? null)
                }
                disabled={loading || savingEdit || deletingId !== null}
                className="mt-3 block w-full cursor-pointer rounded-lg border border-slate-300 bg-white p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-100 file:px-3 file:py-2 file:font-semibold file:text-indigo-700"
              />

              {audioFile && (
                <p className="mt-2 break-all text-sm text-slate-600">
                  Selected: {audioFile.name}
                </p>
              )}

              <button
                onClick={uploadAudioAndGenerate}
                disabled={
                  loading ||
                  !audioFile ||
                  savingEdit ||
                  deletingId !== null
                }
                className="mt-4 w-full rounded-xl bg-violet-700 px-5 py-3 font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Processing..." : "Upload Audio & Generate Flashcards"}
              </button>
            </div>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-semibold uppercase text-slate-400">
                Or paste transcript
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <textarea
              className="min-h-56 w-full rounded-xl border border-slate-300 p-4 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="Paste your lecture transcript here..."
              value={lectureText}
              onChange={(event) => setLectureText(event.target.value)}
              disabled={loading}
            />

            <div className="mt-2 text-right text-xs text-slate-500">
              {lectureText.length} characters
            </div>

            <button
              onClick={generateFlashcards}
              disabled={
                loading ||
                deletingId !== null ||
                savingEdit ||
                !lectureText.trim()
              }
              className="mt-4 w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Please wait..." : "Generate Flashcards"}
            </button>
          </section>

          {/* My flashcards */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold">My flashcards</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  View, edit, and delete flashcards saved for your account.
                </p>
              </div>

              <div className="rounded-xl bg-indigo-50 px-4 py-3 text-center">
                <p className="text-2xl font-bold text-indigo-700">
                  {cards.length}
                </p>
                <p className="text-xs text-indigo-600">Loaded cards</p>
              </div>
            </div>

            <button
              onClick={loadFlashcards}
              disabled={loading || deletingId !== null || savingEdit}
              className="mt-5 w-full rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-3 font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
            >
              Load my flashcards
            </button>

            <div className="mt-5 max-h-[600px] space-y-3 overflow-y-auto">
              {cards.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                  <p className="font-medium text-slate-600">
                    No cards displayed yet
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Generate new cards or load your saved flashcards.
                  </p>
                </div>
              ) : (
                cards.map((card, index) => (
                  <article
                    key={card.id ?? `${card.question}-${index}`}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                      {card.category || "General"}
                    </p>

                    {viewingId === card.id && (
                      <div className="mt-4 rounded-xl bg-blue-50 p-4">
                        <h4 className="mb-3 text-lg font-bold text-blue-800">
                          Flashcard Details
                        </h4>
                        <p className="mb-3 whitespace-pre-wrap break-words text-sm leading-6">
                          <strong>Question:</strong> {card.question}
                        </p>
                        <p className="mb-3 whitespace-pre-wrap break-words text-sm leading-6">
                          <strong>Answer:</strong> {card.answer}
                        </p>
                        <p className="text-sm">
                          <strong>Category:</strong>{" "}
                          {card.category || "General"}
                        </p>
                      </div>
                    )}

                    {editingId === card.id ? (
                      <div className="mt-3 space-y-3">
                        <label className="block text-sm font-semibold">
                          Question
                        </label>
                        <textarea
                          className="w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-indigo-500"
                          value={editQuestion}
                          onChange={(event) =>
                            setEditQuestion(event.target.value)
                          }
                          maxLength={2000}
                        />

                        <label className="block text-sm font-semibold">
                          Answer
                        </label>
                        <textarea
                          className="w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-indigo-500"
                          value={editAnswer}
                          onChange={(event) =>
                            setEditAnswer(event.target.value)
                          }
                          maxLength={5000}
                        />

                        <label className="block text-sm font-semibold">
                          Category
                        </label>
                        <select
                          className="w-full rounded-lg border border-slate-300 p-3 text-sm"
                          value={editCategory}
                          onChange={(event) =>
                            setEditCategory(event.target.value)
                          }
                        >
                          <option value="concept">Concept</option>
                          <option value="definition">Definition</option>
                          <option value="formula">Formula</option>
                        </select>

                        <div className="flex flex-wrap gap-2 pt-2">
                          <button
                            onClick={() => saveEditedFlashcard(card.id)}
                            disabled={
                              savingEdit || loading || deletingId !== null
                            }
                            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            {savingEdit ? "Saving..." : "Save Changes"}
                          </button>
                          <button
                            onClick={cancelEditing}
                            disabled={savingEdit}
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h4 className="mt-2 font-semibold">
                          {card.question}
                        </h4>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {card.answer}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              setViewingId(
                                viewingId === card.id ? null : card.id
                              )
                            }
                            disabled={
                              savingEdit || deletingId !== null || loading
                            }
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            {viewingId === card.id
                              ? "Hide Details"
                              : "View Flashcard"}
                          </button>

                          <button
                            onClick={() => startEditing(card)}
                            disabled={
                              savingEdit || deletingId !== null || loading
                            }
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                          >
                            Edit Flashcard
                          </button>

                          <button
                            onClick={() => deleteFlashcard(card.id)}
                            disabled={
                              savingEdit || deletingId !== null || loading
                            }
                            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            {deletingId === card.id
                              ? "Deleting..."
                              : "Delete Flashcard"}
                          </button>
                        </div>
                      </>
                    )}
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        {message && (
          <p
            role="status"
            aria-live="polite"
            className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600"
          >
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
