"use client";

import { useEffect, useState, useMemo } from "react";

type Hub = { hubId: string; lots: number; activeLots: number; trucks: number };
type Manager = { id: string; name: string; email: string; status: string };

type ViewMode = "grid" | "table";

export default function AdminHubsPage() {
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [expandedHub, setExpandedHub] = useState<string | null>(null);
  const [mgrSearch, setMgrSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = () => {
    setRefreshing(true);
    fetch("/api/admin/hubs")
      .then((r) => r.json())
      .then((d) => {
        setHubs(d.hubs ?? []);
        setManagers(d.managers ?? []);
      })
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => { fetchData(); }, []);

  const filteredHubs = useMemo(() =>
    hubs.filter((h) => h.hubId.toLowerCase().includes(search.toLowerCase())),
    [hubs, search]
  );

  const filteredManagers = useMemo(() =>
    managers.filter((m) =>
      m.name.toLowerCase().includes(mgrSearch.toLowerCase()) ||
      m.email.toLowerCase().includes(mgrSearch.toLowerCase())
    ),
    [managers, mgrSearch]
  );

  const totalLots = hubs.reduce((s, h) => s + h.lots, 0);
  const totalActive = hubs.reduce((s, h) => s + h.activeLots, 0);
  const totalTrucks = hubs.reduce((s, h) => s + h.trucks, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Hub Management</h1>
          <p className="text-slate-500">
            {loading ? "Loading…" : `${hubs.length} hub${hubs.length !== 1 ? "s" : ""} with lot activity.`}
          </p>
        </div>
        <button type="button" onClick={fetchData} disabled={refreshing}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition">
          {refreshing ? "Refreshing…" : "↻ Refresh"}
        </button>
      </div>

      {/* Summary stats */}
      {!loading && hubs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total Lots", value: totalLots, color: "text-slate-900", bg: "bg-slate-50" },
            { label: "Active Lots", value: totalActive, color: "text-emerald-700", bg: "bg-emerald-50" },
            { label: "Total Trucks", value: totalTrucks, color: "text-sky-700", bg: "bg-sky-50" },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl border border-slate-100 p-5 shadow-sm ${s.bg}`}>
              <p className="text-sm text-slate-500">{s.label}</p>
              <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
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
          {/* Search + view toggle */}
          <div className="flex flex-wrap items-center gap-3">
            <input type="text" placeholder="Search hubs…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-xs rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none ring-indigo-100 focus:ring-2" />
            <div className="flex rounded-xl border border-slate-200 overflow-hidden">
              <button type="button" onClick={() => setViewMode("grid")}
                className={`px-3 py-1.5 text-xs font-semibold transition ${viewMode === "grid" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                Grid
              </button>
              <button type="button" onClick={() => setViewMode("table")}
                className={`px-3 py-1.5 text-xs font-semibold transition ${viewMode === "table" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                Table
              </button>
            </div>
          </div>

          {filteredHubs.length > 0 ? (
            viewMode === "grid" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredHubs.map((h) => (
                  <div key={h.hubId}
                    onClick={() => setExpandedHub(expandedHub === h.hubId ? null : h.hubId)}
                    className={`rounded-2xl border bg-white p-5 shadow-sm cursor-pointer transition hover:shadow-md ${
                      expandedHub === h.hubId ? "border-indigo-300 ring-2 ring-indigo-100" : "border-slate-100"
                    }`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{h.hubId}</p>
                        <p className="mt-0.5 text-xs text-slate-400">Hub ID</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${h.lots > 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {h.lots > 0 ? "Active" : "Idle"}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-slate-50 py-2">
                        <p className="text-lg font-bold text-slate-900">{h.lots}</p>
                        <p className="text-[10px] text-slate-400">Total Lots</p>
                      </div>
                      <div className="rounded-xl bg-emerald-50 py-2">
                        <p className="text-lg font-bold text-emerald-700">{h.activeLots}</p>
                        <p className="text-[10px] text-slate-400">Active</p>
                      </div>
                      <div className="rounded-xl bg-sky-50 py-2">
                        <p className="text-lg font-bold text-sky-700">{h.trucks}</p>
                        <p className="text-[10px] text-slate-400">Trucks</p>
                      </div>
                    </div>
                    {expandedHub === h.hubId && (
                      <div className="mt-4 border-t border-slate-100 pt-3 space-y-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase">Utilization</p>
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-500 transition-all"
                              style={{ width: h.lots > 0 ? `${Math.round((h.activeLots / h.lots) * 100)}%` : "0%" }} />
                          </div>
                          <span className="text-xs font-semibold text-slate-600">
                            {h.lots > 0 ? `${Math.round((h.activeLots / h.lots) * 100)}%` : "0%"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {h.activeLots} of {h.lots} lots currently active · {h.trucks} truck{h.trucks !== 1 ? "s" : ""} registered
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* Table view */
              <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-3 text-left">Hub ID</th>
                      <th className="px-5 py-3 text-left">Status</th>
                      <th className="px-5 py-3 text-left">Total Lots</th>
                      <th className="px-5 py-3 text-left">Active Lots</th>
                      <th className="px-5 py-3 text-left">Trucks</th>
                      <th className="px-5 py-3 text-left">Utilization</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredHubs.map((h) => (
                      <tr key={h.hubId} className="hover:bg-slate-50">
                        <td className="px-5 py-4 font-semibold text-slate-900">{h.hubId}</td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${h.lots > 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {h.lots > 0 ? "Active" : "Idle"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-700">{h.lots}</td>
                        <td className="px-5 py-4 text-emerald-700 font-semibold">{h.activeLots}</td>
                        <td className="px-5 py-4 text-sky-700">{h.trucks}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-500"
                                style={{ width: h.lots > 0 ? `${Math.round((h.activeLots / h.lots) * 100)}%` : "0%" }} />
                            </div>
                            <span className="text-xs text-slate-500">{h.lots > 0 ? `${Math.round((h.activeLots / h.lots) * 100)}%` : "—"}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-slate-400 shadow-sm">
              {search ? "No hubs match your search." : "No hub activity yet. Lots will appear once sellers submit deliveries."}
            </div>
          )}

          {/* Hub Managers */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Hub Managers ({managers.length})</h2>
              {managers.length > 3 && (
                <input type="text" placeholder="Search managers…" value={mgrSearch}
                  onChange={(e) => setMgrSearch(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs outline-none ring-indigo-100 focus:ring-2" />
              )}
            </div>
            {managers.length === 0 ? (
              <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-slate-400 shadow-sm">
                No hub managers assigned yet. Use the{" "}
                <a href="/admin/users" className="font-semibold text-indigo-600 hover:underline">Users</a>{" "}
                page to assign the hub_manager role.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-3 text-left">Name</th>
                      <th className="px-5 py-3 text-left">Email</th>
                      <th className="px-5 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredManagers.length === 0 ? (
                      <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-400">No managers match search.</td></tr>
                    ) : filteredManagers.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-medium text-slate-900">{m.name}</td>
                        <td className="px-5 py-3 text-slate-500">{m.email}</td>
                        <td className="px-5 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            m.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                          }`}>
                            {m.status === "ACTIVE" ? "Active" : m.status}
                          </span>
                        </td>
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
