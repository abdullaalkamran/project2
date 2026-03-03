export const metadata = {
  title: "Won Auctions | Buyer | Paikari",
  description: "View auctions you have won.",
};

import Link from "next/link";

const wonBids = [
  { orderId: "ORD-2026-009", lot: "Wheat Flour — 3,000 kg", seller: "Alam Mills", finalBid: "৳ 96,000", date: "Feb 18, 2026", orderStatus: "In Transit" },
  { orderId: "ORD-2026-008", lot: "Soybean Oil — 1,000 L", seller: "Pure Oil Co.", finalBid: "৳ 1,15,000", date: "Feb 14, 2026", orderStatus: "Delivered" },
  { orderId: "ORD-2026-007", lot: "Cotton Saree — 100 pcs", seller: "Weave House", finalBid: "৳ 42,000", date: "Feb 19, 2026", orderStatus: "Pending Payment" },
  { orderId: "ORD-2026-006", lot: "Jasmine Rice — 2,000 kg", seller: "Rice Republic", finalBid: "৳ 1,56,000", date: "Feb 10, 2026", orderStatus: "Delivered" },
];

const statusColors: Record<string, string> = {
  "In Transit": "bg-blue-50 text-blue-700",
  Delivered: "bg-emerald-50 text-emerald-700",
  "Pending Payment": "bg-orange-50 text-orange-600",
};

export default function WonBidsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/buyer-dashboard/my-bids" className="text-sm font-semibold text-slate-400 hover:text-slate-600">← My Bids</Link>
        <span className="text-slate-200">/</span>
        <h1 className="text-2xl font-bold text-slate-900">Won Bids</h1>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-5 py-3 text-left">Order ID</th>
              <th className="px-5 py-3 text-left">Lot</th>
              <th className="px-5 py-3 text-left">Seller</th>
              <th className="px-5 py-3 text-left">Final Bid</th>
              <th className="px-5 py-3 text-left">Date Won</th>
              <th className="px-5 py-3 text-left">Order Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {wonBids.map((b) => (
              <tr key={b.orderId} className="hover:bg-slate-50">
                <td className="px-5 py-4 font-mono text-xs text-slate-500">{b.orderId}</td>
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
    </div>
  );
}
