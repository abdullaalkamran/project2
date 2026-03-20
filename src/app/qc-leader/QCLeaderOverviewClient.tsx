"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  UserCheck,
  FlaskConical,
  CheckCircle2,
  XCircle,
  Layers,
  BadgeAlert,
  ShieldCheck,
  ArrowRight,
  Loader2,
  Truck,
  Weight,
  DollarSign,
  PenLine,
  PackageCheck,
  SendHorizonal,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface Stat {
  label: string;
  value: string;
  sub: string;
  href: string;
  color: string;
  bg: string;
  border: string;
}

interface ActionItem {
  id: string;
  label: string;
  sub: string;
  href: string;
}

interface RequiredAction {
  type: string;
  title: string;
  desc: string;
  count: number;
  urgency: "high" | "medium" | "low";
  href: string;
  items: ActionItem[];
}

interface PipelineLot {
  lotCode: string;
  title: string;
  seller: string;
  checker: string;
  grade: string | null;
  verdict: string | null;
  qty: string;
  status: string;
  leaderDecision: string | null;
  submitted: string;
}

interface PendingItem {
  lotCode: string;
  title: string;
  seller: string;
  checker: string;
  grade: string | null;
  verdict: string | null;
  qty: string;
  submitted: string;
  hub: string | null;
}

interface OverviewData {
  stats: Stat[];
  pendingList: PendingItem[];
  pendingTotal: number;
  requiredActions: RequiredAction[];
  pipeline: PipelineLot[];
  hubNames: string[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const URGENCY_STYLES: Record<string, { card: string; badge: string; btn: string }> = {
  high:   { card: "border-rose-200 bg-rose-50",   badge: "bg-rose-100 text-rose-700",   btn: "text-rose-700 hover:text-rose-900"   },
  medium: { card: "border-amber-200 bg-amber-50",  badge: "bg-amber-100 text-amber-700",  btn: "text-amber-700 hover:text-amber-900"  },
  low:    { card: "border-slate-200 bg-slate-50",  badge: "bg-slate-100 text-slate-600",  btn: "text-slate-600 hover:text-slate-900"  },
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  approve:          <ClipboardCheck className="h-4 w-4" />,
  assign:           <UserCheck      className="h-4 w-4" />,
  tasks:            <FlaskConical   className="h-4 w-4" />,
  fixed_review:     <ShieldCheck    className="h-4 w-4" />,
  transport_edit:   <PenLine        className="h-4 w-4" />,
  transport_weight: <Weight         className="h-4 w-4" />,
  transport_price:  <DollarSign     className="h-4 w-4" />,
  transport_truck:  <Truck          className="h-4 w-4" />,
  transport_load:     <PackageCheck    className="h-4 w-4" />,
  transport_dispatch: <SendHorizonal   className="h-4 w-4" />,
};

const STAT_ICONS: Record<string, React.ReactNode> = {
  "Pending Approvals":      <ClipboardCheck className="h-5 w-5" />,
  "In QC Inspection":       <FlaskConical   className="h-5 w-5" />,
  "Awaiting Checker":       <UserCheck      className="h-5 w-5" />,
  "Passed Today":           <CheckCircle2   className="h-5 w-5" />,
  "Rejected Today":         <XCircle        className="h-5 w-5" />,
  "Total at Hub":           <Layers         className="h-5 w-5" />,
  "Fixed Price Review":     <BadgeAlert     className="h-5 w-5" />,
  "Needs Weight Check":     <Weight         className="h-5 w-5" />,
  "Needs Truck Price":      <DollarSign     className="h-5 w-5" />,
  "Needs Truck Assigned":   <Truck          className="h-5 w-5" />,
  "Awaiting Load Confirm":  <PackageCheck    className="h-5 w-5" />,
  "Ready to Dispatch":      <SendHorizonal   className="h-5 w-5" />,
};

const VERDICT_COLORS: Record<string, string> = {
  PASSED:      "bg-emerald-50 text-emerald-700",
  CONDITIONAL: "bg-amber-50 text-amber-700",
  FAILED:      "bg-red-50 text-red-600",
};

const DECISION_COLORS: Record<string, string> = {
  Approved: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-red-50 text-red-600",
  Pending:  "bg-orange-50 text-orange-600",
};

const STATUS_LABELS: Record<string, string> = {
  AT_HUB:            "At Hub",
  IN_QC:             "In Inspection",
  QC_SUBMITTED:      "Report Submitted",
  QC_PASSED:         "QC Passed",
  QC_FAILED:         "QC Failed",
  FIXED_PRICE_REVIEW: "Fixed Price Review",
  AUCTION_UNSOLD:    "Auction Unsold",
};

const QUICK_LINKS = [
  { label: "Approval Queue",    sub: "Review QC reports",              href: "/qc-leader/approvals",        icon: <ClipboardCheck className="h-5 w-5 text-violet-600" /> },
  { label: "Assign Checkers",   sub: "Assign inspectors to lots",      href: "/qc-leader/tasks",            icon: <UserCheck className="h-5 w-5 text-blue-600" />       },
  { label: "Active Tasks",      sub: "Track inspections in progress",  href: "/qc-leader/tasks",            icon: <FlaskConical className="h-5 w-5 text-teal-600" />    },
  { label: "Confirmed Orders",  sub: "Pre-dispatch & truck actions",   href: "/qc-leader/confirmed-orders", icon: <Truck className="h-5 w-5 text-amber-600" />          },
  { label: "History",           sub: "Browse past decisions",          href: "/qc-leader/history",          icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" /> },
  { label: "Rejected Lots",     sub: "Lots held for issues",           href: "/qc-leader/rejected",         icon: <XCircle className="h-5 w-5 text-rose-600" />         },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function QCLeaderOverviewClient() {
  const [data, setData]     = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/qc-leader/overview")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError("Failed to load data."); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-600">
        {error ?? "Unexpected error."}
      </div>
    );
  }

  const { stats, pendingList, pendingTotal, requiredActions, pipeline, hubNames } = data;

  return (
    <div className="space-y-10">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">QC Team Leader Overview</h1>
        <p className="text-slate-500">
          {hubNames.length > 0 ? (
            <>Hub: <span className="font-semibold text-slate-700">{hubNames.join(" · ")}</span> · Your inspection pipeline and pending actions.</>
          ) : (
            "Your inspection pipeline and pending actions."
          )}
        </p>
      </div>

      {/* ── Required Actions ───────────────────────────────────────────────── */}
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
                          <span className="ml-1 text-slate-400 font-mono text-[10px]">({item.id})</span>
                          <p className="text-slate-500">{item.sub}</p>
                        </li>
                      ))}
                      {action.count > action.items.length && (
                        <li className="text-[11px] text-slate-400 px-1">
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
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <p className="text-sm font-medium text-emerald-700">All clear — no pending actions right now.</p>
        </div>
      )}

