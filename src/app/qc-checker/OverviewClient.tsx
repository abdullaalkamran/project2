"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle, ClipboardCheck, Clock, FileText, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import type { FlowLot } from "@/lib/product-flow";

type MeResponse = { id: string; name: string };

type TaskStatus = "Pending" | "In Progress" | "Submitted";

type Task = {
  taskId: string;
  lotId: string;
  lot: string;
  product: string;
  qty: string;
  hub: string;
  seller: string;
  assignedBy: string;
  priority: "High" | "Medium" | "Low";
  status: TaskStatus;
  isReinspection: boolean;
  verdict?: string;
  leaderDecision?: string;
};

function toStatus(l: FlowLot): TaskStatus {
  if (l.qcTaskStatus === "IN_PROGRESS") return "In Progress";
  if (l.qcTaskStatus === "SUBMITTED") return "Submitted";
  return "Pending";
}

function toTask(l: FlowLot): Task {
  const qty = `${l.quantity.toLocaleString()} ${l.unit}`;
  const hasPrior = !!l.qcSubmittedAt || !!l.verdict || !!l.qcNotes;
  const isReinspection =
    l.qcTaskStatus === "PENDING" && l.leaderDecision === "Pending" && hasPrior;
  return {
    taskId: `TSK-${l.id.replace("LOT-", "")}`,
    lotId: l.id,
    lot: `${l.title} — ${qty}`,
    product: l.title,
    qty,
    hub: l.hubId,
    seller: l.sellerName,
    assignedBy: l.qcLeader ?? "QC Team Leader",
    priority: isReinspection ? "High" : l.status === "IN_QC" ? "High" : "Medium",
    status: toStatus(l),
    isReinspection,
    verdict: l.verdict,
    leaderDecision: l.leaderDecision,
  };
}

const priorityColors: Record<string, string> = {
  High: "bg-red-50 text-red-600 border-red-200",
  Medium: "bg-orange-50 text-orange-600 border-orange-200",
  Low: "bg-slate-50 text-slate-600 border-slate-200",
};

const statusColors: Record<string, string> = {
  Pending: "bg-orange-50 text-orange-600",
  "In Progress": "bg-blue-50 text-blue-700",
  Submitted: "bg-emerald-50 text-emerald-700",
};

