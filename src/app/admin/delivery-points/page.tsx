"use client";

import { useEffect, useState, useMemo } from "react";

type DPUser = { id: string; name: string; email: string; phone: string; status: string; joined: string; roles: string[] };
type DPStat = { point: string; orders: number; pending: number };

const ROLE_LABEL: Record<string, string> = {
  delivery_hub_manager: "Delivery Hub Mgr",
  delivery_distributor: "Delivery Point",
};

const DP_FILTERS = ["All Points", "Has Pending", "No Pending"];
const STAFF_FILTERS = ["All Staff", "Active", "Inactive"];

export default function AdminDeliveryPointsPage() {
  const [users, setUsers] = useState<DPUser[]>([]);
  const [stats, setStats] = useState<DPStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Delivery points search & filter
  const [dpSearch, setDpSearch] = useState("");
  const [dpFilter, setDpFilter] = useState("All Points");

  // Staff search & filter
  const [staffSearch, setStaffSearch] = useState("");
  const [staffFilter, setStaffFilter] = useState("All Staff");

  // Expanded card
  const [expandedPoint, setExpandedPoint] = useState<string | null>(null);

  const fetchData = () => {
    setRefreshing(true);
    Promise.all([
      fetch("/api/admin/staff").then((r) => r.json()),
      fetch("/api/admin/orders").then((r) => r.json()),
    ]).then(([staffData, ordersData]) => {
      const dp = (staffData as { id: string; name: string; email: string; phone: string; status: string; joined: string; roles: string[] }[]).filter(
        (s) => s.roles.some((r) => ["delivery_hub_manager", "delivery_distributor"].includes(r))
      );
      setUsers(dp);

      const map: Record<string, { orders: number; pending: number }> = {};
      for (const o of ordersData as { deliveryPoint: string; dispatched: boolean }[]) {
        const key = o.deliveryPoint || "Unknown";
        if (!map[key]) map[key] = { orders: 0, pending: 0 };
        map[key].orders++;
        if (!o.dispatched) map[key].pending++;
      }
      setStats(Object.entries(map).map(([point, v]) => ({ point, ...v })).sort((a, b) => b.orders - a.orders));
    }).finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => { fetchData(); }, []);

  const filteredStats = useMemo(() =>
    stats.filter((d) => {
      if (dpSearch && !d.point.toLowerCase().includes(dpSearch.toLowerCase())) return false;
      if (dpFilter === "Has Pending" && d.pending === 0) return false;
      if (dpFilter === "No Pending" && d.pending > 0) return false;
      return true;
    }),
    [stats, dpSearch, dpFilter]
  );

  const filteredStaff = useMemo(() =>
    users.filter((u) => {
      if (staffSearch && !u.name.toLowerCase().includes(staffSearch.toLowerCase()) && !u.email.toLowerCase().includes(staffSearch.toLowerCase()))
        return false;
      if (staffFilter === "Active" && u.status !== "ACTIVE") return false;
      if (staffFilter === "Inactive" && u.status === "ACTIVE") return false;
      return true;
    }),
    [users, staffSearch, staffFilter]
  );

  const totalOrders = stats.reduce((s, d) => s + d.orders, 0);
  const totalPending = stats.reduce((s, d) => s + d.pending, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Delivery Points</h1>
          <p className="text-slate-500">
            {loading ? "Loading…" : `${stats.length} active delivery point${stats.length !== 1 ? "s" : ""} from order data.`}
          </p>
        </div>
        <button type="button" onClick={fetchData} disabled={refreshing}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition">
          {refreshing ? "Refreshing…" : "↻ Refresh"}
        </button>
      </div>

      {/* Summary stats */}
      {!loading && stats.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 p-5 shadow-sm bg-slate-50">
            <p className="text-sm text-slate-500">Delivery Points</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{stats.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 p-5 shadow-sm bg-blue-50">
            <p className="text-sm text-slate-500">Total Orders</p>
            <p className="mt-1 text-2xl font-bold text-blue-700">{totalOrders}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 p-5 shadow-sm bg-orange-50">
            <p className="text-sm text-slate-500">Pending Deliveries</p>
            <p className="mt-1 text-2xl font-bold text-orange-600">{totalPending}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <>
          {/* Delivery point cards with search + filter */}
          <div className="flex flex-wrap gap-3">
            <input type="text" placeholder="Search delivery points…" value={dpSearch}
              onChange={(e) => setDpSearch(e.target.value)}
              className="w-full max-w-xs rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none ring-indigo-100 focus:ring-2" />
            <div className="flex flex-wrap gap-2">
              {DP_FILTERS.map((f) => (
                <button key={f} type="button" onClick={() => setDpFilter(f)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition ${
                    dpFilter === f
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}>{f}</button>
              ))}
            </div>
          </div>

          {filteredStats.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredStats.map((d) => (
                <div key={d.point}
                  onClick={() => setExpandedPoint(expandedPoint === d.point ? null : d.point)}
                  className={`rounded-2xl border bg-white p-5 shadow-sm cursor-pointer transition hover:shadow-md ${
                    expandedPoint === d.point ? "border-indigo-300 ring-2 ring-indigo-100" : "border-slate-100"
                  }`}>
                  <p className="font-semibold text-slate-900 truncate">{d.point}</p>
                  <p className="mt-0.5 text-xs text-slate-400">Delivery Point</p>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-xl bg-slate-50 py-2">
                      <p className="text-lg font-bold text-slate-900">{d.orders}</p>
                      <p className="text-[10px] text-slate-400">Total Orders</p>
                    </div>
                    <div className="rounded-xl bg-orange-50 py-2">
                      <p className="text-lg font-bold text-orange-600">{d.pending}</p>
                      <p className="text-[10px] text-slate-400">Pending</p>
                    </div>
                  </div>
                  {expandedPoint === d.point && (
                    <div className="mt-4 border-t border-slate-100 pt-3 space-y-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase">Fulfillment Rate</p>
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: d.orders > 0 ? `${Math.round(((d.orders - d.pending) / d.orders) * 100)}%` : "0%" }} />
                        </div>
                        <span className="text-xs font-semibold text-slate-600">
                          {d.orders > 0 ? `${Math.round(((d.orders - d.pending) / d.orders) * 100)}%` : "0%"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {d.orders - d.pending} of {d.orders} orders dispatched · {d.pending} pending
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-slate-400 shadow-sm">
              {dpSearch || dpFilter !== "All Points" ? "No delivery points match your criteria." : "No delivery point data yet. Orders with delivery points will appear here."}
            </div>
          )}

          {/* Delivery staff */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Delivery Staff ({users.length})</h2>
            </div>

            <div className="flex flex-wrap gap-3">
              <input type="text" placeholder="Search staff…" value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                className="w-full max-w-xs rounded-xl border border-slate-200 px-3 py-1.5 text-xs outline-none ring-indigo-100 focus:ring-2" />
              <div className="flex flex-wrap gap-2">
                {STAFF_FILTERS.map((f) => (
                  <button key={f} type="button" onClick={() => setStaffFilter(f)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold border transition ${
                      staffFilter === f
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}>{f}</button>
                ))}
              </div>
            </div>

            {users.length === 0 ? (
              <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-slate-400 shadow-sm">
                No delivery staff assigned. Use the{" "}
                <a href="/admin/users" className="font-semibold text-indigo-600 hover:underline">Users</a>{" "}
                page to assign delivery roles.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-3 text-left">Name</th>
                      <th className="px-5 py-3 text-left">Email</th>
                      <th className="px-5 py-3 text-left">Phone</th>
                      <th className="px-5 py-3 text-left">Role</th>
                      <th className="px-5 py-3 text-left">Status</th>
                      <th className="px-5 py-3 text-left">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredStaff.length === 0 ? (
                      <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">No staff match your filters.</td></tr>
                    ) : filteredStaff.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-medium text-slate-900">{u.name}</td>
                        <td className="px-5 py-3 text-slate-500">{u.email}</td>
                        <td className="px-5 py-3 text-slate-500">{u.phone}</td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-1">
                            {u.roles.filter((r) => ["delivery_hub_manager", "delivery_distributor"].includes(r)).map((r) => (
                              <span key={r} className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700">
                                {ROLE_LABEL[r] ?? r}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            u.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                          }`}>
                            {u.status === "ACTIVE" ? "Active" : u.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-500">{u.joined}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
