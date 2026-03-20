"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Truck,
  PackageCheck,
  SendHorizonal,
  Layers,
  BarChart3,
} from "lucide-react";
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

type ActionItem = {
  id: string;
  label: string;
  sub: string;
  href: string;
};

type RequiredAction = {
  type: string;
  title: string;
  desc: string;
  count: number;
  urgency: "high" | "medium" | "low";
  href: string;
  items: ActionItem[];
};

type PipelineLot = {
  lotId: string;
  product: string;
  seller: string;
  hub: string;
  qty: string;
  askingPricePerKg: string;
  arrived: string;
  qcChecker: string | null;
  qcLeaderDecision: string | null;
  minBidRate: string | null;
  verdict: "PASSED" | "CONDITIONAL" | "FAILED" | null;
  stage: string;
};

type Hub = { id: string; name: string; location: string; type: string; roles?: string[] };

const URGENCY_STYLES: Record<string, { card: string; badge: string; btn: string; dot: string }> = {
  high:   { card: "border-rose-200 bg-rose-50",   badge: "bg-rose-100 text-rose-700",   btn: "text-rose-700 hover:text-rose-900",   dot: "bg-rose-500"   },
  medium: { card: "border-amber-200 bg-amber-50",  badge: "bg-amber-100 text-amber-700",  btn: "text-amber-700 hover:text-amber-900",  dot: "bg-amber-500"  },
  low:    { card: "border-slate-200 bg-slate-50",  badge: "bg-slate-100 text-slate-600",  btn: "text-slate-600 hover:text-slate-900",  dot: "bg-slate-400"  },
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  pending_orders: <Clock         className="h-4 w-4" />,
  inbound:        <ArrowRight    className="h-4 w-4" />,
  qc_assign:      <CheckCircle2  className="h-4 w-4" />,
  leader_review:  <Clock         className="h-4 w-4" />,
  truck:          <Truck         className="h-4 w-4" />,
  load_confirm:   <PackageCheck  className="h-4 w-4" />,
  dispatch:       <SendHorizonal className="h-4 w-4" />,
  unsold:         <AlertTriangle className="h-4 w-4" />,
};

const VERDICT_COLORS: Record<string, string> = {
  PASSED:      "bg-emerald-50 text-emerald-700",
  CONDITIONAL: "bg-amber-50 text-amber-700",
  FAILED:      "bg-red-50 text-red-600",
};

const STAGE_COLORS: Record<string, string> = {
  "Awaiting Receipt": "bg-orange-50 text-orange-700",
  "In QC":            "bg-blue-50 text-blue-700",
  "Leader Review":    "bg-violet-50 text-violet-700",
  "Approved":         "bg-emerald-50 text-emerald-700",
  "Rejected":         "bg-red-50 text-red-600",
  "Dispatch":         "bg-amber-50 text-amber-700",
};

const STAT_ICONS: Record<string, React.ReactNode> = {
  "Awaiting Receipt":  <ArrowRight    className="h-5 w-5" />,
  "In QC":             <CheckCircle2  className="h-5 w-5" />,
  "Leader Review":     <Clock         className="h-5 w-5" />,
  "Approved & Ready":  <CheckCircle2  className="h-5 w-5" />,
  "Ready to Dispatch": <SendHorizonal className="h-5 w-5" />,
  "Total in Hub":      <Layers        className="h-5 w-5" />,
  "Trucks Available":  <Truck         className="h-5 w-5" />,
};

const QUICK_LINKS = [
  { href: "/hub-manager/inbound",          label: "Inbound Log",         desc: "All received lots",               icon: <ArrowRight    className="h-5 w-5 text-orange-600" /> },
  { href: "/hub-manager/qc-assign",        label: "QC Assignment",       desc: "Assign / track QC teams",         icon: <CheckCircle2  className="h-5 w-5 text-blue-600" />   },
  { href: "/hub-manager/inventory",        label: "Inventory",           desc: "In-hub stock overview",           icon: <Layers        className="h-5 w-5 text-emerald-600" />},
  { href: "/hub-manager/dispatch",         label: "Dispatch",            desc: "Post-auction dispatch",           icon: <SendHorizonal className="h-5 w-5 text-amber-600" />  },
  { href: "/hub-manager/trucks",           label: "Trucks & Drivers",    desc: "Fleet & driver roster",           icon: <Truck         className="h-5 w-5 text-sky-600" />    },
  { href: "/hub-manager/reports",          label: "Reports",             desc: "Hub analytics & exports",         icon: <BarChart3     className="h-5 w-5 text-slate-600" />  },
];

