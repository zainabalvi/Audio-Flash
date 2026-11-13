
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Logging in...");
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", password);

      const response = await fetch("http://127.0.0.1:8000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          typeof data.detail === "string"
            ? data.detail
            : "Login failed. Please check your username and password."
        );
        return;
      }

      localStorage.setItem("audio_flash_token", data.access_token);
      router.push("/dashboard");
    } catch {
      setMessage("Cannot connect to the server. Please check FastAPI.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12 text-slate-900">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl md:grid-cols-2">
        <section className="flex flex-col justify-center bg-gradient-to-br from-indigo-700 to-violet-900 p-8 text-white md:p-12">
          <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold">
            AF
          </div>
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-200">
            Your learning space
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight">
            Welcome back!
          </h1>
          <p className="mt-5 leading-7 text-indigo-100">
            Sign in to create, organize, and review your lecture flashcards.
          </p>
        </section>

        <section className="p-8 md:p-12">
          <p className="text-sm font-semibold text-indigo-600">AUDIO FLASH</p>
          <h2 className="mt-2 text-3xl font-bold">Log in to your account</h2>
          <p className="mt-3 text-sm text-slate-500">
            Enter your account details to continue.
          </p>

          {searchParams.get("registered") === "1" && (
            <p className="mt-5 rounded-lg bg-green-50 p-3 text-sm text-green-700">
              Account created successfully. You can log in now.
            </p>
          )}

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <div>
              <label htmlFor="username" className="mb-2 block text-sm font-medium">
                Username
              </label>
              <input
                id="username"
                required
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter your username"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {message && (
              <p role="status" className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            New to Audio Flash?{" "}
            <Link href="/register" className="font-semibold text-indigo-600 hover:text-indigo-800">
              Create an account
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
