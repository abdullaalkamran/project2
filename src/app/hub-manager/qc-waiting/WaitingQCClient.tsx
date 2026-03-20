"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import api from "@/lib/api";
import type { FlowLot } from "@/lib/product-flow";
import Pagination from "@/components/Pagination";

const LOT_PHASES = [
  { label: "Lot Created",      sublabel: "Seller submitted"     },
  { label: "Received at Hub",  sublabel: "Hub manager accepted" },
  { label: "QC Inspection",    sublabel: "Quality check"        },
  { label: "QC Approved",      sublabel: "Grade & price set"    },
  { label: "Listed in Market", sublabel: "Buyers can order"     },
  { label: "Orders Active",    sublabel: "Qty being fulfilled"  },
];

function lotPhaseActive(status: string): number {
  if (status === "SOLD" || status === "DELIVERED") return 6;
  if (status === "LIVE" || status === "AUCTION_ENDED" || status === "AUCTION_UNSOLD") return 5;
  if (status === "QC_PASSED") return 4;
  if (status === "QC_SUBMITTED") return 3;
  if (status === "IN_QC") return 2;
  if (status === "AT_HUB") return 1;
  return 0;
}

function LotPhaseBar({ rawStatus }: { rawStatus: string }) {
  const active = lotPhaseActive(rawStatus);
  const total  = LOT_PHASES.length;
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex items-start" style={{ minWidth: `${total * 88}px` }}>
        {LOT_PHASES.map((step, i) => {
          const isDone   = i < active;
          const isActive = i === active;
          const isLast   = i === total - 1;
          return (
            <div key={i} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <div className={`h-0.5 flex-1 ${i === 0 ? "invisible" : isDone ? "bg-emerald-400" : isActive ? "bg-gradient-to-r from-emerald-400 to-slate-200" : "bg-slate-200"}`} />
                <div className={`relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[9px] font-bold transition-all ${
                  isDone   ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
                  : isActive ? "border-emerald-500 bg-white text-emerald-600 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]"
                  : "border-slate-200 bg-white text-slate-400"
                }`}>
                  {isDone ? (
                    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  ) : isActive ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                <div className={`h-0.5 flex-1 ${isLast ? "invisible" : isDone ? "bg-emerald-400" : "bg-slate-200"}`} />
              </div>
              <div className="mt-1.5 px-0.5 text-center">
                <p className={`text-[9px] font-semibold leading-tight ${isDone ? "text-emerald-700" : isActive ? "text-emerald-700" : "text-slate-400"}`}>{step.label}</p>
                <p className={`mt-0.5 text-[8px] leading-tight ${isDone ? "text-emerald-500" : isActive ? "text-emerald-500" : "text-slate-300"}`}>{step.sublabel}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const PAGE_SIZE = 15;

type WaitingRow = {
  id: string;
  product: string;
  category: string;
  seller: string;
  leader: string;
  checker: string;
  qty: string;
  received: string;
  currentStatus: string;
  rawLotStatus: string;
  timeline: Array<{ label: string; at: string; state: "done" | "current" | "pending" }>;
};

const statusChip: Record<string, string> = {
  "Leader Assigned": "bg-amber-50 text-amber-700",
  "Checker Assigned": "bg-orange-50 text-orange-700",
  "QC In Progress": "bg-blue-50 text-blue-700",
  "QC Submitted": "bg-violet-50 text-violet-700",
  "Re-inspection Requested": "bg-red-50 text-red-700",
  Approved: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-red-50 text-red-600",
};

const timelineDot: Record<"done" | "current" | "pending", string> = {
  done: "bg-emerald-500",
  current: "bg-sky-500",
  pending: "bg-slate-300",
};

function deriveCurrentStatus(l: FlowLot): string {
  if (l.status === "QC_PASSED" || l.leaderDecision === "Approved") return "Approved";
  if (l.status === "QC_FAILED" || l.leaderDecision === "Rejected") return "Rejected";
  if (l.status === "QC_SUBMITTED" || l.qcTaskStatus === "SUBMITTED") return "QC Submitted";
  if (l.status === "IN_QC" && l.qcTaskStatus === "IN_PROGRESS") return "QC In Progress";
  if (l.status === "IN_QC" && l.qcTaskStatus === "PENDING" && l.qcSubmittedAt) return "Re-inspection Requested";
  if (l.qcChecker) return "Checker Assigned";
  if (l.qcLeader) return "Leader Assigned";
  return "Waiting Assignment";
}

function buildTimeline(l: FlowLot, currentStatus: string): WaitingRow["timeline"] {
  const created = l.createdAt ? new Date(l.createdAt).toLocaleString() : "-";
  const received = l.receivedAt ? new Date(l.receivedAt).toLocaleString() : "Not received yet";
  const submitted = l.qcSubmittedAt ? new Date(l.qcSubmittedAt).toLocaleString() : "Not submitted yet";
  const leaderDecisionAt =
    currentStatus === "Approved"
      ? "Approved by QC Team Leader"
      : currentStatus === "Rejected"
        ? "Rejected by QC Team Leader"
        : "Waiting for QC Team Leader";

  return [
    { label: "Lot created", at: created, state: "done" },
    { label: "Received at hub", at: received, state: l.receivedAt ? "done" : "pending" },
    { label: "Leader assigned", at: l.qcLeader ? received : "Not assigned", state: l.qcLeader ? "done" : "pending" },
    { label: "Checker assigned", at: l.qcChecker ? received : "Not assigned", state: l.qcChecker ? "done" : "pending" },
    {
      label:
        currentStatus === "QC In Progress"
          ? "QC inspection in progress"
          : currentStatus === "Re-inspection Requested"
            ? "Re-inspection requested by leader"
            : "QC inspection in queue",
      at: currentStatus === "QC In Progress" ? "In progress now" : submitted,
      state: currentStatus === "QC In Progress" || currentStatus === "Re-inspection Requested" ? "current" : "done",
    },
    {
      label: "Inspection submitted",
      at: submitted,
      state: l.qcSubmittedAt ? "done" : "pending",
    },
    {
      label: "Leader decision",
      at: leaderDecisionAt,
      state: currentStatus === "Approved" || currentStatus === "Rejected" ? "done" : "pending",
    },
  ];
}

function toRow(l: FlowLot): WaitingRow {
  const currentStatus = deriveCurrentStatus(l);
  return {
    id: l.id,
    product: l.title,
    category: l.category,
    seller: l.sellerName,
    leader: l.qcLeader ?? "Unassigned",
    checker: l.qcChecker ?? "Unassigned",
    qty: `${l.quantity} ${l.unit}`,
    received: l.receivedAt ? new Date(l.receivedAt).toLocaleString() : "-",
    currentStatus,
    rawLotStatus: l.status,
    timeline: buildTimeline(l, currentStatus),
  };
}

export default function WaitingQCClient() {
  const [rows, setRows] = useState<WaitingRow[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      const lots = await api.get<FlowLot[]>("/api/flow/lots");
      const waiting = lots
        .filter((l) => {
          const hasAssignee = !!l.qcLeader || !!l.qcChecker;
          const pendingQc =
            l.status === "IN_QC" &&
            (l.qcTaskStatus === "PENDING" || l.qcTaskStatus === "IN_PROGRESS");
          // Backward compatibility for older rows that were assigned but remained AT_HUB.
          const legacyAssignedAtHub = l.status === "AT_HUB" && hasAssignee;
          return pendingQc || legacyAssignedAtHub;
        })
        .map(toRow);
      setRows(waiting);
    };
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Waiting for QC Check</h1>
        <p className="text-slate-500">Lots assigned to QC with current product status and full status timeline.</p>
      </div>

      <div className="space-y-4">
        {rows.length === 0 && (
          <div className="rounded-2xl border border-slate-100 bg-white p-5 text-sm text-slate-500 shadow-sm">
            No lots are waiting for QC check.
          </div>
        )}
        {rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((r) => (
          <div key={r.id} className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setExpanded((prev) => ({ ...prev, [r.id]: !prev[r.id] }))}
              className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-slate-50"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-slate-500">{r.id}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusChip[r.currentStatus] ?? "bg-slate-100 text-slate-700"}`}>
                    {r.currentStatus}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-900">{r.product}</p>
                <p className="text-xs text-slate-500">
                  {r.category} · {r.qty} · Seller: {r.seller}
                </p>
                <p className="text-xs text-slate-400">
                  Leader: {r.leader} · Checker: {r.checker} · Received: {r.received}
                </p>
              </div>
              {expanded[r.id] ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>

            {expanded[r.id] && (
              <div className="border-t border-slate-100 p-4 space-y-4">
                <LotPhaseBar rawStatus={r.rawLotStatus} />
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status Timeline</p>
                <div className="space-y-3">
                  {r.timeline.map((event, idx) => (
                    <div key={`${r.id}-${idx}`} className="flex items-start gap-3">
                      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${timelineDot[event.state]}`} />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{event.label}</p>
                        <p className="text-xs text-slate-500">{event.at}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <Pagination page={page} totalPages={Math.ceil(rows.length / PAGE_SIZE)} onPageChange={setPage} className="mt-4" />
    </div>
  );
}