export default function HubManagerOverviewPage() {
  const [stats, setStats]                   = useState<StatItem[]>([]);
  const [requiredActions, setRequiredActions] = useState<RequiredAction[]>([]);
  const [pipeline, setPipeline]             = useState<PipelineLot[]>([]);
  const [myHubs, setMyHubs]                 = useState<Hub[]>([]);
  const [loading, setLoading]               = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ stats: StatItem[]; requiredActions: RequiredAction[]; pipeline: PipelineLot[] }>("/api/hub-manager/overview"),
      api.get<{ hubs: Hub[] }>("/api/hub-manager/my-hubs"),
    ])
      .then(([data, hubData]) => {
        setStats(data.stats ?? []);
        setRequiredActions(data.requiredActions ?? []);
        setPipeline(data.pipeline ?? []);
        setMyHubs(hubData.hubs ?? []);
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
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Hub Overview</h1>
        <p className="text-slate-500">Full pipeline from seller submission to dispatch.</p>
      </div>

      {/* Your Hubs banner */}
      {myHubs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-3">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">Your Hubs</span>
          {myHubs.map((h) => (
            <span key={h.id} className="flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold text-indigo-700">
              {h.name}
              <span className="text-indigo-400">· {h.location}</span>
              {h.roles && h.roles.length > 0 && (
                <span className="flex gap-1">
                  {h.roles.map((r) => (
                    <span key={r} className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${r === "hub_manager" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                      {r === "hub_manager" ? "HM" : "DHM"}
                    </span>
                  ))}
                </span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Required Actions */}
      {requiredActions.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Required Actions</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {requiredActions.map((action) => {
              const styles = URGENCY_STYLES[action.urgency] ?? URGENCY_STYLES.low;
              return (
                <div key={action.type} className={`rounded-2xl border p-5 ${styles.card}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0">{ACTION_ICONS[action.type]}</span>
                      <p className="font-semibold text-slate-900 leading-tight">{action.title}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${styles.badge}`}>
                        {action.count}
                      </span>
                      {action.urgency === "high" && (
                        <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Urgent
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{action.desc}</p>
                  {action.items.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {action.items.map((item) => (
                        <li key={item.id} className="rounded-lg bg-white/70 px-3 py-2 text-xs">
                          <span className="font-medium text-slate-800">{item.label}</span>
                          <span className="ml-1 font-mono text-[10px] text-slate-400">({item.id})</span>
                          <p className="text-slate-500">{item.sub}</p>
                        </li>
                      ))}
                      {action.count > action.items.length && (
                        <li className="px-1 text-[11px] text-slate-400">
                          +{action.count - action.items.length} more
                        </li>
                      )}
                    </ul>
                  )}
                  <Link
                    href={action.href}
                    className={`mt-3 flex items-center gap-1 text-xs font-semibold ${styles.btn}`}
                  >
                    Go <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-sm font-medium text-emerald-700">All clear — no pending actions right now.</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className={`rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${s.bg} ${s.border}`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{s.label}</p>
              <span className={`${s.color} opacity-60`}>{STAT_ICONS[s.label]}</span>
            </div>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-1 text-xs text-slate-400">{s.sub}</p>
          </Link>
        ))}
      </div>

      {/* Lot Pipeline */}
      {pipeline.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Lot Pipeline</h2>
            <Link href="/hub-manager/inventory" className="text-xs font-semibold text-teal-700 hover:underline">
              View all →
            </Link>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Lot</th>
                  <th className="px-4 py-3 text-left">Seller</th>
                  <th className="px-4 py-3 text-left">Qty</th>
                  <th className="px-4 py-3 text-left">Arrived</th>
                  <th className="px-4 py-3 text-left">QC Checker</th>
                  <th className="px-4 py-3 text-left">Verdict</th>
                  <th className="px-4 py-3 text-left">Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pipeline.map((lot) => (
                  <tr key={lot.lotId} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{lot.product}</p>
                      <p className="font-mono text-[10px] text-slate-400">{lot.lotId}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{lot.seller}</td>
                    <td className="px-4 py-3 text-slate-500">{lot.qty}</td>
                    <td className="px-4 py-3 text-slate-500">{lot.arrived}</td>
                    <td className="px-4 py-3 text-slate-500">{lot.qcChecker ?? "—"}</td>
                    <td className="px-4 py-3">
                      {lot.verdict ? (
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${VERDICT_COLORS[lot.verdict] ?? "bg-slate-50 text-slate-600"}`}>
                          {lot.verdict.charAt(0) + lot.verdict.slice(1).toLowerCase()}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STAGE_COLORS[lot.stage] ?? "bg-slate-100 text-slate-600"}`}>
                        {lot.stage}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Quick Links */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Quick Links</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {QUICK_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              {l.icon}
              <div>
                <p className="text-sm font-semibold text-slate-800">{l.label}</p>
                <p className="text-xs text-slate-400">{l.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
