"use client";
import { useState } from "react";
import { AlertTriangle, Check, ChevronDown, ChevronUp, X } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type LotField = {
  label: string;
  seller: string;
  qc: string;
};

type PendingReport = {
  id: string;
  lotId: string;
  seller: string;
  checker: string;
  hub: string;
  submittedAt: string;
  fields: LotField[];
  askingPricePerKg: string;
  basePrice: string;
  basePriceOriginal: string;
  minBidRate: string;
  qcGrade: string;
  actualWeight: string;
  defectRate: string;
  verdict: "PASSED" | "FAILED" | "CONDITIONAL";
  conditionNotes: string;
  qcNote: string;
  photosCount: number;
  videosCount: number;
};

// ── Mock data ─────────────────────────────────────────────────────────────────
const PENDING: PendingReport[] = [
  {
    id: "QC-042",
    lotId: "LOT-1016",
    seller: "Rahman Traders",
    checker: "Sadia Islam",
    hub: "Mirpur Hub — Dhaka",
    submittedAt: "21 Feb 2026, 09:14 AM",
    fields: [
      { label: "Product name",        seller: "Miniket Rice",                                                                       qc: "Miniket Rice" },
      { label: "Category",            seller: "Rice",                                                                               qc: "Rice" },
      { label: "Quantity",            seller: "5 000 kg",                                                                           qc: "4 850 kg" },
      { label: "Unit",                seller: "kg",                                                                                  qc: "kg" },
      { label: "Declared grade",      seller: "Grade A",                                                                            qc: "Grade B" },
      { label: "Storage type",        seller: "Silo / Bulk Grain Store",                                                             qc: "Silo / Bulk Grain Store" },
      { label: "Baggage / Packaging", seller: "Jute Bag (50 kg)",                                                                    qc: "Jute Bag (50 kg)" },
      { label: "No. of bags",         seller: "100",                                                                                 qc: "97" },
      { label: "Description",         seller: "Premium Miniket rice, harvested November 2025. Well sorted, no husks.",               qc: "Miniket rice, November 2025 harvest. ~3% husk content found; re-sorted at hub." },
    ],
    askingPricePerKg: "৳ 65.00",
    basePrice: "৳ 58.00",
    basePriceOriginal: "৳ 58.00",
    minBidRate: "৳ 52.00",
    qcGrade: "B",
    actualWeight: "491.2 kg",
    defectRate: "3.0%",
    verdict: "CONDITIONAL",
    conditionNotes: "Approx 3% husk content detected; re-sorted on-site. Net saleable quantity is 4 850 kg across 97 bags. Recommend Grade B listing.",
    qcNote: "Seller declared Grade A and 5 000 kg. After re-sorting at hub, adjusted to 4 850 kg (97 bags) and Grade B. Asking price unchanged at ৳ 65 — set minimum bid at ৳ 52 based on current market.",
    photosCount: 6,
    videosCount: 1,
  },
  {
    id: "QC-043",
    lotId: "LOT-1017",
    seller: "Green Farm Co.",
    checker: "Mamun Hossain",
    hub: "Uttara Hub — Dhaka",
    submittedAt: "21 Feb 2026, 10:52 AM",
    fields: [
      { label: "Product name",        seller: "Fresh Tomato",                                                                        qc: "Fresh Tomato" },
      { label: "Category",            seller: "Vegetables",                                                                          qc: "Vegetables" },
      { label: "Quantity",            seller: "1 200 kg",                                                                            qc: "1 200 kg" },
      { label: "Unit",                seller: "kg",                                                                                   qc: "kg" },
      { label: "Declared grade",      seller: "Grade B",                                                                             qc: "Grade B" },
      { label: "Storage type",        seller: "Cool & Dry Warehouse",                                                                 qc: "Cool & Dry Warehouse" },
      { label: "Baggage / Packaging", seller: "Plastic Crate",                                                                       qc: "Plastic Crate" },
      { label: "No. of bags",         seller: "60",                                                                                   qc: "60" },
      { label: "Description",         seller: "Fresh red tomatoes from Bogra. Minor surface marks on ~5% of units.",                 qc: "Fresh red tomatoes from Bogra. Minor surface marks on ~5% of units." },
    ],
    askingPricePerKg: "৳ 38.00",
    basePrice: "৳ 32.00",
    basePriceOriginal: "৳ 32.00",
    minBidRate: "৳ 30.00",
    qcGrade: "B",
    actualWeight: "1 198 kg",
    defectRate: "4.5%",
    verdict: "PASSED",
    conditionNotes: "Good uniform colour, firm texture. ~4.5% surface blemishes — within Grade B tolerance. All 60 crates intact.",
    qcNote: "No corrections needed. Seller description accurate. Set minimum bid at ৳ 30 — market price for Grade B tomato is ৳ 33–36.",
    photosCount: 8,
    videosCount: 2,
  },
];

