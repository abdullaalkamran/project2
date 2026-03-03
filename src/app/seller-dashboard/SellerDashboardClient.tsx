"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { X, Clock, TrendingUp, Package, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { walletWithdrawSchema, type WalletWithdrawFormData } from "@/lib/schemas";
import api from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────────────────

type SellerStat = {
  label: string;
  value: string;
  sub: string;
  color: string;
  bg: string;
  border: string;
  href: string;
};

type SellerAnalyticsStat = {
  label: string;
  value: string;
  color: string;
};

type SellerLotPerformance = {
  lotCode: string;
  lot: string;
  bids: number;
  bidders: number;
  reserve: string;
  closing: string;
  vs: string;
  status: string;
};

type ActiveLotDetail = {
  lotCode: string;
  title: string;
  quantity: string;
  status: string;
  rawStatus: string;
  bids: number;
  topBid: string | null;
  auctionEndsAt: string | null;
  needsAction: boolean;
};

type PendingDecision = {
  id: string;
  product: string;
  buyer: string;
  qty: string;
  amount: string;
  confirmedAt: string;
};

type RecentOrder = {
  id: string;
  product: string;
  buyer: string;
  amount: string;
  status: string;
  sellerStatus: string;
  confirmedAt: string;
};

type OverviewResponse = {
  stats: SellerStat[];
  analyticsStats: SellerAnalyticsStat[];
  lotPerformance: SellerLotPerformance[];
  activeLotDetails: ActiveLotDetail[];
  pendingDecisions: PendingDecision[];
  recentOrders: RecentOrder[];
  statusBreakdown: Record<string, number>;
  totalLots: number;
};

// ── Constants ────────────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  Live: "bg-emerald-50 text-emerald-700",
  "Approved in Marketplace": "bg-emerald-50 text-emerald-700",
  "QC Passed": "bg-emerald-50 text-emerald-700",
  "QC Check": "bg-blue-50 text-blue-700",
  "Waiting QC Approval": "bg-violet-50 text-violet-700",
  "Waiting Hub Manager Approval": "bg-amber-50 text-amber-700",
  "Hub Received": "bg-cyan-50 text-cyan-700",
  "QC Failed": "bg-rose-50 text-rose-600",
  Sold: "bg-blue-50 text-blue-700",
  Unsold: "bg-rose-50 text-rose-600",
  "Action Required: Auction Unsold": "bg-orange-50 text-orange-700",
  "Price Under Review": "bg-violet-50 text-violet-700",
};

const orderStatusColors: Record<string, string> = {
  CONFIRMED: "bg-blue-50 text-blue-700",
  DISPATCHED: "bg-amber-50 text-amber-700",
  ARRIVED: "bg-cyan-50 text-cyan-700",
  PICKED_UP: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-rose-50 text-rose-600",
};

const orderStatusLabel: Record<string, string> = {
  CONFIRMED: "Confirmed",
  DISPATCHED: "Dispatched",
  ARRIVED: "Arrived",
  PICKED_UP: "Delivered",
  CANCELLED: "Cancelled",
};

// ── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-100 ${className ?? ""}`} />;
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-5 w-28" />
        </div>
      ))}
    </div>
  );
}

// ── Countdown Timer ───────────────────────────────────────────────────────────

