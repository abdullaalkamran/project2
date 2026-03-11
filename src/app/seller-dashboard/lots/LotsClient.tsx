"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, X } from "lucide-react";
import api from "@/lib/api";
import LotLifecycleTracker from "@/components/LotLifecycleTracker";

type ActiveLot = {
  id: string;
  title: string;
  status: string;
  rawStatus: string;
  hub: string;
  askingPricePerKg: number;
  createdAt: string;
};

type PastLot = {
  id: string;
  title: string;
  status: string;
  rawStatus: string;
  hub: string;
  createdAt: string;
};

type SellerLotsResponse = {
  active: ActiveLot[];
  past: PastLot[];
};

const STATUS_COLORS: Record<string, string> = {
  "Waiting Hub Manager Approval":        "bg-amber-50 text-amber-700 border-amber-200",
  "Hub Received":                         "bg-cyan-50 text-cyan-700 border-cyan-200",
  "QC Check":                             "bg-blue-50 text-blue-700 border-blue-200",
  "Waiting QC Approval":                  "bg-violet-50 text-violet-700 border-violet-200",
  "QC Passed":                            "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Approved in Marketplace":              "bg-emerald-50 text-emerald-700 border-emerald-200",
  Live:                                   "bg-emerald-50 text-emerald-700 border-emerald-200",
  Sold:                                   "bg-emerald-50 text-emerald-700 border-emerald-200",
  "QC Failed":                            "bg-rose-50 text-rose-600 border-rose-200",
  "Action Required: Auction Unsold":      "bg-orange-50 text-orange-700 border-orange-300",
  "Price Under Review":                   "bg-violet-50 text-violet-700 border-violet-200",
};

function statusClass(status: string): string {
  return STATUS_COLORS[status] ?? "bg-slate-100 text-slate-700 border-slate-200";
}


// ─── Main component ────────────────────────────────────────────────────────────

