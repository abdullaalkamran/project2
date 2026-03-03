export default function DeliveryHubPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Delivery Hub Overview</h1>
        <p className="text-slate-500 mt-1">Manage incoming shipments, distribution, and fleet operations.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Incoming Shipments", value: "0", color: "bg-blue-50 text-blue-700" },
          { label: "Active Distributors", value: "0", color: "bg-emerald-50 text-emerald-700" },
          { label: "Dispatched Today", value: "0", color: "bg-amber-50 text-amber-700" },
          { label: "Vehicles Active", value: "0", color: "bg-purple-50 text-purple-700" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className={`mt-2 text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <p className="text-slate-500 text-sm">No recent activity. Incoming shipments will appear here.</p>
      </div>
    </div>
  );
}
