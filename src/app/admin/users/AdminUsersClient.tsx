"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 12;

const ALL_ROLES = [
  { value: "buyer",                label: "Buyer" },
  { value: "seller",               label: "Seller" },
  { value: "admin",                label: "Admin" },
  { value: "hub_manager",          label: "Hub Manager" },
  { value: "qc_leader",            label: "QC Leader" },
  { value: "qc_checker",           label: "QC Checker" },
  { value: "delivery_hub_manager", label: "Delivery Hub Mgr" },
  { value: "delivery_distributor", label: "Delivery Man" },
];

const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  ALL_ROLES.map((r) => [r.value, r.label])
);

const AVATAR_COLORS = [
  "bg-indigo-500","bg-violet-500","bg-pink-500",
  "bg-emerald-500","bg-amber-500","bg-sky-500",
  "bg-rose-500","bg-teal-500","bg-orange-500","bg-cyan-500",
];

function avatarColor(name: string) {
  let s = 0; for (const c of name) s += c.charCodeAt(0);
  return AVATAR_COLORS[s % AVATAR_COLORS.length];
}
function initials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

interface User {
  id: string; name: string; email: string; phone: string | null;
  photo: string | null; status: string; isVerified: boolean;
  roles: string[]; createdAt: string;
}

/* ── Role Modal ─────────────────────────────────────────── */
function RoleModal({ user, onClose, onSaved }: {
  user: User; onClose: () => void; onSaved: (u: User) => void;
}) {
  const [sel, setSel] = useState(new Set(user.roles));
  const [saving, setSaving] = useState(false);

  const toggle = (r: string) => setSel(prev => {
    const n = new Set(prev); n.has(r) ? n.delete(r) : n.add(r); return n;
  });

  const save = async () => {
    setSaving(true);
    try {
      const toAdd    = ALL_ROLES.map(r => r.value).filter(r => sel.has(r) && !user.roles.includes(r));
      const toRemove = user.roles.filter(r => !sel.has(r));
      for (const role of toAdd)
        await fetch(`/api/admin/users/${user.id}/roles`, { method: "POST",   headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
      for (const role of toRemove)
        await fetch(`/api/admin/users/${user.id}/roles`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
      onSaved({ ...user, roles: [...sel] });
      toast.success("Roles updated"); onClose();
    } catch { toast.error("Failed"); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-5">
          <div className={`h-10 w-10 rounded-full ${avatarColor(user.name)} flex items-center justify-center`}>
            <span className="text-sm font-bold text-white">{initials(user.name)}</span>
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">{user.name}</p>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Assign Roles</p>
        <div className="space-y-2 mb-6">
          {ALL_ROLES.map(r => (
            <label key={r.value} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-slate-50 cursor-pointer">
              <input type="checkbox" checked={sel.has(r.value)} onChange={() => toggle(r.value)}
                className="h-4 w-4 rounded border-slate-300 accent-indigo-600" />
              <span className="text-sm font-medium text-slate-800">{r.label}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={save} disabled={saving}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────── */
export default function AdminUsersPage() {
  const [users, setUsers]       = useState<User[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [roleFilter,   setRoleFilter]   = useState("All");
  const [page, setPage]         = useState(1);
  const [roleModal, setRoleModal] = useState<User | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/users")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setUsers(d); })
      .catch(() => toast.error("Failed to load users"))
      .finally(() => setLoading(false));
  }, []);

  const toggleStatus = async (u: User) => {
    const next = u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setToggling(u.id);
    try {
      await fetch(`/api/admin/users/${u.id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: next } : x));
      toast.success(`Account ${next === "ACTIVE" ? "activated" : "deactivated"}`);
    } catch { toast.error("Failed"); } finally { setToggling(null); }
  };

  const exportCSV = () => {
    const header = "Name,Email,Phone,Roles,Status,Verified,Joined";
    const rows = users.map(u =>
      [u.name, u.email, u.phone ?? "", u.roles.map(r => ROLE_LABELS[r] ?? r).join(";"),
       u.status, u.isVerified ? "Yes" : "No",
       new Date(u.createdAt).toLocaleDateString()].join(",")
    );
    const csv  = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `users-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  /* computed stats */
  const totalCount    = users.length;
  const activeCount   = users.filter(u => u.status === "ACTIVE").length;
  const suspendCount  = users.filter(u => u.status === "SUSPENDED").length;
  const pendingCount  = users.filter(u => u.status === "PENDING").length;
  const verifiedCount = users.filter(u => u.isVerified).length;

  const roleFilterVal = ALL_ROLES.find(r => r.label === roleFilter)?.value;

  const filtered = users.filter(u => {
    const s = search.toLowerCase();
    const matchSearch = u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) ||
      (u.phone ?? "").includes(s);
    const matchStatus = statusFilter === "All" || u.status === statusFilter;
    const matchRole   = roleFilter   === "All" || (roleFilterVal && u.roles.includes(roleFilterVal));
    return matchSearch && matchStatus && matchRole;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const STATUS_TABS = [
    { label: "All",       count: totalCount,   color: "text-slate-700" },
    { label: "ACTIVE",    count: activeCount,  color: "text-emerald-700" },
    { label: "SUSPENDED", count: suspendCount, color: "text-red-600" },
    { label: "PENDING",   count: pendingCount, color: "text-orange-600" },
  ];

  return (
    <div className="space-y-6">
      {roleModal && (
        <RoleModal user={roleModal} onClose={() => setRoleModal(null)}
          onSaved={u => { setUsers(prev => prev.map(x => x.id === u.id ? u : x)); setRoleModal(null); }} />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All Users</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {loading ? "Loading…" : `${totalCount} registered accounts on the platform`}
          </p>
        </div>
        <button type="button" onClick={exportCSV}
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a1 1 0 001 1h16a1 1 0 001-1v-3" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Stat cards */}
      {!loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: "Total",     val: totalCount,    bg: "bg-slate-50",    text: "text-slate-900" },
            { label: "Active",    val: activeCount,   bg: "bg-emerald-50",  text: "text-emerald-700" },
            { label: "Suspended", val: suspendCount,  bg: "bg-red-50",      text: "text-red-600" },
            { label: "Pending",   val: pendingCount,  bg: "bg-orange-50",   text: "text-orange-600" },
            { label: "Verified",  val: verifiedCount, bg: "bg-blue-50",     text: "text-blue-700" },
          ].map(c => (
            <div key={c.label} className={`rounded-2xl border border-slate-100 ${c.bg} p-4 shadow-sm`}>
              <p className="text-xs text-slate-500">{c.label}</p>
              <p className={`mt-1 text-2xl font-bold ${c.text}`}>{c.val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3">
        {/* Status tabs */}
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
          {STATUS_TABS.map(t => (
            <button key={t.label} type="button"
              onClick={() => { setStatusFilter(t.label); setPage(1); }}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                statusFilter === t.label
                  ? "bg-white shadow text-slate-900"
                  : "text-slate-500 hover:text-slate-700"
              }`}>
              {t.label === "All" ? "All" : t.label.charAt(0) + t.label.slice(1).toLowerCase()}
              {" "}<span className={`ml-1 ${statusFilter === t.label ? t.color : "text-slate-400"}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search + role filter */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="Search name, email, phone…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 w-72" />
          </div>
          <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white text-slate-700">
            <option value="All">All Roles</option>
            {ALL_ROLES.map(r => <option key={r.value} value={r.label}>{r.label}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/60">
            <tr className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3.5 text-left">User</th>
              <th className="px-5 py-3.5 text-left">Phone</th>
              <th className="px-5 py-3.5 text-left">Roles</th>
              <th className="px-5 py-3.5 text-left">Status</th>
              <th className="px-5 py-3.5 text-left">Joined</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td colSpan={6} className="px-5 py-4">
                    <div className="h-8 animate-pulse rounded-lg bg-slate-100" />
                  </td>
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                  </div>
                  <p className="font-semibold text-slate-700">No users found</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters</p>
                </td>
              </tr>
            ) : paginated.map(u => (
              <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                {/* Avatar + name */}
                <td className="px-5 py-3.5">
                  <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3 group">
                    <div className="relative flex-shrink-0">
                      {u.photo ? (
                        <img src={u.photo} alt={u.name} className="h-10 w-10 rounded-full object-cover ring-2 ring-slate-100" />
                      ) : (
                        <div className={`h-10 w-10 rounded-full ${avatarColor(u.name)} flex items-center justify-center ring-2 ring-slate-100`}>
                          <span className="text-xs font-bold text-white">{initials(u.name)}</span>
                        </div>
                      )}
                      {u.isVerified && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-blue-500 ring-2 ring-white text-[8px] font-bold text-white">✓</span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">{u.name}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </div>
                  </Link>
                </td>

                <td className="px-5 py-3.5 text-slate-500 text-xs">{u.phone ?? "—"}</td>

                {/* Roles */}
                <td className="px-5 py-3.5">
                  <div className="flex flex-wrap gap-1">
                    {u.roles.length === 0 ? (
                      <span className="text-xs text-slate-300 italic">none</span>
                    ) : u.roles.map(r => (
                      <span key={r} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                        {ROLE_LABELS[r] ?? r}
                      </span>
                    ))}
                  </div>
                </td>

                {/* Status */}
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    u.status === "ACTIVE"    ? "bg-emerald-50 text-emerald-700" :
                    u.status === "SUSPENDED" ? "bg-red-50 text-red-600" :
                                              "bg-orange-50 text-orange-600"
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      u.status === "ACTIVE" ? "bg-emerald-500" :
                      u.status === "SUSPENDED" ? "bg-red-500" : "bg-orange-500"
                    }`} />
                    {u.status.charAt(0) + u.status.slice(1).toLowerCase()}
                  </span>
                </td>

                <td className="px-5 py-3.5 text-xs text-slate-400">
                  {new Date(u.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </td>

                {/* Actions */}
                <td className="px-5 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/admin/users/${u.id}`}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition">
                      View
                    </Link>
                    <button type="button" onClick={() => setRoleModal(u)}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition">
                      Roles
                    </button>
                    <button type="button" disabled={toggling === u.id} onClick={() => toggleStatus(u)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40 ${
                        u.status === "ACTIVE"
                          ? "text-red-600 hover:bg-red-50"
                          : "text-emerald-700 hover:bg-emerald-50"
                      }`}>
                      {toggling === u.id ? "…" : u.status === "ACTIVE" ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length > PAGE_SIZE && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-1" />
      )}
    </div>
  );
}
