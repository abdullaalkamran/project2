"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle, XCircle, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import api from "@/lib/api";
import type { QCPendingApprovalRecord } from "@/lib/qc-approvals";
import LotLifecycleTracker from "@/components/LotLifecycleTracker";

function approvalLotStatus(r: QCPendingApprovalRecord): string {
  if (r.decision === "approved") return "QC_PASSED";
  if (r.decision === "rejected" || r.verdict === "FAILED") return "QC_FAILED";
  return "QC_SUBMITTED";
}

type Decision = "Pending" | "Approved" | "Rejected" | "Re-inspect";

type UiReport = QCPendingApprovalRecord & {
  decisionLabel: Decision;
};

const verdictChip: Record<string, string> = {
  PASSED: "bg-emerald-50 text-emerald-700",
  CONDITIONAL: "bg-amber-50 text-amber-700",
  FAILED: "bg-red-50 text-red-600",
};

const gradeChip: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-800",
  B: "bg-amber-100 text-amber-800",
  C: "bg-red-100 text-red-700",
};

const decisionChip: Record<Decision, string> = {
  Pending: "bg-violet-50 text-violet-700",
  Approved: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-red-50 text-red-600",
  "Re-inspect": "bg-orange-50 text-orange-600",
};

function toDecisionLabel(status: QCPendingApprovalRecord["decision"]): Decision {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  if (status === "reinspect") return "Re-inspect";
  return "Pending";
}

