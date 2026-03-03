"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 10;

type Buyer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  isVerified: boolean;
  status: string;
  joined: string;
  orders: number;
  spent: number;
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

export default function AdminBuyersPage() {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/buyers")
      .then((r) => r.json())
      .then((data) => { setBuyers(data); setLoading(false); });
  }, []);

  async function toggleStatus(buyer: Buyer) {
    const next = buyer.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setSaving(buyer.id);
    await fetch(`/api/admin/users/${buyer.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBuyers((prev) => prev.map((b) => b.id === buyer.id ? { ...b, status: next } : b));
    setSaving(null);
  }

  async function toggleVerify(buyer: Buyer) {
    setVerifying(buyer.id);
    try {
      await fetch(`/api/admin/users/${buyer.id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified: !buyer.isVerified }),
      });
      setBuyers((prev) =>
        prev.map((b) => b.id === buyer.id ? { ...b, isVerified: !b.isVerified } : b)
      );
      toast.success(buyer.isVerified ? "Verification removed" : "Buyer verified");
    } catch {
      toast.error("Failed to update verification");
    } finally {
      setVerifying(null);
    }
  }

  const filtered = buyers.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <nav className="text-xs text-slate-400">
            <Link href="/admin/users" className="hover:text-slate-600">Users</Link> / Buyers
          </nav>
          <h1 className="text-2xl font-bold text-slate-900">Buyers</h1>
          <p className="text-slate-500">
            {loading ? "Loading…" : `${buyers.length} registered buyer${buyers.length !== 1 ? "s" : ""} on the platform.`}
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
              <th className="px-5 py-3">Orders</th>
              <th className="px-5 py-3">Total Spent</th>
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
            ) : paginated.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{b.name}</span>
                    {b.isVerified && (
                      <span title="Verified" className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold text-white">✓</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3 text-slate-600">{b.email}</td>
                <td className="px-5 py-3 text-slate-600">{b.phone}</td>
                <td className="px-5 py-3 text-slate-600">{b.orders}</td>
                <td className="px-5 py-3 font-semibold text-slate-700">{fmtBDT(b.spent)}</td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[b.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {statusLabel[b.status] ?? b.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-slate-500">{b.joined}</td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={verifying === b.id}
                      onClick={() => toggleVerify(b)}
                      className={`text-xs font-semibold hover:underline disabled:opacity-50 ${b.isVerified ? "text-slate-400" : "text-blue-600"}`}
                    >
                      {verifying === b.id ? "…" : b.isVerified ? "Unverify" : "Verify"}
                    </button>
                    <button
                      type="button"
                      disabled={saving === b.id}
                      onClick={() => toggleStatus(b)}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold disabled:opacity-50 ${
                        b.status === "SUSPENDED"
                          ? "bg-emerald-500 text-white hover:bg-emerald-600"
                          : "border border-red-100 text-red-500 hover:bg-red-50"
                      }`}
                    >
                      {saving === b.id ? "…" : b.status === "SUSPENDED" ? "Reinstate" : "Suspend"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-slate-400">No buyers found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-2" />
    </div>
  );
}
