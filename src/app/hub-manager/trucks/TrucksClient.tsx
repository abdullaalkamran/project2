"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Truck, User, MapPin, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  RefreshCw, Search, Phone, AlertTriangle, Clock, Package,
  Navigation, Loader2, ChevronRight,
} from "lucide-react";
import api from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────
type FleetDriver = {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  nid: string;
  nidPhotoUrl: string | null;
  photoUrl: string | null;
  license: string;
  licenseExpiry: string;
  licensePhotoUrl: string | null;
  joinDate: string;
  emergencyContactName: string | null;
  emergencyContactRelation: string | null;
  emergencyContactPhone: string | null;
  emergencyContactAddress: string | null;
  emergencyContactPhotoUrl: string | null;
  emergencyContactNidPhotoUrl: string | null;
};

type FleetTruck = {
  id: string;
  reg: string;
  type: string;
  capacityKg: number;
  status: string;
  photoUrl: string | null;
  currentDestination: string | null;
  liveCoordLat: number | null;
  liveCoordLng: number | null;
  driver: FleetDriver | null;
};

type DispatchOrder = {
  id: string;
  lotId: string;
  product: string;
  qty: string;
  seller: string;
  buyer: string;
  deliveryPoint: string;
  winningBid: string;
  totalAmount: string;
  confirmedAt: string;
  assignedTruck: string | null;
  loadConfirmed: boolean;
  dispatched: boolean;
  status: string;
};

type PendingDriver = {
  driverCode: string;
  name: string;
  phone: string;
  address: string | null;
  nid: string;
  nidPhotoUrl: string | null;
  photoUrl: string | null;
  license: string;
  licenseExpiry: string;
  licensePhotoUrl: string | null;
  emergencyContactName: string | null;
  emergencyContactRelation: string | null;
  emergencyContactPhone: string | null;
  emergencyContactAddress: string | null;
  emergencyContactPhotoUrl: string | null;
  emergencyContactNidPhotoUrl: string | null;
};

type PendingTruck = {
  id: string;
  reg: string;
  type: string;
  capacityKg: number;
  photoUrl: string | null;
  registrationStatus: string;
  registrationNote: string | null;
  submittedAt: string;
  submittedByName: string | null;
  hubName: string | null;
  driver: PendingDriver | null;
};

type Tab = "fleet" | "drivers" | "dispatch" | "tracking" | "pending";

// ── Status config ─────────────────────────────────────────────────────────────
const TRUCK_STATUSES = [
  { value: "AVAILABLE",   label: "Available",   color: "bg-emerald-50 text-emerald-700 border-emerald-200",  dot: "bg-emerald-500"  },
  { value: "LOADING",     label: "Loading",     color: "bg-amber-50 text-amber-700 border-amber-200",        dot: "bg-amber-500"    },
  { value: "IN_TRANSIT",  label: "In Transit",  color: "bg-blue-50 text-blue-700 border-blue-200",           dot: "bg-blue-500"     },
  { value: "MAINTENANCE", label: "Maintenance", color: "bg-red-50 text-red-600 border-red-200",              dot: "bg-red-500"      },
];

function getStatusCfg(status: string) {
  return (
    TRUCK_STATUSES.find(
      (s) => s.value === status || s.label.toLowerCase() === status.toLowerCase()
    ) ?? { value: status, label: status, color: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" }
  );
}

function isAvailable(s: string) {
  return s === "AVAILABLE" || s.toLowerCase() === "available";
}

// ── License expiry helpers ────────────────────────────────────────────────────
function licenseStatus(expiry: string): "ok" | "soon" | "expired" {
  const exp = new Date(expiry);
  const now = new Date();
  const days = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (days < 0) return "expired";
  if (days < 60) return "soon";
  return "ok";
}

function ExpiryBadge({ expiry }: { expiry: string }) {
  const s = licenseStatus(expiry);
  if (s === "ok") return null;
  return (
    <span className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
      s === "expired" ? "border-red-200 bg-red-50 text-red-600" : "border-amber-200 bg-amber-50 text-amber-700"
    }`}>
      <AlertTriangle size={9} />
      {s === "expired" ? "Expired" : "Expiring soon"}
    </span>
  );
}

// ── Dispatch helpers ──────────────────────────────────────────────────────────
const LOAD_STEPS = ["Truck Assigned", "Load Confirmed", "Dispatched"];

function loadStep(order: DispatchOrder): number {
  if (order.dispatched) return 3;
  if (order.loadConfirmed) return 2;
  if (order.assignedTruck) return 1;
  return 0;
}

function LoadProgress({ order }: { order: DispatchOrder }) {
  const cur = loadStep(order);
  return (
    <div className="flex w-full items-start">
      {LOAD_STEPS.map((label, i) => {
        const step = i + 1;
        const done = step < cur || (step === 3 && cur === 3);
        const active = step === cur && cur < 3;
        return (
          <div key={label} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              {i > 0 && <div className={`h-0.5 flex-1 ${step <= cur ? "bg-emerald-400" : "bg-slate-200"}`} />}
              <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                done ? "bg-emerald-500 text-white"
                : active ? "bg-amber-400 text-white ring-2 ring-amber-200 ring-offset-1"
                : "border-2 border-slate-200 bg-white text-slate-400"
              }`}>
                {done ? "✓" : step}
              </div>
              {i < LOAD_STEPS.length - 1 && <div className={`h-0.5 flex-1 ${step < cur ? "bg-emerald-400" : "bg-slate-200"}`} />}
            </div>
            <p className={`mt-1 text-center text-[9px] font-medium leading-tight ${
              done ? "text-emerald-600" : active ? "text-amber-700 font-semibold" : "text-slate-400"
            }`}>{label}</p>
          </div>
        );
      })}
    </div>
  );
}

