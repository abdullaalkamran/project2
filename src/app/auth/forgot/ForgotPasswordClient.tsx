"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { forgotPasswordSchema, ForgotPasswordFormData as FormData } from "@/lib/schemas";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (data: FormData) => {
    try {
      // TODO: await api.post("/auth/forgot-password", data);
      await new Promise((r) => setTimeout(r, 800)); // simulate request
      setSent(true);
      toast.success("Reset link sent!");
    } catch {
      toast.error("Failed to send reset link. Please try again.");
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-8 rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
      <div className="space-y-2 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.1em] text-emerald-700">
          Reset access
        </p>
        <h1 className="text-2xl font-bold text-slate-900">Forgot your password?</h1>
        <p className="text-sm text-slate-600">
          We will email a secure link to reset your account.
        </p>
      </div>

      {sent ? (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-5 text-center space-y-2">
          <p className="text-lg font-semibold text-emerald-800">Check your inbox</p>
          <p className="text-sm text-emerald-700">
            We sent a reset link to <strong>{getValues("email")}</strong>.
          </p>
          <p className="text-xs text-emerald-600">
            Didn&apos;t get it? Check your spam folder or{" "}
            <button
              onClick={() => setSent(false)}
              className="underline font-semibold"
            >
              try again
            </button>
            .
          </p>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-800" htmlFor="email">
              Work email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@company.com"
              {...register("email")}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-100 focus:ring-2"
            />
            {errors.email && (
              <p className="text-xs text-rose-500">{errors.email.message}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
          >
            {isSubmitting ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-slate-600">
        Remembered?{" "}
        <Link href="/auth/signin" className="font-semibold text-emerald-700 underline">
          Go back to sign in
        </Link>
        .
      </p>
    </div>
  );
}

