"use client";

import { useEffect, useState } from "react";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 15;

type QCReport = {
  id: string;
  lotCode: string;
  lot: string;
  title: string;
  qty: string;
  seller: string;
  hub: string;
  checker: string;
  leader: string;
  leaderDecision: string;
  grade: string;
  verdict: string;
  minBidRate: number | null;
  notes: string;
  submittedAt: string;
};

const verdictColors: Record<string, string> = {
  PASSED:      "bg-emerald-50 text-emerald-700",
  FAILED:      "bg-red-50 text-red-600",
  CONDITIONAL: "bg-orange-50 text-orange-600",
};

const gradeColors: Record<string, string> = {
  A: "text-emerald-700 font-bold",
  B: "text-blue-700 font-bold",
  C: "text-orange-600 font-bold",
};

const decisionColors: Record<string, string> = {
  Approved: "text-emerald-700",
  Rejected:  "text-red-600",
  Pending:   "text-orange-600",
};

const FILTERS = ["All", "PASSED", "FAILED", "CONDITIONAL"];

function fmtBDT(n: number) {
  return "৳ " + n.toLocaleString("en-IN");
}

function DetailModal({ report, onClose }: { report: QCReport; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">QC Report</h2>
            <p className="font-mono text-xs text-slate-400">{report.lotCode}</p>
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
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Product</p>
              <p className="text-sm font-medium text-slate-900">{report.title}</p>
              <p className="text-xs text-slate-500">{report.qty}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Hub</p>
              <p className="text-sm font-medium text-slate-900">{report.hub}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Seller</p>
              <p className="text-sm font-medium text-slate-900">{report.seller}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase">QC Checker</p>
              <p className="text-sm font-medium text-slate-900">{report.checker}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase">QC Leader</p>
              <p className="text-sm font-medium text-slate-900">{report.leader}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Leader Decision</p>
              <p className={`text-sm font-semibold ${decisionColors[report.leaderDecision] ?? "text-slate-700"}`}>
                {report.leaderDecision}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Grade</p>
              <p className={`text-sm ${gradeColors[report.grade] ?? "text-slate-700"}`}>{report.grade}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Verdict</p>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${verdictColors[report.verdict] ?? "bg-slate-100 text-slate-500"}`}>
                {report.verdict.charAt(0) + report.verdict.slice(1).toLowerCase()}
              </span>
            </div>
          </div>

          {report.minBidRate != null && (
            <div className="rounded-xl bg-blue-50 p-3">
              <p className="text-[10px] font-semibold text-blue-500 uppercase">Min Bid Rate</p>
              <p className="text-sm font-bold text-blue-800">{fmtBDT(report.minBidRate)} / kg</p>
            </div>
          )}

          {report.notes && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Inspector Notes</p>
              <p className="text-sm text-slate-700 rounded-xl bg-slate-50 p-3 leading-relaxed">{report.notes}</p>
            </div>
          )}

          <div className="pt-2 text-xs text-slate-400">Submitted: {report.submittedAt}</div>

          <button type="button" onClick={onClose}
            className="w-full rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminQCReportsPage() {
  const [reports, setReports] = useState<QCReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<QCReport | null>(null);

  useEffect(() => {
    fetch("/api/admin/qc-reports")
      .then((r) => r.json())
      .then((data) => { setReports(data); setLoading(false); });
  }, []);

  const filtered = reports.filter((r) => {
    const matchFilter = filter === "All" || r.verdict === filter;
    const matchSearch =
      r.lotCode.toLowerCase().includes(search.toLowerCase()) ||
      r.seller.toLowerCase().includes(search.toLowerCase()) ||
      r.checker.toLowerCase().includes(search.toLowerCase()) ||
      r.title.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const passedCount  = reports.filter((r) => r.verdict === "PASSED").length;
  const failedCount  = reports.filter((r) => r.verdict === "FAILED").length;
  const condCount    = reports.filter((r) => r.verdict === "CONDITIONAL").length;

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-8">
      {selected && <DetailModal report={selected} onClose={() => setSelected(null)} />}

      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">QC Reports</h1>
        <p className="text-slate-500">
          {loading ? "Loading…" : `${reports.length} inspection report${reports.length !== 1 ? "s" : ""} across all hubs.`}
        </p>
      </div>

      {/* Summary cards */}
      {!loading && reports.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 p-5 shadow-sm bg-emerald-50">
            <p className="text-sm text-slate-500">Passed</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{passedCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 p-5 shadow-sm bg-red-50">
            <p className="text-sm text-slate-500">Failed</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{failedCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 p-5 shadow-sm bg-orange-50">
            <p className="text-sm text-slate-500">Conditional</p>
            <p className="mt-1 text-2xl font-bold text-orange-600">{condCount}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search lot, seller, checker…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full max-w-xs rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none ring-indigo-100 focus:ring-2"
        />
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => { setFilter(f); setPage(1); }}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition ${
                filter === f
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f === "All" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-5 py-3 text-left">Lot</th>
              <th className="px-5 py-3 text-left">Seller</th>
              <th className="px-5 py-3 text-left">Hub</th>
              <th className="px-5 py-3 text-left">Checker</th>
              <th className="px-5 py-3 text-left">Leader Decision</th>
              <th className="px-5 py-3 text-left">Grade</th>
              <th className="px-5 py-3 text-left">Verdict</th>
              <th className="px-5 py-3 text-left">Date</th>
              <th className="px-5 py-3 text-left">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-slate-400">Loading…</td>
              </tr>
            ) : paginated.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelected(r)}>
                <td className="px-5 py-4">
                  <p className="font-medium text-slate-900 truncate max-w-[160px]">{r.title}</p>
                  <p className="font-mono text-[10px] text-slate-400">{r.lotCode}</p>
                </td>
                <td className="px-5 py-4 text-slate-500">{r.seller}</td>
                <td className="px-5 py-4 text-slate-500">{r.hub}</td>
                <td className="px-5 py-4 text-slate-700">{r.checker}</td>
                <td className="px-5 py-4">
                  <span className={`text-xs font-semibold ${decisionColors[r.leaderDecision] ?? "text-slate-500"}`}>
                    {r.leaderDecision}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className={gradeColors[r.grade] ?? "text-slate-700"}>{r.grade}</span>
                </td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${verdictColors[r.verdict] ?? "bg-slate-100 text-slate-500"}`}>
                    {r.verdict.charAt(0) + r.verdict.slice(1).toLowerCase()}
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-500">{r.submittedAt}</td>
                <td className="px-5 py-4">
                  {r.notes ? (
                    <span className="text-xs text-indigo-600 font-semibold hover:underline">View</span>
                  ) : (
                    <span className="text-xs text-slate-300 italic">—</span>
                  )}
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-slate-400">No QC reports found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-2" />
    </div>
  );
}
