"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import api from "@/lib/api";
import type { FlowLot } from "@/lib/product-flow";

type MeResponse = {
  name: string;
};

type HistoryRow = {
  lotId: string;
  product: string;
  seller: string;
  qty: string;
  currentStatus: string;
  timeline: Array<{ label: string; at: string; state: "done" | "current" | "pending" }>;
};

const statusChip: Record<string, string> = {
  "In QC": "bg-blue-50 text-blue-700",
  "Submitted to Leader": "bg-violet-50 text-violet-700",
  "Approved by Leader": "bg-emerald-50 text-emerald-700",
  "Rejected by Leader": "bg-red-50 text-red-600",
  "Re-inspection Requested": "bg-orange-50 text-orange-700",
  "Awaiting Checker Assignment": "bg-amber-50 text-amber-700",
};

const timelineDot: Record<"done" | "current" | "pending", string> = {
  done: "bg-emerald-500",
  current: "bg-sky-500",
  pending: "bg-slate-300",
};

function currentStatus(l: FlowLot): string {
  const hasPriorInspection = !!l.qcSubmittedAt || !!l.verdict || !!l.qcNotes;
  if (!l.qcChecker) return "Awaiting Checker Assignment";
  if (l.status === "IN_QC" && l.qcTaskStatus === "PENDING" && l.leaderDecision === "Pending" && hasPriorInspection) {
    return "Re-inspection Requested";
  }
  if (l.status === "QC_SUBMITTED" || l.qcTaskStatus === "SUBMITTED") return "Submitted to Leader";
  if (l.status === "QC_PASSED" || l.leaderDecision === "Approved") return "Approved by Leader";
  if (l.status === "QC_FAILED" || l.leaderDecision === "Rejected") return "Rejected by Leader";
  return "In QC";
}

function buildTimeline(l: FlowLot): HistoryRow["timeline"] {
  const createdAt = l.createdAt ? new Date(l.createdAt).toLocaleString() : "-";
  const receivedAt = l.receivedAt ? new Date(l.receivedAt).toLocaleString() : "Not received yet";
  const submittedAt = l.qcSubmittedAt ? new Date(l.qcSubmittedAt).toLocaleString() : "Not submitted yet";
  const state = currentStatus(l);

  return [
    { label: "Lot created", at: createdAt, state: "done" },
    { label: "Received at hub", at: receivedAt, state: l.receivedAt ? "done" : "pending" },
    { label: "Checker assigned", at: l.qcChecker ? receivedAt : "Not assigned", state: l.qcChecker ? "done" : "pending" },
    {
      label: state === "Re-inspection Requested" ? "Re-inspection requested" : "Inspection running",
      at: state === "In QC" ? "In progress now" : submittedAt,
      state: state === "In QC" || state === "Re-inspection Requested" ? "current" : "done",
    },
    { label: "Checker submitted report", at: submittedAt, state: l.qcSubmittedAt ? "done" : "pending" },
    {
      label:
        state === "Approved by Leader"
          ? "Leader approved"
          : state === "Rejected by Leader"
            ? "Leader rejected"
            : state === "Re-inspection Requested"
              ? "Leader requested re-inspection"
              : "Waiting leader decision",
      at:
        state === "Approved by Leader"
          ? "Approved"
          : state === "Rejected by Leader"
            ? "Rejected"
            : state === "Re-inspection Requested"
              ? "Sent back to checker"
              : "Pending",
      state:
        state === "Approved by Leader" || state === "Rejected by Leader" || state === "Re-inspection Requested"
          ? "done"
          : "current",
    },
    ...(state === "Re-inspection Requested"
      ? [{ label: "Back in checker queue", at: "Pending re-inspection", state: "current" as const }]
      : []),
  ];
}

function toRow(l: FlowLot): HistoryRow {
  return {
    lotId: l.id,
    product: l.title,
    seller: l.sellerName,
    qty: `${l.quantity} ${l.unit}`,
    currentStatus: currentStatus(l),
    timeline: buildTimeline(l),
  };
}

export default function HistoryClient() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const [lots, me] = await Promise.all([
          api.get<FlowLot[]>("/api/flow/lots"),
          api.get<MeResponse>("/api/auth/me"),
        ]);
        const myName = (me?.name ?? "").trim().toLowerCase();
        setRows(
          lots
            .filter((l) => !!l.qcLeader)
            .filter((l) => (myName ? (l.qcLeader ?? "").trim().toLowerCase() === myName : true))
            .map(toRow),
        );
      } catch {
        setRows([]);
      }
    };
    void load();
  }, []);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Product History Timeline</h1>
        <p className="text-slate-500">Track status changes for all products under your QC team.</p>
      </div>

      <div className="space-y-4">
        {rows.length === 0 && (
          <div className="rounded-2xl border border-slate-100 bg-white p-5 text-sm text-slate-500 shadow-sm">
            No product history found for your account.
          </div>
        )}
        {rows.map((r) => (
          <div key={r.lotId} className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setExpanded((prev) => ({ ...prev, [r.lotId]: !prev[r.lotId] }))}
              className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-slate-50"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-slate-500">{r.lotId}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusChip[r.currentStatus] ?? "bg-slate-100 text-slate-700"}`}>
                    {r.currentStatus}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-900">{r.product}</p>
                <p className="text-xs text-slate-500">
                  Seller: {r.seller} · Qty: {r.qty}
                </p>
              </div>
              {expanded[r.lotId] ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>

            {expanded[r.lotId] && (
              <div className="border-t border-slate-100 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Timeline</p>
                <div className="space-y-3">
                  {r.timeline.map((event, idx) => (
                    <div key={`${r.lotId}-${idx}`} className="flex items-start gap-3">
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
    </div>
  );
}
