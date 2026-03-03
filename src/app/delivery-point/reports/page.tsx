export const metadata = {
  title: "Reports | Delivery | Paikari",
  description: "Delivery point activity and performance reports.",
};

const daily = [
  { date: "Jul 9", arrived: 3, pickedUp: 1, courierHandover: 0, pending: 2 },
  { date: "Jul 8", arrived: 2, pickedUp: 2, courierHandover: 1, pending: 0 },
  { date: "Jul 7", arrived: 4, pickedUp: 3, courierHandover: 1, pending: 0 },
  { date: "Jul 6", arrived: 2, pickedUp: 1, courierHandover: 1, pending: 0 },
];

export default function DPReportsPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Delivery Reports</h1>
        <p className="text-slate-500">Daily statistics for this delivery point.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Orders This Week", value: "11", color: "text-slate-900" },
          { label: "Picked Up", value: "7", color: "text-emerald-600" },
          { label: "Courier Handled", value: "3", color: "text-blue-600" },
          { label: "Pending", value: "2", color: "text-amber-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-x-auto">
        <div className="px-5 py-4 border-b border-slate-100 font-semibold text-slate-800">Daily Breakdown</div>
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {["Date", "Arrived", "Picked Up", "Courier Handover", "Pending"].map((h) => (
                <th key={h} className="px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {daily.map((d) => (
              <tr key={d.date} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-700">{d.date}</td>
                <td className="px-4 py-3 text-slate-600">{d.arrived}</td>
                <td className="px-4 py-3 text-emerald-600">{d.pickedUp}</td>
                <td className="px-4 py-3 text-blue-600">{d.courierHandover}</td>
                <td className="px-4 py-3 text-amber-600">{d.pending}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
