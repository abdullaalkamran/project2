"use client";

import { useEffect, useState } from "react";
import { Loader2, Truck, User } from "lucide-react";
import api from "@/lib/api";

type Driver = {
  id: string; name: string; phone: string; license: string; licenseExpiry: string;
};
type TruckItem = {
  id: string; reg: string; type: string; capacityKg: number; status: string;
  currentDestination: string | null; driver: Driver | null;
};

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ON_TRIP:   "border-blue-200 bg-blue-50 text-blue-700",
  IDLE:      "border-slate-200 bg-slate-50 text-slate-500",
};

export default function HubFleetClient() {
  const [trucks, setTrucks] = useState<TruckItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<TruckItem[]>("/api/flow/trucks/fleet")
      .then(setTrucks)
      .catch(() => setTrucks([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </div>
  );

  const available = trucks.filter((t) => t.status === "AVAILABLE").length;
  const onTrip    = trucks.filter((t) => t.status === "ON_TRIP").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vehicles & Drivers</h1>
          <p className="text-slate-500 text-sm mt-0.5">Approved fleet assigned to delivery operations.</p>
        </div>
        <div className="flex gap-3">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-center">
            <p className="text-2xl font-bold text-emerald-700">{available}</p>
            <p className="text-xs text-emerald-600">Available</p>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-center">
            <p className="text-2xl font-bold text-blue-700">{onTrip}</p>
            <p className="text-xs text-blue-600">On Trip</p>
          </div>
        </div>
      </div>

      {trucks.length === 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
          <Truck size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-500">No approved vehicles yet</p>
          <p className="mt-1 text-sm text-slate-400">Trucks are managed by the main hub and will appear here once approved.</p>
        </div>
      )}

      <div className="space-y-4">
        {trucks.map((t) => (
          <div key={t.id} className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-slate-50">
                  <Truck size={18} className="text-slate-400" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xs text-slate-400">{t.id}</p>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[t.status] ?? "border-slate-200 bg-slate-50 text-slate-500"}`}>
                      {t.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-base font-bold text-slate-900">{t.reg}</p>
                  <p className="text-sm text-slate-500">{t.type} · {t.capacityKg.toLocaleString()} kg capacity</p>
                  {t.currentDestination && (
                    <p className="text-xs text-blue-600">→ {t.currentDestination}</p>
                  )}
                </div>
              </div>
            </div>

            {t.driver && (
              <div className="border-t border-slate-100 mx-5 mb-4 flex items-start gap-3 rounded-xl border border-violet-100 bg-violet-50 px-4 py-3">
                <User size={14} className="text-violet-600 mt-0.5 shrink-0" />
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-violet-800">{t.driver.name}</p>
                  <p className="text-violet-600">{t.driver.phone}</p>
                  <p className="text-slate-400">
                    License: {t.driver.license} · Expires {new Date(t.driver.licenseExpiry).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}

            {!t.driver && (
              <div className="border-t border-slate-100 px-5 py-3">
                <p className="text-xs text-slate-400 italic">No driver assigned</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