// ── Photo tile ────────────────────────────────────────────────────────────────
function PhotoTile({ src, label, className = "" }: { src: string; label: string; className?: string }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold text-slate-400">{label}</p>
      <img src={src} alt={label} className={`rounded-xl border border-slate-200 object-cover ${className}`} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TrucksClient() {
  const [tab, setTab]               = useState<Tab>("fleet");
  const [fleet, setFleet]           = useState<FleetTruck[]>([]);
  const [orders, setOrders]         = useState<DispatchOrder[]>([]);
  const [pending, setPending]       = useState<PendingTruck[]>([]);
  const [loading, setLoading]       = useState(true);

  // fleet interaction
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedTruck, setExpandedTruck] = useState<string | null>(null);
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [changingStatus, setChangingStatus] = useState<string | null>(null);

  // dispatch interaction
  const [selectedTruck, setSelectedTruck] = useState<Record<string, string>>({});
  const [busy, setBusy]                   = useState<string | null>(null);

  // pending interaction
  const [expandedPending, setExpandedPending] = useState<string | null>(null);
  const [acting, setActing]           = useState<string | null>(null);
  const [rejectNote, setRejectNote]   = useState<Record<string, string>>({});
  const [showReject, setShowReject]   = useState<Record<string, boolean>>({});

  // live tracking drift
  const [liveCoords, setLiveCoords] = useState<Record<string, { lat: number; lng: number; updatedAt: string }>>({});
  const coordsInitRef = useRef(false);

  // ── Load data ───────────────────────────────────────────────────────────────
  const reload = useCallback(async () => {
    const [fleetData, orderData, pendingData] = await Promise.all([
      api.get<FleetTruck[]>("/api/flow/trucks/fleet"),
      api.get<DispatchOrder[]>("/api/flow/dispatch/orders"),
      api.get<PendingTruck[]>("/api/flow/trucks/registrations?status=ALL"),
    ]);
    setFleet(fleetData ?? []);
    setOrders(orderData ?? []);
    setPending(pendingData ?? []);

    // Init live coords for IN_TRANSIT trucks (use DB coords if present)
    if (!coordsInitRef.current) {
      const init: Record<string, { lat: number; lng: number; updatedAt: string }> = {};
      (fleetData ?? []).forEach((t) => {
        if (t.status === "IN_TRANSIT" || t.status.toLowerCase() === "in transit") {
          init[t.id] = {
            lat: t.liveCoordLat ?? (23.7 + Math.random() * 0.4),
            lng: t.liveCoordLng ?? (90.3 + Math.random() * 0.2),
            updatedAt: new Date().toISOString(),
          };
        }
      });
      setLiveCoords(init);
      coordsInitRef.current = true;
    }
  }, []);

  useEffect(() => {
    void reload().finally(() => setLoading(false));
  }, [reload]);

  // Drift live coords every 5s
  useEffect(() => {
    const int = setInterval(() => {
      setLiveCoords((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((id) => {
          next[id] = {
            lat: next[id].lat + (Math.random() - 0.5) * 0.002,
            lng: next[id].lng + (Math.random() - 0.5) * 0.002,
            updatedAt: new Date().toISOString(),
          };
        });
        return next;
      });
    }, 5000);
    return () => clearInterval(int);
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const drivers      = fleet.filter((t) => t.driver).map((t) => t.driver!);
  const availTrucks  = fleet.filter((t) => isAvailable(t.status));
  const inTransit    = fleet.filter((t) => t.status === "IN_TRANSIT" || t.status.toLowerCase() === "in transit");
  const maintenance  = fleet.filter((t) => t.status === "MAINTENANCE" || t.status.toLowerCase() === "maintenance");
  const expiring     = drivers.filter((d) => licenseStatus(d.licenseExpiry) !== "ok");
  const pendingDisp  = orders.filter((o) => !o.dispatched);
  const dispatched   = orders.filter((o) => o.dispatched);

  const filteredFleet = fleet.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.id.toLowerCase().includes(q) || t.reg.toLowerCase().includes(q)
      || t.type.toLowerCase().includes(q) || (t.driver?.name ?? "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || t.status === statusFilter
      || getStatusCfg(t.status).label.toLowerCase() === statusFilter.toLowerCase();
    return matchSearch && matchStatus;
  });

  // ── Status change ────────────────────────────────────────────────────────────
  async function changeStatus(truckId: string, newStatus: string) {
    setChangingStatus(truckId);
    try {
      await api.patch(`/api/flow/trucks/${truckId}`, { status: newStatus });
      setFleet((prev) => prev.map((t) => t.id === truckId ? { ...t, status: newStatus } : t));
      toast.success(`${truckId} → ${getStatusCfg(newStatus).label}`);
    } catch {
      toast.error("Could not update status");
    } finally {
      setChangingStatus(null);
    }
  }

  // ── Dispatch actions ─────────────────────────────────────────────────────────
  async function dispatchAction(orderId: string, payload: Record<string, unknown>, msg: string) {
    setBusy(orderId);
    try {
      const updated = await api.patch<DispatchOrder>(`/api/flow/dispatch/orders/${orderId}`, payload);
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, ...updated } : o));
      toast.success(msg);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  // ── Pending actions ──────────────────────────────────────────────────────────
  async function decide(truckId: string, action: "approve" | "reject") {
    setActing(truckId);
    try {
      await fetch(`/api/flow/trucks/${truckId}/registration`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: rejectNote[truckId] || undefined }),
        credentials: "include",
      });
      await reload();
      toast[action === "approve" ? "success" : "error"](
        action === "approve" ? "Truck approved and added to fleet!" : "Registration rejected."
      );
    } catch {
      toast.error("Action failed");
    } finally {
      setActing(null);
    }
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-9 w-72 animate-pulse rounded-xl bg-slate-100" />
        <div className="flex gap-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 w-28 animate-pulse rounded-xl bg-slate-100" />)}</div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-slate-100" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Transport Management</h1>
          <p className="text-slate-500">Fleet, drivers, dispatch and pending truck registrations — all in one place.</p>
        </div>
        <button type="button" onClick={() => void reload()}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {[
          { label: "Available",    value: availTrucks.length,  color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100" },
          { label: "In Transit",   value: inTransit.length,    color: "text-blue-700",    bg: "bg-blue-50 border-blue-100"       },
          { label: "Maintenance",  value: maintenance.length,  color: "text-red-600",     bg: "bg-red-50 border-red-100"         },
          { label: "Fleet Total",  value: fleet.length,        color: "text-slate-700",   bg: "bg-slate-50 border-slate-100"     },
          { label: "Drivers",      value: drivers.length,      color: "text-violet-700",  bg: "bg-violet-50 border-violet-100"   },
          { label: "⚠ Licenses",   value: expiring.length,     color: "text-amber-700",   bg: "bg-amber-50 border-amber-100"     },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border px-3 py-2.5 text-center ${s.bg}`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {([
          { key: "fleet",    label: "Fleet",               badge: fleet.length > 0 ? String(fleet.length) : null },
          { key: "drivers",  label: "Drivers",             badge: drivers.length > 0 ? String(drivers.length) : null },
          { key: "dispatch", label: "Dispatch",            badge: pendingDisp.length > 0 ? String(pendingDisp.length) : null },
          { key: "tracking", label: "Live Tracking",       badge: inTransit.length > 0 ? String(inTransit.length) : null },
          { key: "pending",  label: "Registrations", badge: pending.filter((t) => t.registrationStatus === "PENDING").length > 0 ? String(pending.filter((t) => t.registrationStatus === "PENDING").length) : null },
        ] as const).map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className={`relative flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition ${
              tab === t.key
                ? "text-emerald-700 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-emerald-500"
                : "text-slate-400 hover:text-slate-600"
            }`}>
            {t.label}
            {t.badge && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                tab === t.key ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
              }`}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* FLEET TAB                                                             */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === "fleet" && (
        <div className="space-y-4">
          {/* Search + filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search truck ID, plate, type, driver…"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-amber-400 focus:outline-none"
              />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-amber-400 focus:outline-none">
              <option value="all">All Statuses</option>
              {TRUCK_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {filteredFleet.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
              <Truck size={32} className="mx-auto mb-3 text-slate-300" />
              <p className="font-medium text-slate-500">No trucks found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFleet.map((t) => {
                const cfg     = getStatusCfg(t.status);
                const isOpen  = expandedTruck === t.id;
                const isBusy  = changingStatus === t.id;
                return (
                  <div key={t.id} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                    {/* Card row */}
                    <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                      {/* Truck photo */}
                      {t.photoUrl ? (
                        <img src={t.photoUrl} alt={t.id} className="h-16 w-24 flex-shrink-0 rounded-xl border border-slate-100 object-cover" />
                      ) : (
                        <div className="flex h-16 w-24 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100">
                          <Truck size={24} className="text-slate-400" />
                        </div>
                      )}

                      {/* Truck info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900">{t.id}</span>
                          <span className="font-mono text-xs text-slate-400">{t.reg}</span>
                          <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cfg.color}`}>
                            <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">{t.type} · {t.capacityKg.toLocaleString()} kg</p>
                        {t.currentDestination && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-blue-600">
                            <MapPin size={10} /> En route to {t.currentDestination}
                          </p>
                        )}
                      </div>

                      {/* Driver chip */}
                      {t.driver ? (
                        <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                          {t.driver.photoUrl ? (
                            <img src={t.driver.photoUrl} alt={t.driver.name} className="h-8 w-8 rounded-full border border-slate-200 object-cover" />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200">
                              <User size={13} className="text-slate-400" />
                            </div>
                          )}
                          <div className="text-xs">
                            <p className="font-semibold text-slate-800">{t.driver.name}</p>
                            <p className="flex items-center gap-0.5 text-slate-400"><Phone size={9} /> {t.driver.phone}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs italic text-slate-400">No driver</span>
                      )}

                      {/* Status dropdown */}
                      <div className="flex items-center gap-2">
                        {isBusy ? (
                          <Loader2 size={15} className="animate-spin text-slate-400" />
                        ) : (
                          <select
                            value={t.status}
                            onChange={(e) => void changeStatus(t.id, e.target.value)}
                            className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 focus:border-amber-400 focus:outline-none"
                          >
                            {TRUCK_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        )}
                        <button type="button" onClick={() => setExpandedTruck(isOpen ? null : t.id)}
                          className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
                          {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          {isOpen ? "Hide" : "Details"}
                        </button>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isOpen && (
                      <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4 space-y-4">
                        {/* Truck photo large */}
                        {t.photoUrl && (
                          <div>
                            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Truck Photo</p>
                            <img src={t.photoUrl} alt={t.id} className="h-40 max-w-xs rounded-xl border border-slate-200 object-cover" />
                          </div>
                        )}

                        {/* Driver full details */}
                        {t.driver && (
                          <div>
                            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Driver Details</p>
                            <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-4">
                              <div className="flex flex-wrap gap-4 items-start">
                                {t.driver.photoUrl && <PhotoTile src={t.driver.photoUrl} label="Driver Photo" className="h-24 w-24" />}
                                {t.driver.nidPhotoUrl && <PhotoTile src={t.driver.nidPhotoUrl} label="NID" className="h-24 w-36" />}
                                {t.driver.licensePhotoUrl && <PhotoTile src={t.driver.licensePhotoUrl} label="License" className="h-24 w-36" />}
                                <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                                  {[
                                    { l: "Name",           v: t.driver.name },
                                    { l: "Phone",          v: t.driver.phone },
                                    { l: "NID",            v: t.driver.nid },
                                    { l: "License No.",    v: t.driver.license },
                                    { l: "License Expiry", v: t.driver.licenseExpiry },
                                    { l: "Address",        v: t.driver.address ?? "—" },
                                    { l: "Join Date",      v: t.driver.joinDate },
                                  ].map((f) => (
                                    <div key={f.l}>
                                      <p className="text-[10px] text-slate-400 font-medium">{f.l}</p>
                                      <p className="font-semibold text-slate-800">{f.v}</p>
                                    </div>
                                  ))}
                                  <div className="col-span-2 flex items-center gap-2">
                                    <ExpiryBadge expiry={t.driver.licenseExpiry} />
                                  </div>
                                </div>
                              </div>

                              {/* Emergency contact */}
                              {t.driver.emergencyContactName && (
                                <div className="border-t border-slate-100 pt-3 space-y-2">
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Emergency Contact</p>
                                  <div className="flex flex-wrap gap-4 items-start">
                                    {t.driver.emergencyContactPhotoUrl && (
                                      <PhotoTile src={t.driver.emergencyContactPhotoUrl} label="Photo" className="h-20 w-20" />
                                    )}
                                    {t.driver.emergencyContactNidPhotoUrl && (
                                      <PhotoTile src={t.driver.emergencyContactNidPhotoUrl} label="NID" className="h-20 w-32" />
                                    )}
                                    <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                                      {[
                                        { l: "Name",         v: t.driver.emergencyContactName },
                                        { l: "Relation",     v: t.driver.emergencyContactRelation ?? "—" },
                                        { l: "Phone",        v: t.driver.emergencyContactPhone ?? "—" },
                                        { l: "Address",      v: t.driver.emergencyContactAddress ?? "—" },
                                      ].map((f) => (
                                        <div key={f.l}>
                                          <p className="text-[10px] text-slate-400 font-medium">{f.l}</p>
                                          <p className="font-semibold text-slate-800">{f.v}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* DRIVERS TAB                                                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === "drivers" && (
        <div className="space-y-4">
          {expiring.length > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
              <AlertTriangle size={13} />
              {expiring.length} driver license{expiring.length > 1 ? "s" : ""} expiring soon or already expired — action required.
            </div>
          )}

          {drivers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
              <User size={32} className="mx-auto mb-3 text-slate-300" />
              <p className="font-medium text-slate-500">No drivers in fleet yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {drivers.map((d) => {
                const isOpen = expandedDriver === d.id;
                const expSt  = licenseStatus(d.licenseExpiry);
                return (
                  <div key={d.id} className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
                    expSt === "expired" ? "border-red-200" : expSt === "soon" ? "border-amber-200" : "border-slate-100"
                  }`}>
                    <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                      {/* Photo */}
                      {d.photoUrl ? (
                        <img src={d.photoUrl} alt={d.name} className="h-16 w-16 flex-shrink-0 rounded-full border border-slate-200 object-cover" />
                      ) : (
                        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-slate-100">
                          <User size={22} className="text-slate-400" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900">{d.name}</span>
                          <span className="font-mono text-[11px] text-slate-400">{d.id}</span>
                          <ExpiryBadge expiry={d.licenseExpiry} />
                        </div>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                          <Phone size={10} /> {d.phone}
                        </p>
                        {d.address && <p className="text-xs text-slate-400">{d.address}</p>}
                      </div>

                      {/* License quick view */}
                      <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-center">
                        <p className="text-[10px] text-slate-400">License</p>
                        <p className="font-semibold text-slate-700">{d.license}</p>
                        <p className={`text-[10px] ${expSt === "expired" ? "text-red-500 font-bold" : expSt === "soon" ? "text-amber-600 font-semibold" : "text-slate-400"}`}>
                          Exp: {d.licenseExpiry}
                        </p>
                      </div>

                      <button type="button" onClick={() => setExpandedDriver(isOpen ? null : d.id)}
                        className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
                        {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        {isOpen ? "Hide" : "Full Details"}
                      </button>
                    </div>

                    {/* Expanded */}
                    {isOpen && (
                      <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4 space-y-4">
                        {/* Documents */}
                        <div>
                          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Documents</p>
                          <div className="flex flex-wrap gap-4">
                            {d.photoUrl && <PhotoTile src={d.photoUrl} label="Driver Photo" className="h-24 w-24" />}
                            {d.nidPhotoUrl && <PhotoTile src={d.nidPhotoUrl} label="NID" className="h-24 w-36" />}
                            {d.licensePhotoUrl && <PhotoTile src={d.licensePhotoUrl} label="License" className="h-24 w-36" />}
                          </div>
                        </div>

                        {/* Info grid */}
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs sm:grid-cols-3">
                          {[
                            { l: "NID Number", v: d.nid },
                            { l: "Join Date",  v: d.joinDate },
                          ].map((f) => (
                            <div key={f.l}>
                              <p className="text-[10px] text-slate-400 font-medium">{f.l}</p>
                              <p className="font-semibold text-slate-800">{f.v}</p>
                            </div>
                          ))}
                        </div>

                        {/* Emergency contact */}
                        {d.emergencyContactName && (
                          <div className="space-y-2 border-t border-slate-100 pt-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Emergency Contact</p>
                            <div className="flex flex-wrap gap-4 items-start">
                              {d.emergencyContactPhotoUrl && <PhotoTile src={d.emergencyContactPhotoUrl} label="Photo" className="h-20 w-20" />}
                              {d.emergencyContactNidPhotoUrl && <PhotoTile src={d.emergencyContactNidPhotoUrl} label="NID" className="h-20 w-32" />}
                              <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                                {[
                                  { l: "Name",     v: d.emergencyContactName },
                                  { l: "Relation", v: d.emergencyContactRelation ?? "—" },
                                  { l: "Phone",    v: d.emergencyContactPhone ?? "—" },
                                  { l: "Address",  v: d.emergencyContactAddress ?? "—" },
                                ].map((f) => (
                                  <div key={f.l}>
                                    <p className="text-[10px] text-slate-400 font-medium">{f.l}</p>
                                    <p className="font-semibold text-slate-800">{f.v}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* DISPATCH TAB                                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === "dispatch" && (
        <div className="space-y-5">
          {/* Summary chips */}
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Pending",    value: pendingDisp.length,  color: "text-amber-700",   bg: "bg-amber-50 border-amber-100"   },
              { label: "Dispatched", value: dispatched.length,   color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100" },
              { label: "Trucks Ready", value: availTrucks.length, color: "text-slate-700",  bg: "bg-slate-50 border-slate-100"   },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl border px-4 py-2 text-center min-w-[100px] ${s.bg}`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>

          {orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
              <Package size={32} className="mx-auto mb-3 text-slate-300" />
              <p className="font-medium text-slate-500">No orders awaiting dispatch</p>
              <p className="mt-1 text-sm text-slate-400">Orders appear after QC approval and auction completion.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const step   = loadStep(order);
                const truck  = fleet.find((t) => t.id === order.assignedTruck);
                const isBusy = busy === order.id;
                return (
                  <div key={order.id} className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${order.dispatched ? "border-emerald-100" : "border-slate-100"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-4 p-5">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-slate-400">{order.id}</span>
                          <span className="text-slate-300">·</span>
                          <span className="font-mono text-xs text-slate-400">{order.lotId}</span>
                          {order.dispatched && (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">✓ Dispatched</span>
                          )}
                        </div>
                        <p className="text-base font-bold text-slate-900">{order.product}</p>
                        <p className="text-xs text-slate-500">{order.qty}</p>
                      </div>
                      <div className="flex gap-3">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-center min-w-[90px]">
                          <p className="text-[10px] text-slate-400">Winning Bid</p>
                          <p className="text-sm font-bold text-emerald-700">{order.winningBid}</p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-center min-w-[90px]">
                          <p className="text-[10px] text-slate-400">Total</p>
                          <p className="text-sm font-bold text-slate-800">{order.totalAmount}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 px-5 pb-4">
                      {[
                        { label: "Seller",         value: order.seller },
                        { label: "Buyer",          value: order.buyer },
                        { label: "Delivery Point", value: order.deliveryPoint },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2">
                          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
                          <p className="text-xs font-semibold text-slate-800">{value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-slate-50 px-5 py-4">
                      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Load Progress</p>
                      <LoadProgress order={order} />
                    </div>

                    {truck && (
                      <div className="mx-5 mb-4 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5">
                        {truck.photoUrl ? (
                          <img src={truck.photoUrl} alt={truck.id} className="h-8 w-12 rounded-lg object-cover border border-slate-200" />
                        ) : (
                          <Truck size={16} className="text-slate-400" />
                        )}
                        <div className="flex-1 text-xs">
                          <span className="font-semibold text-slate-800">{truck.id}</span>
                          <span className="mx-1.5 text-slate-300">·</span>
                          <span className="text-slate-600">{truck.reg} · {truck.type}</span>
                          {truck.driver && (
                            <><span className="mx-1.5 text-slate-300">·</span>
                            <span className="text-slate-600">Driver: {truck.driver.name} ({truck.driver.phone})</span></>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="border-t border-slate-100 px-5 py-3">
                      {step === 0 && (
                        <div className="flex flex-wrap items-center gap-3">
                          <select value={selectedTruck[order.id] ?? ""} onChange={(e) => setSelectedTruck((p) => ({ ...p, [order.id]: e.target.value }))}
                            className="flex-1 min-w-[200px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none">
                            <option value="">— Select a truck —</option>
                            {availTrucks.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.id} · {t.reg} · {t.type} ({t.capacityKg} kg){t.driver ? ` · ${t.driver.name}` : ""}
                              </option>
                            ))}
                          </select>
                          <button type="button" disabled={isBusy || !selectedTruck[order.id]}
                            onClick={() => void dispatchAction(order.id, { assignedTruck: selectedTruck[order.id] }, "Truck assigned!")}
                            className="rounded-xl bg-slate-800 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-900 transition disabled:opacity-40">
                            {isBusy ? "Assigning…" : "Assign Truck"}
                          </button>
                        </div>
                      )}
                      {step === 1 && (
                        <div className="flex items-center gap-3">
                          <button type="button" disabled={isBusy}
                            onClick={() => void dispatchAction(order.id, { loadConfirmed: true }, "Load confirmed!")}
                            className="rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition disabled:opacity-40">
                            {isBusy ? "Confirming…" : "Confirm Goods Loaded"}
                          </button>
                          <p className="text-xs text-slate-400">Verify lot is physically loaded onto the truck.</p>
                        </div>
                      )}
                      {step === 2 && (
                        <div className="flex items-center gap-3">
                          <button type="button" disabled={isBusy}
                            onClick={() => void dispatchAction(order.id, { dispatched: true }, "Order dispatched!")}
                            className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-40">
                            {isBusy ? "Dispatching…" : "Dispatch Now →"}
                          </button>
                          <p className="text-xs text-slate-400">Send truck to <span className="font-medium text-slate-600">{order.deliveryPoint}</span>.</p>
                        </div>
                      )}
                      {step === 3 && (
                        <p className="text-xs font-semibold text-emerald-700">✓ Dispatched — en route to {order.deliveryPoint}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* LIVE TRACKING TAB                                                     */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === "tracking" && (
        <div className="space-y-6">
          {inTransit.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
              <Navigation size={32} className="mx-auto mb-3 text-slate-300" />
              <p className="font-medium text-slate-500">No trucks currently in transit</p>
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                🟢 {inTransit.length} truck{inTransit.length > 1 ? "s" : ""} on the road — live GPS
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {inTransit.map((t) => {
                  const c = liveCoords[t.id];
                  const order = orders.find((o) => o.assignedTruck === t.id && !o.dispatched);
                  return (
                    <div key={t.id} className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
                        <div className="flex items-start gap-3">
                          {t.photoUrl ? (
                            <img src={t.photoUrl} alt={t.id} className="h-12 w-16 flex-shrink-0 rounded-xl border border-slate-100 object-cover" />
                          ) : (
                            <div className="flex h-12 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100">
                              <Truck size={18} className="text-slate-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900">{t.id} <span className="font-normal text-slate-500 text-sm">— {t.reg}</span></p>
                            <p className="text-xs text-slate-500">{t.type} · {t.capacityKg.toLocaleString()} kg</p>
                          </div>
                        </div>
                        <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                          Live
                        </span>
                      </div>

                      {/* Map placeholder / coordinates */}
                      <div className="mx-4 mb-4 overflow-hidden rounded-xl border border-slate-200">
                        {c ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`https://maps.googleapis.com/maps/api/staticmap?center=${c.lat},${c.lng}&zoom=14&size=600x200&markers=color:red%7C${c.lat},${c.lng}&key=REPLACE_WITH_API_KEY`}
                              alt="Map"
                              className="h-36 w-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                                (e.currentTarget.nextSibling as HTMLElement | null)?.removeAttribute("hidden");
                              }}
                            />
                            <div hidden className="flex h-36 flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-50 to-slate-100 text-slate-500">
                              <Navigation size={24} className="text-emerald-500" />
                              <span className="font-mono text-sm font-semibold text-slate-700">{c.lat.toFixed(5)}, {c.lng.toFixed(5)}</span>
                              <span className="text-xs text-slate-400">Live GPS (map API key not configured)</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex h-32 flex-col items-center justify-center gap-1 bg-slate-50 text-slate-400">
                            <Navigation size={20} />
                            <span className="text-xs">No GPS signal</span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="space-y-1.5 px-5 pb-4 text-xs text-slate-600">
                        {t.driver && (
                          <p className="flex items-center gap-1.5">
                            <User size={11} className="text-slate-400" />
                            <span className="font-medium">Driver:</span> {t.driver.name}
                            <span className="text-slate-400">({t.driver.phone})</span>
                          </p>
                        )}
                        {t.currentDestination && (
                          <p className="flex items-center gap-1.5">
                            <MapPin size={11} className="text-slate-400" />
                            <span className="font-medium">Destination:</span> {t.currentDestination}
                          </p>
                        )}
                        {order && (
                          <p className="flex items-center gap-1.5">
                            <Package size={11} className="text-slate-400" />
                            <span className="font-medium">Load:</span> {order.product} ({order.qty})
                          </p>
                        )}
                        {c && (
                          <p className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
                            <Clock size={10} />
                            Updated {new Date(c.updatedAt).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Other trucks quick status */}
          {fleet.filter((t) => t.status !== "IN_TRANSIT" && t.status.toLowerCase() !== "in transit").length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Other Trucks</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {fleet.filter((t) => t.status !== "IN_TRANSIT" && t.status.toLowerCase() !== "in transit").map((t) => {
                  const cfg = getStatusCfg(t.status);
                  return (
                    <div key={t.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4">
                      {t.photoUrl ? (
                        <img src={t.photoUrl} alt={t.id} className="h-10 w-14 flex-shrink-0 rounded-lg border border-slate-100 object-cover" />
                      ) : (
                        <div className="flex h-10 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                          <Truck size={15} className="text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm">{t.id} <span className="font-normal text-slate-400 text-xs">{t.reg}</span></p>
                        <p className="text-xs text-slate-500">{t.type}</p>
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* PENDING REGISTRATIONS TAB                                             */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === "pending" && (() => {
        const awaitingTrucks = pending.filter((t) => t.registrationStatus === "PENDING");
        const rejectedTrucks = pending.filter((t) => t.registrationStatus === "REJECTED");

        const renderCard = (t: PendingTruck, isRejectedCard: boolean) => {
          const isOpen   = expandedPending === t.id;
          const isActing = acting === t.id;
          const isRej    = !!showReject[t.id];
          const d        = t.driver;
          const headerBg = isRejectedCard ? "border-red-100 bg-red-50" : "border-amber-100 bg-amber-50";
          const cardBorder = isRejectedCard ? "border-red-200" : "border-amber-200";
          return (
            <div key={t.id} className={`overflow-hidden rounded-2xl border ${cardBorder} bg-white shadow-sm`}>
              {/* Header */}
              <div className={`flex flex-wrap items-start justify-between gap-3 border-b ${headerBg} px-5 py-4`}>
                <div className="flex items-start gap-3">
                  {t.photoUrl ? (
                    <img src={t.photoUrl} alt={t.id} className={`h-14 w-20 flex-shrink-0 rounded-xl border ${isRejectedCard ? "border-red-200" : "border-amber-200"} object-cover`} />
                  ) : (
                    <div className={`flex h-14 w-20 flex-shrink-0 items-center justify-center rounded-xl ${isRejectedCard ? "bg-red-100" : "bg-amber-100"} text-2xl`}>🚛</div>
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {isRejectedCard ? (
                        <span className="rounded-full bg-red-200 px-2 py-0.5 text-[10px] font-bold text-red-800">REJECTED</span>
                      ) : (
                        <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">PENDING</span>
                      )}
                      <span className="font-mono text-xs text-slate-400">
                        {new Date(t.submittedAt).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <p className="mt-0.5 text-base font-bold text-slate-900">{t.reg}</p>
                    <p className="text-xs text-slate-500">{t.type} · {t.capacityKg.toLocaleString()} kg</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {t.hubName && (
                        <span className="flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                          <MapPin size={8} /> {t.hubName}
                        </span>
                      )}
                      {t.submittedByName && (
                        <span className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          <User size={8} /> By {t.submittedByName}
                        </span>
                      )}
                    </div>
                    {isRejectedCard && t.registrationNote && (
                      <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-[11px] text-red-700 max-w-sm">
                        <XCircle size={11} className="mt-0.5 shrink-0" />
                        <span><span className="font-semibold">Reason:</span> {t.registrationNote}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button type="button"
                  onClick={() => setExpandedPending(isOpen ? null : t.id)}
                  className={`flex items-center gap-1.5 rounded-xl border ${isRejectedCard ? "border-red-200 text-red-700 hover:bg-red-50" : "border-amber-200 text-amber-700 hover:bg-amber-50"} bg-white px-3 py-1.5 text-xs font-semibold transition`}>
                  {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  {isOpen ? "Hide Details" : "Review Details"}
                </button>
              </div>

              {/* Driver details */}
              {isOpen && d && (
                <div className="px-5 py-4 space-y-5">
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Driver Information</p>
                    <div className="flex flex-wrap gap-4">
                      {d.photoUrl && <div className="flex-shrink-0"><img src={d.photoUrl} alt={d.name} className="h-20 w-20 rounded-xl border border-slate-200 object-cover" /><p className="mt-1 text-center text-[10px] text-slate-400">Driver</p></div>}
                      {d.nidPhotoUrl && <div className="flex-shrink-0"><img src={d.nidPhotoUrl} alt="NID" className="h-20 w-28 rounded-xl border border-slate-200 object-cover" /><p className="mt-1 text-center text-[10px] text-slate-400">NID</p></div>}
                      {d.licensePhotoUrl && <div className="flex-shrink-0"><img src={d.licensePhotoUrl} alt="License" className="h-20 w-28 rounded-xl border border-slate-200 object-cover" /><p className="mt-1 text-center text-[10px] text-slate-400">License</p></div>}
                      <div className="flex-1 min-w-[200px] grid gap-x-6 gap-y-2 sm:grid-cols-2 text-xs">
                        {[
                          { l: "Name",    v: d.name },
                          { l: "Phone",   v: d.phone },
                          { l: "Address", v: d.address ?? "—" },
                          { l: "NID",     v: d.nid },
                          { l: "License", v: d.license },
                          { l: "Expiry",  v: d.licenseExpiry },
                        ].map((f) => (
                          <div key={f.l}>
                            <p className="text-[10px] text-slate-400 font-medium">{f.l}</p>
                            <p className="font-semibold text-slate-800">{f.v}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {(d.emergencyContactName || d.emergencyContactPhone) && (
                    <div className="space-y-3 border-t border-slate-100 pt-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Emergency Contact</p>
                      <div className="flex flex-wrap gap-4">
                        {d.emergencyContactPhotoUrl && <div className="flex-shrink-0"><img src={d.emergencyContactPhotoUrl} alt="Contact" className="h-20 w-20 rounded-xl border border-slate-200 object-cover" /><p className="mt-1 text-center text-[10px] text-slate-400">Photo</p></div>}
                        {d.emergencyContactNidPhotoUrl && <div className="flex-shrink-0"><img src={d.emergencyContactNidPhotoUrl} alt="NID" className="h-20 w-28 rounded-xl border border-slate-200 object-cover" /><p className="mt-1 text-center text-[10px] text-slate-400">NID</p></div>}
                        <div className="flex-1 min-w-[180px] grid gap-x-6 gap-y-2 sm:grid-cols-2 text-xs">
                          {[
                            { l: "Name",     v: d.emergencyContactName ?? "—" },
                            { l: "Relation", v: d.emergencyContactRelation ?? "—" },
                            { l: "Phone",    v: d.emergencyContactPhone ?? "—" },
                            { l: "Address",  v: d.emergencyContactAddress ?? "—" },
                          ].map((f) => (
                            <div key={f.l}>
                              <p className="text-[10px] text-slate-400 font-medium">{f.l}</p>
                              <p className="font-semibold text-slate-800">{f.v}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action bar — only for PENDING cards */}
              {!isRejectedCard && (
                <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 space-y-2">
                  {isRej && (
                    <div className="flex gap-2">
                      <input
                        className="flex-1 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:border-red-400 focus:outline-none"
                        placeholder="Reason for rejection (optional)…"
                        value={rejectNote[t.id] ?? ""}
                        onChange={(e) => setRejectNote((p) => ({ ...p, [t.id]: e.target.value }))}
                      />
                      <button type="button" disabled={isActing} onClick={() => void decide(t.id, "reject")}
                        className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                        {isActing ? "…" : <><XCircle size={13} /> Confirm Reject</>}
                      </button>
                      <button type="button" onClick={() => setShowReject((p) => ({ ...p, [t.id]: false }))}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-white">Cancel</button>
                    </div>
                  )}
                  {!isRej && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" disabled={isActing} onClick={() => void decide(t.id, "approve")}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50">
                        {isActing ? <><Loader2 size={14} className="animate-spin" /> Processing…</> : <><CheckCircle2 size={15} /> Approve & Add to Fleet</>}
                      </button>
                      <button type="button" disabled={isActing}
                        onClick={() => setShowReject((p) => ({ ...p, [t.id]: true }))}
                        className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50">
                        <XCircle size={15} /> Reject
                      </button>
                      <button type="button" onClick={() => setExpandedPending(isOpen ? null : t.id)}
                        className="ml-auto flex items-center gap-1 text-xs font-semibold text-amber-600 hover:underline">
                        {isOpen ? "Hide details" : "Review details"} <ChevronRight size={12} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        };

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Truck Registration Requests</h2>
                <p className="text-xs text-slate-400 mt-0.5">Review submitted truck and driver details before approving to the active fleet.</p>
              </div>
              <button type="button" onClick={() => void reload()}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
                <RefreshCw size={12} /> Refresh
              </button>
            </div>

            {/* Awaiting Approval */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-700">Awaiting Approval</h3>
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">{awaitingTrucks.length}</span>
              </div>
              {awaitingTrucks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
                  <CheckCircle2 size={28} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-medium text-slate-500">No pending registrations</p>
                  <p className="mt-0.5 text-xs text-slate-400">New submissions from QC Leader will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">{awaitingTrucks.map((t) => renderCard(t, false))}</div>
              )}
            </div>

            {/* Rejected History */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-700">Rejected — History</h3>
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">{rejectedTrucks.length}</span>
              </div>
              {rejectedTrucks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
                  <p className="text-sm text-slate-400">No rejected registrations.</p>
                </div>
              ) : (
                <div className="space-y-4">{rejectedTrucks.map((t) => renderCard(t, true))}</div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
