"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 10;

type StaffMember = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  joined: string;
  roles: string[];
  primaryRole: string;
};

const ROLE_LABEL: Record<string, string> = {
  hub_manager: "Hub Manager",
  qc_leader: "QC Team Leader",
  qc_checker: "QC Checker",
  delivery_hub_manager: "Delivery Hub Mgr",
  delivery_distributor: "Delivery Point",
  admin: "Admin",
};

const roleColors: Record<string, string> = {
  hub_manager: "bg-blue-50 text-blue-700",
  qc_checker: "bg-purple-50 text-purple-700",
  qc_leader: "bg-violet-50 text-violet-700",
  delivery_hub_manager: "bg-teal-50 text-teal-700",
  delivery_distributor: "bg-teal-50 text-teal-600",
  admin: "bg-indigo-50 text-indigo-700",
};

const FILTER_OPTIONS = [
  { label: "All", value: "All" },
  { label: "Hub Manager", value: "hub_manager" },
  { label: "QC Team Leader", value: "qc_leader" },
  { label: "QC Checker", value: "qc_checker" },
  { label: "Delivery", value: "delivery_distributor" },
  { label: "Admin", value: "admin" },
];

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/staff")
      .then((r) => r.json())
      .then((data) => { setStaff(data); setLoading(false); });
  }, []);

  async function removeStaff(member: StaffMember) {
    if (!confirm(`Remove all staff roles from ${member.name}?`)) return;
    setRemoving(member.id);
    for (const role of member.roles) {
      await fetch(`/api/admin/users/${member.id}/roles`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
    }
    setStaff((prev) => prev.filter((s) => s.id !== member.id));
    setRemoving(null);
  }

  const filtered = staff.filter((s) => {
    const matchRole =
      filter === "All" ||
      s.roles.includes(filter) ||
      (filter === "delivery_distributor" &&
        (s.roles.includes("delivery_distributor") || s.roles.includes("delivery_hub_manager")));
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <nav className="text-xs text-slate-400">
            <Link href="/admin/users" className="hover:text-slate-600">Users</Link> / Staff
          </nav>
          <h1 className="text-2xl font-bold text-slate-900">Staff</h1>
          <p className="text-slate-500">Manage hub managers, QC team, and delivery point operators.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full max-w-xs rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none ring-indigo-100 focus:ring-2"
        />
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => { setFilter(r.value); setPage(1); }}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition ${
                filter === r.value
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Roles</th>
              <th className="px-5 py-3">Phone</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Joined</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-slate-400">Loading…</td>
              </tr>
            ) : paginated.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-medium text-slate-900">{s.name}</td>
                <td className="px-5 py-3 text-slate-600">{s.email}</td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1">
                    {s.roles.map((r) => (
                      <span key={r} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${roleColors[r] ?? "bg-slate-100 text-slate-600"}`}>
                        {ROLE_LABEL[r] ?? r}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3 text-slate-600">{s.phone}</td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    s.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                  }`}>
                    {s.status === "ACTIVE" ? "Active" : s.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-slate-500">{s.joined}</td>
                <td className="px-5 py-3">
                  <button
                    type="button"
                    disabled={removing === s.id}
                    onClick={() => removeStaff(s)}
                    className="rounded-lg border border-red-100 px-3 py-1 text-xs font-semibold text-red-500 hover:bg-red-50 disabled:opacity-50"
                  >
                    {removing === s.id ? "…" : "Remove"}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-slate-400">No staff found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-2" />
    </div>
  );
}
