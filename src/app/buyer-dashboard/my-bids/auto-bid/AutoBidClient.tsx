"use client";

import { useState } from "react";

const initialAutoBids = [
  { lot: "Premium Basmati Rice — 2,000 kg", lotId: "LOT-2026-038", limit: "৳ 1,60,000", active: true },
  { lot: "Branded T-shirts — 200 pcs", lotId: "LOT-2026-031", limit: "৳ 35,000", active: true },
];

export default function AutoBidSettingsPage() {
  const [autoBids, setAutoBids] = useState(initialAutoBids);

  const toggleActive = (idx: number) => {
    setAutoBids((prev) => prev.map((b, i) => i === idx ? { ...b, active: !b.active } : b));
  };

  const remove = (idx: number) => {
    setAutoBids((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Auto-bid Settings</h1>
        <p className="text-slate-500">Set maximum bid limits — the system will automatically raise your bid up to this amount.</p>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-800">
        Auto-bid places incremental bids on your behalf whenever you are outbid, up to your set maximum. You will be notified if the auction exceeds your limit.
      </div>

      {autoBids.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-400">
          No auto-bid rules set. Go to an active auction and enable auto-bid there.
        </div>
      ) : (
        <div className="space-y-4">
          {autoBids.map((b, i) => (
            <div key={b.lotId} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div>
                <p className="font-semibold text-slate-900">{b.lot}</p>
                <p className="text-xs text-slate-400 mt-0.5">{b.lotId} · Max limit: <strong className="text-slate-700">{b.limit}</strong></p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleActive(i)}
                  className={`relative h-6 w-11 overflow-hidden rounded-full transition-colors ${b.active ? "bg-emerald-500" : "bg-slate-200"}`}
                  aria-label="Toggle auto-bid"
                >
                  <span className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${b.active ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
                <span className={`text-xs font-semibold ${b.active ? "text-emerald-700" : "text-slate-400"}`}>{b.active ? "Active" : "Paused"}</span>
                <button type="button" onClick={() => remove(i)} className="text-xs font-semibold text-red-500 hover:text-red-700 ml-2">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-4 text-sm text-slate-500">
        To add a new auto-bid rule, open the lot page and set your maximum bid limit from the bid form.
      </div>
    </div>
  );
}
