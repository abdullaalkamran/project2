"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { CheckCircle2, Truck, ChevronDown, MapPin, Loader2, AlertTriangle } from "lucide-react";
import { TRUCKS, APPROVED_LOTS, type ApprovedLot, type Truck as TruckType } from "@/lib/trucks";

// ── helpers ───────────────────────────────────────────────────────────────────
function usedKg(truck: TruckType, lots: ApprovedLot[]) {
  const assignedKg = lots
    .filter((l) => l.assignedTruckId === truck.id && l.loadConfirmed)
    .reduce((s, l) => s + l.weightKg, 0);
  return truck.loads.reduce((s, l) => s + l.weightKg, 0) + assignedKg;
}

function LoadBar({ used, capacity }: { used: number; capacity: number }) {
  const pct = Math.min(100, Math.round((used / capacity) * 100));
  const color = pct >= 90 ? "bg-red-500" : pct >= 65 ? "bg-amber-400" : "bg-emerald-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] text-slate-500">
        <span>{used} kg used</span>
        <span>{capacity} kg cap</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`text-[11px] font-semibold ${pct >= 90 ? "text-red-500" : pct >= 65 ? "text-amber-600" : "text-emerald-600"}`}>
        {pct}% full · {capacity - used} kg remaining
      </p>
    </div>
  );
}

