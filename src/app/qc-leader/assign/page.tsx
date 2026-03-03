"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { UserCheck, Bell } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import type { FlowLot } from "@/lib/product-flow";

type AssignStatus = "Unassigned" | "Assigned" | "In Progress" | "Submitted";

type Lot = {
  id: string;
  product: string;
  category: string;
  qty: string;
  seller: string;
  assignedByHub: string;
  receivedAt: string;
  leader: string;
  checker: string;
  status: AssignStatus;
  saved: boolean;
};

type MeResponse = {
  name: string;
};

const checkers = ["Mamun Hossain", "Sadia Islam", "Farhan Ahmed", "Reza Islam", "Fatima Begum"];

const statusChip: Record<AssignStatus, string> = {
  Unassigned: "bg-orange-50 text-orange-600",
  Assigned: "bg-blue-50 text-blue-700",
  "In Progress": "bg-sky-50 text-sky-700",
  Submitted: "bg-violet-50 text-violet-700",
};

function mapStatus(l: FlowLot): AssignStatus {
  if (!l.qcChecker) return "Unassigned";
  if (l.status === "QC_SUBMITTED") return "Submitted";
  if (l.qcTaskStatus === "IN_PROGRESS") return "In Progress";
  return "Assigned";
}

function toLot(l: FlowLot): Lot {
  return {
    id: l.id,
    product: l.title,
    category: l.category,
    qty: `${l.quantity} ${l.unit}`,
    seller: l.sellerName,
    assignedByHub: "Hub Manager",
    receivedAt: l.receivedAt ? new Date(l.receivedAt).toLocaleString() : "-",
    leader: l.qcLeader ?? "Unassigned",
    checker: l.qcChecker ?? "Unassigned",
    status: mapStatus(l),
    saved: !!l.qcChecker,
  };
}

export default function QCLeaderAssignPage() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [leaderName, setLeaderName] = useState<string>("");

  const loadLots = async () => {
    try {
      const [allLots, me] = await Promise.all([
        api.get<FlowLot[]>("/api/flow/lots"),
        api.get<MeResponse>("/api/auth/me"),
      ]);
      const myName = me?.name ?? "";
      setLeaderName(myName);

      const rows = allLots
        .filter((l) => l.status !== "PENDING_DELIVERY")
        .filter((l) => !!l.qcLeader)
        .filter((l) => !l.qcChecker)
        .filter((l) => (myName ? l.qcLeader?.toLowerCase() === myName.toLowerCase() : true))
        .map(toLot);

      setLots(rows);
    } catch {
      toast.error("Could not load assigned lots.");
      setLots([]);
    }
  };

  useEffect(() => {
    void loadLots();
  }, []);

  const newCount = useMemo(() => lots.filter((l) => l.status === "Unassigned").length, [lots]);

  const updateChecker = (id: string, checker: string) =>
    setLots((prev) => prev.map((l) => (l.id === id ? { ...l, checker, saved: false } : l)));

  const assign = (id: string) => {
    const run = async () => {
      const lot = lots.find((l) => l.id === id);
      if (!lot || lot.checker === "Unassigned") {
        toast.error("Please select a checker first");
        return;
      }

      await api.patch(`/api/flow/lots/${id}/assign`, {
        leader: lot.leader === "Unassigned" ? leaderName || undefined : lot.leader,
        checker: lot.checker,
      });

      toast.success(`${lot.checker} assigned to ${id}`, {
        description: "Moved to All Inspection Tasks with current status.",
      });

      await loadLots();
    };

    void run();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Assign QC Checkers</h1>
        <p className="text-slate-500">
          Recent lots assigned to your QC team. Assign a checker for each lot.
        </p>
        <Link href="/qc-leader/tasks" className="inline-flex text-xs font-semibold text-teal-700 hover:underline">
          Open Inspection Page →
        </Link>
      </div>

      {newCount > 0 && (
        <div className="flex items-start gap-4 rounded-2xl border border-teal-200 bg-teal-50 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100">
            <Bell size={16} className="text-teal-600" />
          </div>
          <div>
            <p className="font-semibold text-teal-800">
              {newCount} lot{newCount > 1 ? "s" : ""} awaiting checker assignment
            </p>
            <p className="mt-0.5 text-sm text-teal-600">
              Hub Manager has assigned these lots to your team. Please assign a QC checker for each.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {lots.length === 0 && (
          <div className="rounded-2xl border border-slate-100 bg-white p-5 text-sm text-slate-500 shadow-sm">
            No unassigned lots found for your QC leader account.
          </div>
        )}

        {lots.map((l) => (
          <div
            key={l.id}
            className={`rounded-2xl border bg-white p-5 shadow-sm ${l.status === "Unassigned" ? "border-teal-200" : "border-slate-100"}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-slate-400">{l.id}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusChip[l.status]}`}>
                    {l.status}
                  </span>
                </div>
                <p className="text-base font-bold text-slate-900">{l.product}</p>
                <p className="text-xs text-slate-500">{l.category} · {l.qty}</p>
              </div>
              <div className="min-w-[180px] space-y-0.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <p className="font-semibold text-slate-800">{l.seller}</p>
                <p className="text-slate-400">Received: {l.receivedAt}</p>
                <p className="text-slate-400">From: {l.assignedByHub}</p>
              </div>
            </div>

            {l.status !== "Submitted" && (
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-50 pt-2">
                <UserCheck size={15} className="text-slate-400" />
                <label className="text-xs font-medium text-slate-500">Assign Checker</label>
                <select
                  value={l.checker}
                  onChange={(e) => updateChecker(l.id, e.target.value)}
                  disabled={l.status === "In Progress"}
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-teal-400 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="Unassigned">— Select checker —</option>
                  {checkers.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                {l.status === "In Progress" ? (
                  <span className="text-xs italic text-slate-400">Inspection in progress</span>
                ) : l.saved ? (
                  <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">✓ Assigned</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => assign(l.id)}
                    className="rounded-lg bg-teal-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700"
                  >
                    Confirm Assignment
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
