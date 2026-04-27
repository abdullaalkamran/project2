"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Role } from "@/types";
import { signInSchema, SignInFormData as FormData } from "@/lib/schemas";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";

const roleRedirects: Record<Role, string> = {
  buyer:                "/buyer-dashboard",
  seller:               "/seller-dashboard",
  admin:                "/admin",
  hub_manager:          "/hub-manager",
  qc_leader:            "/qc-leader",
  qc_checker:           "/qc-checker",
  delivery_hub_manager: "/delivery-hub",
  delivery_distributor: "/delivery-distributor",
  aroth:                "/aroth-dashboard",
};

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoggedIn, role: currentRole } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(signInSchema) as any,
  });

  useEffect(() => {
    if (isLoggedIn && currentRole) {
      const next = searchParams.get("next");
      router.replace(next ?? roleRedirects[currentRole]);
    }
  }, [isLoggedIn, currentRole, router, searchParams]);

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.identifier, data.password);
      toast.success("Welcome back!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed.");
    }
  };

  const isPending = searchParams.get("pending") === "1";

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      {isPending && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Registration received!</p>
          <p className="mt-0.5 text-xs text-amber-700">Your account is pending admin approval. You will be able to sign in once approved.</p>
        </div>
      )}
      <GoogleAuthButton mode="login" />

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">or sign in with email or mobile</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-semibold text-slate-800" htmlFor="identifier">
          Email or mobile number
        </label>
        <input
          id="identifier"
          type="text"
          autoComplete="username"
          placeholder="you@company.com or 017XXXXXXXX"
          {...register("identifier")}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-100 focus:ring-2"
        />
        {errors.identifier && (
          <p className="text-xs text-rose-500">{errors.identifier.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-semibold text-slate-800" htmlFor="password">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            {...register("password")}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-11 text-sm text-slate-900 outline-none ring-emerald-100 focus:ring-2"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7s4-7 9-7a9.96 9.96 0 016.072 2.05M15 12a3 3 0 11-4.5-2.6M3 3l18 18" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-rose-500">{errors.password.message}</p>
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-slate-700">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
          <span>Keep me signed in</span>
        </label>
        <Link
          href="/auth/forgot"
          className="font-semibold text-emerald-700 underline"
        >
          Forgot password?
        </Link>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
