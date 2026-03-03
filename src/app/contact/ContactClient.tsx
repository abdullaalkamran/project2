"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { contactSchema, ContactFormData as FormData } from "@/lib/schemas";
import { Mail, Phone, Building2 } from "lucide-react";

export default function ContactPage() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(contactSchema) });

  const onSubmit = async () => {
    try {
      // TODO: await api.post("/contact", data);
      await new Promise((r) => setTimeout(r, 700));
      toast.success("Message sent! We'll get back to you within one business day.");
      reset();
    } catch {
      toast.error("Failed to send message. Please try again.");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contact us</h1>
          <p className="mt-2 text-slate-600">
            Need onboarding help, have a sourcing request, or want to partner? Send us a note and
            we&apos;ll get back within one business day.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
            <span className="inline-flex items-center gap-1.5"><Mail size={14} className="text-slate-400" /> support@paikari.example</span>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
            <span className="inline-flex items-center gap-1.5"><Phone size={14} className="text-slate-400" /> +880 1700-000000</span>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700 sm:col-span-2">
            <span className="inline-flex items-center gap-1.5"><Building2 size={14} className="text-slate-400" /> Banani, Dhaka — Mon to Fri, 10am–6pm</span>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-5">Send us a message</h2>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-800" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                type="text"
                placeholder="Your name"
                {...register("name")}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none ring-emerald-100 focus:ring-2"
              />
              {errors.name && <p className="text-xs text-rose-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-800" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@company.com"
                {...register("email")}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none ring-emerald-100 focus:ring-2"
              />
              {errors.email && <p className="text-xs text-rose-500">{errors.email.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-800" htmlFor="subject">
              Subject
            </label>
            <input
              id="subject"
              type="text"
              placeholder="How can we help?"
              {...register("subject")}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none ring-emerald-100 focus:ring-2"
            />
            {errors.subject && <p className="text-xs text-rose-500">{errors.subject.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-800" htmlFor="message">
              Message
            </label>
            <textarea
              id="message"
              rows={5}
              placeholder="Tell us what you need…"
              {...register("message")}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none ring-emerald-100 focus:ring-2 resize-none"
            />
            {errors.message && <p className="text-xs text-rose-500">{errors.message.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
          >
            {isSubmitting ? "Sending…" : "Send message"}
          </button>
        </form>
      </div>
    </div>
  );
}

