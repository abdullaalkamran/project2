"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RefreshCw, TrendingUp, Trophy, XCircle, Clock, AlertCircle, ExternalLink } from "lucide-react";
import api from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────
type ActiveBid = {
  lotId: string;
  lot: string;
  seller: string;
  yourBid: number;
  topBid: number;
  qty: number;
  unit: string;
  minBidRate: number;
  auctionEndsAt: string | null;
  status: "Winning" | "Outbid";
  bidId: string;
};

type WonBid = {
  lotId: string;
  lot: string;
  seller: string;
  finalBid: number;
  orderCode: string | null;
  orderStatus: string;
  date: string;
};

type LostBid = {
  lotId: string;
  lot: string;
  seller: string;
  yourBid: number;
  winningBid: number;
  date: string;
};

type BidsData = { active: ActiveBid[]; won: WonBid[]; lost: LostBid[] };

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (n: number) => `৳ ${n.toLocaleString("en-BD")}`;

function useCountdown(endsAt: string | null) {
  const calc = useCallback(() => {
    if (!endsAt) return null;
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return "Ended";
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }, [endsAt]);

  const [display, setDisplay] = useState(calc);
  useEffect(() => {
    setDisplay(calc());
    const id = setInterval(() => setDisplay(calc()), 1_000);
    return () => clearInterval(id);
  }, [calc]);
  return display;
}

// ── Countdown cell (per row) ───────────────────────────────────────────────────
function Countdown({ endsAt }: { endsAt: string | null }) {
  const val = useCountdown(endsAt);
  if (!val) return <span className="text-slate-400">—</span>;
  const isUrgent = val !== "Ended" && !val.includes("h") && !val.includes("m");
  const isEnded = val === "Ended";
  return (
    <span className={`flex items-center gap-1 text-xs font-semibold ${isEnded ? "text-slate-400" : isUrgent ? "text-red-600" : "text-slate-700"}`}>
      <Clock size={11} className="shrink-0" />
      {val}
    </span>
  );
}

