"use client";

import { useEffect, useState } from "react";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 15;

type Lot = {
  id: string;
  lotCode: string;
  title: string;
  seller: string;
  basePrice: number;
  status: string;
  bids: number;
  auctionEndsAt: string | null;
  createdAt: string;
};

function fmtBDT(n: number) {
  return "৳ " + n.toLocaleString("en-IN");
}

function fmtEnds(endsAt: string | null, status: string): string {
  if (!endsAt) return "—";
  const d = new Date(endsAt);
  const now = new Date();
  if (status !== "LIVE") return d.toLocaleDateString("en-BD", { month: "short", day: "numeric" });
  const ms = d.getTime() - now.getTime();
  if (ms <= 0) return "Ended";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  LIVE:             { label: "Live",             color: "bg-emerald-50 text-emerald-700" },
  QC_PASSED:        { label: "Upcoming",         color: "bg-blue-50 text-blue-700" },
  IN_QC:            { label: "QC Pending",       color: "bg-orange-50 text-orange-600" },
  QC_SUBMITTED:     { label: "QC Pending",       color: "bg-orange-50 text-orange-600" },
  QC_FAILED:        { label: "QC Failed",        color: "bg-red-50 text-red-600" },
  AUCTION_ENDED:    { label: "Ended",            color: "bg-slate-100 text-slate-500" },
  PENDING_DELIVERY: { label: "Pending Delivery", color: "bg-slate-50 text-slate-600" },
  AT_HUB:           { label: "At Hub",           color: "bg-sky-50 text-sky-700" },
};

const FILTERS = ["All", "Live", "QC Pending", "Upcoming", "Ended"];

function filterMatch(status: string, filter: string) {
  if (filter === "All") return true;
  if (filter === "Live") return status === "LIVE";
  if (filter === "QC Pending") return ["IN_QC", "QC_SUBMITTED"].includes(status);
  if (filter === "Upcoming") return status === "QC_PASSED";
  if (filter === "Ended") return status === "AUCTION_ENDED";
  return true;
}

export default function AdminAuctionsPage() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/auctions")
      .then((r) => r.json())
      .then((data) => { setLots(data); setLoading(false); });
  }, []);

  async function forceEnd(lot: Lot) {
    if (!confirm(`Force-end auction for ${lot.lotCode}?`)) return;
    setActing(lot.id);
    await fetch(`/api/admin/auctions/${lot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "AUCTION_ENDED" }),
    });
    setLots((prev) => prev.map((l) => l.id === lot.id ? { ...l, status: "AUCTION_ENDED" } : l));
    setActing(null);
  }

  const filtered = lots.filter((l) =>
    filterMatch(l.status, filter) &&
    (l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.lotCode.toLowerCase().includes(search.toLowerCase()) ||
      l.seller.toLowerCase().includes(search.toLowerCase()))
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Auction Control</h1>
        <p className="text-slate-500">
          {loading ? "Loading…" : `${lots.length} total lots across all statuses.`}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search lot, seller…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full max-w-xs rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none ring-indigo-100 focus:ring-2"
        />
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => { setFilter(f); setPage(1); }}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition ${
                filter === f
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-5 py-3 text-left">Lot ID</th>
              <th className="px-5 py-3 text-left">Title</th>
              <th className="px-5 py-3 text-left">Seller</th>
              <th className="px-5 py-3 text-left">Base Price</th>
              <th className="px-5 py-3 text-left">Bids</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-left">Ends</th>
              <th className="px-5 py-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-slate-400">Loading…</td>
              </tr>
            ) : paginated.map((l) => {
              const st = STATUS_MAP[l.status] ?? { label: l.status, color: "bg-slate-100 text-slate-500" };
              return (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-mono text-xs text-slate-500">{l.lotCode}</td>
                  <td className="px-5 py-4 font-medium text-slate-900 max-w-[200px] truncate">{l.title}</td>
                  <td className="px-5 py-4 text-slate-500">{l.seller}</td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{fmtBDT(l.basePrice)}</td>
                  <td className="px-5 py-4 text-slate-700">{l.bids}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${st.color}`}>{st.label}</span>
                  </td>
                  <td className="px-5 py-4 text-slate-500">{fmtEnds(l.auctionEndsAt, l.status)}</td>
                  <td className="px-5 py-4">
                    {l.status === "LIVE" && (
                      <button
                        type="button"
                        disabled={acting === l.id}
                        onClick={() => forceEnd(l)}
                        className="text-xs font-semibold text-red-500 hover:underline disabled:opacity-50"
                      >
                        {acting === l.id ? "…" : "Force End"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-slate-400">No lots found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-2" />
    </div>
  );
}
