"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShoppingBag, Clock, PackageCheck, Banknote, CheckCircle2, TrendingUp, Percent, ShieldCheck,
} from "lucide-react";
import api from "@/lib/api";

type Stats = {
  pending: number;
  received: number;
  sold: number;
  awaiting: number;
  settled: number;
  totalSold: number;
  totalCommission: number;
};
type Hub = { name: string; location: string; commissionRate: number; isVerified: boolean; allowedProductCount: number } | null;

const STAT_CARDS = (s: Stats) => [
  { label: "Pending",        value: s.pending,   color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-100",   icon: <Clock size={18} />,         href: "/aroth-dashboard/orders" },
  { label: "Received",       value: s.received,  color: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-100",     icon: <PackageCheck size={18} />,  href: "/aroth-dashboard/orders" },
  { label: "Sold",           value: s.sold,      color: "text-violet-700",  bg: "bg-violet-50",  border: "border-violet-100",   icon: <ShoppingBag size={18} />,   href: "/aroth-dashboard/orders" },
  { label: "Awaiting Confirmation", value: s.awaiting, color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-100", icon: <Banknote size={18} />,  href: "/aroth-dashboard/orders" },
  { label: "Settled",        value: s.settled,   color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-100",  icon: <CheckCircle2 size={18} />,  href: "/aroth-dashboard/history" },
];

const bdt = (n: number) => `৳${n.toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;

export default function ArothOverviewClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [hub, setHub] = useState<Hub>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ stats: Stats; hub: Hub }>("/api/aroth-dashboard/overview")
      .then((d) => { setStats(d.stats); setHub(d.hub); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-100" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  const s = stats!;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Aroth Overview</h1>
        <p className="text-slate-500">Manage buyer-routed orders and track your sales.</p>
      </div>

      {/* Hub badge */}
      {hub && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-3">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-500">Your Hub</span>
          <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-800">
            {hub.name} · {hub.location}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
            <Percent size={11} />
            {hub.commissionRate}% commission
          </span>
          {hub.isVerified ? (
            <span className="flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
              <ShieldCheck size={11} /> Verified
            </span>
          ) : (
            <span className="rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
              Pending Verification
            </span>
          )}
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
            {hub.allowedProductCount} product{hub.allowedProductCount !== 1 ? "s" : ""} allowed
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {STAT_CARDS(s).map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${card.bg} ${card.border}`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{card.label}</p>
              <span className={`${card.color} opacity-60`}>{card.icon}</span>
            </div>
            <p className={`mt-1 text-2xl font-bold ${card.color}`}>{card.value}</p>
          </Link>
        ))}
      </div>

      {/* Financials */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <TrendingUp size={16} />
            <p className="text-sm font-medium">Total Sales</p>
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">{bdt(s.totalSold)}</p>
          <p className="mt-1 text-xs text-slate-400">Gross amount from all local market sales</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <Percent size={16} />
            <p className="text-sm font-medium">Total Commission Earned</p>
          </div>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{bdt(s.totalCommission)}</p>
          <p className="mt-1 text-xs text-slate-400">Your earnings after platform deduction</p>
        </div>
      </div>

      {/* Quick links */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Quick Links</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/aroth-dashboard/orders"
            className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition">
            <ShoppingBag className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-slate-800">My Orders</p>
              <p className="text-xs text-slate-400">Receive, sell, and report payment</p>
            </div>
          </Link>
          <Link href="/aroth-dashboard/history"
            className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition">
            <CheckCircle2 className="h-5 w-5 text-slate-500" />
            <div>
              <p className="text-sm font-semibold text-slate-800">Settled History</p>
              <p className="text-xs text-slate-400">All settled and confirmed orders</p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
