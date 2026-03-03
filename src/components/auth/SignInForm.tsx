"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Role } from "@/types";
import { signInSchema, SignInFormData as FormData } from "@/lib/schemas";

const roleRedirects: Record<Role, string> = {
  buyer:                "/buyer-dashboard",
  seller:               "/seller-dashboard",
  admin:                "/admin",
  hub_manager:          "/hub-manager",
  qc_leader:            "/qc-leader",
  qc_checker:           "/qc-checker",
  delivery_hub_manager: "/delivery-hub",
  delivery_distributor: "/delivery-distributor",
};

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoggedIn, role: currentRole } = useAuth();

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
      await login(data.email, data.password);
      toast.success("Welcome back!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed.");
    }
  };

  return (
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

      <div className="space-y-1">
        <label className="text-sm font-semibold text-slate-800" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          placeholder="••••••••"
          {...register("password")}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-100 focus:ring-2"
        />
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
