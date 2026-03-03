export const metadata = {
  title: "QC Reports | QC Leader | Paikari",
  description: "Compiled quality control reports.",
};

export default function QCLeaderReportsPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">QC Reports</h1>
        <p className="text-slate-500">Inspection statistics for this hub.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Inspections", value: "43", color: "text-slate-900" },
          { label: "Passed", value: "38", color: "text-emerald-600" },
          { label: "Rejected", value: "2", color: "text-red-500" },
          { label: "Avg. Grade", value: "B+", color: "text-teal-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-x-auto">
        <div className="px-5 py-4 border-b border-slate-100 font-semibold text-slate-800">Grade Distribution</div>
        <div className="p-5 grid gap-3">
          {[
            { grade: "A", count: 18, pct: 42 },
            { grade: "B", count: 14, pct: 33 },
            { grade: "C", count: 6, pct: 14 },
            { grade: "D", count: 3, pct: 7 },
            { grade: "F", count: 2, pct: 5 },
          ].map((g) => (
            <div key={g.grade} className="flex items-center gap-3">
              <span className="w-6 text-sm font-bold text-slate-700">{g.grade}</span>
              <div className="flex-1 rounded-full bg-slate-100 h-3 overflow-hidden">
                <div className="h-3 rounded-full bg-teal-500" style={{ width: `${g.pct}%` }} />
              </div>
              <span className="text-xs text-slate-500 w-12 text-right">{g.count} lots ({g.pct}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
