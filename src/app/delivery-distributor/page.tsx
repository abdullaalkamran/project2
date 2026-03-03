export default function DeliveryDistributorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Distributor Overview</h1>
        <p className="text-slate-500 mt-1">View your assigned orders and manage deliveries.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Assigned Orders", value: "0", color: "bg-violet-50 text-violet-700" },
          { label: "Active Deliveries", value: "0", color: "bg-blue-50 text-blue-700" },
          { label: "Delivered Today", value: "0", color: "bg-emerald-50 text-emerald-700" },
          { label: "Pending Pickup", value: "0", color: "bg-amber-50 text-amber-700" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className={`mt-2 text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <p className="text-slate-500 text-sm">No assigned deliveries yet. Check back when orders are dispatched.</p>
      </div>
    </div>
  );
}
