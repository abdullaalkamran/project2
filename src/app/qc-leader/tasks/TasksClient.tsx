"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Search, ChevronDown, ChevronUp, CheckCircle2, XCircle, RotateCcw,
  X, ChevronLeft, ChevronRight, ImageOff, UserCheck, Bell, AlertTriangle, CheckCircle,
  Truck, Weight, DollarSign, PackageCheck, PenLine, ArrowRight, SendHorizonal,
} from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import type { FlowLot } from "@/lib/product-flow";
import type { QCPendingApprovalRecord } from "@/lib/qc-approvals";

// ── Types ──────────────────────────────────────────────────────────────────────
type StaffMember = { id: string; name: string };

// ── Types ──────────────────────────────────────────────────────────────────────
type Tab = "tasks" | "assign" | "approvals" | "transport";

type PreDispatch = {
  physicallyReceived: boolean;
  qualityChecked: boolean;
  packetQty: number;
  grossWeightKg: number;
  freeQty: number;
  step2EditRequested: boolean;
  step2Unlocked: boolean;
  truckPriceBDT: number;
  hubManagerConfirmed: boolean;
  qcLeadConfirmed: boolean;
};

type TransportOrder = {
  id: string;
  product: string;
  qty: string;
  seller: string;
  buyer: string;
  assignedTruck: string | null;
  loadConfirmed: boolean;
  preDispatch: PreDispatch;
};
type TaskStatus = "Assigned" | "In Progress" | "Submitted" | "Approved" | "Rejected";

type TaskRow = {
  taskId: string;
  lotId: string;
  product: string;
  category: string;
  grade: string;
  quantity: string;
  hub: string;
  seller: string;
  checker: string;
  assignedAt: string;
  submittedAt: string | null;
  verdict: string | null;
  qcNotes: string | null;
  currentStatus: TaskStatus;
  sellerPhotoUrls: string[];
};

type AssignLot = {
  id: string;
  product: string;
  category: string;
  qty: string;
  seller: string;
  receivedAt: string;
  leader: string;
  leaderId: string;
};

type UiDecision = "Pending" | "Approved" | "Rejected" | "Re-inspect";
type UiReport = QCPendingApprovalRecord & { decisionLabel: UiDecision };

// ── Helpers ────────────────────────────────────────────────────────────────────
const statusColors: Record<TaskStatus, string> = {
  Assigned:      "bg-blue-50 text-blue-700 border-blue-200",
  "In Progress": "bg-amber-50 text-amber-700 border-amber-200",
  Submitted:     "bg-violet-50 text-violet-700 border-violet-200",
  Approved:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  Rejected:      "bg-red-50 text-red-700 border-red-200",
};

const verdictColors: Record<string, string> = {
  PASSED:      "bg-emerald-50 text-emerald-700",
  CONDITIONAL: "bg-amber-50 text-amber-700",
  FAILED:      "bg-red-50 text-red-700",
};

const gradeColors: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-800",
  B: "bg-amber-100 text-amber-800",
  C: "bg-rose-100 text-rose-700",
};

const decisionChip: Record<UiDecision, string> = {
  Pending:      "bg-violet-50 text-violet-700",
  Approved:     "bg-emerald-50 text-emerald-700",
  Rejected:     "bg-red-50 text-red-600",
  "Re-inspect": "bg-orange-50 text-orange-600",
};

function mapStatus(l: FlowLot): TaskStatus {
  if (l.status === "QC_PASSED"    || l.leaderDecision === "Approved") return "Approved";
  if (l.status === "QC_FAILED"    || l.leaderDecision === "Rejected") return "Rejected";
  if (l.status === "QC_SUBMITTED" || l.qcTaskStatus  === "SUBMITTED") return "Submitted";
  if (l.qcTaskStatus === "IN_PROGRESS")                               return "In Progress";
  return "Assigned";
}

function toRow(l: FlowLot): TaskRow {
  return {
    taskId:          `QC-${l.id.replace("LOT-", "")}`,
    lotId:           l.id,
    product:         l.title,
    category:        l.category,
    grade:           l.grade,
    quantity:        `${l.quantity.toLocaleString()} ${l.unit}`,
    hub:             l.hubId,
    seller:          l.sellerName,
    checker:         l.qcChecker ?? "Unassigned",
    assignedAt:      l.receivedAt ? new Date(l.receivedAt).toLocaleString() : new Date(l.createdAt).toLocaleString(),
    submittedAt:     l.qcSubmittedAt ? new Date(l.qcSubmittedAt).toLocaleString() : null,
    verdict:         l.verdict ?? null,
    qcNotes:         l.qcNotes ?? null,
    currentStatus:   mapStatus(l),
    sellerPhotoUrls: l.sellerPhotoUrls ?? [],
  };
}

function toAssignLot(l: FlowLot, leaders: StaffMember[]): AssignLot {
  const leaderMatch = leaders.find((s) => s.name === l.qcLeader);
  return {
    id:         l.id,
    product:    l.title,
    category:   l.category,
    qty:        `${l.quantity} ${l.unit}`,
    seller:     l.sellerName,
    receivedAt: l.receivedAt ? new Date(l.receivedAt).toLocaleString() : "-",
    leader:     l.qcLeader ?? "",
    leaderId:   leaderMatch?.id ?? "",
  };
}

