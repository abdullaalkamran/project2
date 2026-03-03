"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { reviewSchema, type ReviewFormData } from "@/lib/schemas";

const pendingReviews = [
  { orderId: "ORD-2026-008", lot: "Soybean Oil — 1,000 L", seller: "Pure Oil Co.", date: "Feb 14, 2026" },
];

const submittedReviews = [
  { orderId: "ORD-2026-006", lot: "Jasmine Rice — 2,000 kg", seller: "Rice Republic", rating: 5, comment: "Excellent quality and fast dispatch.", date: "Feb 12, 2026" },
  { orderId: "ORD-2026-004", lot: "Wheat Flour — 1,000 kg", seller: "Alam Mills", rating: 4, comment: "Good product, packaging could be better.", date: "Jan 28, 2026" },
];

function ReviewForm({ orderId, lot, seller, date, onDone }: { orderId: string; lot: string; seller: string; date: string; onDone: () => void }) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema) as any,
    defaultValues: { rating: 0, comment: "" },
  });

  const rating = watch("rating") ?? 0;

  const onSubmit = (_d: ReviewFormData) => {
    onDone();
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
      <div>
        <p className="font-semibold text-slate-900">{lot}</p>
        <p className="text-sm text-slate-500">Seller: {seller} · {date}</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setValue("rating", star, { shouldValidate: true })}
                className={`text-2xl transition ${rating >= star ? "text-yellow-400" : "text-slate-200 hover:text-yellow-300"}`}
              >
                ★
              </button>
            ))}
          </div>
          {errors.rating && <p className="mt-1 text-xs text-rose-500">{errors.rating.message}</p>}
        </div>
        <textarea
          rows={3}
          placeholder="Write your review (optional)…"
          {...register("comment")}
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 resize-none"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40 hover:bg-emerald-700"
        >
          Submit Review
        </button>
      </form>
      <input type="hidden" value={orderId} />
    </div>
  );
}

export default function ReviewsPage() {
  const [done, setDone] = useState<string[]>([]);

  return (
    <div className="space-y-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Reviews &amp; Ratings</h1>
        <p className="text-slate-500">Share feedback on completed orders and view your past reviews.</p>
      </div>

      {pendingReviews.filter((r) => !done.includes(r.orderId)).length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Pending Reviews</h2>
          {pendingReviews
            .filter((r) => !done.includes(r.orderId))
            .map((r) => (
              <ReviewForm key={r.orderId} {...r} onDone={() => setDone((p) => [...p, r.orderId])} />
            ))}
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Submitted Reviews</h2>
        {submittedReviews.map((r) => (
          <div key={r.orderId} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-900">{r.lot}</p>
                <p className="text-sm text-slate-500">Seller: {r.seller} · {r.date}</p>
              </div>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span key={s} className={s <= r.rating ? "text-yellow-400" : "text-slate-200"}>★</span>
                ))}
              </div>
            </div>
            {r.comment && <p className="mt-3 text-sm text-slate-600">{r.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
