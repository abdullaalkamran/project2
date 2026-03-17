"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import api from "@/lib/api";
import type { FlowLot } from "@/lib/product-flow";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 15;

type InventoryStatus = "In QC" | "Leader Review" | "Approved" | "Awaiting Dispatch" | "Rejected";

type InventoryRow = {
  id: string;
  product: string;
  seller: string;
  weight: string;
  qcGrade: string | null;
  askingPricePerKg: string;
  minBidRate: string | null;
  verdict: string | null;
  arrivedAt: string;
  status: InventoryStatus;
  rawLotStatus: string;
  timeline: Array<{ label: string; at: string; state: "done" | "current" | "pending" }>;
};

const statusColors: Record<InventoryStatus, string> = {
  "In QC": "bg-blue-50 text-blue-700 border-blue-100",
  "Leader Review": "bg-violet-50 text-violet-700 border-violet-100",
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-100",
  "Awaiting Dispatch": "bg-amber-50 text-amber-700 border-amber-100",
  Rejected: "bg-red-50 text-red-600 border-red-100",
};

const verdictColors: Record<string, string> = {
  PASSED: "bg-emerald-50 text-emerald-700",
  CONDITIONAL: "bg-amber-50 text-amber-700",
  FAILED: "bg-red-50 text-red-600",
};


function mapStatus(l: FlowLot): InventoryStatus {
  if (l.status === "IN_QC") return "In QC";
  if (l.status === "QC_SUBMITTED") return "Leader Review";
  if (l.status === "QC_PASSED") return "Approved";
  if (l.status === "LIVE") return "Awaiting Dispatch";
  return "Rejected";
}

function buildTimeline(l: FlowLot, status: InventoryStatus): InventoryRow["timeline"] {
  const createdAt = l.createdAt ? new Date(l.createdAt).toLocaleString() : "-";
  const receivedAt = l.receivedAt ? new Date(l.receivedAt).toLocaleString() : "Not received yet";
  const submittedAt = l.qcSubmittedAt ? new Date(l.qcSubmittedAt).toLocaleString() : "Not submitted yet";

  return [
    { label: "Lot created by seller", at: createdAt, state: "done" },
    { label: "Received at hub", at: receivedAt, state: l.receivedAt ? "done" : "pending" },
    { label: "QC assignment done", at: l.qcChecker ? receivedAt : "Not assigned yet", state: l.qcChecker ? "done" : "pending" },
    {
      label:
        status === "In QC"
          ? "QC inspection in progress"
          : status === "Leader Review"
            ? "QC submitted; waiting leader review"
            : "QC review completed",
      at: status === "In QC" ? "In progress now" : submittedAt,
      state: status === "In QC" ? "current" : "done",
    },
    {
      label:
        status === "Approved"
          ? "Approved by team leader"
          : status === "Rejected"
            ? "Rejected by team leader"
            : "Leader decision pending",
      at: status === "Approved" ? "Approved" : status === "Rejected" ? "Rejected" : "Pending",
      state: status === "Approved" || status === "Rejected" ? "done" : "current",
    },
    {
      label: status === "Awaiting Dispatch" ? "Ready for dispatch" : "Dispatch pending",
      at: status === "Awaiting Dispatch" ? "Now" : "Not ready yet",
      state: status === "Awaiting Dispatch" ? "current" : "pending",
    },
  ];
}

function toRow(l: FlowLot): InventoryRow {
  const status = mapStatus(l);
  return {
    id: l.id,
    product: l.title,
    seller: l.sellerName,
    weight: `${l.quantity} ${l.unit}`,
    qcGrade: l.grade ?? null,
    askingPricePerKg: `৳${l.askingPricePerKg}`,
    minBidRate: l.minBidRate != null ? `৳${l.minBidRate}` : null,
    verdict: l.verdict ?? null,
    arrivedAt: l.receivedAt
      ? new Date(l.receivedAt).toLocaleDateString("en-BD", {
          month: "short",
          day: "numeric",
        })
      : "—",
    status,
    rawLotStatus: l.status,
    timeline: buildTimeline(l, status),
  };
}