export default function ApprovalsClient() {
  const [reports, setReports] = useState<UiReport[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedPhoto, setSelectedPhoto] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const rows = await api.get<QCPendingApprovalRecord[]>("/api/qc/approvals");
        setReports(rows.map((r) => ({ ...r, decisionLabel: toDecisionLabel(r.decision) })));
        setSelectedPhoto(
          Object.fromEntries(
            rows.map((r) => [
              r.reportId,
              r.selectedMarketplacePhotoUrls?.length
                ? r.selectedMarketplacePhotoUrls
                : (r.selectedMarketplacePhotoUrl ? [r.selectedMarketplacePhotoUrl] : []),
            ]),
          ),
        );
      } catch {
        toast.error("Could not load QC approvals.");
      }
    };
    void load();
  }, []);

  const decide = (id: string, decision: "Approved" | "Rejected" | "Re-inspect") => {
    const mapped = decision === "Approved" ? "approved" : decision === "Rejected" ? "rejected" : "reinspect";

    const update = async () => {
      try {
        const row = reports.find((r) => r.reportId === id);
        const selected = selectedPhoto[id]?.length
          ? selectedPhoto[id]
          : row?.selectedMarketplacePhotoUrls?.length
            ? row.selectedMarketplacePhotoUrls
            : (row?.selectedMarketplacePhotoUrl ? [row.selectedMarketplacePhotoUrl] : []);
        if (decision === "Approved" && selected.length === 0) {
          toast.error("Select one or more seller/QC photos for marketplace before approving.");
          return;
        }

        await api.patch<QCPendingApprovalRecord>(`/api/qc/approvals/${id}/decision`, {
          decision: mapped,
          selectedPhotoUrls: selected,
          selectedPhotoUrl: selected[0],
        });
        if (row) {
          const flowDecision = decision === "Approved" ? "Approved" : decision === "Rejected" ? "Rejected" : "Re-inspect";
          await api.patch(`/api/flow/lots/${row.lotId}/leader-decision`, { decision: flowDecision });
        }
        setReports((prev) =>
          prev.map((r) =>
            r.reportId === id
              ? {
                  ...r,
                  decision: mapped,
                  decisionLabel: decision,
                  selectedMarketplacePhotoUrls: selected,
                  selectedMarketplacePhotoUrl: selected[0] ?? r.selectedMarketplacePhotoUrl,
                }
              : r,
          ),
        );
        setExpanded((prev) => ({ ...prev, [id]: false }));

        if (decision === "Approved") toast.success("Lot approved. QC decision saved.");
        else if (decision === "Rejected") toast.error("Lot rejected. QC decision saved.");
        else toast.info("Re-inspection requested. QC decision saved.");
      } catch {
        toast.error("Could not save leader decision.");
      }
    };
    void update();
  };

  const toggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const pending = useMemo(() => reports.filter((r) => r.decisionLabel === "Pending"), [reports]);
  const done = useMemo(() => reports.filter((r) => r.decisionLabel !== "Pending"), [reports]);

  const comparisonRows = (r: UiReport) => {
    // Use full snapshots when available
    if (r.sellerSnapshot && r.qcSnapshot && Object.keys(r.sellerSnapshot).length > 0) {
      return Object.keys(r.sellerSnapshot).map((field) => {
        const seller = r.sellerSnapshot?.[field] ?? "";
        const qc = r.qcSnapshot?.[field] ?? "";
        return { field, seller, qc, changed: seller !== qc };
      });
    }
    // Fall back to the changes array for older / Prisma-only records
    if (r.changes && r.changes.length > 0) {
      return r.changes.map((c) => ({
        field: c.label,
        seller: c.before,
        qc: c.after,
        changed: true,
      }));
    }
    return [];
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Inspection Approvals</h1>
        <p className="text-slate-500">Review QC checker submissions and approve, reject or request re-inspection.</p>
      </div>

      {reports.length === 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-sm text-slate-400 shadow-sm">
          No pending approvals yet. Submit from QC Checker to populate this list.
        </div>
      )}

      {pending.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Awaiting Your Decision ({pending.length})
          </h2>
          {pending.map((r) => {
            const isExpanded = !!expanded[r.reportId];
            const qtyLabel = `${r.qty.toLocaleString()} ${r.unit}`;
            return (
              <div key={r.reportId} className="rounded-2xl border border-violet-200 bg-white shadow-sm">
                <div
                  className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-5"
                  onClick={() => toggle(r.reportId)}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-xs text-slate-400">{r.reportId}</span>
                    <span className="font-mono text-xs text-slate-400">{r.lotId}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${verdictChip[r.verdict]}`}>{r.verdict}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${gradeChip[r.grade]}`}>Grade {r.grade}</span>
                    <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                      {r.changes.length} checker change{r.changes.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">{r.product}</p>
                      <p className="text-xs text-slate-400">{qtyLabel} · {r.seller}</p>
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="space-y-5 border-t border-slate-100 p-5">
                    <LotLifecycleTracker lotStatus={approvalLotStatus(r)} />
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-400">Checker</p>
                        <p className="mt-0.5 font-semibold text-slate-800">{r.checker}</p>
                        <p className="mt-0.5 text-xs text-slate-400">Submitted: {r.submitted}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-400">Weight Verified</p>
                        <p className="mt-0.5 font-semibold text-slate-800">{r.weight ? `${r.weight} ${r.unit}` : "N/A"}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-400">Min Bid Rate</p>
                        <p className="mt-0.5 font-semibold text-sky-700">৳{r.minBidRate.toLocaleString()}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-400">Defect Rate</p>
                        <p className="mt-0.5 font-semibold text-slate-800">{r.defectRate != null ? `${r.defectRate}%` : "N/A"}</p>
                      </div>
                    </div>

                    {/* Transportation & Bonus */}
                    <div className="grid gap-4 sm:grid-cols-4">
                      <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                        <p className="text-xs text-amber-500">Seller Transport Share</p>
                        <p className="mt-0.5 font-semibold text-amber-700">
                          {r.sellerTransportShare === "NO"
                            ? "Buyer pays"
                            : r.sellerTransportShare === "HALF"
                            ? "50% split"
                            : "Seller pays"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-sky-100 bg-sky-50 p-3">
                        <p className="text-xs text-sky-500">QC Transport Cost</p>
                        <p className="mt-0.5 font-semibold text-sky-700">{r.transportCost != null ? `৳${r.transportCost.toLocaleString()}` : "Not set"}</p>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                        <p className="text-xs text-emerald-500">Estimated Order Total</p>
                        <p className="mt-0.5 font-semibold text-emerald-700">
                          ৳{((r.minBidRate * r.qty) + (r.transportCost ?? 0)).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-emerald-500">Product: ৳{(r.minBidRate * r.qty).toLocaleString()} + Transport: ৳{(r.transportCost ?? 0).toLocaleString()}</p>
                      </div>
                      <div className="rounded-xl border border-violet-100 bg-violet-50 p-3">
                        <p className="text-xs text-violet-500">Bonus Offer</p>
                        {r.freeQtyEnabled && (r.freeQtyPer ?? 0) > 0 ? (
                          <p className="mt-0.5 font-semibold text-violet-700">
                            {r.freeQtyAmount} {r.freeQtyUnit} free per {r.freeQtyPer} {r.freeQtyUnit}
                          </p>
                        ) : (
                          <p className="mt-0.5 text-sm text-slate-500">No bonus</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-xs font-medium text-slate-500">Checker Notes</p>
                      <p className="mt-1 text-sm text-slate-700">{r.notes}</p>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-xs font-medium text-slate-500">Uploaded Media</p>
                      <p className="mt-1 text-sm text-slate-700">
                        QC Photos: {r.photosCount} · QC Videos: {r.videosCount}
                      </p>

                      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Seller Uploaded Photos</p>
                      {r.sellerPhotoUrls && r.sellerPhotoUrls.length > 0 ? (
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                          {r.sellerPhotoUrls.map((src, idx) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={`${r.reportId}-seller-photo-${idx}`}
                              src={src}
                              alt={`Seller upload ${idx + 1}`}
                              className="h-24 w-full rounded-lg border border-slate-200 object-cover"
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-slate-500">No seller photos found for this lot.</p>
                      )}

                      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">QC Checker Uploaded Photos</p>
                      {r.qcPhotoPreviews && r.qcPhotoPreviews.length > 0 ? (
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                          {r.qcPhotoPreviews.map((src, idx) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={`${r.reportId}-qc-photo-${idx}`}
                              src={src}
                              alt={`QC upload ${idx + 1}`}
                              className="h-24 w-full rounded-lg border border-slate-200 object-cover"
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-slate-500">No QC checker photos preview available.</p>
                      )}

                      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Select Marketplace Product Photos (Team Leader)
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Choose one or more photos from seller or QC checker gallery.
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                          {[...(r.sellerPhotoUrls ?? []), ...(r.qcPhotoPreviews ?? [])].map((src, idx) => {
                            const selected = selectedPhoto[r.reportId]?.length
                              ? selectedPhoto[r.reportId]
                              : r.selectedMarketplacePhotoUrls?.length
                                ? r.selectedMarketplacePhotoUrls
                                : (r.selectedMarketplacePhotoUrl ? [r.selectedMarketplacePhotoUrl] : []);
                            const isSelected =
                              selected.includes(src);
                            return (
                              <button
                                key={`${r.reportId}-pick-${idx}`}
                                type="button"
                                onClick={() => setSelectedPhoto((prev) => {
                                  const current = prev[r.reportId]?.length
                                    ? prev[r.reportId]
                                    : (r.selectedMarketplacePhotoUrls?.length
                                      ? r.selectedMarketplacePhotoUrls
                                      : (r.selectedMarketplacePhotoUrl ? [r.selectedMarketplacePhotoUrl] : []));
                                  const next = current.includes(src)
                                    ? current.filter((u) => u !== src)
                                    : [...current, src];
                                  return { ...prev, [r.reportId]: next };
                                })}
                                className={`overflow-hidden rounded-lg border-2 ${isSelected ? "border-emerald-500" : "border-slate-200"}`}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={src} alt={`Selectable photo ${idx + 1}`} className="h-20 w-full object-cover" />
                              </button>
                            );
                          })}
                        </div>
                        {![...(r.sellerPhotoUrls ?? []), ...(r.qcPhotoPreviews ?? [])].length && (
                          <p className="mt-2 text-xs text-slate-500">No photos available to select.</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Seller Imported Data vs QC Checker Data
                      </p>
                      <div className="overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full text-sm">
                          <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-400">
                            <tr>
                              <th className="px-3 py-2 text-left">Field</th>
                              <th className="px-3 py-2 text-left">Seller</th>
                              <th className="px-3 py-2 text-left">QC Checker</th>
                              <th className="px-3 py-2 text-left">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {comparisonRows(r).length > 0 ? (
                              comparisonRows(r).map((row) => (
                                <tr key={row.field} className={row.changed ? "bg-amber-50/40" : ""}>
                                  <td className="px-3 py-2 font-medium text-slate-700">{row.field}</td>
                                  <td className={`px-3 py-2 ${row.changed ? "text-slate-500 line-through" : "text-slate-700"}`}>{row.seller}</td>
                                  <td className={`px-3 py-2 ${row.changed ? "font-semibold text-amber-800" : "text-slate-700"}`}>{row.qc}</td>
                                  <td className="px-3 py-2">
                                    {row.changed ? (
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
                                  No field-level data recorded for this submission. All seller values were confirmed unchanged.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                        Changes made by QC checker
                      </p>
                      {r.changes.length === 0 ? (
                        <p className="mt-1 text-sm text-slate-600">No seller fields were changed.</p>
                      ) : (
                        <ul className="mt-2 space-y-1 text-sm text-slate-700">
                          {r.changes.map((c, idx) => (
                            <li key={`${c.label}-${idx}`}>
                              {c.label}: <span className="text-slate-500 line-through">{c.before}</span> {"->"} <span className="font-semibold text-amber-800">{c.after}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {r.qcNote && (
                      <div className="rounded-xl border border-sky-100 bg-sky-50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-sky-600">Internal QC Note</p>
                        <p className="mt-1 text-sm text-sky-900">{r.qcNote}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => decide(r.reportId, "Approved")}
                        className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600"
                      >
                        <CheckCircle size={15} /> Approve & Go Live
                      </button>
                      <button
                        type="button"
                        onClick={() => decide(r.reportId, "Re-inspect")}
                        className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-5 py-2.5 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
                      >
                        <RotateCcw size={15} /> Request Re-inspection
                      </button>
                      <button
                        type="button"
                        onClick={() => decide(r.reportId, "Rejected")}
                        className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                      >
                        <XCircle size={15} /> Reject Lot
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {done.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Reviewed</h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  {["Report ID", "Lot", "Product", "Checker", "Verdict", "Min Bid", "Decision"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {done.map((r) => (
                  <tr key={r.reportId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{r.reportId}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{r.lotId}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{r.product}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{r.checker}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${verdictChip[r.verdict]}`}>{r.verdict}</span>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-sky-700">৳{r.minBidRate.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${decisionChip[r.decisionLabel]}`}>{r.decisionLabel}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
