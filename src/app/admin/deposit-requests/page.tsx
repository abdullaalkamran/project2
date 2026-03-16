"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Hourglass, CheckCircle2, XCircle, Wallet, RefreshCw,
  User, Banknote, Clock, ChevronDown,
} from "lucide-react";

interface DepositRequest {
  id: string;
  depositCode: string;
  userId: string;
  userName: string;
  amount: number;
  method: string;
  accountDetails: string | null;
  status: string;
  rejectedReason: string | null;
  processedBy: string | null;
  requestedAt: string;
  processedAt: string | null;
}

const fmt = (n: number) => "৳ " + Math.round(n).toLocaleString("en-IN");

type FilterStatus = "PENDING" | "APPROVED" | "REJECTED" | "ALL";

export default function AdminDepositRequestsPage() {
  const [requests, setRequests] = useState<DepositRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<FilterStatus>("PENDING");
  const [acting, setActing]     = useState<string | null>(null);

  // Reject modal
  const [rejectId, setRejectId]       = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/admin/deposit-requests?status=${filter}`);
      if (!res.ok) throw new Error();
      setRequests(await res.json());
    } catch {
      toast.error("Failed to load deposit requests");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  async function approve(id: string) {
    setActing(id);
    try {
      const res  = await fetch(`/api/admin/deposit-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.message || "Failed"); return; }
      toast.success("Deposit approved — wallet credited");
      await load(true);
    } catch {
      toast.error("Network error");
    } finally {
      setActing(null);
    }
  }

  async function reject() {
    if (!rejectId) return;
    if (!rejectReason.trim()) { toast.error("Please enter a rejection reason"); return; }
    setActing(rejectId);
    try {
      const res  = await fetch(`/api/admin/deposit-requests/${rejectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", rejectedReason: rejectReason }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.message || "Failed"); return; }
      toast.success("Deposit request rejected");
      setRejectId(null);
      setRejectReason("");
      await load(true);
    } catch {
      toast.error("Network error");
    } finally {
      setActing(null);
    }
  }

  const FILTER_TABS: { key: FilterStatus; label: string }[] = [
    { key: "PENDING",  label: "Pending"  },
    { key: "APPROVED", label: "Approved" },
    { key: "REJECTED", label: "Rejected" },
    { key: "ALL",      label: "All"      },
  ];

  const pendingTotal = requests
    .filter((r) => r.status === "PENDING")
    .reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-7 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Deposit Requests</h1>
          <p className="text-slate-500 text-sm">Review and approve or reject buyer wallet deposit requests.</p>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "Pending Requests",
            value: requests.filter((r) => r.status === "PENDING").length,
            sub: pendingTotal > 0 ? `${fmt(pendingTotal)} awaiting` : "None pending",
            icon: <Hourglass size={18} className="text-amber-500" />,
            bg: "bg-amber-50", border: "border-amber-100", color: "text-amber-700",
          },
          {
            label: "Approved Today",
            value: requests.filter((r) => r.status === "APPROVED" && r.processedAt && new Date(r.processedAt).toDateString() === new Date().toDateString()).length,
            sub: "wallet credited",
            icon: <CheckCircle2 size={18} className="text-emerald-500" />,
            bg: "bg-emerald-50", border: "border-emerald-100", color: "text-emerald-700",
          },
          {
            label: "Rejected Total",
            value: requests.filter((r) => r.status === "REJECTED").length,
            sub: "all time",
            icon: <XCircle size={18} className="text-red-400" />,
            bg: "bg-red-50", border: "border-red-100", color: "text-red-600",
          },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border ${s.border} ${s.bg} px-5 py-4 flex items-center gap-4`}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
              {s.icon}
            </div>
            <div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              <p className="text-[11px] text-slate-400">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTER_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilter(t.key)}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
              filter === t.key
                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {loading ? (
          <div className="divide-y divide-slate-50">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="h-10 w-10 animate-pulse rounded-full bg-slate-100" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-56 animate-pulse rounded bg-slate-50" />
                </div>
                <div className="h-8 w-24 animate-pulse rounded-xl bg-slate-100" />
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Wallet size={32} className="mb-3 text-slate-200" />
            <p className="font-medium">No {filter !== "ALL" ? filter.toLowerCase() : ""} deposit requests</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {requests.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors">
                {/* Icon */}
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  r.status === "PENDING"  ? "bg-amber-100"   :
                  r.status === "APPROVED" ? "bg-emerald-100" : "bg-red-50"
                }`}>
                  {r.status === "PENDING"  && <Hourglass    size={16} className="text-amber-600"   />}
                  {r.status === "APPROVED" && <CheckCircle2 size={16} className="text-emerald-600" />}
                  {r.status === "REJECTED" && <XCircle      size={16} className="text-red-500"     />}
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-800">{fmt(r.amount)}</span>
                    <span className="font-mono text-xs text-slate-400">{r.depositCode}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><User size={11} />{r.userName}</span>
                    <span className="flex items-center gap-1"><Banknote size={11} />{r.method}{r.accountDetails ? ` · ${r.accountDetails}` : ""}</span>
                    <span className="flex items-center gap-1"><Clock size={11} />{new Date(r.requestedAt).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  {r.status === "REJECTED" && r.rejectedReason && (
                    <p className="text-xs text-red-500">Reason: {r.rejectedReason}</p>
                  )}
                  {r.processedBy && (
                    <p className="text-[11px] text-slate-400">Processed by {r.processedBy}</p>
                  )}
                </div>

                {/* Actions */}
                {r.status === "PENDING" && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={acting === r.id}
                      onClick={() => void approve(r.id)}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
                    >
                      <CheckCircle2 size={13} />
                      {acting === r.id ? "Processing…" : "Approve"}
                    </button>
                    <button
                      type="button"
                      disabled={acting === r.id}
                      onClick={() => { setRejectId(r.id); setRejectReason(""); }}
                      className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60 transition"
                    >
                      <XCircle size={13} />
                      Reject
                    </button>
                  </div>
                )}

                {r.status !== "PENDING" && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shrink-0 ${
                    r.status === "APPROVED" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                  }`}>
                    {r.status === "APPROVED" ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                    {r.status}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject reason modal */}
      {rejectId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setRejectId(null); }}
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <XCircle size={20} className="text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Reject Deposit</h3>
                <p className="text-xs text-slate-400">Provide a reason for the buyer</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Reason <span className="text-red-500">*</span></label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="e.g. Invalid payment reference, amount mismatch…"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRejectId(null)}
                className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={reject}
                disabled={acting === rejectId}
                className="flex-1 rounded-2xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60 transition"
              >
                {acting === rejectId ? "Rejecting…" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