      {/* ── Stats Grid ─────────────────────────────────────────────────────── */}
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

      {/* ── Reports Awaiting Approval ──────────────────────────────────────── */}
      {pendingList.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Reports Awaiting Your Decision
            </h2>
            <Link href="/qc-leader/approvals" className="text-xs font-semibold text-teal-700 hover:underline">
              View all ({pendingTotal}) →
            </Link>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Lot Code</th>
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-left">Checker</th>
                  <th className="px-4 py-3 text-left">Submitted</th>
                  <th className="px-4 py-3 text-left">Grade</th>
                  <th className="px-4 py-3 text-left">Verdict</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pendingList.map((r) => (
                  <tr key={r.lotCode} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.lotCode}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{r.title}</p>
                      <p className="text-[11px] text-slate-400">{r.qty}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{r.checker}</td>
                    <td className="px-4 py-3 text-slate-500">{r.submitted}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{r.grade ?? "—"}</td>
                    <td className="px-4 py-3">
                      {r.verdict ? (
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${VERDICT_COLORS[r.verdict] ?? "bg-slate-50 text-slate-600"}`}>
                          {r.verdict.charAt(0) + r.verdict.slice(1).toLowerCase()}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link href="/qc-leader/approvals" className="text-xs font-semibold text-teal-700 hover:underline">
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Pipeline ───────────────────────────────────────────────────────── */}
      {pipeline.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Lot Pipeline</h2>
            <Link href="/qc-leader/tasks" className="text-xs font-semibold text-teal-700 hover:underline">
              All tasks →
            </Link>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Lot</th>
                  <th className="px-4 py-3 text-left">Checker</th>
                  <th className="px-4 py-3 text-left">Grade</th>
                  <th className="px-4 py-3 text-left">Stage</th>
                  <th className="px-4 py-3 text-left">Decision</th>
                  <th className="px-4 py-3 text-left">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pipeline.map((lot) => (
                  <tr key={lot.lotCode} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{lot.title}</p>
                      <p className="font-mono text-[10px] text-slate-400">{lot.lotCode}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{lot.checker}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{lot.grade ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">
                        {STATUS_LABELS[lot.status] ?? lot.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {lot.leaderDecision ? (
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${DECISION_COLORS[lot.leaderDecision] ?? "bg-slate-50 text-slate-600"}`}>
                          {lot.leaderDecision}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{lot.submitted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Quick Links ────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Quick Links</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {QUICK_LINKS.map((ql) => (
            <Link
              key={ql.label}
              href={ql.href}
              className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              {ql.icon}
              <div>
                <p className="text-sm font-semibold text-slate-800">{ql.label}</p>
                <p className="text-xs text-slate-400">{ql.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
