"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 10;

type Seller = {
  id: string;
  name: string;
  email: string;
  phone: string;
  isVerified: boolean;
  status: string;
  joined: string;
  lots: number;
  revenue: number;
};

function fmtBDT(n: number) {
  return "৳ " + n.toLocaleString("en-IN");
}

const statusLabel: Record<string, string> = {
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  PENDING: "Pending Approval",
};

const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  SUSPENDED: "bg-red-50 text-red-600",
  PENDING: "bg-orange-50 text-orange-600",
};

export default function AdminSellersPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/sellers")
      .then((r) => r.json())
      .then((data) => { setSellers(data); setLoading(false); });
  }, []);

  async function setStatus(seller: Seller, next: string) {
    setSaving(seller.id);
    await fetch(`/api/admin/users/${seller.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setSellers((prev) => prev.map((s) => s.id === seller.id ? { ...s, status: next } : s));
    setSaving(null);
  }

  async function toggleVerify(seller: Seller) {
    setVerifying(seller.id);
    try {
      await fetch(`/api/admin/users/${seller.id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified: !seller.isVerified }),
      });
      setSellers((prev) =>
        prev.map((s) => s.id === seller.id ? { ...s, isVerified: !s.isVerified } : s)
      );
      toast.success(seller.isVerified ? "Verification removed" : "Seller verified");
    } catch {
      toast.error("Failed to update verification");
    } finally {
      setVerifying(null);
    }
  }

  const filtered = sellers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <nav className="text-xs text-slate-400">
            <Link href="/admin/users" className="hover:text-slate-600">Users</Link> / Sellers
          </nav>
          <h1 className="text-2xl font-bold text-slate-900">Sellers</h1>
          <p className="text-slate-500">
            {loading ? "Loading…" : `${sellers.length} registered seller${sellers.length !== 1 ? "s" : ""} on the platform.`}
          </p>
        </div>
      </div>

      <input
        type="text"
        placeholder="Search by name or email…"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="w-full max-w-sm rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none ring-indigo-100 focus:ring-2"
      />

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Phone</th>
              <th className="px-5 py-3">Lots</th>
              <th className="px-5 py-3">Revenue</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Joined</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-slate-400">Loading…</td>
              </tr>
            ) : paginated.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{s.name}</span>
                    {s.isVerified && (
                      <span title="Verified" className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold text-white">✓</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3 text-slate-600">{s.email}</td>
                <td className="px-5 py-3 text-slate-600">{s.phone}</td>
                <td className="px-5 py-3 text-slate-600">{s.lots}</td>
                <td className="px-5 py-3 font-semibold text-slate-700">{fmtBDT(s.revenue)}</td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[s.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {statusLabel[s.status] ?? s.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-slate-500">{s.joined}</td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={verifying === s.id}
                      onClick={() => toggleVerify(s)}
                      className={`text-xs font-semibold hover:underline disabled:opacity-50 ${s.isVerified ? "text-slate-400" : "text-blue-600"}`}
                    >
                      {verifying === s.id ? "…" : s.isVerified ? "Unverify" : "Verify"}
                    </button>
                    {s.status === "PENDING" && (
                      <button
                        type="button"
                        disabled={saving === s.id}
                        onClick={() => setStatus(s, "ACTIVE")}
                        className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                      >
                        {saving === s.id ? "…" : "Approve"}
                      </button>
                    )}
                    {s.status !== "SUSPENDED" ? (
                      <button
                        type="button"
                        disabled={saving === s.id}
                        onClick={() => setStatus(s, "SUSPENDED")}
                        className="rounded-lg border border-red-100 px-3 py-1 text-xs font-semibold text-red-500 hover:bg-red-50 disabled:opacity-50"
                      >
                        {saving === s.id ? "…" : "Suspend"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={saving === s.id}
                        onClick={() => setStatus(s, "ACTIVE")}
                        className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                      >
                        {saving === s.id ? "…" : "Reinstate"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-slate-400">No sellers found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-2" />
    </div>
  );
}
