"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center p-8">
      <h2 className="text-xl font-bold text-slate-900">Something went wrong</h2>
      <p className="text-sm text-slate-500 max-w-sm">{error.message || "An unexpected error occurred."}</p>
      <button
        onClick={reset}
        className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
