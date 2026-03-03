"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import type { QCPendingApprovalRecord } from "@/lib/qc-approvals";

type RejectedRow = QCPendingApprovalRecord;

function comparisonRows(r: RejectedRow) {
  if (!r.sellerSnapshot || !r.qcSnapshot) return [];
  return Object.keys(r.sellerSnapshot).map((field) => {
    const seller = r.sellerSnapshot?.[field] ?? "";
    const qc = r.qcSnapshot?.[field] ?? "";
    return { field, seller, qc, changed: seller !== qc };
  });
}

export default function RejectedClient() {
  const [rows, setRows] = useState<RejectedRow[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const all = await api.get<QCPendingApprovalRecord[]>("/api/qc/approvals");
        setRows(all.filter((r) => r.decision === "rejected"));
      } catch {
        setRows([]);
      }
    };
    void load();
  }, []);

  const total = useMemo(() => rows.length, [rows]);
  const toggleExpanded = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Rejected Lots</h1>
        <p className="text-slate-500">Rejected QC reports showing original seller data vs checker submitted data.</p>
      </div>

      <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
        Total rejected lots: <span className="font-semibold">{total}</span>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-sm text-slate-400 shadow-sm">
          No rejected lots.
        </div>
      ) : (
        <div className="space-y-5">
          {rows.map((r) => {
            const compared = comparisonRows(r);
            return (
              <div key={r.reportId} className="rounded-2xl border border-red-100 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">{r.reportId}</span>
                    <span className="font-mono text-xs text-slate-400">{r.lotId}</span>
                    <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">Rejected</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">Verdict: {r.verdict}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleExpanded(r.reportId)}
                    className="mt-2 inline-flex items-center gap-2 text-left text-sm font-bold text-slate-900 hover:text-red-700"
                  >
                    <span>{expanded[r.reportId] ? "-" : "+"}</span>
                    <span>{r.product}</span>
                  </button>
                  <p className="text-xs text-slate-500">
                    Seller: {r.seller} · Checker: {r.checker} · Hub: {r.hub} · Submitted: {r.submitted}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Click product to {expanded[r.reportId] ? "hide" : "view"} details</p>
                </div>

                {expanded[r.reportId] && (
                  <div className="p-5 space-y-4">
                    <p className="text-sm text-red-700"><span className="font-semibold">Rejection reason:</span> {r.notes || "No note provided"}</p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-400">Original Asking Price</p>
                        <p className="mt-1 font-semibold text-slate-800">৳{r.askingPricePerKg.toLocaleString()}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-400">Original Base Price</p>
                        <p className="mt-1 font-semibold text-slate-800">৳{r.basePrice.toLocaleString()}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-400">QC Min Bid Rate</p>
                        <p className="mt-1 font-semibold text-sky-700">৳{r.minBidRate.toLocaleString()}</p>
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Original Seller Data vs QC Data</p>
                      <div className="overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full text-sm">
                          <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-400">
                            <tr>
                              <th className="px-3 py-2 text-left">Field</th>
                              <th className="px-3 py-2 text-left">Original (Seller)</th>
                              <th className="px-3 py-2 text-left">QC Submitted</th>
                              <th className="px-3 py-2 text-left">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {compared.length > 0 ? (
                              compared.map((c) => (
                                <tr key={c.field} className={c.changed ? "bg-amber-50/40" : ""}>
                                  <td className="px-3 py-2 font-medium text-slate-700">{c.field}</td>
                                  <td className={`px-3 py-2 ${c.changed ? "text-slate-500 line-through" : "text-slate-700"}`}>{c.seller}</td>
                                  <td className={`px-3 py-2 ${c.changed ? "font-semibold text-amber-800" : "text-slate-700"}`}>{c.qc}</td>
                                  <td className="px-3 py-2">
                                    {c.changed ? (
                                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Modified</span>
                                    ) : (
                                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Same</span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td className="px-3 py-3 text-slate-500" colSpan={4}>
                                  Original snapshot not available for this older rejected report.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