// ── Increase Bid Modal ─────────────────────────────────────────────────────────
function IncreaseBidModal({
  bid,
  onClose,
  onSuccess,
}: {
  bid: ActiveBid;
  onClose: () => void;
  onSuccess: (lotId: string, newAmount: number) => void;
}) {
  const minNext = bid.topBid + 1;
  const [amount, setAmount] = useState(String(minNext));
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const parsed = parseFloat(amount);
    if (!parsed || isNaN(parsed) || parsed <= bid.topBid) {
      toast.error(`Bid must be greater than ${fmt(bid.topBid)}`);
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/api/buyer-dashboard/bids/${bid.lotId}`, { amount: parsed });
      toast.success(`Bid of ${fmt(parsed)} placed on "${bid.lot}"`);
      onSuccess(bid.lotId, parsed);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to place bid");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="text-lg font-bold text-slate-900">Increase Bid</h2>
          <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{bid.lot}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-400">Current Top Bid</p>
            <p className="mt-0.5 font-bold text-slate-900">{fmt(bid.topBid)}</p>
          </div>
          <div className="rounded-xl bg-red-50 p-3">
            <p className="text-xs text-red-400">Your Last Bid</p>
            <p className="mt-0.5 font-bold text-red-700">{fmt(bid.yourBid)}</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Your New Bid <span className="text-slate-400 font-normal">(min: {fmt(minNext)})</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">৳</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={minNext}
              step={100}
              className="w-full rounded-xl border border-slate-200 pl-7 pr-3 py-2.5 text-sm font-semibold focus:border-emerald-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
          >
            {submitting ? "Placing…" : "Place Bid"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Status style helpers ───────────────────────────────────────────────────────
const orderStatusStyle: Record<string, string> = {
  CONFIRMED: "bg-orange-50 text-orange-600",
  DISPATCHED: "bg-blue-50 text-blue-700",
  ARRIVED: "bg-emerald-50 text-emerald-700",
  PICKED_UP: "bg-emerald-50 text-emerald-700",
  Pending: "bg-slate-50 text-slate-500",
};
const orderStatusLabel: Record<string, string> = {
  CONFIRMED: "Pending Payment",
  DISPATCHED: "In Transit",
  ARRIVED: "Delivered",
  PICKED_UP: "Picked Up",
  Pending: "Pending",
};

// ── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 w-full max-w-[140px] animate-pulse rounded-md bg-slate-100" />
        </td>
      ))}
    </tr>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function Empty({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-slate-400">
      <Icon size={32} strokeWidth={1.5} />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
const TABS = ["Active", "Won", "Lost"] as const;
type Tab = (typeof TABS)[number];

export default function MyBidsPage() {
  const [tab, setTab] = useState<Tab>("Active");
  const [data, setData] = useState<BidsData>({ active: [], won: [], lost: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [increasingBid, setIncreasingBid] = useState<ActiveBid | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await api.get<BidsData>("/api/buyer-dashboard/bids");
      setData(res);
    } catch {
      toast.error("Could not load your bids.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    timerRef.current = setInterval(() => void load(true), 30_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [load]);

  // Optimistically update bid status after a successful increase
  const handleBidSuccess = (lotId: string, newAmount: number) => {
    setData((prev) => ({
      ...prev,
      active: prev.active.map((b) =>
        b.lotId === lotId
          ? { ...b, yourBid: newAmount, topBid: newAmount, status: "Winning" as const }
          : b,
      ),
    }));
  };

  const tabCount = (t: Tab) => {
    if (t === "Active") return data.active.length;
    if (t === "Won") return data.won.length;
    return data.lost.length;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">My Bids</h1>
          <p className="text-slate-500">Track and manage your active, won, and lost auction bids.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <Link
            href="/buyer-dashboard/my-bids/auto-bid"
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Auto-bid Settings
          </Link>
        </div>
      </div>

      {/* Summary chips */}
      {!loading && (
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5">
            <TrendingUp size={15} className="text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700">
              {data.active.filter((b) => b.status === "Winning").length} Winning
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5">
            <AlertCircle size={15} className="text-red-500" />
            <span className="text-sm font-semibold text-red-600">
              {data.active.filter((b) => b.status === "Outbid").length} Outbid
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-2.5">
            <Trophy size={15} className="text-amber-600" />
            <span className="text-sm font-semibold text-amber-700">{data.won.length} Won</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-100 bg-slate-50 p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition ${
              tab === t ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
            {!loading && tabCount(t) > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tab === t ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
                {tabCount(t)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── ACTIVE BIDS ── */}
      {tab === "Active" && (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3 text-left">Lot</th>
                <th className="px-5 py-3 text-left">Seller</th>
                <th className="px-5 py-3 text-left">Top Bid</th>
                <th className="px-5 py-3 text-left">Your Bid</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Ends In</th>
                <th className="px-5 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading
                ? Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
                : data.active.length === 0
                ? (
                  <tr><td colSpan={7}><Empty icon={TrendingUp} message="You have no active bids right now." /></td></tr>
                )
                : data.active.map((b) => (
                  <tr key={b.bidId} className={`hover:bg-slate-50 ${b.status === "Outbid" ? "bg-red-50/30" : ""}`}>
                    <td className="px-5 py-4">
                      <Link href={`/product-details/${b.lotId}`} className="font-semibold text-slate-900 hover:text-emerald-700 flex items-center gap-1 transition">
                        {b.lot}
                        <ExternalLink size={11} className="shrink-0 text-slate-400" />
                      </Link>
                      <p className="text-xs text-slate-400 mt-0.5">{b.qty.toLocaleString()} {b.unit}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs">{b.seller}</td>
                    <td className="px-5 py-4 font-bold text-slate-900">{fmt(b.topBid)}</td>
                    <td className={`px-5 py-4 font-semibold ${b.status === "Outbid" ? "text-red-600" : "text-emerald-700"}`}>
                      {fmt(b.yourBid)}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${b.status === "Winning" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                        {b.status === "Winning" ? <TrendingUp size={10} /> : <AlertCircle size={10} />}
                        {b.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Countdown endsAt={b.auctionEndsAt} />
                    </td>
                    <td className="px-5 py-4">
                      {b.status === "Outbid" && (
                        <button
                          type="button"
                          onClick={() => setIncreasingBid(b)}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                        >
                          Increase Bid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── WON BIDS ── */}
      {tab === "Won" && (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3 text-left">Lot</th>
                <th className="px-5 py-3 text-left">Seller</th>
                <th className="px-5 py-3 text-left">Winning Bid</th>
                <th className="px-5 py-3 text-left">Order Status</th>
                <th className="px-5 py-3 text-left">Date</th>
                <th className="px-5 py-3 text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading
                ? Array.from({ length: 2 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
                : data.won.length === 0
                ? (
                  <tr><td colSpan={6}><Empty icon={Trophy} message="You haven't won any auctions yet." /></td></tr>
                )
                : data.won.map((b) => (
                  <tr key={b.lotId} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-semibold text-slate-900">{b.lot}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">{b.seller}</td>
                    <td className="px-5 py-4 font-bold text-emerald-700">{fmt(b.finalBid)}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${orderStatusStyle[b.orderStatus] ?? "bg-slate-50 text-slate-500"}`}>
                        {orderStatusLabel[b.orderStatus] ?? b.orderStatus}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-400">
                      {new Date(b.date).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-5 py-4">
                      {b.orderCode && (
                        <Link
                          href="/buyer-dashboard/orders"
                          className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition"
                        >
                          View Order <ExternalLink size={10} />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── LOST BIDS ── */}
      {tab === "Lost" && (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3 text-left">Lot</th>
                <th className="px-5 py-3 text-left">Seller</th>
                <th className="px-5 py-3 text-left">Your Bid</th>
                <th className="px-5 py-3 text-left">Winning Bid</th>
                <th className="px-5 py-3 text-left">Diff</th>
                <th className="px-5 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading
                ? Array.from({ length: 2 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
                : data.lost.length === 0
                ? (
                  <tr><td colSpan={6}><Empty icon={XCircle} message="No lost bids on record." /></td></tr>
                )
                : data.lost.map((b) => {
                  const diff = b.winningBid - b.yourBid;
                  const pct = ((diff / b.yourBid) * 100).toFixed(1);
                  return (
                    <tr key={b.lotId} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-semibold text-slate-900">{b.lot}</td>
                      <td className="px-5 py-4 text-xs text-slate-500">{b.seller}</td>
                      <td className="px-5 py-4 font-semibold text-red-500">{fmt(b.yourBid)}</td>
                      <td className="px-5 py-4 font-semibold text-emerald-700">{fmt(b.winningBid)}</td>
                      <td className="px-5 py-4 text-xs text-slate-500">+{fmt(diff)} <span className="text-slate-400">({pct}%)</span></td>
                      <td className="px-5 py-4 text-xs text-slate-400">
                        {new Date(b.date).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* Increase bid modal */}
      {increasingBid && (
        <IncreaseBidModal
          bid={increasingBid}
          onClose={() => setIncreasingBid(null)}
          onSuccess={handleBidSuccess}
        />
      )}
    </div>
  );
}
