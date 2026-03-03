"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // TODO: log to error reporting service (e.g. Sentry)
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center gap-6 px-4">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-widest text-rose-500">
          Something went wrong
        </p>
        <h1 className="text-3xl font-bold text-slate-900">Unexpected error</h1>
        <p className="text-slate-500 max-w-sm mx-auto">
          {error.message ?? "An unexpected error occurred. Please try again."}
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-600 transition"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
