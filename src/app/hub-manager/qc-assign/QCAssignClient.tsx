"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { FlowLot } from "@/lib/product-flow";
import Pagination from "@/components/Pagination";
import LotLifecycleTracker from "@/components/LotLifecycleTracker";

const PAGE_SIZE = 15;

type StaffMember = { id: string; name: string };
type QcStatus = "Not Assigned" | "Leader Assigned" | "In Progress" | "Submitted" | "Approved" | "Rejected";

type LotRow = {
  id: string; product: string; category: string; seller: string; sellerPhone: string;
  askingPricePerKg: string; weight: string; received: string;
  leaderId: string; checkerId: string; saved: boolean;
  qcStatus: QcStatus; verdict: string | null; minBidRate: string | null; leaderDecision: string | null;
  rawLotStatus: string;
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

            <LotLifecycleTracker lotStatus={l.rawLotStatus} compact />

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
