export const metadata = {
  title: "Reports | Hub | Paikari",
  description: "Hub operational reports and analytics.",
};

const weeks = [
  { week: "Jun 30 – Jul 6", received: 8, qcPassed: 6, qcFailed: 1, dispatched: 6 },
  { week: "Jul 7 – Jul 9", received: 5, qcPassed: 2, qcFailed: 0, dispatched: 2 },
];

export default function HubReportsPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Hub Reports</h1>
        <p className="text-slate-500">Weekly activity summary for this hub.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Received (July)", value: "13", color: "text-slate-900" },
          { label: "QC Passed", value: "8", color: "text-emerald-600" },
          { label: "QC Failed", value: "1", color: "text-red-500" },
          { label: "Dispatched", value: "8", color: "text-amber-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-x-auto">
        <div className="px-5 py-4 border-b border-slate-100 font-semibold text-slate-800">Weekly Breakdown</div>
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {["Period", "Received", "QC Passed", "QC Failed", "Dispatched"].map((h) => (
                <th key={h} className="px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {weeks.map((w) => (
              <tr key={w.week} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-700">{w.week}</td>
                <td className="px-4 py-3 text-slate-600">{w.received}</td>
                <td className="px-4 py-3 text-emerald-700">{w.qcPassed}</td>
                <td className="px-4 py-3 text-red-500">{w.qcFailed}</td>
                <td className="px-4 py-3 text-amber-600">{w.dispatched}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
