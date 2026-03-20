import { SignUpForm } from "@/components/auth/SignUpForm";
import Link from "next/link";

export const metadata = {
  title: "Sign Up | Paikari",
};

export default function SignUpPage() {
  return (
    <div className="mx-auto max-w-lg space-y-8 rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
      <div className="space-y-2 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.1em] text-emerald-700">Create account</p>
        <h1 className="text-2xl font-bold text-slate-900">Start trading on Paikari</h1>
        <p className="text-sm text-slate-600">Choose a buyer or seller account, then register with email, mobile number, or both.</p>
      </div>
      <SignUpForm />
      <p className="text-center text-sm text-slate-600">
        Already registered? <Link href="/auth/signin" className="font-semibold text-emerald-700 underline">Sign in</Link>.
      </p>
    </div>
  );
}