export default function LotsClient() {
  const [active, setActive] = useState<ActiveLot[]>([]);
  const [past, setPast] = useState<PastLot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>("All");
  const [pastStatusFilter, setPastStatusFilter] = useState<string>("All");
  const [actionLot, setActionLot] = useState<ActiveLot | null>(null);
  const [actionTab, setActionTab] = useState<"reschedule" | "fixed">("reschedule");
  const [newAuctionEnd, setNewAuctionEnd] = useState("");
  const [fixedPrice, setFixedPrice] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<SellerLotsResponse>("/api/seller-dashboard/lots");
        setActive(res.active ?? []);
        setPast(res.past ?? []);
      } catch {
        setActive([]);
        setPast([]);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const activeStatuses = useMemo(
    () => ["All", ...Array.from(new Set(active.map((lot) => lot.status)))],
    [active],
  );
  const pastStatuses = useMemo(
    () => ["All", ...Array.from(new Set(past.map((lot) => lot.status)))],
    [past],
  );

  const filteredActive = useMemo(() => {
    const q = query.trim().toLowerCase();
    return active.filter((lot) => {
      const matchesStatus = activeStatusFilter === "All" || lot.status === activeStatusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      return (
        lot.id.toLowerCase().includes(q) ||
        lot.title.toLowerCase().includes(q) ||
        lot.hub.toLowerCase().includes(q) ||
        lot.status.toLowerCase().includes(q)
      );
    });
  }, [active, query, activeStatusFilter]);

  const filteredPast = useMemo(() => {
    const q = query.trim().toLowerCase();
    return past.filter((lot) => {
      const matchesStatus = pastStatusFilter === "All" || lot.status === pastStatusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      return (
        lot.id.toLowerCase().includes(q) ||
        lot.title.toLowerCase().includes(q) ||
        lot.hub.toLowerCase().includes(q) ||
        lot.status.toLowerCase().includes(q)
      );
    });
  }, [past, query, pastStatusFilter]);

  async function handleReschedule() {
    if (!actionLot || !newAuctionEnd) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await api.post(`/api/seller-dashboard/lots/${actionLot.id}/reschedule`, { auctionEndsAt: newAuctionEnd });
      setActive((prev) => prev.map((l) => l.id === actionLot.id ? { ...l, status: "QC Passed" } : l));
      setActionLot(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to reschedule");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConvertToFixed() {
    if (!actionLot || !fixedPrice) return;
    const price = parseFloat(fixedPrice);
    if (isNaN(price) || price <= 0) { setActionError("Enter a valid price"); return; }
    setActionLoading(true);
    setActionError(null);
    try {
      await api.post(`/api/seller-dashboard/lots/${actionLot.id}/convert-to-fixed`, { fixedAskingPrice: price });
      setActive((prev) => prev.map((l) => l.id === actionLot.id ? { ...l, status: "Price Under Review" } : l));
      setActionLot(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to convert");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-10">
      {/* ── Action Required Modal ── */}
      {actionLot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            {/* Modal header */}
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <p className="font-bold text-slate-900">Action Required</p>
                <p className="mt-0.5 text-xs text-slate-500 font-mono">{actionLot.id} · {actionLot.title}</p>
              </div>
              <button type="button" onClick={() => setActionLot(null)} className="text-slate-400 hover:text-slate-600 transition">
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-slate-100 px-6 pt-4">
              {(["reschedule", "fixed"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setActionTab(t); setActionError(null); }}
                  className={`pb-3 px-1 text-sm font-semibold border-b-2 transition
                    ${actionTab === t ? "border-emerald-500 text-emerald-700" : "border-transparent text-slate-400 hover:text-slate-600"}`}
                >
                  {t === "reschedule" ? "Reschedule Auction" : "Convert to Fixed Price"}
                </button>
              ))}
            </div>

            <div className="px-6 py-5 space-y-4">
              {actionTab === "reschedule" ? (
                <>
                  <p className="text-sm text-slate-600">Set a new end time for the live auction. The lot will be sent for <strong>hub manager and QC leader re-approval</strong> before going live again.</p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">New Auction End Date & Time</label>
                    <input
                      type="datetime-local"
                      value={newAuctionEnd}
                      onChange={(e) => setNewAuctionEnd(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400"
                    />
                  </div>
                  {actionError && <p className="text-xs text-red-600">{actionError}</p>}
                  <button
                    type="button"
                    onClick={handleReschedule}
                    disabled={actionLoading || !newAuctionEnd}
                    className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {actionLoading ? "Rescheduling…" : "Reschedule Auction"}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-600">Convert this lot to a <strong>Fixed Price</strong> listing. The price will be reviewed by the QC team and Hub Manager before going live.</p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Fixed Asking Price (৳ per kg)</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">৳</span>
                      <input
                        type="number"
                        min="1"
                        value={fixedPrice}
                        onChange={(e) => setFixedPrice(e.target.value)}
                        placeholder="e.g. 45"
                        className="w-full rounded-xl border border-slate-200 py-2.5 pl-7 pr-3 text-sm outline-none focus:border-violet-400"
                      />
                    </div>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                    Notifications will be sent to: <strong>QC Leader, QC Checker, Hub Manager</strong> for a 2nd approval cycle.
                  </div>
                  {actionError && <p className="text-xs text-red-600">{actionError}</p>}
                  <button
                    type="button"
                    onClick={handleConvertToFixed}
                    disabled={actionLoading || !fixedPrice}
                    className="w-full rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
                  >
                    {actionLoading ? "Submitting…" : "Submit for Fixed Price Review"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">My Lots</h1>
          <p className="text-slate-500">Manage active, pending, and past auction lots.</p>
        </div>
        <Link
          href="/seller-dashboard/create-lot"
          className="rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600"
        >
          + Add Product / Create Lot
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by lot, product, hub, status"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-400"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <SlidersHorizontal size={14} />
            <span>Interactive row grid view</span>
          </div>
        </div>
      </div>

      {/* ── Active & Pending ── */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Active & Pending</h2>
        <div className="flex flex-wrap gap-2">
          {activeStatuses.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setActiveStatusFilter(status)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                activeStatusFilter === status
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {!isLoading && filteredActive.length === 0 && (
            <div className="rounded-2xl border border-slate-100 bg-white p-5 text-sm text-slate-500 shadow-sm">
              No active or pending lots found.
            </div>
          )}
          {filteredActive.map((lot) => (
            <div key={lot.id} className="rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="grid gap-3 p-4 md:grid-cols-12">
                <div className="md:col-span-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Lot ID</p>
                  <p className="font-mono text-xs text-slate-600">{lot.id}</p>
                </div>
                <div className="md:col-span-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Product</p>
                  <p className="text-sm font-semibold text-slate-900">{lot.title}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Hub</p>
                  <p className="text-xs text-slate-700">{lot.hub}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Asking Price</p>
                  <p className="text-xs font-semibold text-slate-700">৳ {lot.askingPricePerKg.toLocaleString()}/kg</p>
                </div>
                <div className="md:col-span-1">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Created</p>
                  <p className="text-xs text-slate-700">{lot.createdAt}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Status</p>
                  <span className={`mt-0.5 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusClass(lot.status)}`}>
                    {lot.status}
                  </span>
                </div>
              </div>

              {/* Progress tracker */}
              <div className="border-t border-slate-100 px-5 pb-4 pt-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Journey</p>
                <LotLifecycleTracker lotStatus={lot.rawStatus} compact />
              </div>

              {/* Action Required banner */}
              {lot.status === "Action Required: Auction Unsold" && (
                <div className="border-t border-orange-200 bg-orange-50 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm text-orange-800">
                    <span>⚠️</span>
                    <span className="font-semibold">Auction ended with no bids.</span>
                    <span className="text-xs">Reschedule or convert to fixed price.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setActionLot(lot); setActionTab("reschedule"); setActionError(null); setNewAuctionEnd(""); setFixedPrice(""); }}
                    className="shrink-0 rounded-lg bg-orange-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-700"
                  >
                    Take Action →
                  </button>
                </div>
              )}

              {/* Fixed price review info */}
              {lot.status === "Price Under Review" && (
                <div className="border-t border-violet-200 bg-violet-50 px-5 py-3 flex items-center gap-2 text-xs text-violet-800">
                  <span>🔬</span>
                  <span>Your fixed price is being reviewed by the QC team and Hub Manager.</span>
                </div>
              )}

              <div className="border-t border-slate-100 px-4 py-2.5">
                <Link
                  href={`/seller-dashboard/lots/${lot.id}`}
                  className="text-xs font-semibold text-emerald-700 hover:underline"
                >
                  View details
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Auction History ── */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Auction History</h2>
        <div className="flex flex-wrap gap-2">
          {pastStatuses.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setPastStatusFilter(status)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                pastStatusFilter === status
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {!isLoading && filteredPast.length === 0 && (
            <div className="rounded-2xl border border-slate-100 bg-white p-5 text-sm text-slate-500 shadow-sm">
              No completed lots found.
            </div>
          )}
          {filteredPast.map((lot) => (
            <div key={lot.id} className="rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="grid gap-3 p-4 md:grid-cols-12">
                <div className="md:col-span-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Lot ID</p>
                  <p className="font-mono text-xs text-slate-600">{lot.id}</p>
                </div>
                <div className="md:col-span-4">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Product</p>
                  <p className="text-sm font-semibold text-slate-900">{lot.title}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Hub</p>
                  <p className="text-xs text-slate-700">{lot.hub}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Date</p>
                  <p className="text-xs text-slate-700">{lot.createdAt}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Result</p>
                  <span className={`mt-0.5 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusClass(lot.status)}`}>
                    {lot.status}
                  </span>
                </div>
              </div>

              {/* Progress tracker */}
              <div className="border-t border-slate-100 px-5 pb-4 pt-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Journey</p>
                <LotLifecycleTracker lotStatus={lot.rawStatus} compact />
              </div>

              <div className="border-t border-slate-100 px-4 py-2.5">
                <Link
                  href={`/seller-dashboard/lots/${lot.id}`}
                  className="text-xs font-semibold text-emerald-700 hover:underline"
                >
                  View details
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
