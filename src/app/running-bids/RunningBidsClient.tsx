"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface BidItem {
  id: string;
  title: string;
  status: "Leading" | "Outbid";
  bid: string;
  bidAmount: number;
  closes: string;
}

const bids: BidItem[] = [
  {
    id: "lot-1",
    title: "Denim Jackets | 300 pcs",
    status: "Leading",
    bid: "৳ 42,500",
    bidAmount: 42500,
    closes: "08:12",
  },
  {
    id: "lot-2",
    title: "LED Bulbs | 2,000 pcs",
    status: "Outbid",
    bid: "৳ 78,500",
    bidAmount: 78500,
    closes: "12:10",
  },
];

export default function RunningBidsPage() {
  const { role } = useAuth();
  const [raisingId, setRaisingId] = useState<string | null>(null);
  const [newBid, setNewBid] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isSeller = role === "seller";

  const handleRaiseBid = async (item: BidItem) => {
    const amount = Number(newBid.replace(/[^0-9]/g, ""));
    if (!amount || amount <= item.bidAmount) {
      toast.error(`New bid must be greater than ${item.bid}`);
      return;
    }
    setSubmitting(true);
    try {
      // TODO: await api.post(`/auctions/${item.id}/bids`, { amount });
      await new Promise((r) => setTimeout(r, 600)); // simulate
      toast.success(`Bid of ৳ ${amount.toLocaleString()} placed!`);
      setRaisingId(null);
      setNewBid("");
    } catch {
      toast.error("Failed to place bid. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.1em] text-emerald-700">My bids</p>
        <h1 className="text-2xl font-bold text-slate-900">Track your active bids</h1>
        <p className="text-slate-600">Stay ahead of competing offers and see which lots need attention.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {bids.map((item) => (
          <div key={item.id} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
              <span
                className={
                  item.status === "Leading"
                    ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                    : "rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700"
                }
              >
                {item.status}
              </span>
            </div>
            <p className="text-sm text-slate-600">Closes in {item.closes}</p>
            <p className="text-2xl font-semibold text-slate-900">{item.bid}</p>

            {raisingId === item.id ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700" htmlFor={`bid-${item.id}`}>
                    Your new bid (৳)
                  </label>
                  <input
                    id={`bid-${item.id}`}
                    type="number"
                    min={item.bidAmount + 1}
                    placeholder={`Min ৳ ${(item.bidAmount + 500).toLocaleString()}`}
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
                  href={`/product-details/${item.id}`}
                  className="flex-1 rounded-full border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-800 transition hover:border-emerald-200 hover:text-emerald-700"
                >
                  View lot
                </Link>
                {!isSeller && (
                  <button
                    type="button"
                    onClick={() => { setRaisingId(item.id); setNewBid(""); }}
                    className="flex-1 rounded-full bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
                  >
                    Raise bid
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white px-6 py-5 text-sm text-slate-700">
        Need alerts? Enable notifications from your{" "}
        <Link href="/buyer-dashboard" className="font-semibold text-emerald-700 underline">
          buyer dashboard
        </Link>.
      </div>
    </div>
  );
}
