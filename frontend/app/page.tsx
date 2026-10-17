
"use client";

import { useState } from "react";

type Flashcard = {
  question: string;
  answer: string;
  category: string;
};

export default function Home() {
  const [lectureText, setLectureText] = useState("");
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");

  async function login() {
    setMessage("Logging in...");

    try {
      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", password);

      const response = await fetch(
        "http://127.0.0.1:8000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.detail || "Login failed. Check your details.");
        return;
      }

      setToken(data.access_token);
      setMessage("Login successful! You can now use your flashcards.");
      setPassword("");
    } catch {
      setMessage("Could not connect to the backend. Check FastAPI.");
    }
  }

  async function loadFlashcards() {
    if (!token) {
      setMessage("Please log in before loading flashcards.");
      return;
    }

    setMessage("Loading your flashcards...");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/flashcards/",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.detail ||
            `Could not load flashcards (HTTP ${response.status}).`
        );
        return;
      }

      setCards(data);
      setMessage(`Loaded ${data.length} flashcard(s).`);
    } catch {
      setMessage(
        "Could not connect to the backend. Make sure FastAPI is running."
      );
    }
  }

  async function generateFlashcards() {
    if (!token) {
      setMessage("Please log in before generating flashcards.");
      return;
    }

    if (!lectureText.trim()) {
      setMessage("Please paste your lecture transcript first.");
      return;
    }

    setMessage("Generating flashcards...");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/flashcards/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            transcript: lectureText,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.detail ||
            `Could not generate flashcards (HTTP ${response.status}).`
        );
        return;
      }

      setCards((previousCards) => [
        ...previousCards,
        ...data.flashcards,
      ]);

      setMessage(
        `Successfully generated ${data.count} flashcards!`
      );
    } catch {
      setMessage(
        "Could not connect to the backend. Make sure FastAPI is running."
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-indigo-700">
            Audio Flash
          </h1>
          <p className="mt-3 text-slate-600">
            Turn lecture learning into interactive flashcards.
          </p>
        </header>

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Log in</h2>
          <p className="mt-2 text-sm text-slate-600">
            Log in with your Audio Flash account.
          </p>

          <label className="mt-4 block text-sm font-medium">
            Username
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 p-3"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Enter your username"
            autoComplete="username"
          />

          <label className="mt-3 block text-sm font-medium">
            Password
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 p-3"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
          />

          <button
            className="mt-4 rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-700"
            onClick={login}
          >
            Log in
          </button>
        </section>

        <section className="mt-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Your lecture notes</h2>
          <p className="mt-2 text-sm text-slate-600">
            Paste your lecture transcript below, then generate study flashcards.
          </p>

          <textarea
            className="mt-4 min-h-36 w-full rounded-lg border border-slate-300 p-3"
            placeholder="Paste your lecture transcript here..."
            value={lectureText}
            onChange={(event) => setLectureText(event.target.value)}
          />

          <p className="mt-2 text-sm text-slate-500">
            {lectureText.length} characters
          </p>

          <button
            className="mt-4 rounded-lg bg-green-600 px-5 py-3 font-medium text-white hover:bg-green-700"
            onClick={generateFlashcards}
          >
            Generate Flashcards
          </button>
        </section>

        <section className="mt-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">My flashcards</h2>
          <p className="mt-2 text-sm text-slate-600">
            Load the flashcards saved for your account.
          </p>

          <button
            className="mt-4 rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-700"
            onClick={loadFlashcards}
          >
            Load my flashcards
          </button>

          {message && (
            <p className="mt-4 text-sm" role="status">
              {message}
            </p>
          )}

          <div className="mt-5 space-y-3">
            {cards.map((card, index) => (
              <article
                key={`${card.question}-${index}`}
                className="rounded-lg border border-slate-200 p-4"
              >
                <p className="text-xs font-semibold uppercase text-indigo-600">
                  {card.category}
                </p>
                <h3 className="mt-2 font-semibold">
                  {card.question}
                </h3>
                <p className="mt-2 text-slate-600">
                  {card.answer}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
