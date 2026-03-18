"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
  Loader2,
  Search,
  AlertTriangle,
  XCircle,
  FileText,
  ArrowRight,
  Scale,
} from "lucide-react";
import api from "@/lib/api";
import type { FlowLot } from "@/lib/product-flow";
import LotLifecycleTracker from "@/components/LotLifecycleTracker";

/* ─── types ─── */
type HistoryItem = {
  lotId: string;
  product: string;
  category: string;
  qty: string;
  hub: string;
  grade: string;
  verdict: "PASSED" | "FAILED" | "CONDITIONAL";
  notes: string;
  submittedAt: string;
  leaderDecision: "Approved" | "Rejected" | "Pending";
  seller: string;
  rawLotStatus: string;
};

type VerdictFilter = "all" | "PASSED" | "FAILED" | "CONDITIONAL";
type DecisionFilter = "all" | "Approved" | "Rejected" | "Pending";

/* ─── style maps ─── */
const verdictStyles: Record<string, { bg: string; text: string; icon: typeof CheckCircle2 }> = {
  PASSED: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", icon: CheckCircle2 },
  FAILED: { bg: "bg-red-50 border-red-200", text: "text-red-700", icon: XCircle },
  CONDITIONAL: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", icon: AlertTriangle },
};

const decisionStyles: Record<string, { bg: string; text: string }> = {
  Approved: { bg: "bg-emerald-100", text: "text-emerald-700" },
  Rejected: { bg: "bg-red-100", text: "text-red-700" },
  Pending: { bg: "bg-orange-100", text: "text-orange-700" },
};

const gradeColors: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-700",
  B: "bg-blue-100 text-blue-700",
  C: "bg-orange-100 text-orange-700",
};

/* ─── parse FlowLot to history ─── */
function toHistory(lot: FlowLot): HistoryItem | null {
  if (!lot.verdict || !lot.qcSubmittedAt) return null;
  return {
    lotId: lot.id,
    product: lot.title,
    category: lot.category,
    qty: `${lot.quantity.toLocaleString()} ${lot.unit}`,
    hub: lot.hubId,
    grade: lot.grade || "B",
    verdict: lot.verdict,
    notes: lot.qcNotes || "",
    submittedAt: lot.qcSubmittedAt,
    leaderDecision: lot.leaderDecision || "Pending",
    seller: lot.sellerName,
    rawLotStatus: lot.leaderDecision === "Approved"
      ? "QC_PASSED"
      : lot.leaderDecision === "Rejected" || lot.verdict === "FAILED"
        ? "QC_FAILED"
        : "QC_SUBMITTED",
  };
}

