export const metadata = {
  title: "Delivery Point Overview | Paikari",
  description: "Overview of your delivery point operations.",
};

import Link from "next/link";

const stats = [
  { label: "Incoming Today", value: "4", sub: "En route to this point", href: "/delivery-point/incoming", color: "text-blue-700", bg: "bg-blue-50" },
  { label: "At Point", value: "7", sub: "Ready for pickup", href: "/delivery-point/arrivals", color: "text-emerald-700", bg: "bg-emerald-50" },
  { label: "Pending Pickup", value: "3", sub: "Buyer not yet collected", href: "/delivery-point/pickup", color: "text-orange-600", bg: "bg-orange-50" },
  { label: "Pickup Completed", value: "2", sub: "Collected from delivery point", href: "/delivery-point/pickup", color: "text-purple-700", bg: "bg-purple-50" },
];

const orders = [
  { orderId: "ORD-2026-009", buyer: "Karim Traders", lot: "Wheat Flour — 3,000 kg", status: "En Route", eta: "Feb 20, 4:00 PM" },
  { orderId: "ORD-2026-008", buyer: "Mizan Foods", lot: "Soybean Oil — 1,000 L", status: "At Point", eta: "Arrived" },
  { orderId: "ORD-2026-007", buyer: "Ahmed Wholesale", lot: "Cotton Saree — 100 pcs", status: "Pending Pickup", eta: "Arrived Feb 19" },
  { orderId: "ORD-2026-005", buyer: "Alam Traders", lot: "Refined Oil — 500 L", status: "Picked Up", eta: "Collected Feb 19" },
];

const statusColors: Record<string, string> = {
  "En Route": "bg-blue-50 text-blue-700",
  "At Point": "bg-emerald-50 text-emerald-700",
  "Pending Pickup": "bg-orange-50 text-orange-600",
  "Picked Up": "bg-purple-50 text-purple-700",
};

export default function DeliveryPointOverviewPage() {
  return (
    <div className="space-y-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Delivery Point Overview</h1>
        <p className="text-slate-500">Mirpur-10 Delivery Point — today&apos;s handover status.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}
            className={`rounded-2xl border border-slate-100 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${s.bg}`}>
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-1 text-xs text-slate-400">{s.sub}</p>
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Live Order Board</h2>
          <Link href="/delivery-point/incoming" className="text-xs font-semibold text-blue-700 hover:underline">View all →</Link>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3 text-left">Order ID</th>
                <th className="px-5 py-3 text-left">Buyer</th>
                <th className="px-5 py-3 text-left">Lot</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">ETA / Info</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orders.map((o) => (
                <tr key={o.orderId} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-mono text-xs text-slate-500">{o.orderId}</td>
                  <td className="px-5 py-4 text-slate-700">{o.buyer}</td>
                  <td className="px-5 py-4 font-medium text-slate-900">{o.lot}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[o.status]}`}>{o.status}</span>
                  </td>
                  <td className="px-5 py-4 text-slate-500">{o.eta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
