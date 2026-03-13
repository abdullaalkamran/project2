"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, Truck } from "lucide-react";
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

type Hub = { id: string; name: string; location: string; type: string; roles?: string[] };

const URGENCY_STYLES: Record<string, { border: string; bg: string; badge: string; icon: string; dot: string }> = {
  high:   { border: "border-rose-200",   bg: "bg-rose-50",    badge: "bg-rose-100 text-rose-700",   icon: "text-rose-500",   dot: "bg-rose-500"   },
  medium: { border: "border-amber-200",  bg: "bg-amber-50",   badge: "bg-amber-100 text-amber-700",  icon: "text-amber-500",  dot: "bg-amber-500"  },
  low:    { border: "border-slate-200",  bg: "bg-slate-50",   badge: "bg-slate-100 text-slate-600",  icon: "text-slate-400",  dot: "bg-slate-400"  },
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  inbound:        <ArrowRight className="h-4 w-4" />,
  qc_assign:      <CheckCircle2 className="h-4 w-4" />,
  leader_review:  <Clock className="h-4 w-4" />,
  truck:          <Truck className="h-4 w-4" />,
  load_confirm:   <CheckCircle2 className="h-4 w-4" />,
  dispatch:       <Truck className="h-4 w-4" />,
  unsold:         <AlertTriangle className="h-4 w-4" />,
};

export default function HubManagerOverviewPage() {
  const [stats, setStats] = useState<StatItem[]>([]);
  const [requiredActions, setRequiredActions] = useState<RequiredAction[]>([]);
  const [myHubs, setMyHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ stats: StatItem[]; requiredActions: RequiredAction[] }>("/api/hub-manager/overview"),
      api.get<{ hubs: Hub[] }>("/api/hub-manager/my-hubs"),
    ])
      .then(([data, hubData]) => {
        setStats(data.stats);
        setRequiredActions(data.requiredActions ?? []);
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
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
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

      {/* Your Hubs banner */}
      {myHubs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-3">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">Your Hubs</span>
          {myHubs.map((h) => (
            <span key={h.id} className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
              {h.name}
              <span className="text-indigo-400">· {h.location}</span>
              {h.roles && h.roles.length > 0 && (
                <span className="flex gap-1">
                  {h.roles.map((r) => (
                    <span key={r} className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                      r === "hub_manager" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {r === "hub_manager" ? "HM" : "DHM"}
                    </span>
                  ))}
                </span>
              )}
            </span>
          ))}
        </div>
      )}

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

      {/* Required Actions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Required Actions</h2>
          {requiredActions.length === 0 && (
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
              ✓ All clear
            </span>
          )}
        </div>

        {requiredActions.length === 0 ? (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-6 py-5 text-sm text-emerald-700 font-semibold">
            No pending actions — everything is on track! 🎉
          </div>
        ) : (
          <div className="space-y-3">
            {requiredActions.map((action) => {
              const s = URGENCY_STYLES[action.urgency];
              return (
                <div key={action.type} className={`rounded-2xl border ${s.border} ${s.bg} overflow-hidden`}>
                  {/* Action header */}
                  <div className="flex items-center justify-between gap-4 px-5 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`shrink-0 ${s.icon}`}>{ACTION_ICONS[action.type]}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-slate-900">{action.title}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.badge}`}>
                            {action.count} {action.count === 1 ? "item" : "items"}
                          </span>
                          {action.urgency === "high" && (
                            <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wide">
                              Urgent
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">{action.desc}</p>
                      </div>
                    </div>
                    <Link
                      href={action.href}
                      className="shrink-0 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
                    >
                      Go →
                    </Link>
                  </div>

                  {/* Action items list */}
                  <div className="border-t border-white/60 divide-y divide-white/60">
                    {action.items.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        className="flex items-center justify-between gap-3 bg-white/50 px-5 py-2.5 transition hover:bg-white/80"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
                          <span className="truncate text-xs font-semibold text-slate-800">{item.label}</span>
                          <span className="shrink-0 text-[11px] text-slate-400">{item.sub}</span>
                        </div>
                        <span className="shrink-0 font-mono text-[10px] text-slate-400">{item.id}</span>
                      </Link>
                    ))}
                    {action.count > action.items.length && (
                      <Link
                        href={action.href}
                        className="flex items-center justify-center bg-white/30 px-5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition"
                      >
                        +{action.count - action.items.length} more — view all
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* quick links */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/hub-manager/inbound",     label: "Inbound Log",         desc: "All received lots",              color: "text-orange-700" },
          { href: "/hub-manager/qc-assign",   label: "QC Assignment",       desc: "Assign / track QC teams",        color: "text-blue-700"   },
          { href: "/hub-manager/inventory",   label: "Inventory",           desc: "In-hub stock overview",          color: "text-emerald-700"},
          { href: "/hub-manager/dispatch",    label: "Dispatch",            desc: "Post-auction dispatch",          color: "text-amber-700"  },
          { href: "/hub-manager/sellers",     label: "Registered Sellers",  desc: "Contact details & lots",         color: "text-teal-700"   },
          { href: "/hub-manager/bid-winners", label: "Bid Winners",         desc: "Buyer details & auction results",color: "text-indigo-700" },
          { href: "/hub-manager/trucks",      label: "Trucks & Drivers",    desc: "Fleet & driver roster",          color: "text-sky-700"    },
          { href: "/hub-manager/reports",     label: "Reports",             desc: "Hub analytics & exports",        color: "text-slate-700"  },
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
