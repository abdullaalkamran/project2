"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { signUpSchema, SignUpFormData as FormData } from "@/lib/schemas";

export function SignUpForm() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(signUpSchema) as any,
  });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.company, email: data.email, password: data.password }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.message ?? "Registration failed.");
        return;
      }

      toast.success("Account created! Welcome to Paikari.");
      router.push("/buyer-dashboard");
    } catch {
      toast.error("Registration failed. Please try again.");
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-1">
        <label className="text-sm font-semibold text-slate-800" htmlFor="company">
          Business name
        </label>
        <input
          id="company"
          type="text"
          placeholder="Company LLC"
          {...register("company")}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-100 focus:ring-2"
        />
        {errors.company && (
          <p className="text-xs text-rose-500">{errors.company.message}</p>
        )}
      </div>

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

      <div className="grid gap-4 sm:grid-cols-2">
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
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-800" htmlFor="confirm">
            Confirm password
          </label>
          <input
            id="confirm"
            type="password"
            placeholder="••••••••"
            {...register("confirm")}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-100 focus:ring-2"
          />
          {errors.confirm && (
            <p className="text-xs text-rose-500">{errors.confirm.message}</p>
          )}
        </div>
      </div>

      <p className="text-sm text-slate-600">
        By creating an account you agree to our{" "}
        <a href="/terms" className="font-semibold text-emerald-700 underline">
          Terms
        </a>{" "}
        and{" "}
        <a href="/privacy" className="font-semibold text-emerald-700 underline">
          Privacy Policy
        </a>
        .
      </p>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
      >
        {isSubmitting ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
