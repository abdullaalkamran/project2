"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { X, RefreshCw, Clock, CheckCircle, XCircle, Banknote, Wallet, TrendingUp, Truck } from "lucide-react";
import { toast } from "sonner";

type PaymentRequest = {
  id: string;
  paymentCode: string;
  amount: number;
  method: string;
  bankDetails: string | null;
  note: string | null;
  status: string;
  rejectedReason: string | null;
  transactionRef: string | null;
  processedBy: string | null;
  processedAt: string | null;
  requestedAt: string;
};

function fmtBDT(n: number) {
  if (n >= 100000) return "৳ " + (n / 100000).toFixed(2) + " L";
  return "৳ " + n.toLocaleString("en-IN");
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-BD", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
  PENDING: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", icon: Clock },
  APPROVED: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", icon: CheckCircle },
  PAID: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", icon: Banknote },
  REJECTED: { bg: "bg-red-50 border-red-200", text: "text-red-700", icon: XCircle },
};

export default function SellerFinanceClient() {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<"requests" | "history">("requests");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);

  // Balance state
  const [balance, setBalance] = useState<{
    available: number;
    totalEarned: number;
    totalPaid: number;
    totalPending: number;
    totalLifetimeEarnings: number;
    pendingEarnings: number;
    deliveredCount: number;
    pendingDelivery: number;
  } | null>(null);

  // Withdraw form state
  const [wAmount, setWAmount] = useState("");
  const [wMethod, setWMethod] = useState("Bank Transfer");
  const [wAccountDetails, setWAccountDetails] = useState("");
  const [wNote, setWNote] = useState("");
  const [wError, setWError] = useState("");
  const [wSubmitting, setWSubmitting] = useState(false);

  // Seller profile payment info
  const [sellerBank, setSellerBank] = useState<{
    bankName: string; accountName: string; accountNumber: string; routingNumber: string;
    mobileBanking: string; mobileNumber: string;
  } | null>(null);

  const fetchBalance = useCallback(() => {
    fetch("/api/seller-dashboard/balance")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => { if (d.available !== undefined) setBalance(d); })
      .catch(() => {});
  }, []);

  const fetchRequests = useCallback(() => {
    setLoading(true);
    fetch("/api/seller-dashboard/payment-requests")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => { if (Array.isArray(d)) setRequests(d); })
      .catch(() => toast.error("Failed to load payment requests"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchRequests(); fetchBalance(); }, [fetchRequests, fetchBalance]);

  const resetWithdrawForm = () => {
    setWAmount("");
    setWMethod("Bank Transfer");
    setWAccountDetails("");
    setWNote("");
    setWError("");
  };

  const openWithdraw = () => {
    resetWithdrawForm();
    setSubmitted(false);
    setShowWithdraw(true);
    // Fetch seller profile bank info, then pre-fill based on default method (Bank Transfer)
    fetch("/api/seller-dashboard/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d?.bank) return;
        setSellerBank(d.bank);
        const b = d.bank;
        const parts = [b.bankName, b.accountNumber, b.accountName, b.routingNumber].filter(Boolean);
        setWAccountDetails(parts.join(" | "));
      })
      .catch(() => {});
  };

  const handleMethodChange = (method: string) => {
    setWMethod(method);
    setWError("");
    if (!sellerBank) { setWAccountDetails(""); return; }
    if (method === "Bank Transfer") {
      const parts = [sellerBank.bankName, sellerBank.accountNumber, sellerBank.accountName, sellerBank.routingNumber].filter(Boolean);
      setWAccountDetails(parts.join(" | "));
    } else {
      // bKash / Nagad — use mobileNumber
      setWAccountDetails(sellerBank.mobileNumber || "");
    }
  };

  const onWithdraw = async () => {
    const num = Number(wAmount);
    if (!wAmount || isNaN(num) || num < 500) { setWError("Minimum withdrawal is ৳ 500"); return; }
    if (!wAccountDetails.trim()) { setWError("Account details are required"); return; }
    setWError("");
    setWSubmitting(true);
    try {
      const res = await fetch("/api/seller-dashboard/payment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: num,
          method: wMethod,
          bankDetails: wAccountDetails.trim(),
          note: wNote || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || "Failed to submit request");
        return;
      }
      setSubmitted(true);
      toast.success("Payment request submitted!");
      fetchRequests();
      fetchBalance();
      setTimeout(() => { setShowWithdraw(false); setSubmitted(false); resetWithdrawForm(); }, 2500);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setWSubmitting(false);
    }
  };

  // Stats
  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "PENDING").length,
    pendingAmount: requests.filter((r) => r.status === "PENDING").reduce((s, r) => s + r.amount, 0),
    approved: requests.filter((r) => r.status === "APPROVED").length,
    approvedAmount: requests.filter((r) => r.status === "APPROVED").reduce((s, r) => s + r.amount, 0),
    paid: requests.filter((r) => r.status === "PAID").length,
    paidAmount: requests.filter((r) => r.status === "PAID").reduce((s, r) => s + r.amount, 0),
    rejected: requests.filter((r) => r.status === "REJECTED").length,
    totalPaid: requests.filter((r) => r.status === "PAID").reduce((s, r) => s + r.amount, 0),
  };

  // Filtered lists
  const pendingRequests = requests.filter((r) => ["PENDING", "APPROVED"].includes(r.status));
  const historyRequests = requests.filter((r) => ["PAID", "REJECTED"].includes(r.status));

  const filteredRequests = activeTab === "requests"
    ? statusFilter === "All" ? pendingRequests : pendingRequests.filter((r) => r.status === statusFilter)
    : statusFilter === "All" ? historyRequests : historyRequests.filter((r) => r.status === statusFilter);

  const tabs = [
    { key: "requests" as const, label: "Active Requests", count: pendingRequests.length },
    { key: "history" as const, label: "Payment History", count: historyRequests.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payments &amp; Withdrawals</h1>
          <p className="mt-1 text-sm text-slate-500">
            Request payment withdrawals and track their status. Admin will review and process your requests.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={openWithdraw}
            className="rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-emerald-600"
          >
            + New Withdrawal Request
          </button>
          <button
            type="button"
            onClick={fetchRequests}
            className="rounded-full border border-slate-200 px-3 py-2.5 text-slate-500 transition hover:bg-slate-50"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Balance Dashboard */}
      {balance && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Balance Overview</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 text-white">
              <div className="flex items-center gap-2">
                <Wallet size={16} />
                <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">Available to Withdraw</p>
              </div>
              <p className="mt-2 text-2xl font-bold">{fmtBDT(balance.available)}</p>
              <p className="text-xs opacity-70">From {balance.deliveredCount} delivered order{balance.deliveredCount !== 1 ? "s" : ""}</p>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-indigo-500" />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500">Total Earned</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-indigo-700">{fmtBDT(balance.totalEarned)}</p>
              <p className="text-xs text-indigo-400">Delivered &amp; accepted</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-slate-400" />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Pending Delivery</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-700">{fmtBDT(balance.pendingEarnings)}</p>
              <p className="text-xs text-slate-400">{balance.pendingDelivery} order{balance.pendingDelivery !== 1 ? "s" : ""} in progress</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-amber-500" />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">Paid + Pending Requests</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-amber-700">{fmtBDT(balance.totalPaid + balance.totalPending)}</p>
              <p className="text-xs text-amber-400">Paid: {fmtBDT(balance.totalPaid)} · Pending: {fmtBDT(balance.totalPending)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-amber-500" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">Pending</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-700">{stats.pending}</p>
          <p className="text-xs text-amber-500">{fmtBDT(stats.pendingAmount)}</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} className="text-blue-500" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-500">Approved</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-700">{stats.approved}</p>
          <p className="text-xs text-blue-500">{fmtBDT(stats.approvedAmount)}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <div className="flex items-center gap-2">
            <Banknote size={16} className="text-emerald-500" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500">Total Received</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{fmtBDT(stats.totalPaid)}</p>
          <p className="text-xs text-emerald-500">{stats.paid} payments</p>
        </div>
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
          <div className="flex items-center gap-2">
            <XCircle size={16} className="text-red-400" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-red-400">Rejected</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-red-700">{stats.rejected}</p>
          <p className="text-xs text-red-400">of {stats.total} total requests</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl bg-slate-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => { setActiveTab(t.key); setStatusFilter("All"); }}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label} <span className="ml-1 text-xs text-slate-400">({t.count})</span>
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex gap-2">
        {(activeTab === "requests" ? ["All", "PENDING", "APPROVED"] : ["All", "PAID", "REJECTED"]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              statusFilter === s ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {s === "All" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Request list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <p className="text-lg font-semibold text-slate-400">No {activeTab === "requests" ? "active requests" : "payment history"}</p>
          <p className="mt-1 text-sm text-slate-400">
            {activeTab === "requests"
              ? "Submit a withdrawal request to get started."
              : "Completed and rejected payments will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => {
            const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING;
            const Icon = cfg.icon;
            return (
              <button
                key={req.id}
                type="button"
                onClick={() => setSelectedRequest(req)}
                className={`w-full rounded-2xl border bg-white p-5 text-left transition hover:shadow-md ${
                  selectedRequest?.id === req.id ? "ring-2 ring-emerald-300" : ""
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full border ${cfg.bg}`}>
                      <Icon size={18} className={cfg.text} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{req.paymentCode}</p>
                      <p className="text-xs text-slate-400">{fmtDateTime(req.requestedAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">{fmtBDT(req.amount)}</p>
                    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase ${cfg.bg} ${cfg.text}`}>
                      {req.status}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                  <span>Method: <strong className="text-slate-700">{req.method}</strong></span>
                  {req.bankDetails && <span>Account: <strong className="text-slate-700">{req.bankDetails}</strong></span>}
                  {req.note && <span>Note: <em className="text-slate-600">{req.note}</em></span>}
                </div>

                {req.status === "REJECTED" && req.rejectedReason && (
                  <div className="mt-3 rounded-xl bg-red-50 border border-red-100 px-4 py-2 text-xs text-red-600">
                    <strong>Rejection reason:</strong> {req.rejectedReason}
                  </div>
                )}

                {req.status === "PAID" && req.processedAt && (
                  <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2 text-xs text-emerald-600">
                    <strong>Paid on:</strong> {fmtDateTime(req.processedAt)}
                    {req.processedBy && <span> by {req.processedBy}</span>}
                    {req.transactionRef && <span> · Ref: <strong>{req.transactionRef}</strong></span>}
                  </div>
                )}

                {req.status === "APPROVED" && (
                  <div className="mt-3 rounded-xl bg-blue-50 border border-blue-100 px-4 py-2 text-xs text-blue-600">
                    <strong>Approved</strong> — Payment will be processed shortly by admin.
                    {req.processedAt && <span> ({fmtDateTime(req.processedAt)})</span>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Detail panel */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-xl space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{selectedRequest.paymentCode}</h2>
                <p className="text-xs text-slate-400">Requested {fmtDateTime(selectedRequest.requestedAt)}</p>
              </div>
              <button type="button" onClick={() => setSelectedRequest(null)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            {/* Amount display */}
            <div className={`rounded-2xl border p-5 text-center ${STATUS_CONFIG[selectedRequest.status]?.bg || "bg-slate-50"}`}>
              <p className="text-[10px] font-semibold uppercase text-slate-400">Amount</p>
              <p className={`text-3xl font-bold ${STATUS_CONFIG[selectedRequest.status]?.text || "text-slate-900"}`}>
                {fmtBDT(selectedRequest.amount)}
              </p>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">Status</p>
                <span className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_CONFIG[selectedRequest.status]?.bg} ${STATUS_CONFIG[selectedRequest.status]?.text}`}>
                  {selectedRequest.status}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">Method</p>
                <p className="font-medium text-slate-700">{selectedRequest.method}</p>
              </div>
              {selectedRequest.bankDetails && (
                <div className="col-span-2">
                  <p className="text-[10px] font-semibold uppercase text-slate-400">Account Details</p>
                  <p className="font-medium text-slate-700">{selectedRequest.bankDetails}</p>
                </div>
              )}
              {selectedRequest.note && (
                <div className="col-span-2">
                  <p className="text-[10px] font-semibold uppercase text-slate-400">Note</p>
                  <p className="text-slate-600">{selectedRequest.note}</p>
                </div>
              )}
              {selectedRequest.transactionRef && (
                <div className="col-span-2">
                  <p className="text-[10px] font-semibold uppercase text-emerald-400">Transaction Reference</p>
                  <p className="font-medium text-emerald-700">{selectedRequest.transactionRef}</p>
                </div>
              )}
            </div>

            {/* Status timeline */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase text-slate-400">Timeline</p>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-xs">
                  <div className="h-2 w-2 rounded-full bg-slate-400" />
                  <span className="text-slate-600">Request submitted — {fmtDateTime(selectedRequest.requestedAt)}</span>
                </div>
                {selectedRequest.status === "APPROVED" && selectedRequest.processedAt && (
                  <div className="flex items-center gap-3 text-xs">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-blue-600">Approved — {fmtDateTime(selectedRequest.processedAt)}</span>
                  </div>
                )}
                {selectedRequest.status === "PAID" && selectedRequest.processedAt && (
                  <div className="flex items-center gap-3 text-xs">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-emerald-600">Payment transferred — {fmtDateTime(selectedRequest.processedAt)}</span>
                  </div>
                )}
                {selectedRequest.status === "REJECTED" && (
                  <div className="flex items-center gap-3 text-xs">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-red-600">Rejected — {selectedRequest.rejectedReason || "No reason"}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedRequest(null)}
              className="w-full rounded-full border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Support link */}
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-4 text-sm text-slate-600">
        Questions about a payment?{" "}
        <Link href="/contact" className="font-semibold text-emerald-700 underline">Contact support</Link>.
      </div>

      {/* Withdraw modal */}
      {showWithdraw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-xl">
            {submitted ? (
              <div className="space-y-3 py-4 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-600">
                  ✓
                </div>
                <p className="text-lg font-semibold text-slate-900">Request submitted!</p>
                <p className="text-sm text-slate-500">
                  Your withdrawal request has been sent to admin for review. You&apos;ll be notified once it&apos;s processed.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Withdraw Funds</h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Submit a payment request. Admin will review and transfer to your bank account.
                    </p>
                  </div>
                  <button type="button" onClick={() => setShowWithdraw(false)} className="text-slate-400 hover:text-slate-700">
                    <X size={18} />
                  </button>
                </div>
                <div className="space-y-4">
                  {/* Amount */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Amount (৳) *</label>
                    <input
                      type="number"
                      value={wAmount}
                      onChange={(e) => { setWAmount(e.target.value); setWError(""); }}
                      placeholder="e.g. 10000"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />
                    <p className="mt-1 text-xs text-slate-400">
                      Minimum ৳ 500{balance ? ` · Available: ${fmtBDT(balance.available)}` : ""}
                    </p>
                  </div>

                  {/* Method */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Payment Method *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["Bank Transfer", "bKash", "Nagad"].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleMethodChange(m)}
                          className={`rounded-xl border py-2.5 text-sm font-semibold transition ${
                            wMethod === m
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Account details — pre-filled from profile */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      {wMethod === "Bank Transfer" ? "Bank Account Details *" : `${wMethod} Number *`}
                    </label>
                    <input
                      type="text"
                      value={wAccountDetails}
                      onChange={(e) => setWAccountDetails(e.target.value)}
                      placeholder={
                        wMethod === "Bank Transfer"
                          ? "Bank name | Account number | Account name"
                          : "017XXXXXXXX"
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />
                    {sellerBank && (
                      <p className="mt-1 text-xs text-slate-400">
                        Pre-filled from your profile — edit if needed
                      </p>
                    )}
                    {!sellerBank && (
                      <p className="mt-1 text-xs text-amber-500">
                        No payment info saved in your profile. <Link href="/seller-dashboard/settings" className="underline">Add it here</Link>.
                      </p>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Notes (optional)</label>
                    <textarea
                      value={wNote}
                      onChange={(e) => setWNote(e.target.value)}
                      placeholder="e.g. Branch name, routing number, any extra info"
                      rows={2}
                      className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>

                  {wError && <p className="text-xs text-rose-500">{wError}</p>}

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={onWithdraw}
                      disabled={wSubmitting}
                      className="flex-1 rounded-full bg-emerald-500 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                    >
                      {wSubmitting ? "Submitting…" : "Submit Request"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowWithdraw(false); resetWithdrawForm(); }}
                      className="flex-1 rounded-full border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
