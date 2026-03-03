import { SignInForm } from "@/components/auth/SignInForm";
import Link from "next/link";

export const metadata = {
  title: "Sign In | Paikari",
};

export default function SignInPage() {
  return (
    <div className="mx-auto max-w-lg space-y-8 rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
      <div className="space-y-2 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.1em] text-emerald-700">Welcome back</p>
        <h1 className="text-2xl font-bold text-slate-900">Sign in to Paikari</h1>
        <p className="text-sm text-slate-600">Access your auctions, bids, and payouts.</p>
      </div>
      <SignInForm />
      <p className="text-center text-sm text-slate-600">
        New to Paikari? <Link href="/auth/signup" className="font-semibold text-emerald-700 underline">Create an account</Link>.
      </p>
    </div>
  );
}