const VERDICT_STYLE: Record<string, string> = {
  PASSED:      "bg-emerald-100 text-emerald-800 border-emerald-200",
  FAILED:      "bg-red-100 text-red-700 border-red-200",
  CONDITIONAL: "bg-amber-100 text-amber-800 border-amber-200",
};

type Decision = "approved" | "rejected" | null;

// ── Component ─────────────────────────────────────────────────────────────────
export default function QCLeaderApprovalsPage() {
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const decide = (id: string, d: Decision) => setDecisions((p) => ({ ...p, [id]: d }));
  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));
  const modifiedFields = (r: PendingReport) => r.fields.filter((f) => f.seller !== f.qc);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Pending Approvals</h1>
        <p className="text-slate-500">
          Review QC reports — compare seller inputs against QC corrections, check pricing and inspection results, then approve or reject.
        </p>
      </div>

      {PENDING.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-slate-400 text-sm shadow-sm">
          No pending approvals.
        </div>
      ) : (
        <div className="space-y-6">
          {PENDING.map((r) => {
            const dec = decisions[r.id];
            const mods = modifiedFields(r);
            const isExpanded = expanded[r.id] ?? false;

            return (
              <div
                key={r.id}
                className={`rounded-2xl border bg-white shadow-sm overflow-hidden transition-colors ${
                  dec === "approved" ? "border-emerald-300" :
                  dec === "rejected"  ? "border-red-300"     : "border-slate-100"
                }`}
              >
                {/* ── Header ── */}
                <div className="flex flex-wrap items-start justify-between gap-3 px-6 py-5 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-base">{r.id}</span>
                      <span className="text-slate-300">·</span>
                      <span className="font-semibold text-slate-700">{r.lotId}</span>
                      <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${VERDICT_STYLE[r.verdict]}`}>
                        {r.verdict}
                      </span>
                      {mods.length > 0 && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                          {mods.length} field{mods.length > 1 ? "s" : ""} corrected by QC
                        </span>
                      )}
                      {dec && (
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${dec === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`}>
                          {dec === "approved" ? "✓ Approved" : "✗ Rejected"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Seller: <strong className="text-slate-700">{r.seller}</strong>
                      &nbsp;·&nbsp;Checker: <strong className="text-slate-700">{r.checker}</strong>
                      &nbsp;·&nbsp;Hub: {r.hub}
                      &nbsp;·&nbsp;Submitted: {r.submittedAt}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(r.id)}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    {isExpanded ? <><ChevronUp size={13} /> Collapse</> : <><ChevronDown size={13} /> View Full Details</>}
                  </button>
                </div>

                {/* ── Expandable body ── */}
                {isExpanded && (
                  <div className="px-6 py-5 space-y-6">

                    {/* 1. Lot details — diff table */}
                    <div>
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
                        1 · Lot Details — Seller Input vs QC Corrections
                      </h3>
                      <div className="overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
                              <th className="px-4 py-2.5 text-left w-40">Field</th>
                              <th className="px-4 py-2.5 text-left">Seller submitted</th>
                              <th className="px-4 py-2.5 text-left">QC value</th>
                              <th className="px-4 py-2.5 text-left w-32">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {r.fields.map((f) => {
                              const changed = f.seller !== f.qc;
                              return (
                                <tr key={f.label} className={changed ? "bg-amber-50/50" : ""}>
                                  <td className="px-4 py-2.5 font-medium text-slate-600 text-xs">{f.label}</td>
                                  <td className={`px-4 py-2.5 ${changed ? "text-slate-400 line-through" : "text-slate-700"}`}>
                                    {f.seller}
                                  </td>
                                  <td className={`px-4 py-2.5 font-semibold ${changed ? "text-amber-800" : "text-slate-700"}`}>
                                    {f.qc}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    {changed ? (
                                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                        ✎ Modified
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                        <Check size={9} strokeWidth={3} /> Confirmed
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* 2. Pricing */}
                    <div>
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">2 · Pricing</h3>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase text-slate-400 mb-1">Seller Asking Price / kg</p>
                          <p className="text-xl font-bold text-slate-800">{r.askingPricePerKg}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Set by seller — locked</p>
                        </div>
                        <div className={`rounded-xl border px-4 py-3 ${r.basePrice !== r.basePriceOriginal ? "border-amber-200 bg-amber-50/40" : "border-slate-100 bg-slate-50"}`}>
                          <p className="text-[11px] font-semibold uppercase text-slate-400 mb-1">Base / Start Price</p>
                          <p className="text-xl font-bold text-slate-800">{r.basePrice}</p>
                          {r.basePrice !== r.basePriceOriginal && (
                            <p className="text-[10px] text-amber-600 mt-0.5">Seller: {r.basePriceOriginal} → QC corrected</p>
                          )}
                        </div>
                        <div className="rounded-xl border border-sky-200 bg-sky-50/40 px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase text-sky-500 mb-1">Min. Bidding Rate (QC set)</p>
                          <p className="text-xl font-bold text-sky-800">{r.minBidRate}</p>
                          <p className="text-[10px] text-sky-500 mt-0.5">Floor price for buyers</p>
                        </div>
                      </div>
                    </div>

                    {/* 3. Inspection results */}
                    <div>
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">3 · Inspection Results</h3>
                      <div className="grid gap-3 sm:grid-cols-4 mb-3">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-center">
                          <p className="text-[11px] font-semibold uppercase text-slate-400 mb-1">QC Grade</p>
                          <p className="text-2xl font-black text-slate-800">{r.qcGrade}</p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-center">
                          <p className="text-[11px] font-semibold uppercase text-slate-400 mb-1">Actual Weight</p>
                          <p className="text-lg font-bold text-slate-800">{r.actualWeight}</p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-center">
                          <p className="text-[11px] font-semibold uppercase text-slate-400 mb-1">Defect Rate</p>
                          <p className="text-lg font-bold text-slate-800">{r.defectRate}</p>
                        </div>
                        <div className={`rounded-xl border px-4 py-3 text-center ${VERDICT_STYLE[r.verdict]}`}>
                          <p className="text-[11px] font-semibold uppercase mb-1 opacity-70">Verdict</p>
                          <p className="text-base font-black">{r.verdict}</p>
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        <span className="font-semibold text-slate-500 text-xs uppercase tracking-wide mr-1">Condition Notes:</span>
                        {r.conditionNotes}
                      </div>
                    </div>

                    {/* 4. Media */}
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">4 · Media:</h3>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                        📷 {r.photosCount} photo{r.photosCount !== 1 ? "s" : ""}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                        🎥 {r.videosCount} video{r.videosCount !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* 5. Internal QC note */}
                    {r.qcNote && (
                      <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-amber-600">
                          QC Internal Note — checker to leader
                        </p>
                        <p className="text-sm text-amber-900">{r.qcNote}</p>
                      </div>
                    )}

                    {/* Verdict warnings */}
                    {r.verdict === "CONDITIONAL" && (
                      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" />
                        <span>This lot passed <strong>conditionally</strong>. Only approve if the corrections and conditions above are acceptable for listing.</span>
                      </div>
                    )}
                    {r.verdict === "FAILED" && (
                      <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        <X size={15} className="mt-0.5 shrink-0 text-red-500" />
                        <span>Checker marked this lot as <strong>FAILED</strong>. Rejecting will notify the seller and hub manager.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Decision area ── */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 space-y-3">
                  {dec === "rejected" && (
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-red-700">
                        Rejection reason <span className="font-normal text-slate-400">(sent to seller &amp; hub manager)</span>
                      </label>
                      <textarea
                        rows={2}
                        value={rejectNote[r.id] ?? ""}
                        onChange={(e) => setRejectNote((p) => ({ ...p, [r.id]: e.target.value }))}
                        className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm focus:outline-none resize-none placeholder:text-slate-400"
                        placeholder="Explain why this lot is rejected…"
                      />
                    </div>
                  )}

                  {!dec ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => decide(r.id, "approved")}
                        className="rounded-xl bg-teal-600 px-6 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                      >
                        ✓ Approve &amp; Publish
                      </button>
                      <button
                        type="button"
                        onClick={() => decide(r.id, "rejected")}
                        className="rounded-xl border border-red-200 px-6 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                      >
                        ✗ Reject
                      </button>
                      {!isExpanded && (
                        <span className="text-xs text-slate-400 italic">↑ Expand details before deciding.</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`rounded-xl px-4 py-2 text-sm font-bold ${dec === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`}>
                        {dec === "approved" ? "✓ Approved — lot will go live" : "✗ Rejected — seller notified"}
                      </span>
                      <button
                        type="button"
                        onClick={() => decide(r.id, null)}
                        className="text-xs text-slate-400 underline hover:text-slate-600"
                      >
                        Undo
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
