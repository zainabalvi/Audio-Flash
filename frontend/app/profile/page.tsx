
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ProfilePage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("Loading profile...");

  useEffect(() => {
    const token = localStorage.getItem("audio_flash_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    async function loadProfile() {
      try {
        const response = await fetch(
          "http://127.0.0.1:8000/api/auth/me",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          localStorage.removeItem("audio_flash_token");
          router.replace("/login");
          return;
        }

        const user = await response.json();
        setUsername(user.username || "Student");
        setEmail(user.email || "Email not available");
        setMessage("Your profile information");
      } catch {
        setMessage("Could not connect to the backend.");
      }
    }

    loadProfile();
  }, [router]);

  function logout() {
    localStorage.removeItem("audio_flash_token");
    router.replace("/login");
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="font-semibold text-indigo-600">
          ← Back to Dashboard
        </Link>

        <section className="mt-6 rounded-2xl border bg-white p-8 shadow-sm">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-3xl font-bold text-indigo-700">
            {username ? username.charAt(0).toUpperCase() : "S"}
          </div>

          <h1 className="mt-5 text-2xl font-bold">My Profile</h1>
          <p className="mt-2 text-sm text-slate-500">{message}</p>

          <div className="mt-6 space-y-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Username</p>
              <p className="mt-1 font-semibold">{username || "Loading..."}</p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Email Address</p>
              <p className="mt-1 font-semibold">{email || "Loading..."}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="mt-6 w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
          >
            Log out
          </button>
        </section>
      </div>
    </main>
  );
}
