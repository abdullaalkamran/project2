"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { walletDepositSchema, WalletDepositFormData } from "@/lib/schemas";

const transactions = [
  { id: "TXN-0041", type: "Deposit", amount: "+৳ 20,000", method: "bKash", date: "Feb 19, 2026", status: "Completed" },
  { id: "TXN-0040", type: "Payment", amount: "-৳ 96,000", method: "Wallet", date: "Feb 18, 2026", status: "Completed" },
  { id: "TXN-0039", type: "Payment", amount: "-৳ 1,15,000", method: "Wallet", date: "Feb 14, 2026", status: "Completed" },
  { id: "TXN-0038", type: "Deposit", amount: "+৳ 1,50,000", method: "Bank Transfer", date: "Feb 12, 2026", status: "Completed" },
  { id: "TXN-0037", type: "Refund", amount: "+৳ 8,000", method: "Wallet", date: "Feb 09, 2026", status: "Completed" },
  { id: "TXN-0036", type: "Payment", amount: "-৳ 42,000", method: "Wallet", date: "Feb 07, 2026", status: "Pending" },
];

const statusColors: Record<string, string> = {
  Completed: "bg-emerald-50 text-emerald-700",
  Pending: "bg-yellow-50 text-yellow-700",
  Failed: "bg-red-50 text-red-600",
};

export default function PaymentsPage() {
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WalletDepositFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(walletDepositSchema) as any,
    defaultValues: { method: "MOBILE_BANKING" },
  });

  const watchedAmount = watch("amount");
  const watchedMethod = watch("method");

  const onDeposit = async (data: WalletDepositFormData) => {
    await new Promise((r) => setTimeout(r, 600));
    toast.success(`Deposit of ৳ ${data.amount.toLocaleString()} submitted`);
    setDepositSuccess(true);
  };

  const openDeposit = () => { reset(); setDepositSuccess(false); setDepositOpen(true); };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Payments &amp; Wallet</h1>
          <p className="text-slate-500">Manage your balance, deposits, and payment history.</p>
        </div>
        <button
          type="button"
          onClick={() => openDeposit()}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        >
          + Deposit Funds
        </button>
      </div>

      {/* Wallet summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Wallet Balance", value: "৳ 12,500", color: "text-emerald-700", bg: "bg-emerald-50" },
          { label: "Total Deposited", value: "৳ 1,70,000", color: "text-blue-700", bg: "bg-blue-50" },
          { label: "Total Spent", value: "৳ 2,53,000", color: "text-slate-700", bg: "bg-slate-50" },
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
          <table className="w-full min-w-[520px] text-sm">
            <thead className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3 text-left">ID</th>
                <th className="px-5 py-3 text-left">Type</th>
                <th className="px-5 py-3 text-left">Amount</th>
                <th className="px-5 py-3 text-left">Method</th>
                <th className="px-5 py-3 text-left">Date</th>
                <th className="px-5 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-mono text-xs text-slate-500">{t.id}</td>
                  <td className="px-5 py-4 font-medium text-slate-900">{t.type}</td>
                  <td className={`px-5 py-4 font-semibold ${t.amount.startsWith("+") ? "text-emerald-700" : "text-slate-900"}`}>{t.amount}</td>
                  <td className="px-5 py-4 text-slate-500">{t.method}</td>
                  <td className="px-5 py-4 text-slate-500">{t.date}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[t.status]}`}>{t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deposit Modal */}
      {depositOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-xl">
            {depositSuccess ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">✓</div>
                <h3 className="text-lg font-bold text-slate-900">Deposit Requested</h3>
                <p className="text-sm text-slate-500">Your deposit of <strong>৳ {watchedAmount?.toLocaleString()}</strong> via <strong>{watchedMethod}</strong> has been submitted and will be credited shortly.</p>
                <button type="button" onClick={() => setDepositOpen(false)} className="mt-2 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Close</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onDeposit)} className="space-y-5">
                <h3 className="text-lg font-bold text-slate-900">Deposit Funds</h3>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Amount (৳)</label>
                  <input
                    type="number"
                    {...register("amount")}
                    placeholder="Minimum ৳ 100"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                  {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Method</label>
                  <select {...register("method")} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100">
                    <option value="MOBILE_BANKING">Mobile Banking (bKash / Nagad)</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CARD">Card</option>
                  </select>
                  {errors.method && <p className="text-xs text-red-500">{errors.method.message}</p>}
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setDepositOpen(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                    {isSubmitting ? "Submitting…" : "Submit"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
