export const metadata = {
  title: "QC Leader Overview | Paikari",
  description: "Overview of quality control operations.",
};

import Link from "next/link";

const stats = [
  { label: "Pending Tasks", value: "8", sub: "Awaiting assignment", href: "/qc-leader/tasks", color: "text-teal-700", bg: "bg-teal-50" },
  { label: "Pending Approvals", value: "5", sub: "Reports to review", href: "/qc-leader/approvals", color: "text-orange-600", bg: "bg-orange-50" },
  { label: "Passed Today", value: "6", sub: "Lots approved", href: "/qc-leader/tasks", color: "text-emerald-700", bg: "bg-emerald-50" },
  { label: "Rejected Today", value: "2", sub: "Lots held", href: "/qc-leader/rejected", color: "text-red-600", bg: "bg-red-50" },
];

const pendingApprovals = [
  { reportId: "QCR-091", lot: "Rice — 5,000 kg", checker: "Reza Islam", submitted: "Feb 20, 2026 10:15 AM", grade: "A", verdict: "Pass" },
  { reportId: "QCR-090", lot: "Mustard Oil — 1,000 L", checker: "Fatima Begum", submitted: "Feb 20, 2026 9:40 AM", grade: "B", verdict: "Pass" },
  { reportId: "QCR-089", lot: "Turmeric — 500 kg", checker: "Reza Islam", submitted: "Feb 19, 2026 5:00 PM", grade: "C", verdict: "Fail" },
];

const verdictColors: Record<string, string> = {
  Pass: "bg-emerald-50 text-emerald-700",
  Fail: "bg-red-50 text-red-600",
  Pending: "bg-orange-50 text-orange-600",
};

export default function QCLeaderOverviewPage() {
  return (
    <div className="space-y-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">QC Team Leader Overview</h1>
        <p className="text-slate-500">Inspection pipeline at Dhaka Central Hub.</p>
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
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Reports Awaiting Approval</h2>
          <Link href="/qc-leader/approvals" className="text-xs font-semibold text-teal-700 hover:underline">View all →</Link>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3 text-left">Report ID</th>
                <th className="px-5 py-3 text-left">Lot</th>
                <th className="px-5 py-3 text-left">Checker</th>
                <th className="px-5 py-3 text-left">Submitted</th>
                <th className="px-5 py-3 text-left">Grade</th>
                <th className="px-5 py-3 text-left">Verdict</th>
                <th className="px-5 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pendingApprovals.map((r) => (
                <tr key={r.reportId} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-mono text-xs text-slate-500">{r.reportId}</td>
                  <td className="px-5 py-4 font-medium text-slate-900">{r.lot}</td>
                  <td className="px-5 py-4 text-slate-500">{r.checker}</td>
                  <td className="px-5 py-4 text-slate-500">{r.submitted}</td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{r.grade}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${verdictColors[r.verdict]}`}>{r.verdict}</span>
                  </td>
                  <td className="px-5 py-4">
                    <Link href="/qc-leader/approvals" className="text-xs font-semibold text-teal-700 hover:underline">Review</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