function Countdown({ endsAt }: { endsAt: string }) {
  const [left, setLeft] = useState("");

  useEffect(() => {
    const calc = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) { setLeft("Ended"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLeft(h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`);
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [endsAt]);

  return (
    <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
      <Clock size={11} />
      {left}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SellerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [deciding, setDeciding] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<OverviewResponse>("/api/seller-dashboard/overview");
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WalletWithdrawFormData>({
    resolver: zodResolver(walletWithdrawSchema) as any,
    defaultValues: { amount: undefined, bankAccount: "", notes: "" },
  });

  const onWithdraw = (_d: WalletWithdrawFormData) => {
    setSubmitted(true);
    setTimeout(() => { setShowWithdraw(false); setSubmitted(false); reset(); }, 2000);
  };

  const handleDecide = async (orderId: string, decision: "ACCEPTED" | "DECLINED") => {
    setDeciding(orderId);
    try {
      await api.patch(`/api/seller-dashboard/orders/${orderId}/decide`, { decision });
      await load();
    } catch {
      // error handled silently — data will refresh
    } finally {
      setDeciding(null);
    }
  };

  const stats = data?.stats ?? [];
  const analyticsStats = data?.analyticsStats ?? [];
  const lotPerformance = data?.lotPerformance ?? [];
  const activeLotDetails = data?.activeLotDetails ?? [];
  const pendingDecisions = data?.pendingDecisions ?? [];
  const recentOrders = data?.recentOrders ?? [];
  const statusBreakdown = data?.statusBreakdown ?? {};

  return (
    <div className="space-y-10">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-[0.1em] text-emerald-700">Seller Dashboard</p>
          <h1 className="text-3xl font-bold text-slate-900">Welcome back</h1>
          <p className="text-slate-500">Here&apos;s a live overview of your store activity.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShowWithdraw(true)}
            className="rounded-full border border-emerald-500 px-5 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          >
            Withdraw funds
          </button>
          <Link
            href="/seller-dashboard/create-lot"
            className="rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            + Add Product / Create Lot
          </Link>
        </div>
      </div>

      {/* ── Overview stats ── */}
      {loading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className={`group rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 ${s.border ?? "border-slate-100"} hover:border-emerald-200`}
            >
              <p className="text-sm text-slate-500">{s.label}</p>
              <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${s.bg} ${s.color}`}>{s.sub}</p>
            </Link>
          ))}
        </div>
      )}

      {/* ── Needs Your Attention ── */}
      {!loading && pendingDecisions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-600" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-600">Needs Your Decision</h2>
            </div>
            <Link href="/seller-dashboard/orders" className="text-xs font-semibold text-emerald-700 hover:underline">
              View all orders →
            </Link>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/50 divide-y divide-amber-100 overflow-hidden">
            {pendingDecisions.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{o.product}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {o.buyer} · {o.qty} · {o.confirmedAt}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-900">{o.amount}</span>
                  <button
                    type="button"
                    disabled={deciding === o.id}
                    onClick={() => handleDecide(o.id, "ACCEPTED")}
                    className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                  >
                    <CheckCircle2 size={13} />
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={deciding === o.id}
                    onClick={() => handleDecide(o.id, "DECLINED")}
                    className="flex items-center gap-1.5 rounded-full border border-rose-200 px-3.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
                  >
                    <XCircle size={13} />
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Active Lots ── */}
      {!loading && activeLotDetails.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package size={16} className="text-emerald-600" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Active Lots</h2>
            </div>
            <Link href="/seller-dashboard/lots" className="text-xs font-semibold text-emerald-700 hover:underline">
              All lots →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeLotDetails.map((l) => (
              <Link
                key={l.lotCode}
                href={`/seller-dashboard/lots`}
                className={`group relative rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 ${
                  l.needsAction ? "border-orange-200" : "border-slate-100"
                }`}
              >
                {l.needsAction && (
                  <span className="absolute top-3 right-3 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700 uppercase tracking-wide">
                    Action Required
                  </span>
                )}
                <p className="text-[11px] font-mono text-slate-400">{l.lotCode}</p>
                <p className="mt-1 font-semibold text-slate-900 line-clamp-1">{l.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{l.quantity}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[l.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {l.status}
                  </span>
                  {l.auctionEndsAt && l.rawStatus === "LIVE" && (
                    <Countdown endsAt={l.auctionEndsAt} />
                  )}
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                  <span>{l.bids} bid{l.bids !== 1 ? "s" : ""}</span>
                  {l.topBid && (
                    <span className="font-semibold text-emerald-700">Top: {l.topBid}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Analytics summary ── */}
      {!loading && analyticsStats.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-600" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Performance Analytics</h2>
            </div>
            <Link href="/seller-dashboard/analytics" className="text-xs font-semibold text-emerald-700 hover:underline">
              Full analytics →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {analyticsStats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="mt-1 text-xs text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent Orders ── */}
      {!loading && recentOrders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Recent Orders</h2>
            <Link href="/seller-dashboard/orders" className="text-xs font-semibold text-emerald-700 hover:underline">
              All orders →
            </Link>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-50">
              {recentOrders.map((o) => (
                <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-slate-50 transition">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">{o.product}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{o.buyer} · {o.confirmedAt}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-900">{o.amount}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${orderStatusColors[o.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {orderStatusLabel[o.status] ?? o.status}
                    </span>
                    {o.sellerStatus === "PENDING_SELLER" && (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        Pending decision
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Lot Performance Table ── */}
      {!loading && lotPerformance.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Lot Performance</h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3 text-left">Lot</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Bids</th>
                  <th className="px-5 py-3 text-left">Bidders</th>
                  <th className="px-5 py-3 text-left">Reserve</th>
                  <th className="px-5 py-3 text-left">Closing</th>
                  <th className="px-5 py-3 text-left">vs Reserve</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {lotPerformance.map((lot) => (
                  <tr key={lot.lotCode} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900 line-clamp-1">{lot.lot}</p>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">{lot.lotCode}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[lot.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {lot.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{lot.bids}</td>
                    <td className="px-5 py-4 text-slate-600">{lot.bidders}</td>
                    <td className="px-5 py-4 text-slate-500">{lot.reserve}</td>
                    <td className="px-5 py-4 font-semibold text-slate-900">{lot.closing}</td>
                    <td className={`px-5 py-4 font-semibold ${lot.vs === "—" || lot.vs === "-" ? "text-slate-400" : "text-emerald-700"}`}>
                      {lot.vs}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Status Breakdown ── */}
      {!loading && Object.keys(statusBreakdown).length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Lot Status Breakdown</h2>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusBreakdown).map(([label, count]) => (
                <div
                  key={label}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusColors[label] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}
                >
                  <span>{label}</span>
                  <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-[11px] font-bold">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !data && (
        <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
          <p className="text-slate-500">Could not load dashboard data. Please try refreshing.</p>
        </div>
      )}

      {/* ── Withdraw modal ── */}
      {showWithdraw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-xl">
            {submitted ? (
              <div className="space-y-3 py-4 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-600">
                  ✓
                </div>
                <p className="text-lg font-semibold text-slate-900">Request submitted!</p>
                <p className="text-sm text-slate-500">Your withdrawal is being processed. Funds will be transferred within 1–2 business days.</p>
              </div>
            ) : (
              <>
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Withdraw Funds</h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Available balance: <span className="font-semibold text-emerald-700">৳ 38,200</span>
                    </p>
                  </div>
                  <button type="button" onClick={() => setShowWithdraw(false)} className="text-slate-400 hover:text-slate-700">
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={handleSubmit(onWithdraw)} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Amount (৳) *</label>
                    <input
                      type="number"
                      placeholder="e.g. 10000"
                      {...register("amount")}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />
                    {errors.amount ? (
                      <p className="mt-1 text-xs text-rose-500">{errors.amount.message}</p>
                    ) : (
                      <p className="mt-1 text-xs text-slate-400">Minimum: ৳ 500 — Maximum: ৳ 38,200</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Bank account / number *</label>
                    <input
                      type="text"
                      placeholder="Account or mobile number"
                      {...register("bankAccount")}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />
                    {errors.bankAccount && (
                      <p className="mt-1 text-xs text-rose-500">{errors.bankAccount.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Notes (optional)</label>
                    <input
                      type="text"
                      placeholder="Any notes for this withdrawal"
                      {...register("notes")}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 rounded-full bg-emerald-500 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                    >
                      Submit request
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowWithdraw(false); reset(); }}
                      className="flex-1 rounded-full border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
