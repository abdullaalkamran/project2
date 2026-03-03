"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type StatItem = {
  label: string;
  value: string;
  sub: string;
  href: string;
  color: string;
  bg: string;
  border: string;
};

export default function HubManagerOverviewPage() {
  const [stats, setStats] = useState<StatItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ stats: StatItem[] }>("/api/hub-manager/overview")
      .then((data) => {
        setStats(data.stats);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-10">
        <div className="space-y-1">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-4 w-64 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Hub Overview</h1>
        <p className="text-slate-500">Full pipeline from seller submission to dispatch.</p>
      </div>

      {/* stats */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className={`rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${s.bg} ${s.border}`}
          >
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-700">{s.label}</p>
            <p className="mt-0.5 text-xs leading-tight text-slate-400">{s.sub}</p>
          </Link>
        ))}
      </div>


      {/* quick links */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/hub-manager/inbound", label: "Inbound Log", desc: "All received lots", color: "text-orange-700" },
          { href: "/hub-manager/qc-assign", label: "QC Assignment", desc: "Assign / track QC teams", color: "text-blue-700" },
          { href: "/hub-manager/inventory", label: "Inventory", desc: "In-hub stock overview", color: "text-emerald-700" },
          { href: "/hub-manager/dispatch", label: "Dispatch", desc: "Post-auction dispatch", color: "text-amber-700" },
          { href: "/hub-manager/sellers", label: "Registered Sellers", desc: "Contact details & lots", color: "text-teal-700" },
          { href: "/hub-manager/bid-winners", label: "Bid Winners", desc: "Buyer details & auction results", color: "text-indigo-700" },
          { href: "/hub-manager/trucks", label: "Trucks & Drivers", desc: "Fleet & driver roster", color: "text-sky-700" },
          { href: "/hub-manager/reports", label: "Reports", desc: "Hub analytics & exports", color: "text-slate-700" },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className={`text-sm font-semibold ${l.color}`}>{l.label}</p>
            <p className="mt-0.5 text-xs text-slate-400">{l.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
