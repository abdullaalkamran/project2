"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  reference: string | null;
  createdAt: string;
}

interface OrderPayment {
  id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  createdAt: string;
}

interface WalletData {
  balance: number;
  totalDeposited: number;
  totalSpent: number;
  transactions: WalletTransaction[];
  orderPayments: OrderPayment[];
}

type UnifiedEntry = {
  id: string;
  type: string;
  amount: number;
  description: string;
  isCredit: boolean;
  date: string;
  status: string;
};

const fmt = (n: number) =>
  "৳ " + Math.round(n).toLocaleString("en-IN");

const METHODS = [
  { value: "bKash", label: "bKash" },
  { value: "Nagad", label: "Nagad" },
  { value: "Bank Transfer", label: "Bank Transfer" },
  { value: "Card", label: "Card" },
];

export default function PaymentsPage() {
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

  const [depositOpen, setDepositOpen] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bKash");
  const [accountDetails, setAccountDetails] = useState("");
  const [amountError, setAmountError] = useState("");

  const fetchWallet = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/buyer-dashboard/wallet");
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error("Failed to load wallet data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWallet(); }, [fetchWallet]);

  const openDeposit = () => {
    setAmount("");
    setMethod("bKash");
    setAccountDetails("");
    setAmountError("");
    setDepositSuccess(false);
    setDepositOpen(true);
  };

  const handleDeposit = async () => {
    const num = Number(amount);
    if (!amount || isNaN(num) || num < 100) {
      setAmountError("Minimum deposit is ৳ 100");
      return;
    }
    if (num > 1_000_000) {
      setAmountError("Maximum deposit is ৳ 10,00,000");
      return;
    }
    setAmountError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/buyer-dashboard/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: num, method, accountDetails: accountDetails || undefined }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.message || "Deposit failed"); return; }
      setDepositSuccess(true);
      await fetchWallet();
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  // Merge & sort transactions
  const unified: UnifiedEntry[] = data
    ? [
        ...data.transactions.map((t) => ({
          id: t.id.slice(-8).toUpperCase(),
          type: t.type === "DEPOSIT" ? "Deposit" : t.type === "REFUND" ? "Refund" : "Wallet",
          amount: t.amount,
          description: t.description ?? "",
          isCredit: t.type !== "PAYMENT",
          date: new Date(t.createdAt).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" }),
          status: "Completed",
        })),
        ...data.orderPayments.map((o) => ({
          id: o.id,
          type: "Payment",
          amount: o.amount,
          description: o.description,
          isCredit: false,
          date: new Date(o.createdAt).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" }),
          status: o.status,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Payments &amp; Wallet</h1>
          <p className="text-slate-500">Manage your balance, deposits, and payment history.</p>
        </div>
        <button
          type="button"
          onClick={openDeposit}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        >
          + Deposit Funds
        </button>
      </div>

      {/* Wallet summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Wallet Balance", value: loading ? "—" : fmt(data?.balance ?? 0), color: "text-emerald-700", bg: "bg-emerald-50" },
          { label: "Total Deposited", value: loading ? "—" : fmt(data?.totalDeposited ?? 0), color: "text-blue-700", bg: "bg-blue-50" },
          { label: "Total Spent", value: loading ? "—" : fmt(data?.totalSpent ?? 0), color: "text-slate-700", bg: "bg-slate-50" },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border border-slate-100 p-5 shadow-sm ${s.bg}`}>
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Transaction history */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Transaction History</h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400">Loading…</div>
          ) : unified.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">No transactions yet.</div>
          ) : (
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3 text-left">ID</th>
                  <th className="px-5 py-3 text-left">Type</th>
                  <th className="px-5 py-3 text-left">Amount</th>
                  <th className="px-5 py-3 text-left">Description</th>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {unified.map((t, i) => (
                  <tr key={`${t.id}-${i}`} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-mono text-xs text-slate-500">{t.id}</td>
                    <td className="px-5 py-4 font-medium text-slate-900">{t.type}</td>
                    <td className={`px-5 py-4 font-semibold ${t.isCredit ? "text-emerald-700" : "text-slate-900"}`}>
                      {t.isCredit ? "+" : "-"}{fmt(t.amount)}
                    </td>
                    <td className="px-5 py-4 text-slate-500 max-w-[180px] truncate">{t.description || "—"}</td>
                    <td className="px-5 py-4 text-slate-500">{t.date}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        t.status === "Completed" ? "bg-emerald-50 text-emerald-700" :
                        t.status === "Pending" ? "bg-yellow-50 text-yellow-700" :
                        "bg-red-50 text-red-600"
                      }`}>{t.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Deposit Modal */}
      {depositOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-xl">
            {depositSuccess ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">✓</div>
                <h3 className="text-lg font-bold text-slate-900">Deposit Successful</h3>
                <p className="text-sm text-slate-500">
                  <strong>{fmt(Number(amount))}</strong> via <strong>{method}</strong> has been credited to your wallet.
                </p>
                <button type="button" onClick={() => setDepositOpen(false)} className="mt-2 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <h3 className="text-lg font-bold text-slate-900">Deposit Funds</h3>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Amount (৳)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setAmountError(""); }}
                    placeholder="Minimum ৳ 100"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                  {amountError && <p className="text-xs text-red-500">{amountError}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Method</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  >
                    {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Account / Reference (optional)</label>
                  <input
                    type="text"
                    value={accountDetails}
                    onChange={(e) => setAccountDetails(e.target.value)}
                    placeholder="e.g. 017XXXXXXXX"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setDepositOpen(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Cancel
                  </button>
                  <button type="button" onClick={handleDeposit} disabled={submitting} className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                    {submitting ? "Processing…" : "Deposit"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