export default function OverviewClient() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const me = await api.get<MeResponse>("/api/auth/me");
        const query = me?.id ? `?checkerId=${encodeURIComponent(me.id)}` : "";
        const rows = await api.get<FlowLot[]>(`/api/flow/tasks${query}`);
        setTasks(rows.map(toTask));
      } catch {
        setTasks([]);
        toast.error("Could not load QC checker dashboard.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const activeTasks = useMemo(() => tasks.filter((t) => t.status !== "Submitted"), [tasks]);
  const submittedTasks = useMemo(() => tasks.filter((t) => t.status === "Submitted"), [tasks]);
  const pendingCount = useMemo(() => activeTasks.filter((t) => t.status === "Pending").length, [activeTasks]);
  const inProgressCount = useMemo(() => activeTasks.filter((t) => t.status === "In Progress").length, [activeTasks]);
  const reinspectionCount = useMemo(() => activeTasks.filter((t) => t.isReinspection).length, [activeTasks]);
  const completedCount = submittedTasks.length;
  const approvedCount = useMemo(() => submittedTasks.filter((t) => t.leaderDecision === "Approved").length, [submittedTasks]);

  const recentActive = activeTasks.slice(0, 5);

  const requiredActions = useMemo(() => {
    const actions = [];
    if (reinspectionCount > 0) {
      actions.push({
        type: "reinspect",
        title: "Re-inspection Requested",
        desc: "QC Team Leader has sent these lots back — re-inspect and resubmit your report.",
        count: reinspectionCount,
        urgency: "high" as const,
        href: "/qc-checker/tasks",
        items: activeTasks.filter((t) => t.isReinspection).slice(0, 5).map((t) => ({
          id: t.lotId,
          label: t.product,
          sub: `${t.qty} · ${t.hub} · Assigned by ${t.assignedBy}`,
        })),
      });
    }
    if (pendingCount > 0) {
      actions.push({
        type: "pending",
        title: "Lots Waiting for Inspection",
        desc: "You have been assigned these lots — start inspecting to proceed.",
        count: pendingCount,
        urgency: "high" as const,
        href: "/qc-checker/tasks",
        items: activeTasks.filter((t) => t.status === "Pending" && !t.isReinspection).slice(0, 5).map((t) => ({
          id: t.lotId,
          label: t.product,
          sub: `${t.qty} · ${t.hub} · ${t.seller}`,
        })),
      });
    }
    if (inProgressCount > 0) {
      actions.push({
        type: "inprogress",
        title: "Inspections In Progress",
        desc: "Continue your active inspections and submit the report when done.",
        count: inProgressCount,
        urgency: "medium" as const,
        href: "/qc-checker/tasks",
        items: activeTasks.filter((t) => t.status === "In Progress").slice(0, 5).map((t) => ({
          id: t.lotId,
          label: t.product,
          sub: `${t.qty} · ${t.hub}`,
        })),
      });
    }
    return actions;
  }, [activeTasks, reinspectionCount, pendingCount, inProgressCount]);

  const URGENCY_STYLES: Record<string, { card: string; badge: string; btn: string }> = {
    high:   { card: "border-rose-200 bg-rose-50",   badge: "bg-rose-100 text-rose-700",   btn: "text-rose-700 hover:text-rose-900"   },
    medium: { card: "border-amber-200 bg-amber-50",  badge: "bg-amber-100 text-amber-700",  btn: "text-amber-700 hover:text-amber-900"  },
  };

  const ACTION_ICONS: Record<string, React.ReactNode> = {
    reinspect:  <RotateCcw  className="h-4 w-4" />,
    pending:    <Clock      className="h-4 w-4" />,
    inprogress: <ClipboardCheck className="h-4 w-4" />,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">QC Checker Dashboard</h1>
        <p className="text-slate-500">
          Your assigned inspection tasks, including re-inspection requests from the team leader.
        </p>
      </div>

      {/* Required Actions */}
      {requiredActions.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Required Actions</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {requiredActions.map((action) => {
              const styles = URGENCY_STYLES[action.urgency];
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
        !loading && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">
            <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
            <p className="text-sm font-medium text-emerald-700">All clear — no pending actions right now.</p>
          </div>
        )
      )}

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/qc-checker/tasks"
          className="group rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600">Pending Tasks</p>
            <Clock size={18} className="text-orange-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-orange-600">{pendingCount}</p>
          <p className="mt-1 text-xs text-slate-400">Waiting for your inspection</p>
        </Link>

        <Link
          href="/qc-checker/tasks"
          className="group rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600">Re-inspection</p>
            <RotateCcw size={18} className="text-red-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-red-600">{reinspectionCount}</p>
          <p className="mt-1 text-xs text-slate-400">Sent back by team leader</p>
        </Link>

        <Link
          href="/qc-checker/tasks"
          className="group rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600">In Progress</p>
            <ClipboardCheck size={18} className="text-blue-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-blue-700">{inProgressCount}</p>
          <p className="mt-1 text-xs text-slate-400">Currently inspecting</p>
        </Link>

        <Link
          href="/qc-checker/history"
          className="group rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600">Completed</p>
            <CheckCircle size={18} className="text-emerald-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{completedCount}</p>
          <p className="mt-1 text-xs text-slate-400">{approvedCount} approved by leader</p>
        </Link>
      </div>


      {/* Active Tasks Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Active Tasks</h2>
          <Link href="/qc-checker/tasks" className="text-xs font-semibold text-sky-700 hover:underline">
            View all tasks →
          </Link>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3 text-left">Task</th>
                <th className="px-5 py-3 text-left">Lot / Product</th>
                <th className="px-5 py-3 text-left">Hub</th>
                <th className="px-5 py-3 text-left">Priority</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentActive.length === 0 && (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-400" colSpan={6}>
                    <FileText size={24} className="mx-auto mb-2 text-slate-300" />
                    No active tasks. Check{" "}
                    <Link href="/qc-checker/history" className="font-semibold text-sky-600 hover:underline">
                      Inspection History
                    </Link>{" "}
                    for completed work.
                  </td>
                </tr>
              )}
              {recentActive.map((t) => (
                <tr key={t.taskId} className="hover:bg-slate-50 transition">
                  <td className="px-5 py-4">
                    <span className="font-mono text-xs text-slate-500">{t.taskId}</span>
                    {t.isReinspection && (
                      <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
                        Re-inspect
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900">{t.product}</p>
                    <p className="text-xs text-slate-400">{t.qty} · {t.seller}</p>
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-500">{t.hub}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${priorityColors[t.priority]}`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[t.status]}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      href={`/qc-checker/tasks/${t.lotId}`}
                      className="text-xs font-semibold text-sky-700 hover:underline"
                    >
                      {t.status === "Pending" ? "Start →" : "Inspect →"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Completed */}
      {submittedTasks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Recently Completed</h2>
            <Link href="/qc-checker/history" className="text-xs font-semibold text-sky-700 hover:underline">
              Full history →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {submittedTasks.slice(0, 3).map((t) => (
              <div key={t.taskId} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{t.product}</p>
                    <p className="text-xs text-slate-400">{t.lotId} · {t.qty}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      t.leaderDecision === "Approved"
                        ? "bg-emerald-50 text-emerald-700"
                        : t.leaderDecision === "Rejected"
                          ? "bg-red-50 text-red-600"
                          : "bg-amber-50 text-amber-600"
                    }`}
                  >
                    {t.leaderDecision ?? "Pending"}
                  </span>
                </div>
                {t.verdict && (
                  <p className="mt-2 text-xs text-slate-500">
                    Verdict: <span className="font-semibold text-slate-700">{t.verdict}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
