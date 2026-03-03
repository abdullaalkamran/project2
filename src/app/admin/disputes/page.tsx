"use client";

import { useEffect, useState } from "react";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 10;

type Dispute = {
  id: string;
  code: string;
  buyer: string;
  seller: string;
  orderCode: string;
  product: string;
  reason: string;
  description: string;
  status: "OPEN" | "IN_REVIEW" | "RESOLVED" | "ESCALATED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  createdAt: string;
  resolvedAt: string | null;
  resolution: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-red-50 text-red-700",
  IN_REVIEW: "bg-orange-50 text-orange-600",
  RESOLVED: "bg-emerald-50 text-emerald-700",
  ESCALATED: "bg-purple-50 text-purple-700",
};
const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_REVIEW: "In Review",
  RESOLVED: "Resolved",
  ESCALATED: "Escalated",
};
const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-amber-50 text-amber-700",
  HIGH: "bg-red-50 text-red-700",
};

const FILTERS = ["All", "Open", "In Review", "Resolved", "Escalated"];

function filterMatch(status: string, filter: string) {
  if (filter === "All") return true;
  return STATUS_LABELS[status] === filter;
}

function DetailModal({
  dispute,
  onClose,
  onStatusChange,
  acting,
}: {
  dispute: Dispute;
  onClose: () => void;
  onStatusChange: (id: string, status: Dispute["status"], resolution?: string) => void;
  acting: boolean;
}) {
  const [resolution, setResolution] = useState(dispute.resolution ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Dispute {dispute.code}</h2>
            <p className="text-xs text-slate-500">Order: {dispute.orderCode}</p>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Buyer</p>
              <p className="text-sm font-medium text-slate-900">{dispute.buyer}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Seller</p>
              <p className="text-sm font-medium text-slate-900">{dispute.seller}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Product</p>
              <p className="text-sm font-medium text-slate-900">{dispute.product}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Priority</p>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_COLORS[dispute.priority]}`}>
                {dispute.priority}
              </span>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Reason</p>
            <p className="text-sm text-slate-700 font-medium">{dispute.reason}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Description</p>
            <p className="text-sm text-slate-600">{dispute.description}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Filed</p>
            <p className="text-sm text-slate-600">{dispute.createdAt}</p>
          </div>

          {dispute.status !== "RESOLVED" && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Resolution Note</label>
              <textarea rows={3} value={resolution} onChange={(e) => setResolution(e.target.value)}
                placeholder="Enter resolution details…"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
            </div>
          )}

          {dispute.resolution && dispute.status === "RESOLVED" && (
            <div className="rounded-xl bg-emerald-50 p-3">
              <p className="text-[10px] font-semibold text-emerald-600 uppercase">Resolution</p>
              <p className="text-sm text-emerald-800">{dispute.resolution}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {dispute.status === "OPEN" && (
              <>
                <button type="button" disabled={acting}
                  onClick={() => onStatusChange(dispute.id, "IN_REVIEW")}
                  className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition">
                  {acting ? "…" : "Start Review"}
                </button>
                <button type="button" disabled={acting}
                  onClick={() => onStatusChange(dispute.id, "ESCALATED")}
                  className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition">
                  {acting ? "…" : "Escalate"}
                </button>
              </>
            )}
            {dispute.status === "IN_REVIEW" && (
              <>
                <button type="button" disabled={acting || !resolution.trim()}
                  onClick={() => onStatusChange(dispute.id, "RESOLVED", resolution)}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition">
                  {acting ? "…" : "Resolve"}
                </button>
                <button type="button" disabled={acting}
                  onClick={() => onStatusChange(dispute.id, "ESCALATED")}
                  className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition">
                  {acting ? "…" : "Escalate"}
                </button>
              </>
            )}
            {dispute.status === "ESCALATED" && (
              <button type="button" disabled={acting || !resolution.trim()}
                onClick={() => onStatusChange(dispute.id, "RESOLVED", resolution)}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition">
                {acting ? "…" : "Resolve"}
              </button>
            )}
            <button type="button" onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    fetch("/api/admin/disputes")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setDisputes(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (id: string, status: Dispute["status"], resolution?: string) => {
    setActing(true);
    try {
      await fetch(`/api/admin/disputes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, resolution }),
      });
      setDisputes((prev) =>
        prev.map((d) =>
          d.id === id
            ? { ...d, status, resolution: resolution ?? d.resolution, resolvedAt: status === "RESOLVED" ? new Date().toISOString() : d.resolvedAt }
            : d
        )
      );
      if (selectedDispute?.id === id) {
        setSelectedDispute((prev) =>
          prev ? { ...prev, status, resolution: resolution ?? prev.resolution } : prev
        );
      }
    } catch {
      /* ignore */
    }
    setActing(false);
  };

  const filtered = disputes.filter((d) => {
    const matchFilter = filterMatch(d.status, filter);
    const matchSearch =
      d.code.toLowerCase().includes(search.toLowerCase()) ||
      d.buyer.toLowerCase().includes(search.toLowerCase()) ||
      d.seller.toLowerCase().includes(search.toLowerCase()) ||
      d.reason.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const openCount = disputes.filter((d) => d.status === "OPEN").length;
  const reviewCount = disputes.filter((d) => d.status === "IN_REVIEW").length;
  const escalatedCount = disputes.filter((d) => d.status === "ESCALATED").length;
  const resolvedCount = disputes.filter((d) => d.status === "RESOLVED").length;

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-8">
      {selectedDispute && (
        <DetailModal
          dispute={selectedDispute}
          onClose={() => setSelectedDispute(null)}
          onStatusChange={handleStatusChange}
          acting={acting}
        />
      )}

      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Dispute Centre</h1>
        <p className="text-slate-500">
          {loading ? "Loading…" : `${disputes.length} total dispute${disputes.length !== 1 ? "s" : ""}.`}
        </p>
      </div>

      {/* Summary cards */}
      {!loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Open", value: openCount, color: "text-red-700", bg: "bg-red-50" },
            { label: "In Review", value: reviewCount, color: "text-orange-600", bg: "bg-orange-50" },
            { label: "Escalated", value: escalatedCount, color: "text-purple-700", bg: "bg-purple-50" },
            { label: "Resolved", value: resolvedCount, color: "text-emerald-700", bg: "bg-emerald-50" },
          ].map((c) => (
            <div key={c.label} className={`rounded-2xl border border-slate-100 p-5 shadow-sm ${c.bg}`}>
              <p className="text-sm text-slate-500">{c.label}</p>
              <p className={`mt-1 text-2xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search & filter */}
      <div className="flex flex-wrap gap-3">
        <input type="text" placeholder="Search dispute, buyer, seller…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full max-w-xs rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none ring-indigo-100 focus:ring-2" />
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button key={f} type="button" onClick={() => { setFilter(f); setPage(1); }}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition ${
                filter === f
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-5 py-3 text-left">Dispute ID</th>
              <th className="px-5 py-3 text-left">Reason</th>
              <th className="px-5 py-3 text-left">Buyer</th>
              <th className="px-5 py-3 text-left">Seller</th>
              <th className="px-5 py-3 text-left">Priority</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-left">Filed</th>
              <th className="px-5 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-400">Loading…</td></tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <p className="font-semibold text-slate-700">No disputes found</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {disputes.length === 0
                      ? "No disputes have been filed yet. They will appear here when buyers or sellers raise issues."
                      : "Try adjusting your search or filter criteria."}
                  </p>
                </td>
              </tr>
            ) : paginated.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedDispute(d)}>
                <td className="px-5 py-4 font-mono text-xs text-slate-500">{d.code}</td>
                <td className="px-5 py-4 font-medium text-slate-900 max-w-[200px] truncate">{d.reason}</td>
                <td className="px-5 py-4 text-slate-700">{d.buyer}</td>
                <td className="px-5 py-4 text-slate-500">{d.seller}</td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PRIORITY_COLORS[d.priority]}`}>
                    {d.priority}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[d.status]}`}>
                    {STATUS_LABELS[d.status]}
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-500">{d.createdAt}</td>
                <td className="px-5 py-4">
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {d.status === "OPEN" && (
                      <button type="button" onClick={() => handleStatusChange(d.id, "IN_REVIEW")}
                        className="text-xs font-semibold text-orange-600 hover:underline">Review</button>
                    )}
                    {(d.status === "OPEN" || d.status === "IN_REVIEW") && (
                      <button type="button" onClick={() => handleStatusChange(d.id, "ESCALATED")}
                        className="text-xs font-semibold text-purple-600 hover:underline">Escalate</button>
                    )}
                    <button type="button" onClick={() => setSelectedDispute(d)}
                      className="text-xs font-semibold text-indigo-700 hover:underline">View</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-2" />
    </div>
  );
}
