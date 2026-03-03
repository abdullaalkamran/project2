export const metadata = {
  title: "Watchlist | Buyer | Paikari",
  description: "Lots you are watching for price alerts.",
};

const savedLots = [
  { id: "LOT-2026-041", title: "Premium Basmati Rice — 5,000 kg", seller: "Rahim Agro", startBid: "৳ 3,20,000", starts: "Feb 22, 2026 10:00 AM", status: "Upcoming" },
  { id: "LOT-2026-038", title: "Mustard Oil — 1,000 L", seller: "Karim Traders", startBid: "৳ 1,10,000", starts: "Feb 21, 2026 2:00 PM", status: "Live" },
  { id: "LOT-2026-035", title: "Organic Turmeric — 500 kg", seller: "Spice Hub", startBid: "৳ 45,000", starts: "Feb 23, 2026 9:00 AM", status: "Upcoming" },
  { id: "LOT-2026-031", title: "Branded Polo Shirts — 300 pcs", seller: "Sumon Fashions", startBid: "৳ 36,000", starts: "Feb 20, 2026 4:00 PM", status: "Live" },
];

const followedSellers = [
  { name: "Rahim Agro", activeLots: 3, joined: "Jan 2025", rating: "4.8" },
  { name: "Karim Traders", activeLots: 1, joined: "Mar 2024", rating: "4.6" },
  { name: "Pure Oil Co.", activeLots: 0, joined: "Jun 2024", rating: "4.9" },
];

const statusColors: Record<string, string> = {
  Live: "bg-emerald-50 text-emerald-700",
  Upcoming: "bg-blue-50 text-blue-700",
  Ended: "bg-slate-100 text-slate-500",
};

export default function WatchlistPage() {
  return (
    <div className="space-y-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Watchlist &amp; Saved</h1>
        <p className="text-slate-500">Saved lots and sellers you follow.</p>
      </div>

      {/* Saved Lots */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Saved Lots</h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full min-w-[580px] text-sm">
            <thead className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3 text-left">Lot</th>
                <th className="px-5 py-3 text-left">Seller</th>
                <th className="px-5 py-3 text-left">Starting Bid</th>
                <th className="px-5 py-3 text-left">Starts</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {savedLots.map((lot) => (
                <tr key={lot.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-medium text-slate-900">{lot.title}</td>
                  <td className="px-5 py-4 text-slate-500">{lot.seller}</td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{lot.startBid}</td>
                  <td className="px-5 py-4 text-slate-500">{lot.starts}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[lot.status]}`}>{lot.status}</span>
                  </td>
                  <td className="px-5 py-4">
                    <button type="button" className="text-xs font-semibold text-red-500 hover:text-red-700">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Followed Sellers */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Followed Sellers</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {followedSellers.map((s) => (
            <div key={s.name} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{s.name}</p>
                  <p className="mt-0.5 text-xs text-slate-400">Joined {s.joined} · ★ {s.rating}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${s.activeLots > 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                  {s.activeLots} active lot{s.activeLots !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="mt-4 flex gap-2">
                <button type="button" className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">View Lots</button>
                <button type="button" className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50">Unfollow</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