function toDecisionLabel(d: QCPendingApprovalRecord["decision"]): UiDecision {
  if (d === "approved")  return "Approved";
  if (d === "rejected")  return "Rejected";
  if (d === "reinspect") return "Re-inspect";
  return "Pending";
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-100 ${className ?? ""}`} />;
}

const ALL_STATUSES: TaskStatus[] = ["Assigned", "In Progress", "Submitted", "Approved", "Rejected"];

// ── Main component ─────────────────────────────────────────────────────────────
export default function TasksClient() {
  const [tab, setTab]           = useState<Tab>("tasks");

  // ── All Tasks state ───────────────────────────────────────────────────────
  const [rows, setRows]         = useState<TaskRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [query, setQuery]       = useState("");
  const [activeFilter, setActive] = useState<TaskStatus | "All">("All");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [deciding, setDeciding] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ urls: string[]; idx: number } | null>(null);

  // ── Assign Checker state ──────────────────────────────────────────────────
  const [assignLots, setAssignLots] = useState<AssignLot[]>([]);
  const [checkers, setCheckers]     = useState<StaffMember[]>([]);
  const [leaders, setLeaders]       = useState<StaffMember[]>([]);
  const [checkerSel, setCheckerSel] = useState<Record<string, string>>({});
  const [assigning, setAssigning]   = useState<string | null>(null);

  // ── Transport Tasks state ─────────────────────────────────────────────────
  const [transportOrders, setTransportOrders] = useState<TransportOrder[]>([]);
  const [transportLoading, setTransportLoading] = useState(true);

  // ── Pending Approvals state ───────────────────────────────────────────────
  const [reports, setReports]               = useState<UiReport[]>([]);
  const [appLoading, setAppLoading]         = useState(true);
  const [expApprovals, setExpApprovals]     = useState<Record<string, boolean>>({});
  const [selectedPhoto, setSelectedPhoto]   = useState<Record<string, string[]>>({});
  const [deciding2, setDeciding2]           = useState<string | null>(null);

  // ── Load: lots ────────────────────────────────────────────────────────────
  const loadLots = useCallback(async (staffLeaders?: StaffMember[], staffCheckers?: StaffMember[]) => {
    try {
      const [lots, me] = await Promise.all([
        api.get<FlowLot[]>("/api/flow/lots"),
        api.get<{ name: string }>("/api/auth/me"),
      ]);
      const name  = me?.name ?? "";
      const lower = name.trim().toLowerCase();

      const resolvedLeaders = staffLeaders ?? leaders;

      setRows(
        lots
          .filter((l) => !!l.qcChecker)
          .filter((l) => lower ? (l.qcLeader ?? "").trim().toLowerCase() === lower : true)
          .filter((l) => ["IN_QC", "QC_SUBMITTED", "QC_PASSED", "QC_FAILED"].includes(l.status))
          .map(toRow)
      );
      setAssignLots(
        lots
          .filter((l) => l.status !== "PENDING_DELIVERY")
          .filter((l) => !!l.qcLeader)
          .filter((l) => !l.qcChecker)
          .filter((l) => lower ? (l.qcLeader ?? "").trim().toLowerCase() === lower : true)
          .map((l) => toAssignLot(l, resolvedLeaders))
      );
      if (staffCheckers) setCheckers(staffCheckers);
      if (staffLeaders)  setLeaders(staffLeaders);
    } catch {
      toast.error("Could not load tasks.");
    } finally {
      setLoading(false);
    }
  }, [leaders]);

  // ── Load: transport orders ────────────────────────────────────────────────
  const loadTransport = useCallback(async () => {
    try {
      const data = await api.get<TransportOrder[]>("/api/flow/dispatch/orders");
      setTransportOrders(data ?? []);
    } catch {
      // silent — transport section will show empty
    } finally {
      setTransportLoading(false);
    }
  }, []);

  // ── Load: approvals ───────────────────────────────────────────────────────
  const loadApprovals = useCallback(async () => {
    try {
      const data = await api.get<QCPendingApprovalRecord[]>("/api/qc/approvals");
      setReports(data.map((r) => ({ ...r, decisionLabel: toDecisionLabel(r.decision) })));
      setSelectedPhoto(
        Object.fromEntries(
          data.map((r) => [
            r.reportId,
            r.selectedMarketplacePhotoUrls?.length
              ? r.selectedMarketplacePhotoUrls
              : (r.selectedMarketplacePhotoUrl ? [r.selectedMarketplacePhotoUrl] : []),
          ])
        )
      );
    } catch {
      toast.error("Could not load pending approvals.");
    } finally {
      setAppLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const staff = await api.get<{ leaders: StaffMember[]; checkers: StaffMember[] }>("/api/qc-leader/qc-staff");
      await loadLots(staff.leaders, staff.checkers);
    };
    void init();
    void loadApprovals();
    void loadTransport();
  }, [loadLots, loadApprovals, loadTransport]);

  // ── Derived counts ────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const c: Record<string, number> = { All: rows.length };
    ALL_STATUSES.forEach((s) => { c[s] = rows.filter((r) => r.currentStatus === s).length; });
    return c;
  }, [rows]);

  const pendingApprovalCount = useMemo(
    () => reports.filter((r) => r.decisionLabel === "Pending").length,
    [reports]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (activeFilter !== "All" && r.currentStatus !== activeFilter) return false;
      if (q && ![r.product, r.lotId, r.taskId, r.checker, r.seller, r.category].some((v) => v.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [rows, query, activeFilter]);

  const pendingApprovals = useMemo(() => reports.filter((r) => r.decisionLabel === "Pending"), [reports]);
  const doneApprovals    = useMemo(() => reports.filter((r) => r.decisionLabel !== "Pending"), [reports]);

  // ── Transport task groups ─────────────────────────────────────────────────
  const transportGroups = useMemo(() => {
    const needsWeightCheck = transportOrders.filter((o) =>
      o.preDispatch.physicallyReceived && !o.preDispatch.qualityChecked
    );
    const editUnlocked = transportOrders.filter((o) => o.preDispatch.step2Unlocked);
    const needsTruckPrice = transportOrders.filter((o) =>
      o.preDispatch.qualityChecked && (!o.preDispatch.truckPriceBDT || o.preDispatch.truckPriceBDT === 0)
    );
    const needsTruck = transportOrders.filter((o) =>
      o.preDispatch.hubManagerConfirmed && !o.assignedTruck
    );
    const needsLoad = transportOrders.filter((o) =>
      !!o.assignedTruck && o.loadConfirmed !== true
    );
    const readyToDispatch = transportOrders.filter((o) =>
      !!o.assignedTruck && o.loadConfirmed === true
    );
    return { needsWeightCheck, editUnlocked, needsTruckPrice, needsTruck, needsLoad, readyToDispatch };
  }, [transportOrders]);

  const transportPendingCount = useMemo(() => {
    const { needsWeightCheck, editUnlocked, needsTruckPrice, needsTruck, needsLoad, readyToDispatch } = transportGroups;
    return needsWeightCheck.length + editUnlocked.length + needsTruckPrice.length + needsTruck.length + needsLoad.length + readyToDispatch.length;
  }, [transportGroups]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const decideTask = async (lotId: string, decision: "Approved" | "Rejected" | "Re-inspect") => {
    setDeciding(lotId);
    try {
      await api.patch(`/api/flow/lots/${lotId}/leader-decision`, { decision });
      toast.success(decision === "Approved" ? "Lot approved ✓" : decision === "Rejected" ? "Lot rejected" : "Sent for re-inspection");
      await loadLots();
    } catch {
      toast.error("Action failed. Please try again.");
    } finally {
      setDeciding(null);
    }
  };

  const assignChecker = async (lotId: string) => {
    const checkerId = checkerSel[lotId];
    if (!checkerId) { toast.error("Please select a checker first"); return; }
    const lot = assignLots.find((l) => l.id === lotId);
    const checkerName = checkers.find((c) => c.id === checkerId)?.name ?? "Checker";
    setAssigning(lotId);
    try {
      await api.patch(`/api/flow/lots/${lotId}/assign`, {
        leaderId:  lot?.leaderId || undefined,
        checkerId,
      });
      toast.success(`${checkerName} assigned`, { description: "Moved to All Inspection Tasks." });
      await loadLots();
    } catch {
      toast.error("Assignment failed.");
    } finally {
      setAssigning(null);
    }
  };

  const decideApproval = async (reportId: string, decision: "Approved" | "Rejected" | "Re-inspect") => {
    const mapped  = decision === "Approved" ? "approved" : decision === "Rejected" ? "rejected" : "reinspect";
    const row     = reports.find((r) => r.reportId === reportId);
    const selected = selectedPhoto[reportId]?.length
      ? selectedPhoto[reportId]
      : row?.selectedMarketplacePhotoUrls?.length
        ? row.selectedMarketplacePhotoUrls
        : (row?.selectedMarketplacePhotoUrl ? [row.selectedMarketplacePhotoUrl] : []);
    if (decision === "Approved" && selected.length === 0) {
      toast.error("Select one or more seller/QC photos for marketplace before approving.");
      return;
    }
    setDeciding2(reportId);
    try {
      await api.patch<QCPendingApprovalRecord>(`/api/qc/approvals/${reportId}/decision`, {
        decision: mapped,
        selectedPhotoUrls: selected,
        selectedPhotoUrl: selected[0],
      });
      if (row) {
        await api.patch(`/api/flow/lots/${row.lotId}/leader-decision`, { decision });
      }
      setReports((prev) =>
        prev.map((r) =>
          r.reportId === reportId
            ? {
                ...r,
                decision: mapped,
                decisionLabel: decision,
                selectedMarketplacePhotoUrls: selected,
                selectedMarketplacePhotoUrl: selected[0] ?? r.selectedMarketplacePhotoUrl,
              }
            : r
        )
      );
      setExpApprovals((prev) => ({ ...prev, [reportId]: false }));
      if (decision === "Approved")     toast.success("Lot approved. QC decision saved.");
      else if (decision === "Rejected") toast.error("Lot rejected.");
      else                              toast.info("Re-inspection requested.");
    } catch {
      toast.error("Could not save decision.");
    } finally {
      setDeciding2(null);
    }
  };

  const toggleTask     = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));
  const toggleApproval = (id: string) => setExpApprovals((p) => ({ ...p, [id]: !p[id] }));

  const comparisonRows = (r: UiReport) => {
    if (r.sellerSnapshot && r.qcSnapshot && Object.keys(r.sellerSnapshot).length > 0) {
      return Object.keys(r.sellerSnapshot).map((field) => ({
        field,
        seller:  r.sellerSnapshot?.[field] ?? "",
        qc:      r.qcSnapshot?.[field] ?? "",
        changed: (r.sellerSnapshot?.[field] ?? "") !== (r.qcSnapshot?.[field] ?? ""),
      }));
    }
    if (r.changes && r.changes.length > 0) {
      return r.changes.map((c) => ({
        field: c.label,
        seller: c.before,
        qc: c.after,
        changed: true,
      }));
    }
    return [];
  };

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-7 w-52" />
        <div className="flex gap-1"><Skeleton className="h-10 w-32" /><Skeleton className="h-10 w-36" /><Skeleton className="h-10 w-40" /></div>
        <div className="grid gap-3 sm:grid-cols-5">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">QC Tasks</h1>
        <p className="text-slate-500">Assign checkers, monitor inspections, and approve or reject lots — all in one place.</p>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {([
          { key: "tasks",     label: "All Tasks",          badge: rows.length > 0 ? String(rows.length) : null },
          { key: "assign",    label: "Assign Checker",     badge: assignLots.length > 0 ? String(assignLots.length) : null },
          { key: "approvals", label: "Pending Approvals",  badge: pendingApprovalCount > 0 ? String(pendingApprovalCount) : null },
          { key: "transport", label: "Transport Tasks",    badge: transportPendingCount > 0 ? String(transportPendingCount) : null },
        ] as const).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
              tab === t.key
                ? "bg-emerald-500 text-white shadow-sm"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
            }`}
          >
            {t.label}
            {t.badge && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                tab === t.key ? "bg-white/25 text-white" : "bg-slate-300 text-slate-600"
              }`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* Tab: All Tasks                                                    */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {tab === "tasks" && (
        <>
          {/* Stats */}
          <div className="grid gap-3 sm:grid-cols-5">
            {[
              { label: "Total",       key: "All",         color: "text-slate-700",   bg: "bg-slate-50",   border: "border-slate-200"  },
              { label: "Assigned",    key: "Assigned",    color: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200"   },
              { label: "In Progress", key: "In Progress", color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200"  },
              { label: "Submitted",   key: "Submitted",   color: "text-violet-700",  bg: "bg-violet-50",  border: "border-violet-200" },
              { label: "Decided",     key: "done",        color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200"},
            ].map((s) => {
              const count = s.key === "done"
                ? (counts["Approved"] ?? 0) + (counts["Rejected"] ?? 0)
                : (counts[s.key] ?? 0);
              return (
                <div key={s.label} className={`rounded-xl border p-4 ${s.bg} ${s.border}`}>
                  <p className={`text-2xl font-bold ${s.color}`}>{count}</p>
                  <p className="mt-0.5 text-xs font-medium text-slate-600">{s.label}</p>
                </div>
              );
            })}
          </div>

          {/* Search + filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search product, lot ID, checker, seller…"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-teal-400"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["All", ...ALL_STATUSES] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setActive(s)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    activeFilter === s
                      ? "border-teal-400 bg-teal-50 text-teal-700"
                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {s}{s !== "All" && counts[s] ? ` (${counts[s]})` : ""}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-400">{visible.length} of {rows.length} tasks</p>

          {/* Task cards */}
          <div className="space-y-3">
            {visible.length === 0 && (
              <div className="rounded-2xl border border-slate-100 bg-white p-6 text-sm text-slate-500 shadow-sm">
                No tasks match the current filter.
              </div>
            )}

            {visible.map((t) => {
              const isOpen      = !!expanded[t.taskId];
              const isSubmitted = t.currentStatus === "Submitted";
              const isDeciding  = deciding === t.lotId;

              return (
                <div
                  key={t.taskId}
                  className={`rounded-2xl border bg-white shadow-sm transition ${isSubmitted ? "border-violet-200" : "border-slate-100"}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleTask(t.taskId)}
                    className="flex w-full items-start justify-between gap-3 rounded-2xl p-4 text-left transition hover:bg-slate-50"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] text-slate-400">{t.taskId}</span>
                        <span className="font-mono text-[11px] text-slate-400">{t.lotId}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${gradeColors[t.grade] ?? "bg-slate-100 text-slate-600"}`}>
                          Grade {t.grade}
                        </span>
                        <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusColors[t.currentStatus]}`}>
                          {t.currentStatus}
                        </span>
                        {isSubmitted && (
                          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
                            Needs Decision
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-slate-900">{t.product}</p>
                      <p className="text-xs text-slate-500">
                        {t.category} · {t.quantity} · {t.hub} · Checker:{" "}
                        <span className="font-medium text-slate-700">{t.checker}</span>
                      </p>
                    </div>
                    <div className="mt-1 shrink-0 text-slate-400">
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-4">
                      <div className="grid gap-3 sm:grid-cols-3 text-xs">
                        <div className="rounded-xl bg-slate-50 px-3 py-2.5 space-y-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Seller</p>
                          <p className="font-medium text-slate-900">{t.seller}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2.5 space-y-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Assigned</p>
                          <p className="text-slate-700">{t.assignedAt}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2.5 space-y-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Submitted</p>
                          <p className="text-slate-700">{t.submittedAt ?? "Not yet submitted"}</p>
                        </div>
                      </div>

                      {/* Seller photos */}
                      {t.sellerPhotoUrls.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            Seller Photos ({t.sellerPhotoUrls.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {t.sellerPhotoUrls.map((url, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setLightbox({ urls: t.sellerPhotoUrls, idx: i })}
                                className="h-20 w-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 hover:opacity-90 transition"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 px-3 py-2.5 text-xs text-slate-400">
                          <ImageOff size={14} /> No seller photos uploaded for this lot.
                        </div>
                      )}

                      {/* QC report */}
                      {(t.verdict || t.qcNotes) && (
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 space-y-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">QC Report</p>
                          <div className="flex flex-wrap items-center gap-3">
                            {t.verdict && (
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${verdictColors[t.verdict] ?? "bg-slate-100 text-slate-700"}`}>
                                {t.verdict}
                              </span>
                            )}
                            {t.qcNotes && (
                              <p className="text-xs italic text-slate-600">&ldquo;{t.qcNotes}&rdquo;</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Decision buttons */}
                      {isSubmitted && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            type="button"
                            disabled={isDeciding}
                            onClick={() => decideTask(t.lotId, "Approved")}
                            className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                          >
                            <CheckCircle2 size={13} /> Approve
                          </button>
                          <button
                            type="button"
                            disabled={isDeciding}
                            onClick={() => decideTask(t.lotId, "Rejected")}
                            className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                          >
                            <XCircle size={13} /> Reject
                          </button>
                          <button
                            type="button"
                            disabled={isDeciding}
                            onClick={() => decideTask(t.lotId, "Re-inspect")}
                            className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60"
                          >
                            <RotateCcw size={13} /> Re-inspect
                          </button>
                        </div>
                      )}

                      {(t.currentStatus === "Approved" || t.currentStatus === "Rejected") && (
                        <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold ${
                          t.currentStatus === "Approved" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                        }`}>
                          {t.currentStatus === "Approved" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          Decision recorded: {t.currentStatus}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* Tab: Assign Checker                                               */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {tab === "assign" && (
        <div className="space-y-5">
          {assignLots.length > 0 && (
            <div className="flex items-start gap-4 rounded-2xl border border-teal-200 bg-teal-50 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100">
                <Bell size={16} className="text-teal-600" />
              </div>
              <div>
                <p className="font-semibold text-teal-800">
                  {assignLots.length} lot{assignLots.length > 1 ? "s" : ""} awaiting checker assignment
                </p>
                <p className="mt-0.5 text-sm text-teal-600">
                  Hub Manager has assigned these lots to your team. Please assign a QC checker for each.
                </p>
              </div>
            </div>
          )}

          {assignLots.length === 0 && (
            <div className="rounded-2xl border border-slate-100 bg-white p-6 text-sm text-slate-500 shadow-sm">
              No lots awaiting checker assignment.
            </div>
          )}

          <div className="space-y-4">
            {assignLots.map((l) => (
              <div key={l.id} className="rounded-2xl border border-teal-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-slate-400">{l.id}</span>
                      <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-600">Unassigned</span>
                    </div>
                    <p className="text-base font-bold text-slate-900">{l.product}</p>
                    <p className="text-xs text-slate-500">{l.category} · {l.qty}</p>
                  </div>
                  <div className="min-w-[180px] space-y-0.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <p className="font-semibold text-slate-800">{l.seller}</p>
                    <p className="text-slate-400">Received: {l.receivedAt}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-50 pt-3">
                  <UserCheck size={15} className="text-slate-400" />
                  <label className="text-xs font-medium text-slate-500">Assign Checker</label>
                  <select
                    value={checkerSel[l.id] ?? ""}
                    onChange={(e) => setCheckerSel((prev) => ({ ...prev, [l.id]: e.target.value }))}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-teal-400 focus:outline-none"
                  >
                    <option value="">— Select checker —</option>
                    {checkers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button
                    type="button"
                    disabled={!checkerSel[l.id] || assigning === l.id}
                    onClick={() => assignChecker(l.id)}
                    className="rounded-lg bg-teal-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
                  >
                    {assigning === l.id ? "Assigning…" : "Confirm Assignment"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* Tab: Pending Approvals                                            */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {tab === "approvals" && (
        <div className="space-y-6">
          {appLoading && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
            </div>
          )}

          {!appLoading && reports.length === 0 && (
            <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-sm text-slate-400 shadow-sm">
              No pending approvals yet. QC Checker must submit a report first.
            </div>
          )}

          {/* Pending decisions */}
          {!appLoading && pendingApprovals.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Awaiting Your Decision ({pendingApprovals.length})
              </h2>
              {pendingApprovals.map((r) => {
                const isOpen     = !!expApprovals[r.reportId];
                const isDeciding = deciding2 === r.reportId;
                const qtyLabel   = `${r.qty.toLocaleString()} ${r.unit}`;
                const compRows   = comparisonRows(r);
                const allPhotos  = [...(r.sellerPhotoUrls ?? []), ...(r.qcPhotoPreviews ?? [])];

                return (
                  <div key={r.reportId} className="rounded-2xl border border-violet-200 bg-white shadow-sm">
                    <button
                      type="button"
                      onClick={() => toggleApproval(r.reportId)}
                      className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl p-5 text-left transition hover:bg-slate-50"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono text-xs text-slate-400">{r.reportId}</span>
                        <span className="font-mono text-xs text-slate-400">{r.lotId}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${verdictColors[r.verdict] ?? "bg-slate-100 text-slate-700"}`}>
                          {r.verdict}
                        </span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${gradeColors[r.grade] ?? "bg-slate-100 text-slate-600"}`}>
                          Grade {r.grade}
                        </span>
                        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                          {r.changes.length} change{r.changes.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">{r.product}</p>
                          <p className="text-xs text-slate-400">{qtyLabel} · {r.seller}</p>
                        </div>
                        {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="space-y-5 border-t border-slate-100 p-5">
                        {/* Info cards */}
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          {[
                            { label: "Checker",        value: r.checker, sub: `Submitted: ${r.submitted}` },
                            { label: "Weight Verified", value: r.weight ? `${r.weight} ${r.unit}` : "N/A", sub: "" },
                            { label: "Min Bid Rate",    value: `৳${r.minBidRate.toLocaleString()}`, sub: "", valueClass: "text-sky-700" },
                            { label: "Defect Rate",     value: r.defectRate != null ? `${r.defectRate}%` : "N/A", sub: "" },
                          ].map((card) => (
                            <div key={card.label} className="rounded-xl bg-slate-50 p-3">
                              <p className="text-xs text-slate-400">{card.label}</p>
                              <p className={`mt-0.5 font-semibold ${card.valueClass ?? "text-slate-800"}`}>{card.value}</p>
                              {card.sub && <p className="mt-0.5 text-xs text-slate-400">{card.sub}</p>}
                            </div>
                          ))}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                            <p className="text-xs text-amber-500">Seller Transport Share</p>
                            <p className="mt-0.5 font-semibold text-amber-700">
                              {r.sellerTransportShare === "NO"
                                ? "Buyer pays"
                                : r.sellerTransportShare === "HALF"
                                  ? "50% split"
                                  : "Seller pays"}
                            </p>
                          </div>
                          <div className="rounded-xl border border-sky-100 bg-sky-50 p-3">
                            <p className="text-xs text-sky-500">QC Transport Cost</p>
                            <p className="mt-0.5 font-semibold text-sky-700">{r.transportCost != null ? `৳${r.transportCost.toLocaleString()}` : "Not set"}</p>
                          </div>
                          <div className="rounded-xl border border-violet-100 bg-violet-50 p-3">
                            <p className="text-xs text-violet-500">Free Offer Qty</p>
                            {r.freeQtyEnabled && (r.freeQtyPer ?? 0) > 0 ? (
                              <p className="mt-0.5 font-semibold text-violet-700">
                                {r.freeQtyAmount} {r.freeQtyUnit} free per {r.freeQtyPer} {r.freeQtyUnit}
                              </p>
                            ) : (
                              <p className="mt-0.5 text-sm text-slate-500">No free offer</p>
                            )}
                          </div>
                          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                            <p className="text-xs text-emerald-500">Estimated Order Total</p>
                            <p className="mt-0.5 font-semibold text-emerald-700">
                              ৳{((r.minBidRate * r.qty) + (r.transportCost ?? 0)).toLocaleString()}
                            </p>
                            <p className="text-[10px] text-emerald-500">Product: ৳{(r.minBidRate * r.qty).toLocaleString()} + Transport: ৳{(r.transportCost ?? 0).toLocaleString()}</p>
                          </div>
                        </div>

                        {/* Checker notes */}
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <p className="text-xs font-medium text-slate-500">Checker Notes</p>
                          <p className="mt-1 text-sm text-slate-700">{r.notes}</p>
                        </div>

                        {/* Media */}
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
                          <p className="text-xs font-medium text-slate-500">
                            Media · {r.photosCount} photo{r.photosCount !== 1 ? "s" : ""} · {r.videosCount} video{r.videosCount !== 1 ? "s" : ""}
                          </p>

                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Seller Uploaded Photos</p>
                            {r.sellerPhotoUrls && r.sellerPhotoUrls.length > 0 ? (
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                                {r.sellerPhotoUrls.map((src, idx) => (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img key={`seller-${idx}`} src={src} alt={`Seller photo ${idx + 1}`} className="h-24 w-full rounded-lg border border-slate-200 object-cover" />
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500">No seller photos for this lot.</p>
                            )}
                          </div>

                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">QC Checker Uploaded Photos</p>
                            {r.qcPhotoPreviews && r.qcPhotoPreviews.length > 0 ? (
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                                {r.qcPhotoPreviews.map((src, idx) => (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img key={`qc-${idx}`} src={src} alt={`QC photo ${idx + 1}`} className="h-24 w-full rounded-lg border border-slate-200 object-cover" />
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500">No QC checker photos available.</p>
                            )}
                          </div>

                          {/* Select marketplace photo */}
                          <div className="rounded-lg border border-slate-200 bg-white p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Select Marketplace Product Photos</p>
                            <p className="mt-1 text-xs text-slate-400">Choose one or more photos to display in the marketplace listing.</p>
                            {allPhotos.length > 0 ? (
                              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                                {allPhotos.map((src, idx) => {
                                  const selected = selectedPhoto[r.reportId]?.length
                                    ? selectedPhoto[r.reportId]
                                    : r.selectedMarketplacePhotoUrls?.length
                                      ? r.selectedMarketplacePhotoUrls
                                      : (r.selectedMarketplacePhotoUrl ? [r.selectedMarketplacePhotoUrl] : []);
                                  const isSelected = selected.includes(src);
                                  return (
                                    <button
                                      key={`pick-${idx}`}
                                      type="button"
                                      onClick={() => setSelectedPhoto((prev) => {
                                        const current = prev[r.reportId]?.length
                                          ? prev[r.reportId]
                                          : (r.selectedMarketplacePhotoUrls?.length
                                            ? r.selectedMarketplacePhotoUrls
                                            : (r.selectedMarketplacePhotoUrl ? [r.selectedMarketplacePhotoUrl] : []));
                                        const next = current.includes(src)
                                          ? current.filter((u) => u !== src)
                                          : [...current, src];
                                        return { ...prev, [r.reportId]: next };
                                      })}
                                      className={`overflow-hidden rounded-lg border-2 transition ${isSelected ? "border-emerald-500" : "border-slate-200 hover:border-slate-300"}`}
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={src} alt={`Pick ${idx + 1}`} className="h-20 w-full object-cover" />
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="mt-2 text-xs text-slate-500">No photos available to select.</p>
                            )}
                          </div>
                        </div>

                        {/* Comparison table */}
                        {compRows.length > 0 && (
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                              Seller Data vs QC Checker Data
                            </p>
                            <div className="overflow-x-auto rounded-xl border border-slate-100">
                              <table className="w-full text-sm">
                                <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                  <tr>
                                    {["Field", "Seller", "QC Checker", "Status"].map((h) => (
                                      <th key={h} className="px-3 py-2 text-left">{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                  {compRows.map((row) => (
                                    <tr key={row.field} className={row.changed ? "bg-amber-50/40" : ""}>
                                      <td className="px-3 py-2 font-medium text-slate-700">{row.field}</td>
                                      <td className={`px-3 py-2 ${row.changed ? "text-slate-500 line-through" : "text-slate-700"}`}>{row.seller}</td>
                                      <td className={`px-3 py-2 ${row.changed ? "font-semibold text-amber-800" : "text-slate-700"}`}>{row.qc}</td>
                                      <td className="px-3 py-2">
                                        {row.changed
                                          ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Modified</span>
                                          : <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Same</span>
                                        }
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Changes summary */}
                        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Changes made by QC checker</p>
                          {r.changes.length === 0 ? (
                            <p className="mt-1 text-sm text-slate-600">No seller fields were changed.</p>
                          ) : (
                            <ul className="mt-2 space-y-1 text-sm text-slate-700">
                              {r.changes.map((c, idx) => (
                                <li key={`${c.label}-${idx}`}>
                                  {c.label}: <span className="text-slate-500 line-through">{c.before}</span> {"→"} <span className="font-semibold text-amber-800">{c.after}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {r.qcNote && (
                          <div className="rounded-xl border border-sky-100 bg-sky-50 p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-sky-600">Internal QC Note</p>
                            <p className="mt-1 text-sm text-sky-900">{r.qcNote}</p>
                          </div>
                        )}

                        {r.verdict === "CONDITIONAL" && (
                          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" />
                            <span>This lot passed <strong>conditionally</strong>. Only approve if corrections above are acceptable for listing.</span>
                          </div>
                        )}
                        {r.verdict === "FAILED" && (
                          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            <X size={15} className="mt-0.5 shrink-0 text-red-500" />
                            <span>Checker marked this lot as <strong>FAILED</strong>. Rejecting will notify the seller and hub manager.</span>
                          </div>
                        )}

                        {/* Decision buttons */}
                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            type="button"
                            disabled={isDeciding}
                            onClick={() => decideApproval(r.reportId, "Approved")}
                            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                          >
                            <CheckCircle size={15} /> Approve &amp; Go Live
                          </button>
                          <button
                            type="button"
                            disabled={isDeciding}
                            onClick={() => decideApproval(r.reportId, "Re-inspect")}
                            className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-5 py-2.5 text-sm font-semibold text-orange-700 transition hover:bg-orange-100 disabled:opacity-60"
                          >
                            <RotateCcw size={15} /> Request Re-inspection
                          </button>
                          <button
                            type="button"
                            disabled={isDeciding}
                            onClick={() => decideApproval(r.reportId, "Rejected")}
                            className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                          >
                            <XCircle size={15} /> Reject Lot
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Reviewed table */}
          {!appLoading && doneApprovals.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Reviewed</h2>
              <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <tr>
                      {["Report ID", "Lot", "Product", "Checker", "Verdict", "Min Bid", "Decision"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {doneApprovals.map((r) => (
                      <tr key={r.reportId} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{r.reportId}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{r.lotId}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{r.product}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{r.checker}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${verdictColors[r.verdict] ?? "bg-slate-100 text-slate-700"}`}>{r.verdict}</span>
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-sky-700">৳{r.minBidRate.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${decisionChip[r.decisionLabel]}`}>{r.decisionLabel}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* Tab: Transport Tasks                                             */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {tab === "transport" && (
        <div className="space-y-6">
          {transportLoading && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
            </div>
          )}

          {!transportLoading && transportPendingCount === 0 && (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 text-sm text-emerald-700 shadow-sm flex items-center gap-3">
              <CheckCircle2 size={18} className="shrink-0" />
              No pending transport or pre-dispatch tasks right now.
            </div>
          )}

          {!transportLoading && (() => {
            const { needsWeightCheck, editUnlocked, needsTruckPrice, needsTruck, needsLoad, readyToDispatch } = transportGroups;
            const groups = [
              {
                key: "editUnlocked",
                title: "Weight Edit Permission Granted",
                desc: "Hub manager unlocked re-entry — update weight & quality now.",
                urgency: "high" as const,
                icon: <PenLine size={16} />,
                orders: editUnlocked,
                color: "border-rose-200 bg-rose-50",
                badge: "bg-rose-100 text-rose-700",
              },
              {
                key: "needsWeightCheck",
                title: "Needs Weight & Quality Check",
                desc: "Product physically arrived — enter actual weight and quality data.",
                urgency: "high" as const,
                icon: <Weight size={16} />,
                orders: needsWeightCheck,
                color: "border-cyan-200 bg-cyan-50",
                badge: "bg-cyan-100 text-cyan-700",
              },
              {
                key: "needsTruckPrice",
                title: "Truck Price Not Set",
                desc: "Quality check complete — set the transport cost to proceed.",
                urgency: "medium" as const,
                icon: <DollarSign size={16} />,
                orders: needsTruckPrice,
                color: "border-indigo-200 bg-indigo-50",
                badge: "bg-indigo-100 text-indigo-700",
              },
              {
                key: "needsTruck",
                title: "Truck Not Yet Assigned",
                desc: "Pre-dispatch gate complete — assign a truck to dispatch.",
                urgency: "high" as const,
                icon: <Truck size={16} />,
                orders: needsTruck,
                color: "border-amber-200 bg-amber-50",
                badge: "bg-amber-100 text-amber-700",
              },
              {
                key: "needsLoad",
                title: "Load Not Confirmed",
                desc: "Truck assigned — confirm that goods are loaded before dispatch.",
                urgency: "high" as const,
                icon: <PackageCheck size={16} />,
                orders: needsLoad,
                color: "border-teal-200 bg-teal-50",
                badge: "bg-teal-100 text-teal-700",
              },
              {
                key: "readyToDispatch",
                title: "Ready to Dispatch",
                desc: "Truck assigned and load confirmed — initiate dispatch from the dispatch page.",
                urgency: "high" as const,
                icon: <SendHorizonal size={16} />,
                orders: readyToDispatch,
                color: "border-green-200 bg-green-50",
                badge: "bg-green-100 text-green-700",
              },
            ].filter((g) => g.orders.length > 0);

            if (groups.length === 0) return null;

            return (
              <div className="space-y-4">
                {groups.map((g) => (
                  <div key={g.key} className={`rounded-2xl border p-5 ${g.color}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="shrink-0">{g.icon}</span>
                        <p className="font-semibold text-slate-900">{g.title}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${g.badge}`}>
                          {g.orders.length}
                        </span>
                        {g.urgency === "high" && (
                          <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                            Urgent
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{g.desc}</p>
                    <ul className="mt-3 space-y-1.5">
                      {g.orders.slice(0, 5).map((o) => (
                        <li key={o.id} className="rounded-lg bg-white/70 px-3 py-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <span className="font-medium text-slate-800">{o.product}</span>
                              <span className="ml-1.5 font-mono text-[10px] text-slate-400">({o.id})</span>
                              <p className="text-slate-500">{o.seller} → {o.buyer} · {o.qty}</p>
                              {o.assignedTruck && (
                                <p className="text-[11px] text-slate-400">Truck: {o.assignedTruck}</p>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                      {g.orders.length > 5 && (
                        <li className="px-1 text-[11px] text-slate-400">+{g.orders.length - 5} more</li>
                      )}
                    </ul>
                    <Link
                      href="/qc-leader/confirmed-orders"
                      className="mt-3 flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      Manage in Confirmed Orders <ArrowRight size={12} />
                    </Link>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Lightbox ──────────────────────────────────────────────────────────── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-h-[90vh] max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute -top-10 right-0 flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-white/80 hover:text-white"
            >
              <X size={16} /> Close
            </button>
            <div className="overflow-hidden rounded-2xl bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={lightbox.urls[lightbox.idx]} alt={`Photo ${lightbox.idx + 1}`} className="max-h-[70vh] w-full object-contain" />
            </div>
            {lightbox.urls.length > 1 && (
              <div className="mt-3 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setLightbox((lb) => lb && { ...lb, idx: (lb.idx - 1 + lb.urls.length) % lb.urls.length })}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-xs text-white/70">{lightbox.idx + 1} / {lightbox.urls.length}</span>
                <button
                  type="button"
                  onClick={() => setLightbox((lb) => lb && { ...lb, idx: (lb.idx + 1) % lb.urls.length })}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
            {lightbox.urls.length > 1 && (
              <div className="mt-3 flex justify-center gap-2 overflow-x-auto pb-1">
                {lightbox.urls.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setLightbox((lb) => lb && { ...lb, idx: i })}
                    className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                      i === lightbox.idx ? "border-white" : "border-transparent opacity-50 hover:opacity-80"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Thumb ${i + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
