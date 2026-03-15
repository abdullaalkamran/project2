"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { walletDepositSchema, type WalletDepositFormData } from "@/lib/schemas";
import api from "@/lib/api";

type BuyerStat = {
  label: string;
  value: string;
  sub: string;
  href: string;
  color: string;
  bg: string;
};

type BuyerActiveBid = {
  lot: string;
  currentBid: string;
  yourBid: string;
  status: string;
  ends: string;
};

type BuyerOrder = {
  id: string;
  lot: string;
  qty: string;
  freeQty: number;
  amount: string;
  status: string;
  date: string;
};

type BuyerOverviewResponse = {
  stats: BuyerStat[];
  activeBids: BuyerActiveBid[];
  recentOrders: BuyerOrder[];
};

const statusColors: Record<string, string> = {
  Winning: "bg-emerald-50 text-emerald-700",
  Outbid: "bg-red-50 text-red-600",
  "In Transit": "bg-blue-50 text-blue-700",
  Delivered: "bg-emerald-50 text-emerald-700",
  "Pending Payment": "bg-orange-50 text-orange-600",
};

export default function BuyerOverviewPage() {
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState(false);
  const [stats, setStats] = useState<BuyerStat[]>([]);
  const [activeBids, setActiveBids] = useState<BuyerActiveBid[]>([]);
  const [recentOrders, setRecentOrders] = useState<BuyerOrder[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<BuyerOverviewResponse>("/api/buyer-dashboard/overview");
        setStats(res.stats ?? []);
        setActiveBids(res.activeBids ?? []);
        setRecentOrders(res.recentOrders ?? []);
      } catch {
        setStats([]);
        setActiveBids([]);
        setRecentOrders([]);
      }
    };
    void load();
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<WalletDepositFormData>({
    resolver: zodResolver(walletDepositSchema) as any,
    defaultValues: { amount: undefined, method: "MOBILE_BANKING" },
  });

  const depositAmt = watch("amount");
  const depositMethod = watch("method");

  const onDeposit = async (data: WalletDepositFormData) => {
    try {
      const methodMap: Record<string, string> = {
        MOBILE_BANKING: "bKash / Nagad",
        BANK_TRANSFER: "Bank Transfer",
        CARD: "Card",
      };
      const res = await fetch("/api/buyer-dashboard/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: data.amount, method: methodMap[data.method] ?? data.method }),
      });
      const json = await res.json();
      if (!res.ok) {
        console.error("Deposit failed:", json.message);
        return;
      }
      setDepositSuccess(true);
    } catch {
      console.error("Deposit network error");
    }
  };

  const openDeposit = () => {
    reset();
    setDepositSuccess(false);
    setDepositOpen(true);
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Buyer Overview</h1>
          <p className="text-slate-500">Track your bids, orders, and wallet at a glance.</p>
        </div>
        <button
          type="button"
          onClick={openDeposit}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        >
          + Deposit Funds
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className={`rounded-2xl border border-slate-100 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${s.bg}`}
          >
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-1 text-xs text-slate-400">{s.sub}</p>
          </Link>
        ))}
      </div>

      {/* Active Bids */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Active Bids</h2>
          <Link href="/buyer-dashboard/my-bids" className="text-xs font-semibold text-emerald-700 hover:underline">View all →</Link>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full min-w-[540px] text-sm">
            <thead className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3 text-left">Lot</th>
                <th className="px-5 py-3 text-left">Current Bid</th>
                <th className="px-5 py-3 text-left">Your Bid</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Ends In</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {activeBids.map((b, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-medium text-slate-900">{b.lot}</td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{b.currentBid}</td>
                  <td className="px-5 py-4 text-slate-600">{b.yourBid}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[b.status]}`}>{b.status}</span>
                  </td>
                  <td className="px-5 py-4 text-slate-500">{b.ends}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Recent Orders</h2>
          <Link href="/buyer-dashboard/orders" className="text-xs font-semibold text-emerald-700 hover:underline">View all →</Link>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3 text-left">Order ID</th>
                <th className="px-5 py-3 text-left">Lot</th>
                <th className="px-5 py-3 text-left">Qty</th>
                <th className="px-5 py-3 text-left">Amount</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentOrders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-mono text-xs text-slate-500">{o.id}</td>
                  <td className="px-5 py-4 font-medium text-slate-900">{o.lot}</td>
                  <td className="px-5 py-4 text-slate-700">
                    {o.qty}
                    {o.freeQty > 0 && (
                      <span className="ml-1.5 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        +{o.freeQty} free
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{o.amount}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[o.status]}`}>{o.status}</span>
                  </td>
                  <td className="px-5 py-4 text-slate-500">{o.date}</td>
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
                <p className="text-sm text-slate-500">Your deposit of <strong>৳ {depositAmt}</strong> via <strong>{depositMethod}</strong> has been submitted and will be credited shortly.</p>
                <button
                  type="button"
                  onClick={() => setDepositOpen(false)}
                  className="mt-2 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onDeposit)} className="space-y-5">
                <h3 className="text-lg font-bold text-slate-900">Deposit Funds</h3>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Amount (৳) *</label>
                  <input
                    type="number"
                    placeholder="Minimum ৳ 100"
                    {...register("amount")}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                  {errors.amount && (
                    <p className="text-xs text-rose-500">{errors.amount.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Method *</label>
                  <select
                    {...register("method")}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="MOBILE_BANKING">bKash / Nagad</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CARD">Card</option>
                  </select>
                  {errors.method && (
                    <p className="text-xs text-rose-500">{errors.method.message}</p>
                  )}
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setDepositOpen(false)}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Submit
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
