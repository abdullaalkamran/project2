import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center gap-6 px-4">
      <div className="space-y-2">
        <p className="text-8xl font-black text-slate-100 select-none">404</p>
        <h1 className="text-3xl font-bold text-slate-900 -mt-4">Page not found</h1>
        <p className="text-slate-500 max-w-sm mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-600 transition"
      >
        Back to home
      </Link>
    </div>
  );
}
