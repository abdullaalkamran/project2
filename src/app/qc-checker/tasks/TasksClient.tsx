"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ClipboardCheck, Filter, Loader2, RotateCcw, Search } from "lucide-react";
import api from "@/lib/api";
import type { FlowLot } from "@/lib/product-flow";

type TaskStatus = "Pending" | "In Progress" | "Submitted";

type Task = {
  taskId: string;
  lotId: string;
  product: string;
  category: string;
  qty: string;
  seller: string;
  hub: string;
  storage: string;
  assignedBy: string;
  assignedAt: string;
  priority: "High" | "Medium" | "Low";
  status: TaskStatus;
  isReinspection: boolean;
};

type MeResponse = { name: string };

function toTaskStatus(l: FlowLot): TaskStatus {
  if (l.qcTaskStatus === "IN_PROGRESS") return "In Progress";
  if (l.qcTaskStatus === "SUBMITTED") return "Submitted";
  return "Pending";
}

function toTask(l: FlowLot): Task {
  const hasPrior = !!l.qcSubmittedAt || !!l.verdict || !!l.qcNotes;
  const isReinspection =
    l.qcTaskStatus === "PENDING" && l.leaderDecision === "Pending" && hasPrior;
  return {
    taskId: `TSK-${l.id.replace("LOT-", "")}`,
    lotId: l.id,
    product: l.title,
    category: l.category,
    qty: `${l.quantity.toLocaleString()} ${l.unit}`,
    seller: l.sellerName,
    hub: l.hubId,
    storage: l.storageType || "Not specified",
    assignedBy: `${l.qcLeader ?? "QC Leader"} (Team Leader)`,
    assignedAt: l.receivedAt
      ? new Date(l.receivedAt).toLocaleDateString()
      : new Date(l.createdAt).toLocaleDateString(),
    priority: isReinspection ? "High" : l.status === "IN_QC" ? "High" : "Medium",
    status: toTaskStatus(l),
    isReinspection,
  };
}

const priorityColors: Record<string, string> = {
  High: "bg-red-50 text-red-600 border-red-200",
  Medium: "bg-orange-50 text-orange-600 border-orange-200",
  Low: "bg-slate-50 text-slate-600 border-slate-200",
};

const statusColors: Record<TaskStatus, string> = {
  Pending: "bg-orange-50 text-orange-600",
  "In Progress": "bg-blue-50 text-blue-700",
  Submitted: "bg-emerald-50 text-emerald-700",
};

type StatusFilter = "all" | "Pending" | "In Progress";

export default function TasksClient() {
  const [taskList, setTaskList] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [startingId, setStartingId] = useState<string | null>(null);

  const loadTasks = async () => {
    try {
      const me = await api.get<MeResponse>("/api/auth/me");
      const query = me?.name ? `?checker=${encodeURIComponent(me.name)}` : "";
      const rows = await api.get<FlowLot[]>(`/api/flow/tasks${query}`);
      const all = rows.map(toTask);
      // Only show non-submitted tasks
      setTaskList(all.filter((t) => t.status !== "Submitted"));
    } catch {
      setTaskList([]);
      toast.error("Could not load your inspection tasks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTasks();
  }, []);

  const startTask = async (task: Task) => {
    setStartingId(task.taskId);
    try {
      await api.patch(`/api/flow/tasks/${task.lotId}/start`, {});
      await loadTasks();
      toast.success("Inspection started", { description: `Head to the inspection form for ${task.product}.` });
    } catch {
      toast.error("Failed to start inspection.");
    } finally {
      setStartingId(null);
    }
  };

  const filtered = taskList.filter((t) => {
    const matchesSearch =
      !search ||
      t.product.toLowerCase().includes(search.toLowerCase()) ||
      t.lotId.toLowerCase().includes(search.toLowerCase()) ||
      t.seller.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Sort: re-inspections first, then High priority, then Pending before In Progress
  const sorted = [...filtered].sort((a, b) => {
    if (a.isReinspection !== b.isReinspection) return a.isReinspection ? -1 : 1;
    const prio = { High: 0, Medium: 1, Low: 2 };
    if (prio[a.priority] !== prio[b.priority]) return prio[a.priority] - prio[b.priority];
    const stat = { Pending: 0, "In Progress": 1, Submitted: 2 };
    return stat[a.status] - stat[b.status];
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">My Inspection Tasks</h1>
        <p className="text-slate-500">
          Lots assigned to you for QC inspection. Click a task to begin or continue inspection.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Pending", count: taskList.filter((t) => t.status === "Pending").length, color: "text-orange-600", bg: "bg-orange-50", icon: ClipboardCheck },
          { label: "Re-inspection", count: taskList.filter((t) => t.isReinspection).length, color: "text-red-600", bg: "bg-red-50", icon: RotateCcw },
          { label: "In Progress", count: taskList.filter((t) => t.status === "In Progress").length, color: "text-blue-700", bg: "bg-blue-50", icon: ClipboardCheck },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`rounded-xl border border-slate-100 p-4 ${s.bg}`}>
              <div className="flex items-center justify-between">
                <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                <Icon size={16} className={s.color} />
              </div>
              <p className="mt-1 text-xs font-medium text-slate-600">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by product, lot, seller..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={14} className="text-slate-400" />
          {(["all", "Pending", "In Progress"] as StatusFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStatusFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === f
                  ? "bg-sky-100 text-sky-700"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100"
              }`}
            >
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>
      </div>

      {/* Task Cards */}
      <div className="space-y-4">
        {sorted.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
            <ClipboardCheck size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No pending inspection tasks</p>
            <p className="mt-1 text-xs text-slate-400">
              Submitted tasks are shown in{" "}
              <Link href="/qc-checker/history" className="font-semibold text-sky-600 hover:underline">
                Inspection History
              </Link>.
            </p>
          </div>
        )}

        {sorted.map((t) => (
          <div
            key={t.taskId}
            className={`rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
              t.isReinspection
                ? "border-red-200 ring-1 ring-red-100"
                : t.status === "In Progress"
                  ? "border-blue-200"
                  : "border-slate-200"
            }`}
          >
            <div className="p-5 space-y-4">
              {/* Top row */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">{t.taskId}</span>
                    <span className="font-mono text-xs text-slate-400">{t.lotId}</span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${priorityColors[t.priority]}`}>
                      {t.priority}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[t.status]}`}>
                      {t.status}
                    </span>
                    {t.isReinspection && (
                      <span className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold text-red-600">
                        <RotateCcw size={10} /> Re-inspection
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{t.product}</h3>
                  <p className="text-sm text-slate-500">{t.category} · {t.qty} · {t.hub}</p>
                </div>

                {/* Seller info card */}
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600 space-y-1 min-w-[180px]">
                  <p className="font-semibold text-slate-800">{t.seller}</p>
                  <p className="text-slate-400">Storage: {t.storage}</p>
                  <p className="text-slate-400">Assigned: {t.assignedAt}</p>
                  <p className="text-slate-400">By: {t.assignedBy}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                {t.status === "Pending" && (
                  <button
                    type="button"
                    onClick={() => void startTask(t)}
                    disabled={startingId === t.taskId}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    {startingId === t.taskId ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <ClipboardCheck size={13} />
                    )}
                    Start Inspection
                  </button>
                )}
                {t.status === "In Progress" && (
                  <Link
                    href={`/qc-checker/tasks/${t.lotId}`}
                    className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 transition"
                  >
                    <ClipboardCheck size={13} /> Open Inspection Form
                  </Link>
                )}
                <Link
                  href={`/qc-checker/tasks/${t.lotId}`}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  View Details
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
