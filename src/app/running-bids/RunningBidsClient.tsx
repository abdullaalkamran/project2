"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface ActiveBid {
  lotId: string;
  lot: string;
  seller: string;
  yourBid: number;
  topBid: number;
  qty: number;
  unit: string;
  minBidRate: number;
  auctionEndsAt: string | null;
  bidId: string;
  status: "Winning" | "Outbid";
}

/** Format seconds → "MM:SS", returns "Ended" for ≤ 0 */
function formatCountdown(seconds: number) {
  if (seconds <= 0) return "Ended";
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function RunningBidsPage() {
  const { role } = useAuth();
  const [activeBids, setActiveBids] = useState<ActiveBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [raisingId, setRaisingId] = useState<string | null>(null);
  const [newBid, setNewBid] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [countdowns, setCountdowns] = useState<Record<string, number>>({});
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isSeller = role === "seller";

  // Load active bids from API
  useEffect(() => {
    fetch("/api/buyer-dashboard/bids")
      .then((r) => r.json())
      .then((data: { active?: ActiveBid[] }) => {
        const items = data.active ?? [];
        setActiveBids(items);
        // Seed countdown map from auctionEndsAt
        const initial: Record<string, number> = {};
        for (const b of items) {
          if (b.auctionEndsAt) {
            initial[b.lotId] = Math.max(0, Math.floor((new Date(b.auctionEndsAt).getTime() - Date.now()) / 1000));
          }
        }
        setCountdowns(initial);
        setLoading(false);
      })
      .catch(() => { toast.error("Failed to load bids."); setLoading(false); });
  }, []);

  // Tick all countdowns every second
  useEffect(() => {
    if (activeBids.length === 0) return;
    tickRef.current = setInterval(() => {
      setCountdowns((prev) => {
        const next = { ...prev };
        for (const k in next) next[k] = Math.max(0, next[k] - 1);
        return next;
      });
    }, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [activeBids.length]);

  const handleRaiseBid = useCallback(async (item: ActiveBid) => {
    const amount = Number(newBid);
    const minNext = item.topBid + 0.01;
    if (!amount || amount < minNext) {
      toast.error(`New bid must be at least ৳ ${minNext.toFixed(2)}/kg`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/buyer-dashboard/bids/${item.lotId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        toast.error(data.error || "Failed to place bid.");
      } else {
        toast.success(`Bid of ৳ ${amount.toFixed(2)}/kg placed!`);
        setActiveBids((prev) =>
          prev.map((b) =>
            b.lotId === item.lotId ? { ...b, yourBid: amount, topBid: Math.max(b.topBid, amount), status: "Winning" } : b
          )
        );
        setRaisingId(null);
        setNewBid("");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [newBid]);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.1em] text-emerald-700">My bids</p>
        <h1 className="text-2xl font-bold text-slate-900">Track your active bids</h1>
        <p className="text-slate-600">Stay ahead of competing offers and see which lots need attention.</p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : activeBids.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <p className="text-sm font-semibold text-slate-500">You have no active bids right now.</p>
          <Link href="/live" className="mt-3 inline-block text-sm font-semibold text-emerald-700 underline">
            Browse live auctions
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {activeBids.map((item) => {
            const secs = countdowns[item.lotId] ?? 0;
            return (
              <div key={item.lotId} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">{item.lot}</h2>
                  <span
                    className={
                      item.status === "Winning"
                        ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                        : "rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700"
                    }
                  >
                    {item.status}
                  </span>
                </div>
                <p className="text-sm text-slate-600">Closes in {formatCountdown(secs)}</p>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Your bid</p>
                  <p className="text-2xl font-semibold text-slate-900">৳ {item.yourBid.toFixed(2)}/kg</p>
                  {item.topBid > item.yourBid && (
                    <p className="text-xs font-semibold text-orange-600">Top bid: ৳ {item.topBid.toFixed(2)}/kg</p>
                  )}
                </div>

                {raisingId === item.lotId ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700" htmlFor={`bid-${item.lotId}`}>
                        New bid (৳/kg) — min ৳ {(item.topBid + 0.01).toFixed(2)}
                      </label>
                      <input
                        id={`bid-${item.lotId}`}
                        type="number"
                        min={item.topBid + 0.01}
                        step={0.01}
                        placeholder={`Min ৳ ${(item.topBid + 0.25).toFixed(2)}`}
                        value={newBid}
                        onChange={(e) => setNewBid(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none ring-emerald-100 focus:ring-2"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleRaiseBid(item)}
                        disabled={submitting}
                        className="flex-1 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60 transition"
                      >
                        {submitting ? "Placing…" : "Confirm bid"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setRaisingId(null); setNewBid(""); }}
                        className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Link
                      href={`/live?lot=${item.lotId}`}
                      className="flex-1 rounded-full border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-800 transition hover:border-emerald-200 hover:text-emerald-700"
                    >
                      View lot
                    </Link>
                    {!isSeller && secs > 0 && (
                      <button
                        type="button"
                        onClick={() => { setRaisingId(item.lotId); setNewBid(""); }}
                        className="flex-1 rounded-full bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
                      >
                        Raise bid
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-2xl border border-slate-100 bg-white px-6 py-5 text-sm text-slate-700">
        Need alerts? Enable notifications from your{" "}
        <Link href="/buyer-dashboard" className="font-semibold text-emerald-700 underline">
          buyer dashboard
        </Link>.
      </div>
    </div>
  );
}