export default function InventoryClient() {
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | InventoryStatus>("All");
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [query, statusFilter]);

  useEffect(() => {
    const load = async () => {
      try {
        const rows = await api.get<FlowLot[]>("/api/flow/lots");
        setItems(
          rows
            .filter((l) => ["IN_QC", "QC_SUBMITTED", "QC_PASSED", "LIVE", "QC_FAILED"].includes(l.status))
            .map(toRow),
        );
      } catch {
        setItems([]);
      }
    };
    void load();
  }, []);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      const matchesStatus = statusFilter === "All" || i.status === statusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      return (
        i.id.toLowerCase().includes(q) ||
        i.product.toLowerCase().includes(q) ||
        i.seller.toLowerCase().includes(q)
      );
    });
  }, [items, query, statusFilter]);

  const inQc = useMemo(() => items.filter((i) => i.status === "In QC" || i.status === "Leader Review").length, [items]);
  const approved = useMemo(() => items.filter((i) => i.status === "Approved").length, [items]);
  const awaitingDispatch = useMemo(() => items.filter((i) => i.status === "Awaiting Dispatch").length, [items]);

  const statusTabs: Array<"All" | InventoryStatus> = [
    "All",
    "In QC",
    "Leader Review",
    "Approved",
    "Awaiting Dispatch",
    "Rejected",
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Lots", value: String(items.length), color: "text-slate-900" },
          { label: "In QC / Review", value: String(inQc), color: "text-blue-600" },
          { label: "Approved", value: String(approved), color: "text-emerald-700" },
          { label: "Awaiting Dispatch", value: String(awaitingDispatch), color: "text-amber-700" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by lot, product, seller"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-sky-400"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <SlidersHorizontal size={14} />
            <span>Filter by status</span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {statusTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                statusFilter === tab
                  ? "border-sky-300 bg-sky-50 text-sky-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredItems.length === 0 && (
          <div className="rounded-2xl border border-slate-100 bg-white p-5 text-sm text-slate-500 shadow-sm">
            No inventory lots found for this filter.
          </div>
        )}
        {filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((item) => (
          <div key={item.id} className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="grid gap-3 p-4 md:grid-cols-12">
              <div className="md:col-span-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Lot ID</p>
                <p className="font-mono text-xs text-slate-600">{item.id}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Product</p>
                <p className="text-sm font-semibold text-slate-900">{item.product}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Seller</p>
                <p className="text-xs text-slate-700">{item.seller}</p>
              </div>
              <div className="md:col-span-1">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Weight</p>
                <p className="text-xs text-slate-700">{item.weight}</p>
              </div>
              <div className="md:col-span-1">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Grade</p>
                <p className="text-xs font-semibold text-slate-700">{item.qcGrade ?? "—"}</p>
              </div>
              <div className="md:col-span-1">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Ask</p>
                <p className="text-xs font-semibold text-slate-700">{item.askingPricePerKg}</p>
              </div>
              <div className="md:col-span-1">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Min Bid</p>
                <p className="text-xs font-semibold text-sky-700">{item.minBidRate ?? "—"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Status</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColors[item.status]}`}>
                    {item.status}
                  </span>
                  {item.verdict && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${verdictColors[item.verdict]}`}>
                      {item.verdict}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">Arrived: {item.arrivedAt}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-slate-100 px-4 py-2.5">
              <button
                type="button"
                onClick={() => setExpanded((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline"
              >
                {expanded[item.id] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                Timeline
              </button>
            </div>

            {expanded[item.id] && (
              <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-4">
                <ol className="space-y-3">
                  {item.timeline.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                        step.state === "done" ? "bg-emerald-500" :
                        step.state === "current" ? "bg-sky-500 ring-2 ring-sky-200" :
                        "bg-slate-200"
                      }`} />
                      <div>
                        <p className={`text-xs font-semibold ${step.state === "pending" ? "text-slate-400" : "text-slate-700"}`}>
                          {step.label}
                        </p>
                        <p className="text-[11px] text-slate-400">{step.at}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        ))}
      </div>
      <Pagination page={page} totalPages={Math.ceil(filteredItems.length / PAGE_SIZE)} onPageChange={setPage} className="mt-4" />
    </div>
  );
}