export default function HistoryClient() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>("all");
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const me = await api.get<{ id: string; name: string }>("/api/auth/me");
        const query = me?.id ? `?checkerId=${encodeURIComponent(me.id)}` : "";
        const rows = await api.get<FlowLot[]>(`/api/flow/tasks${query}`);
        const history = rows
          .map(toHistory)
          .filter((x): x is HistoryItem => x !== null)
          .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        setItems(history);
      } catch {
        toast.error("Failed to load inspection history");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filtered = items.filter((item) => {
    const matchSearch =
      !search ||
      item.product.toLowerCase().includes(search.toLowerCase()) ||
      item.lotId.toLowerCase().includes(search.toLowerCase()) ||
      item.seller.toLowerCase().includes(search.toLowerCase());
    const matchVerdict = verdictFilter === "all" || item.verdict === verdictFilter;
    const matchDecision = decisionFilter === "all" || item.leaderDecision === decisionFilter;
    return matchSearch && matchVerdict && matchDecision;
  });

  // Stats
  const stats = {
    total: items.length,
    passed: items.filter((i) => i.verdict === "PASSED").length,
    failed: items.filter((i) => i.verdict === "FAILED").length,
    conditional: items.filter((i) => i.verdict === "CONDITIONAL").length,
    approved: items.filter((i) => i.leaderDecision === "Approved").length,
    rejected: items.filter((i) => i.leaderDecision === "Rejected").length,
    pending: items.filter((i) => i.leaderDecision === "Pending").length,
  };

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
        <h1 className="text-2xl font-bold text-slate-900">Inspection History</h1>
        <p className="text-slate-500 text-sm">
          View all your past QC inspection reports and their approval status.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: "Total Reports", value: stats.total, color: "text-slate-700", bg: "bg-slate-50 border-slate-200" },
          { label: "Passed", value: stats.passed, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
          { label: "Failed", value: stats.failed, color: "text-red-700", bg: "bg-red-50 border-red-200" },
          { label: "Leader Approved", value: stats.approved, color: "text-sky-700", bg: "bg-sky-50 border-sky-200" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
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

        {/* Verdict Filter */}
        <div className="flex items-center gap-1.5">
          <Filter size={14} className="text-slate-400" />
          {(["all", "PASSED", "FAILED", "CONDITIONAL"] as VerdictFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setVerdictFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                verdictFilter === f
                  ? "bg-sky-100 text-sky-700"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100"
              }`}
            >
              {f === "all" ? "All" : f === "PASSED" ? "Passed" : f === "FAILED" ? "Failed" : "Conditional"}
            </button>
          ))}
        </div>

        {/* Decision Filter */}
        <div className="flex items-center gap-1.5">
          {(["all", "Approved", "Rejected", "Pending"] as DecisionFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setDecisionFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                decisionFilter === f
                  ? "bg-sky-100 text-sky-700"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100"
              }`}
            >
              {f === "all" ? "All Decisions" : f}
            </button>
          ))}
        </div>
      </div>

      {/* History List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
            <FileText size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">
              {items.length === 0
                ? "No inspection reports yet"
                : "No reports match your filters"}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {items.length === 0
                ? "Complete an inspection to see it here."
                : "Try adjusting your search or filter criteria."}
            </p>
          </div>
        )}

        {filtered.map((item) => {
          const vStyle = verdictStyles[item.verdict];
          const VIcon = vStyle.icon;
          const dStyle = decisionStyles[item.leaderDecision];
          const isExpanded = expandedId === item.lotId;

          return (
            <div
              key={item.lotId}
              className={`rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
                item.leaderDecision === "Rejected"
                  ? "border-red-100"
                  : item.leaderDecision === "Approved"
                    ? "border-emerald-100"
                    : "border-slate-200"
              }`}
            >
              {/* Summary Row */}
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : item.lotId)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className={`rounded-xl border p-2.5 ${vStyle.bg}`}>
                    <VIcon size={18} className={vStyle.text} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-slate-400">{item.lotId}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${gradeColors[item.grade] || "bg-slate-100 text-slate-500"}`}>
                        Grade {item.grade}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${dStyle.bg} ${dStyle.text}`}>
                        {item.leaderDecision}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 truncate">{item.product}</h3>
                    <p className="text-xs text-slate-500">
                      {item.category} · {item.qty} · {item.hub} · Seller: {item.seller}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-slate-400">Submitted</p>
                    <p className="text-xs font-semibold text-slate-600">
                      {new Date(item.submittedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={18} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={18} className="text-slate-400" />
                  )}
                </div>
              </button>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-4">
                  <LotLifecycleTracker lotStatus={item.rawLotStatus} />
                  {/* Timeline */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Timeline</h4>
                    <div className="relative pl-6 space-y-4">
                      <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-slate-200" />

                      {/* Submitted */}
                      <div className="relative">
                        <div className="absolute -left-[18px] top-0.5 h-3 w-3 rounded-full bg-sky-500 border-2 border-white" />
                        <div className="flex items-center gap-2">
                          <Clock size={12} className="text-slate-400" />
                          <span className="text-xs font-semibold text-slate-700">QC Report Submitted</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(item.submittedAt).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Leader Decision */}
                      <div className="relative">
                        <div
                          className={`absolute -left-[18px] top-0.5 h-3 w-3 rounded-full border-2 border-white ${
                            item.leaderDecision === "Approved"
                              ? "bg-emerald-500"
                              : item.leaderDecision === "Rejected"
                                ? "bg-red-500"
                                : "bg-orange-400"
                          }`}
                        />
                        <div className="flex items-center gap-2">
                          {item.leaderDecision === "Pending" ? (
                            <Clock size={12} className="text-orange-400" />
                          ) : item.leaderDecision === "Approved" ? (
                            <CheckCircle2 size={12} className="text-emerald-500" />
                          ) : (
                            <XCircle size={12} className="text-red-500" />
                          )}
                          <span className="text-xs font-semibold text-slate-700">
                            Leader: {item.leaderDecision}
                          </span>
                          {item.leaderDecision === "Pending" && (
                            <span className="text-[10px] text-orange-500 italic">Awaiting review…</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-4 space-y-2">
                      <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">QC Verdict</h4>
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg border p-2 ${vStyle.bg}`}>
                          <VIcon size={16} className={vStyle.text} />
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${vStyle.text}`}>
                            {item.verdict === "PASSED" ? "Passed" : item.verdict === "FAILED" ? "Failed" : "Conditional"}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Grade {item.grade} ·{" "}
                            {new Date(item.submittedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4 space-y-2">
                      <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Leader Decision</h4>
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg p-2 ${dStyle.bg}`}>
                          <Scale size={16} className={dStyle.text} />
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${dStyle.text}`}>{item.leaderDecision}</p>
                          <p className="text-[10px] text-slate-400">
                            {item.leaderDecision === "Pending"
                              ? "Awaiting QC Leader review"
                              : item.leaderDecision === "Approved"
                                ? "Product cleared for auction"
                                : "Action required – check remarks"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {item.notes && (
                    <div className="rounded-xl bg-amber-50/50 border border-amber-100 p-4">
                      <h4 className="text-xs font-bold text-amber-700 mb-1">QC Notes</h4>
                      <p className="text-sm text-amber-800 whitespace-pre-wrap">{item.notes}</p>
                    </div>
                  )}

                  {/* Action */}
                  <div className="flex justify-end">
                    <Link
                      href={`/qc-checker/tasks/${item.lotId}`}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                    >
                      View Full Report <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
