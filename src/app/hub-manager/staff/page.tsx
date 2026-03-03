export const metadata = {
  title: "Staff | Hub | Paikari",
  description: "Manage hub staff members.",
};

const staff = [
  { name: "Rina Begum", role: "QC Leader", phone: "017xxxxxxxx", status: "Active", lotsHandled: 14 },
  { name: "Mamun Hossain", role: "QC Checker", phone: "018xxxxxxxx", status: "Active", lotsHandled: 9 },
  { name: "Sadia Islam", role: "QC Checker", phone: "019xxxxxxxx", status: "Active", lotsHandled: 11 },
  { name: "Farhan Ahmed", role: "QC Checker", phone: "017xxxxxxxx", status: "On Leave", lotsHandled: 6 },
  { name: "Kamal Das", role: "Delivery Staff", phone: "018xxxxxxxx", status: "Active", lotsHandled: 20 },
];

const roleColors: Record<string, string> = {
  "QC Leader": "bg-teal-50 text-teal-700",
  "QC Checker": "bg-sky-50 text-sky-700",
  "Delivery Staff": "bg-blue-50 text-blue-700",
};
const statusColors: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-700",
  "On Leave": "bg-orange-50 text-orange-700",
};

export default function HubStaffPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Hub Staff</h1>
          <p className="text-slate-500">All staff assigned to this hub.</p>
        </div>
        <button type="button" className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600">
          + Add Staff
        </button>
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {["Name", "Role", "Phone", "Lots Handled", "Status", "Action"].map((h) => (
                <th key={h} className="px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {staff.map((s) => (
              <tr key={s.name} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${roleColors[s.role]}`}>{s.role}</span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{s.phone}</td>
                <td className="px-4 py-3 text-slate-700">{s.lotsHandled}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[s.status]}`}>{s.status}</span>
                </td>
                <td className="px-4 py-3">
                  <button type="button" className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