// ── Live Tracking tab ──────────────────────────────────────────────────────────
function LiveTrackingTab({ trucks }: { trucks: TruckType[] }) {
  const [coords, setCoords] = useState(
    Object.fromEntries(trucks.map((t) => [t.id, t.liveCoords ? { ...t.liveCoords } : null]))
  );

  // Simulate GPS drift for on-route trucks every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCoords((prev) => {
        const next = { ...prev };
        trucks.forEach((t) => {
          if (t.status === "On Route" && next[t.id]) {
            next[t.id] = {
              lat: next[t.id]!.lat + (Math.random() - 0.5) * 0.002,
              lng: next[t.id]!.lng + (Math.random() - 0.5) * 0.002,
              updatedAt: new Date().toISOString(),
            };
          }
        });
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [trucks]);

  const onRoute = trucks.filter((t) => t.status === "On Route");
  const rest = trucks.filter((t) => t.status !== "On Route");

  return (
    <div className="space-y-6">
      {onRoute.length === 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-slate-400">
          No trucks currently on route.
        </div>
      )}
      {onRoute.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">🟢 On Route — Live</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {onRoute.map((t) => {
              const c = coords[t.id];
              return (
                <div key={t.id} className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-800">{t.id} <span className="font-normal text-slate-500 text-sm">— {t.reg}</span></p>
                      <p className="text-xs text-slate-500">{t.type}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                    </span>
                  </div>

                  {/* Map embed */}
                  {c && (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      {/* Google Static Maps — shows pin at current coords */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://maps.googleapis.com/maps/api/staticmap?center=${c.lat},${c.lng}&zoom=14&size=600x220&markers=color:red%7C${c.lat},${c.lng}&key=REPLACE_WITH_API_KEY`}
                        alt={`Map for ${t.id}`}
                        className="h-36 w-full object-cover"
                        onError={(e) => {
                          // Fallback: show coordinates as text tile
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                          (e.currentTarget.nextSibling as HTMLElement | null)?.removeAttribute("hidden");
                        }}
                      />
                      <div hidden className="flex h-36 flex-col items-center justify-center gap-1 bg-slate-50 text-slate-500">
                        <MapPin size={20} className="text-slate-400" />
                        <span className="font-mono text-xs">{c.lat.toFixed(5)}, {c.lng.toFixed(5)}</span>
                        <span className="text-[11px] text-slate-400">Live coordinates (map key not set)</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1 text-xs text-slate-600">
                    <p><span className="font-medium">Driver:</span> {t.driverId}</p>
                    <p><span className="font-medium">Destination:</span> {t.currentDestination ?? "—"}</p>
                    {c && <p className="font-mono text-slate-400 text-[11px]">📍 {c.lat.toFixed(5)}, {c.lng.toFixed(5)} · Updated {new Date(c.updatedAt).toLocaleTimeString()}</p>}
                    {t.loads.map((l) => (
                      <p key={l.lotId}><span className="font-medium">Lot:</span> {l.lotId} — {l.product} ({l.weightKg} kg) → {l.deliveryPoint}</p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Other Trucks</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((t) => (
              <div key={t.id} className="rounded-xl border border-slate-100 bg-white p-4 text-sm space-y-1">
                <p className="font-bold text-slate-800">{t.id} <span className="font-normal text-slate-400">{t.reg}</span></p>
                <p className="text-xs text-slate-500">{t.type}</p>
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  t.status === "Available" ? "bg-sky-50 text-sky-700" : t.status === "Maintenance" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"
                }`}>{t.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Assign Loads tab ──────────────────────────────────────────────────────────
export default function TruckLoadClient() {
  const [tab, setTab] = useState<"assign" | "tracking">("assign");
  const [lots, setLots] = useState<ApprovedLot[]>(APPROVED_LOTS);
  const [confirming, setConfirming] = useState<string | null>(null);

  const availableTrucks = TRUCKS.filter((t) => t.status !== "On Route" && t.status !== "Maintenance");

  const assignTruck = (lotId: string, truckId: string) => {
    setLots((prev) => prev.map((l) => l.lotId === lotId ? { ...l, assignedTruckId: truckId || null, loadConfirmed: false } : l));
  };

  const confirmLoad = async (lotId: string) => {
    const lot = lots.find((l) => l.lotId === lotId);
    if (!lot?.assignedTruckId) { toast.error("Assign a truck first."); return; }
    setConfirming(lotId);
    await new Promise((r) => setTimeout(r, 800));
    setLots((prev) => prev.map((l) => l.lotId === lotId ? { ...l, loadConfirmed: true } : l));
    setConfirming(null);
    toast.success(`${lotId} load confirmed on ${lot.assignedTruckId}`);
  };

  const verdictBadge = (v: ApprovedLot["verdict"]) =>
    v === "PASSED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <div className="space-y-6 max-w-5xl pb-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Truck Load Management</h1>
        <p className="text-slate-500">Assign trucks to approved lots, confirm loading, and track live positions.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
        {([["assign", "📦 Assign Loads"], ["tracking", "📍 Live Tracking"]] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${tab === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Assign Loads tab ── */}
      {tab === "assign" && (
        <div className="space-y-4">
          {/* Summary strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Lots to dispatch", value: lots.length, color: "bg-sky-50 text-sky-700" },
              { label: "Loads confirmed", value: lots.filter((l) => l.loadConfirmed).length, color: "bg-emerald-50 text-emerald-700" },
              { label: "Awaiting truck", value: lots.filter((l) => !l.assignedTruckId).length, color: "bg-amber-50 text-amber-700" },
              { label: "Available trucks", value: availableTrucks.length, color: "bg-slate-100 text-slate-700" },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl px-4 py-3 ${s.color}`}>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {lots.map((lot) => {
            const truck = lot.assignedTruckId ? TRUCKS.find((t) => t.id === lot.assignedTruckId) : null;
            const used = truck ? usedKg(truck, lots) : 0;
            return (
              <div key={lot.lotId} className={`rounded-2xl border bg-white p-5 shadow-sm space-y-4 ${lot.loadConfirmed ? "border-emerald-200" : "border-slate-100"}`}>
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900">{lot.lotId}</p>
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${verdictBadge(lot.verdict)}`}>
                        {lot.verdict}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">Grade {lot.grade}</span>
                      {lot.loadConfirmed && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle2 size={11} /> Load Confirmed
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">{lot.product} — {lot.seller} · {lot.hub}</p>
                    <p className="text-xs text-slate-500">{lot.weightKg} kg · Buyer: <span className="font-medium text-slate-700">{lot.buyerName}</span> · Delivery: {lot.deliveryPoint}</p>
                  </div>
                </div>

                {/* Truck assignment */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Assign Truck</label>
                    <div className="relative">
                      <select
                        disabled={lot.loadConfirmed}
                        value={lot.assignedTruckId ?? ""}
                        onChange={(e) => assignTruck(lot.lotId, e.target.value)}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                      >
                        <option value="">— Select truck —</option>
                        {availableTrucks.map((t) => {
                          const remaining = t.capacityKg - usedKg(t, lots);
                          const canFit = remaining >= lot.weightKg;
                          return (
                            <option key={t.id} value={t.id} disabled={!canFit}>
                              {t.id} ({t.reg}) · {t.type} · {remaining} kg free{!canFit ? " — OVERLOAD" : ""}
                            </option>
                          );
                        })}
                      </select>
                      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  {truck && (
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Load progress</label>
                      <LoadBar used={used} capacity={truck.capacityKg} />
                    </div>
                  )}
                </div>

                {/* Overload warning */}
                {truck && usedKg(truck, lots) > truck.capacityKg && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                    <AlertTriangle size={13} /> Truck overloaded — reassign or split the load
                  </div>
                )}

                {/* Confirm Load button */}
                {lot.assignedTruckId && !lot.loadConfirmed && (
                  <button
                    type="button"
                    disabled={confirming === lot.lotId}
                    onClick={() => confirmLoad(lot.lotId)}
                    className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
                  >
                    {confirming === lot.lotId ? <><Loader2 size={14} className="animate-spin" /> Confirming…</> : <><Truck size={14} /> Confirm Load</>}
                  </button>
                )}
              </div>
            );
          })}

          {lots.every((l) => l.loadConfirmed) && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center space-y-1">
              <CheckCircle2 size={28} className="mx-auto text-emerald-500" />
              <p className="font-bold text-emerald-800">All loads confirmed!</p>
              <p className="text-sm text-emerald-600">All approved lots have been assigned a truck and loading confirmed.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Live Tracking tab ── */}
      {tab === "tracking" && <LiveTrackingTab trucks={TRUCKS} />}
    </div>
  );
}
