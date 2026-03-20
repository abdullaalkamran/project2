"use client";
import { useEffect, useState } from "react";
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

function lotPhaseActive(status: string, saleType: string): number {
  if (status === "SOLD" || status === "DELIVERED") return 6;
  if (status === "LIVE" || status === "AUCTION_ENDED" || status === "AUCTION_UNSOLD") return 5;
  if (status === "QC_PASSED" && saleType === "FIXED_PRICE") return 5;
  if (status === "FIXED_PRICE_REVIEW") return 4;
  if (status === "QC_PASSED") return 4;
  if (status === "QC_SUBMITTED") return 3;
  if (status === "IN_QC") return 2;
  if (status === "AT_HUB") return 1;
  return 0;
}

function LotPhaseBar({ rawStatus, saleType }: { rawStatus: string; saleType: string }) {
  const active = lotPhaseActive(rawStatus, saleType);
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

type StaffMember = { id: string; name: string };
type QcStatus = "Not Assigned" | "Leader Assigned" | "In Progress" | "Submitted" | "Approved" | "Rejected";

type LotRow = {
  id: string; product: string; category: string; seller: string; sellerPhone: string;
  askingPricePerKg: string; weight: string; received: string;
  leaderId: string; checkerId: string; saved: boolean;
  qcStatus: QcStatus; verdict: string | null; minBidRate: string | null; leaderDecision: string | null;
  rawLotStatus: string; saleType: string;
};

function mapQcStatus(l: FlowLot): QcStatus {
  if (!l.qcChecker && l.qcLeader) return "Leader Assigned";
  if (!l.qcChecker) return "Not Assigned";
  if (l.status === "IN_QC" && l.qcTaskStatus === "IN_PROGRESS") return "In Progress";
  if (l.status === "QC_SUBMITTED") return "Submitted";
  if (l.status === "QC_PASSED") return "Approved";
  if (l.status === "QC_FAILED") return "Rejected";
  return "In Progress";
}

function toRow(l: FlowLot, leaders: StaffMember[], checkers: StaffMember[]): LotRow {
  const leaderMatch = leaders.find((s) => s.name === l.qcLeader);
  const checkerMatch = checkers.find((s) => s.name === l.qcChecker);
  return {
    id: l.id,
    product: l.title,
    category: l.category,
    seller: l.sellerName,
    sellerPhone: l.sellerPhone ?? "N/A",
    askingPricePerKg: `BDT ${l.askingPricePerKg}/${l.unit}`,
    weight: `${l.quantity} ${l.unit}`,
    received: l.receivedAt ? new Date(l.receivedAt).toLocaleString() : "-",
    leaderId: leaderMatch?.id ?? "",
    checkerId: checkerMatch?.id ?? "",
    saved: !!l.qcLeader || !!l.qcChecker,
    qcStatus: mapQcStatus(l),
    verdict: l.verdict ?? null,
    minBidRate: l.minBidRate ? `BDT ${l.minBidRate}` : null,
    leaderDecision: l.leaderDecision ?? null,
    rawLotStatus: l.status,
    saleType: l.saleType ?? "",
  };
}

const qcStatusChip: Record<QcStatus, string> = {
  "Not Assigned": "bg-orange-50 text-orange-600",
  "Leader Assigned": "bg-amber-50 text-amber-700",
  "In Progress":  "bg-blue-50 text-blue-700",
  "Submitted":    "bg-violet-50 text-violet-700",
  "Approved":     "bg-emerald-50 text-emerald-700",
  "Rejected":     "bg-red-50 text-red-600",
};

const verdictChip: Record<string, string> = {
  PASSED:      "bg-emerald-50 text-emerald-700",
  CONDITIONAL: "bg-amber-50 text-amber-700",
  FAILED:      "bg-red-50 text-red-600",
};

const leaderChip: Record<string, string> = {
  Approved: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-red-50 text-red-600",
  Pending:  "bg-violet-50 text-violet-700",
};

export default function HubQCAssignPage() {
  const [lots, setLots] = useState<LotRow[]>([]);
  const [leaders, setLeaders] = useState<StaffMember[]>([]);
  const [checkers, setCheckers] = useState<StaffMember[]>([]);
  const [page, setPage] = useState(1);

  const loadLots = async (ldr: StaffMember[], chk: StaffMember[]) => {
    const rows = await api.get<FlowLot[]>("/api/flow/lots");
    setLots(
      rows
        .filter((l) => l.status === "AT_HUB" && !l.qcLeader && !l.qcChecker)
        .map((l) => toRow(l, ldr, chk))
    );
  };

  useEffect(() => {
    const init = async () => {
      const staff = await api.get<{ leaders: StaffMember[]; checkers: StaffMember[] }>("/api/hub-manager/qc-staff");
      setLeaders(staff.leaders);
      setCheckers(staff.checkers);
      await loadLots(staff.leaders, staff.checkers);
    };
    void init();
  }, []);

  const update = (id: string, field: "leaderId" | "checkerId", value: string) =>
    setLots((prev) => prev.map((l) => l.id === id ? { ...l, [field]: value, saved: false } : l));

  const save = (id: string) => {
    const run = async () => {
      const row = lots.find((l) => l.id === id);
      if (!row) return;
      await api.patch(`/api/flow/lots/${id}/assign`, {
        leaderId:  row.leaderId  || undefined,
        checkerId: row.checkerId || undefined,
      });
      await loadLots(leaders, checkers);
    };
    void run();
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">QC Team Assignment</h1>
        <p className="text-slate-500">
          Assign QC leaders/checkers to newly received lots. Once saved, lots move to Waiting for QC Check.
        </p>
      </div>

      <div className="space-y-4">
        {lots.length === 0 && (
          <div className="rounded-2xl border border-slate-100 bg-white p-5 text-sm text-slate-500 shadow-sm">
            No unassigned lots. Check the &quot;Waiting for QC Check&quot; page for already assigned lots.
          </div>
        )}
        {lots.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((l) => (
          <div key={l.id} className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-400">{l.id}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${qcStatusChip[l.qcStatus]}`}>{l.qcStatus}</span>
                </div>
                <p className="text-base font-bold text-slate-900">{l.product}</p>
                <p className="text-xs text-slate-500">{l.category} · {l.weight} · Ask: <span className="font-semibold text-slate-700">{l.askingPricePerKg}</span></p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600 min-w-[160px]">
                <p className="font-semibold text-slate-800">{l.seller}</p>
                <p>{l.sellerPhone}</p>
                <p className="text-slate-400">Received: {l.received}</p>
              </div>
            </div>

            <LotPhaseBar rawStatus={l.rawLotStatus} saleType={l.saleType} />

            {(l.verdict || l.minBidRate) && (
              <div className="flex flex-wrap gap-3">
                {l.verdict && (
                  <div className={`rounded-xl px-4 py-2 text-xs font-semibold ${verdictChip[l.verdict]}`}>
                    Verdict: {l.verdict}
                  </div>
                )}
                {l.minBidRate && (
                  <div className="rounded-xl bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-700">
                    Min Bid Rate: {l.minBidRate}
                  </div>
                )}
                {l.leaderDecision && (
                  <div className={`rounded-xl px-4 py-2 text-xs font-semibold ${leaderChip[l.leaderDecision] ?? "bg-slate-100 text-slate-500"}`}>
                    Leader: {l.leaderDecision}
                  </div>
                )}
              </div>
            )}

            {l.qcStatus !== "Approved" && l.qcStatus !== "Rejected" && (
              <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-50">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-slate-500">Leader</label>
                  <select value={l.leaderId} onChange={(e) => update(l.id, "leaderId", e.target.value)}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-amber-400 focus:outline-none">
                    <option value="">Unassigned</option>
                    {leaders.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-slate-500">Checker</label>
                  <select value={l.checkerId} onChange={(e) => update(l.id, "checkerId", e.target.value)}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-amber-400 focus:outline-none">
                    <option value="">Unassigned</option>
                    {checkers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                {l.saved ? (
                  <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">✓ Saved</span>
                ) : (
                  <button type="button" onClick={() => save(l.id)}
                    className="rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-600">
                    Save Assignment
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <Pagination page={page} totalPages={Math.ceil(lots.length / PAGE_SIZE)} onPageChange={setPage} className="mt-4" />
    </div>
  );
}
