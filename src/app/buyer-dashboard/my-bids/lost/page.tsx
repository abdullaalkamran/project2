export const metadata = {
  title: "Lost Bids | Buyer | Paikari",
  description: "View auctions you did not win.",
};

import Link from "next/link";

const lostBids = [
  { lot: "Jasmine Rice — 1,000 kg", seller: "Rice Republic", yourBid: "৳ 72,000", winningBid: "৳ 78,500", date: "Feb 12, 2026" },
  { lot: "Coconut Oil — 300 L", seller: "Tropical Goods", yourBid: "৳ 31,000", winningBid: "৳ 33,000", date: "Feb 08, 2026" },
  { lot: "Premium Saree — 50 pcs", seller: "Weave House", yourBid: "৳ 24,000", winningBid: "৳ 25,500", date: "Feb 05, 2026" },
];

export default function LostBidsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/buyer-dashboard/my-bids" className="text-sm font-semibold text-slate-400 hover:text-slate-600">← My Bids</Link>
        <span className="text-slate-200">/</span>
        <h1 className="text-2xl font-bold text-slate-900">Lost Bids</h1>
      </div>

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
            {lostBids.map((b, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-5 py-4 font-medium text-slate-900">{b.lot}</td>
                <td className="px-5 py-4 text-slate-500">{b.seller}</td>
                <td className="px-5 py-4 font-semibold text-red-600">{b.yourBid}</td>
                <td className="px-5 py-4 font-semibold text-emerald-700">{b.winningBid}</td>
                <td className="px-5 py-4 text-slate-500">{b.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
