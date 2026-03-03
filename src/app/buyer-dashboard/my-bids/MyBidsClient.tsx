"use client";

import Link from "next/link";
import { useState } from "react";

const tabs = ["Active", "Won", "Lost"];

const bids = {
  Active: [
    { lot: "Premium Basmati Rice — 2,000 kg", seller: "Rahim Agro", currentBid: "৳ 1,40,000", yourBid: "৳ 1,40,000", status: "Winning", ends: "2h 14m", autoBid: "৳ 1,60,000" },
    { lot: "Refined Mustard Oil — 500 L", seller: "Karim Traders", currentBid: "৳ 62,500", yourBid: "৳ 60,000", status: "Outbid", ends: "45m", autoBid: "—" },
    { lot: "Branded T-shirts — 200 pcs", seller: "Sumon Fashions", currentBid: "৳ 28,000", yourBid: "৳ 28,000", status: "Winning", ends: "5h 30m", autoBid: "৳ 35,000" },
    { lot: "Fresh Potatoes — 5,000 kg", seller: "Dhaka Farms", currentBid: "৳ 37,500", yourBid: "৳ 35,000", status: "Outbid", ends: "1h 05m", autoBid: "—" },
  ],
  Won: [
    { lot: "Wheat Flour — 3,000 kg", seller: "Alam Mills", finalBid: "৳ 96,000", date: "Feb 18, 2026", orderStatus: "In Transit" },
    { lot: "Soybean Oil — 1,000 L", seller: "Pure Oil Co.", finalBid: "৳ 1,15,000", date: "Feb 14, 2026", orderStatus: "Delivered" },
    { lot: "Cotton Saree — 100 pcs", seller: "Weave House", finalBid: "৳ 42,000", date: "Feb 19, 2026", orderStatus: "Pending Payment" },
  ],
  Lost: [
    { lot: "Jasmine Rice — 1,000 kg", seller: "Rice Republic", yourBid: "৳ 72,000", winningBid: "৳ 78,500", date: "Feb 12, 2026" },
    { lot: "Coconut Oil — 300 L", seller: "Tropical Goods", yourBid: "৳ 31,000", winningBid: "৳ 33,000", date: "Feb 08, 2026" },
  ],
};

const statusColors: Record<string, string> = {
  Winning: "bg-emerald-50 text-emerald-700",
  Outbid: "bg-red-50 text-red-600",
  "In Transit": "bg-blue-50 text-blue-700",
  Delivered: "bg-emerald-50 text-emerald-700",
  "Pending Payment": "bg-orange-50 text-orange-600",
};

export default function MyBidsPage() {
  const [tab, setTab] = useState("Active");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">My Bids</h1>
          <p className="text-slate-500">Manage your active, won, and lost auction bids.</p>
        </div>
        <Link
          href="/buyer-dashboard/my-bids/auto-bid"
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Auto-bid Settings
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-100 bg-slate-50 p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${
              tab === t ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Active Bids */}
      {tab === "Active" && (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3 text-left">Lot</th>
                <th className="px-5 py-3 text-left">Seller</th>
                <th className="px-5 py-3 text-left">Current Bid</th>
                <th className="px-5 py-3 text-left">Your Bid</th>
                <th className="px-5 py-3 text-left">Auto-bid Limit</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Ends In</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {bids.Active.map((b, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-medium text-slate-900">{b.lot}</td>
                  <td className="px-5 py-4 text-slate-500">{b.seller}</td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{b.currentBid}</td>
                  <td className="px-5 py-4 text-slate-700">{b.yourBid}</td>
                  <td className="px-5 py-4 text-slate-500">{b.autoBid}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[b.status]}`}>{b.status}</span>
                  </td>
                  <td className="px-5 py-4 text-slate-500">{b.ends}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Won Bids */}
      {tab === "Won" && (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3 text-left">Lot</th>
                <th className="px-5 py-3 text-left">Seller</th>
                <th className="px-5 py-3 text-left">Final Bid</th>
                <th className="px-5 py-3 text-left">Date Won</th>
                <th className="px-5 py-3 text-left">Order Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {bids.Won.map((b, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-medium text-slate-900">{b.lot}</td>
                  <td className="px-5 py-4 text-slate-500">{b.seller}</td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{b.finalBid}</td>
                  <td className="px-5 py-4 text-slate-500">{b.date}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[b.orderStatus]}`}>{b.orderStatus}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Lost Bids */}
      {tab === "Lost" && (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3 text-left">Lot</th>
                <th className="px-5 py-3 text-left">Seller</th>
                <th className="px-5 py-3 text-left">Your Bid</th>
                <th className="px-5 py-3 text-left">Winning Bid</th>
                <th className="px-5 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {bids.Lost.map((b, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-medium text-slate-900">{b.lot}</td>
                  <td className="px-5 py-4 text-slate-500">{b.seller}</td>
                  <td className="px-5 py-4 text-red-600 font-semibold">{b.yourBid}</td>
                  <td className="px-5 py-4 text-emerald-700 font-semibold">{b.winningBid}</td>
                  <td className="px-5 py-4 text-slate-500">{b.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
