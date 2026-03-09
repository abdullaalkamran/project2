"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import {
  Clock, TrendingUp, Package, AlertCircle, CheckCircle2, XCircle,
  Banknote, Truck, BarChart3, ArrowRight, RefreshCw, ShoppingCart,
} from "lucide-react";
import api from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

type SellerStat = {
  label: string; value: string; sub: string;
  color: string; bg: string; border: string; href: string;
};
type ActiveLotDetail = {
  lotCode: string; title: string; quantity: string;
  status: string; rawStatus: string; bids: number;
  topBid: string | null; auctionEndsAt: string | null; needsAction: boolean;
};
type PendingDecision = {
  id: string; product: string; buyer: string;
  qty: string; amount: string; confirmedAt: string;
};
type RecentOrder = {
  id: string; product: string; buyer: string;
  amount: string; status: string; sellerStatus: string; confirmedAt: string;
};
type OverviewResponse = {
  stats: SellerStat[];
  analyticsStats: { label: string; value: string; color: string }[];
  lotPerformance: unknown[];
  activeLotDetails: ActiveLotDetail[];
  pendingDecisions: PendingDecision[];
  recentOrders: RecentOrder[];
  statusBreakdown: Record<string, number>;
  totalLots: number;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const STAT_ICONS = [Package, AlertCircle, Banknote, Truck];

const ORDER_STATUS_COLOR: Record<string, string> = {
  CONFIRMED:  "bg-blue-50   text-blue-700",
  DISPATCHED: "bg-amber-50  text-amber-700",
  ARRIVED:    "bg-cyan-50   text-cyan-700",
  PICKED_UP:  "bg-emerald-50 text-emerald-700",
  CANCELLED:  "bg-rose-50   text-rose-600",
};
const ORDER_STATUS_LABEL: Record<string, string> = {
  CONFIRMED: "Confirmed", DISPATCHED: "Dispatched",
  ARRIVED: "Arrived",    PICKED_UP: "Delivered",  CANCELLED: "Cancelled",
};
const LOT_STATUS_COLOR: Record<string, string> = {
  Live: "bg-emerald-50 text-emerald-700",
  "Approved in Marketplace": "bg-emerald-50 text-emerald-700",
  "QC Passed": "bg-emerald-50 text-emerald-700",
  "QC Check": "bg-blue-50 text-blue-700",
  "Waiting QC Approval": "bg-violet-50 text-violet-700",
  "Hub Received": "bg-cyan-50 text-cyan-700",
  "QC Failed": "bg-rose-50 text-rose-600",
  Unsold: "bg-rose-50 text-rose-600",
  "Action Required: Auction Unsold": "bg-orange-50 text-orange-700",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-100 ${className ?? ""}`} />;
}

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
    <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
      <Clock size={11} /> {left}
    </span>
  );
}

function SectionHead({ icon: Icon, label, href, linkLabel = "View all" }: {
  icon: React.ElementType; label: string; href?: string; linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon size={15} className="text-slate-400" />
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</h2>
      </div>
      {href && (
        <Link href={href} className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline">
          {linkLabel} <ArrowRight size={12} />
        </Link>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SellerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [deciding, setDeciding] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await api.get<OverviewResponse>("/api/seller-dashboard/overview");
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleDecide = async (orderId: string, decision: "ACCEPTED" | "DECLINED") => {
    setDeciding(orderId);
    try {
      await api.patch(`/api/seller-dashboard/orders/${orderId}/decide`, { decision });
      await load(true);
    } catch {
      // silent
    } finally {
      setDeciding(null);
    }
  };

  const stats           = data?.stats ?? [];
  const activeLotDetails = data?.activeLotDetails ?? [];
  const pendingDecisions = data?.pendingDecisions ?? [];
  const recentOrders    = data?.recentOrders ?? [];

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">Seller Dashboard</p>
          <h1 className="mt-0.5 text-2xl font-bold text-slate-900">Overview</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <Link
            href="/seller-dashboard/finance"
            className="flex items-center gap-1.5 rounded-full border border-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          >
            <Banknote size={14} />
            Withdraw
          </Link>
          <Link
            href="/seller-dashboard/create-lot"
            className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            <Package size={14} />
            Create Lot
          </Link>
        </div>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => {
            const Icon = STAT_ICONS[i] ?? BarChart3;
            return (
              <Link
                key={s.label}
                href={s.href}
                className={`group rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${s.border ?? "border-slate-100"} hover:border-emerald-200`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-500">{s.label}</p>
                  <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${s.bg}`}>
                    <Icon size={15} className={s.color} />
                  </span>
                </div>
                <p className={`mt-3 text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="mt-1 text-xs text-slate-400">{s.sub}</p>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pending Decisions */}
      {!loading && pendingDecisions.length > 0 && (
        <div className="space-y-3">
          <SectionHead icon={AlertCircle} label="Needs Your Decision" href="/seller-dashboard/orders" linkLabel="All orders" />
          <div className="divide-y divide-amber-100 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/40">
            {pendingDecisions.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{o.product}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{o.buyer} · {o.qty}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{o.amount}</span>
                  <button
                    type="button"
                    disabled={deciding === o.id}
                    onClick={() => handleDecide(o.id, "ACCEPTED")}
                    className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                  >
                    <CheckCircle2 size={12} /> Accept
                  </button>
                  <button
                    type="button"
                    disabled={deciding === o.id}
                    onClick={() => handleDecide(o.id, "DECLINED")}
                    className="flex items-center gap-1.5 rounded-full border border-rose-200 px-3.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                  >
                    <XCircle size={12} /> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Lots */}
      {!loading && activeLotDetails.length > 0 && (
        <div className="space-y-3">
          <SectionHead icon={Package} label="Active Lots" href="/seller-dashboard/lots" linkLabel="All lots" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeLotDetails.map((l) => (
              <Link
                key={l.lotCode}
                href="/seller-dashboard/lots"
                className={`group rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md ${
                  l.needsAction ? "border-orange-200" : "border-slate-100"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{l.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{l.quantity}</p>
                  </div>
                  {l.needsAction && (
                    <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700 uppercase">
                      Action
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${LOT_STATUS_COLOR[l.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {l.status}
                  </span>
                  {l.auctionEndsAt && l.rawStatus === "LIVE"
                    ? <Countdown endsAt={l.auctionEndsAt} />
                    : l.bids > 0 && <span className="text-xs text-slate-400">{l.bids} bid{l.bids !== 1 ? "s" : ""}</span>
                  }
                </div>
                {l.topBid && (
                  <p className="mt-2 text-xs font-semibold text-emerald-700">Top bid: {l.topBid}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Orders */}
      {!loading && recentOrders.length > 0 && (
        <div className="space-y-3">
          <SectionHead icon={ShoppingCart} label="Recent Orders" href="/seller-dashboard/orders" linkLabel="All orders" />
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="divide-y divide-slate-50">
              {recentOrders.map((o) => (
                <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-slate-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                      <ShoppingCart size={13} className="text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{o.product}</p>
                      <p className="text-xs text-slate-400">{o.buyer}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{o.amount}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ORDER_STATUS_COLOR[o.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {ORDER_STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Analytics quick row */}
      {!loading && data?.analyticsStats && data.analyticsStats.length > 0 && (
        <div className="space-y-3">
          <SectionHead icon={TrendingUp} label="Performance" href="/seller-dashboard/analytics" linkLabel="Full analytics" />
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {data.analyticsStats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="mt-1 text-[10px] text-slate-400 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty / error state */}
      {!loading && !data && (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
          <AlertCircle size={32} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm text-slate-400">Could not load dashboard. Try refreshing.</p>
          <button
            type="button"
            onClick={() => load()}
            className="mt-4 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            Retry
          </button>
        </div>
      )}

    </div>
  );
}
