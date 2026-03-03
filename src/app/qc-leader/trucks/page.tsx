"use client";

import { useEffect, useState, useCallback } from "react";
import { Truck, User, Phone, Package, RefreshCw } from "lucide-react";
import api from "@/lib/api";

type DbTruck = {
  id: string;
  reg: string;
  type: string;
  capacityKg: number;
  status: string;
  driverName: string | null;
  driverPhone: string | null;
  currentDestination: string | null;
};

type ActiveOrder = {
  id: string;
  lotId: string;
  product: string;
  qty: string;
  buyer: string;
  deliveryPoint: string;
  assignedTruck: string | null;
  loadConfirmed: boolean;
  dispatched: boolean;
};

const statusStyle: Record<string, string> = {
  AVAILABLE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Available: "bg-emerald-50 text-emerald-700 border-emerald-200",
  IN_TRANSIT: "bg-blue-50 text-blue-700 border-blue-200",
  "In Transit": "bg-blue-50 text-blue-700 border-blue-200",
  MAINTENANCE: "bg-red-50 text-red-600 border-red-200",
  Maintenance: "bg-red-50 text-red-600 border-red-200",
  LOADING: "bg-amber-50 text-amber-700 border-amber-200",
  Loading: "bg-amber-50 text-amber-700 border-amber-200",
};

const statusLabel: Record<string, string> = {
  AVAILABLE: "Available",
  IN_TRANSIT: "In Transit",
  MAINTENANCE: "Maintenance",
  LOADING: "Loading",
};

function parseKg(qty: string): number {
  const n = parseFloat(qty.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

function LoadBar({ used, capacity }: { used: number; capacity: number }) {
  const pct = capacity > 0 ? Math.min(100, Math.round((used / capacity) * 100)) : 0;
  const color = pct >= 90 ? "bg-red-500" : pct >= 65 ? "bg-amber-400" : "bg-teal-500";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] text-slate-500">
        <span>{used} kg used</span>
        <span className={`font-semibold ${pct >= 90 ? "text-red-600" : pct >= 65 ? "text-amber-600" : "text-teal-600"}`}>
          {pct}%
        </span>
        <span>{capacity} kg cap</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`text-[10px] font-medium ${pct >= 90 ? "text-red-500" : pct >= 65 ? "text-amber-600" : "text-slate-400"}`}>
        {capacity - used} kg remaining
      </p>
    </div>
  );
}

export default function TruckFleetPage() {
  const [trucks, setTrucks] = useState<DbTruck[]>([]);
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [truckRows, orderRows] = await Promise.all([
      api.get<DbTruck[]>("/api/flow/trucks"),
      api.get<ActiveOrder[]>("/api/flow/dispatch/orders"),
    ]);
    setTrucks(truckRows);
    setOrders(orderRows);
  }, []);

  useEffect(() => {
    void reload().finally(() => setLoading(false));
  }, [reload]);

  const statusCounts = {
    available: trucks.filter((t) => t.status === "AVAILABLE" || t.status === "Available").length,
    inTransit: trucks.filter((t) => t.status === "IN_TRANSIT" || t.status === "In Transit").length,
    loading: trucks.filter((t) => t.status === "LOADING" || t.status === "Loading").length,
    maintenance: trucks.filter((t) => t.status === "MAINTENANCE" || t.status === "Maintenance").length,
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-100" />
        <div className="grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Truck Fleet</h1>
          <p className="text-slate-500">
            Live fleet overview — truck status, driver details, and current load.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Available", count: statusCounts.available, color: "text-emerald-700", bg: "bg-emerald-50" },
          { label: "Loading", count: statusCounts.loading, color: "text-amber-700", bg: "bg-amber-50" },
          { label: "In Transit", count: statusCounts.inTransit, color: "text-blue-700", bg: "bg-blue-50" },
          { label: "Maintenance", count: statusCounts.maintenance, color: "text-red-600", bg: "bg-red-50" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border border-slate-100 px-4 py-3 ${s.bg}`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="mt-0.5 text-xs font-medium text-slate-600">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Truck cards */}
      {trucks.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center">
          <Truck size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 font-medium">No trucks in fleet</p>
          <p className="mt-1 text-sm text-slate-400">Trucks will appear here once added to the system.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {trucks.map((t) => {
            const truckOrders = orders.filter((o) => o.assignedTruck === t.id);
            const loadedOrders = truckOrders.filter((o) => o.loadConfirmed);
            const dispatchedOrders = truckOrders.filter((o) => o.dispatched);
            const usedKg = loadedOrders.reduce((s, o) => s + parseKg(o.qty), 0);
            const chipStyle = statusStyle[t.status] ?? "bg-slate-100 text-slate-600 border-slate-200";
            const label = statusLabel[t.status] ?? t.status;

            return (
              <div
                key={t.id}
                className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
                  t.status === "IN_TRANSIT" || t.status === "In Transit"
                    ? "border-blue-200"
                    : t.status === "LOADING" || t.status === "Loading"
                    ? "border-amber-200"
                    : t.status === "MAINTENANCE" || t.status === "Maintenance"
                    ? "border-red-200"
                    : "border-slate-100"
                }`}
              >
                {/* Card header */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                      <Truck size={18} className="text-slate-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">{t.id}</span>
                        <span className="text-sm text-slate-400 font-mono">{t.reg}</span>
                        <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${chipStyle}`}>
                          {label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{t.type} · {t.capacityKg.toLocaleString()} kg capacity</p>
                    </div>
                  </div>

                  {/* Driver */}
                  {t.driverName ? (
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs min-w-[160px]">
                      <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                        <User size={11} className="text-slate-400" />
                        {t.driverName}
                      </div>
                      {t.driverPhone && (
                        <div className="mt-0.5 flex items-center gap-1.5 text-slate-400">
                          <Phone size={11} />
                          {t.driverPhone}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No driver assigned</span>
                  )}
                </div>

                {/* Card body */}
                <div className="space-y-4 px-5 py-4">
                  {/* Load bar */}
                  {t.capacityKg > 0 && (
                    <div>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Load Progress</p>
                      <LoadBar used={usedKg} capacity={t.capacityKg} />
                    </div>
                  )}

                  {/* Active orders on this truck */}
                  {truckOrders.length > 0 && (
                    <div>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Active Orders ({truckOrders.length})
                      </p>
                      <div className="space-y-2">
                        {truckOrders.map((o) => (
                          <div
                            key={o.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2.5 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <Package size={12} className="text-slate-400 flex-shrink-0" />
                              <span className="font-medium text-slate-800">{o.product}</span>
                              <span className="text-slate-400">{o.qty}</span>
                              <span className="font-mono text-[10px] text-slate-300">{o.id}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">{o.buyer}</span>
                              {o.dispatched ? (
                                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                  Dispatched
                                </span>
                              ) : o.loadConfirmed ? (
                                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                  Loaded
                                </span>
                              ) : (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                  Assigned
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {truckOrders.length === 0 && (
                    <p className="text-xs text-slate-400 italic">No orders assigned to this truck.</p>
                  )}

                  {/* Current destination */}
                  {t.currentDestination && (
                    <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-700">
                      <span className="font-medium">En route to:</span>
                      <span>{t.currentDestination}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
