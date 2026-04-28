"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, X, Clock, MapPin } from "lucide-react";
import api from "@/lib/api";

type HubRequest = {
  orderCode: string;
  product: string;
  qty: string;
  buyerName: string;
  currentHub: string;
  requestedHub: string | null;
  status: string | null;
  requestedAt: string | null;
  rejectedReason: string | null;
  sourceHub: string | null;
  loadConfirmed: boolean;
  dispatched: boolean;
};

const STATUS_CHIP: Record<string, string> = {
  PENDING:  "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-600",
};

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" }) : "—";

export default function HubChangeRequestsClient() {
  const [requests, setRequests] = useState<HubRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");

  const load = useCallback(async () => {
    setLoading(true);
    return api.get<{ requests: HubRequest[] }>("/api/hub-manager/hub-change-requests")
      .then((d) => setRequests(d.requests ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function approve(orderCode: string) {
    setBusy(orderCode);
    try {
      await api.patch(`/api/hub-manager/hub-change-requests/${orderCode}`, { action: "APPROVE" });
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function reject(orderCode: string) {
    setBusy(orderCode);
    try {
      await api.patch(`/api/hub-manager/hub-change-requests/${orderCode}`, {
        action: "REJECT",
        reason: rejectReason.trim() || undefined,
      });
      setRejectModal(null);
      setRejectReason("");
      await load();
    } finally {
      setBusy(null);
    }
  }

  const filtered = requests.filter((r) => filter === "ALL" || r.status === filter);
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Delivery Hub Change Requests</h1>
          <p className="text-slate-500">Buyers requesting delivery hub changes before truck confirmation.</p>
        </div>
        {pendingCount > 0 && (
          <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white">
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              filter === f
                ? "border-slate-400 bg-slate-100 text-slate-800"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            {f !== "ALL" && (
              <span className="ml-1 opacity-60">({requests.filter((r) => r.status === f).length})</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <p className="text-slate-400">No {filter === "ALL" ? "" : filter.toLowerCase()} requests.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.orderCode} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900">{r.product}</p>
                    <span className="font-mono text-xs text-slate-400">{r.orderCode}</span>
                    {r.status && (
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${STATUS_CHIP[r.status] ?? "bg-slate-100 text-slate-500"}`}>
                        {r.status}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>{r.buyerName}</span>
                    <span>{r.qty}</span>
                    {r.requestedAt && (
                      <span className="flex items-center gap-1"><Clock size={10} /> {fmt(r.requestedAt)}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Hub change arrow */}
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                  <MapPin size={11} className="text-slate-400" /> {r.currentHub}
                </div>
                <ArrowRight size={14} className="text-amber-500 shrink-0" />
                <div className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                  <MapPin size={11} /> {r.requestedHub ?? "—"}
                </div>
                <span className="text-xs text-slate-400">requested by buyer</span>
              </div>

              {r.rejectedReason && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  Rejected: {r.rejectedReason}
                </p>
              )}

              {/* Actions — only for pending */}
              {r.status === "PENDING" && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => approve(r.orderCode)}
                    disabled={busy === r.orderCode}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 transition"
                  >
                    <CheckCircle2 size={13} />
                    {busy === r.orderCode ? "Approving…" : "Approve"}
                  </button>
                  <button
                    onClick={() => { setRejectModal(r.orderCode); setRejectReason(""); }}
                    disabled={busy === r.orderCode}
                    className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-40 transition"
                  >
                    <X size={13} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h2 className="font-bold text-slate-900">Reject Hub Change Request</h2>
            <p className="text-sm text-slate-500">Optionally provide a reason for the buyer.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason (optional)…"
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-red-300 focus:bg-white resize-none transition"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRejectModal(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => reject(rejectModal)}
                disabled={busy === rejectModal}
                className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40 transition"
              >
                {busy === rejectModal ? "Rejecting…" : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
