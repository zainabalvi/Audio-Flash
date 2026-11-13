import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 font-bold">
            AF
          </span>
          <span className="text-xl font-bold">Audio Flash</span>
        </Link>

        <div className="flex gap-3">
          <Link href="/login" className="rounded-xl px-4 py-3 hover:bg-white/10">
            Log in
          </Link>
          <Link href="/register" className="rounded-xl bg-indigo-600 px-4 py-3 font-semibold hover:bg-indigo-500">
            Sign up
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <p className="text-sm font-semibold text-indigo-300">
          YOUR PERSONAL LECTURE STUDY ASSISTANT
        </p>
        <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-6xl">
          Turn your lectures into{" "}
          <span className="text-indigo-400">smart flashcards.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          Transform lecture transcripts into study questions and answers.
          Organize your flashcards and make revision easier.
        </p>
        <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
          <Link href="/register" className="rounded-xl bg-indigo-600 px-7 py-4 font-semibold hover:bg-indigo-500">
            Get started
          </Link>
          <Link href="/login" className="rounded-xl border border-slate-600 px-7 py-4 font-semibold hover:bg-white/10">
            I already have an account
          </Link>
        </div>

        <div className="mt-16 grid gap-5 text-left sm:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="font-semibold">Lecture learning</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">Work with your lecture transcripts.</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="font-semibold">AI flashcards</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">Create concise questions and answers.</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="font-semibold">Personal dashboard</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">Access flashcards saved to your account.</p>
          </article>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-5 text-center text-sm text-slate-400">
        Audio Flash — Learn smarter, one lecture at a time.
      </footer>
    </main>
  );
}