"use client";

import { useEffect, useState, useMemo } from "react";
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

const ROLE_LABELS: Record<string, string> = Object.fromEntries(ALL_ROLES.map(r => [r.value, r.label]));

const AVATAR_COLORS = [
  "bg-indigo-500","bg-violet-500","bg-pink-500","bg-emerald-500",
  "bg-amber-500","bg-sky-500","bg-rose-500","bg-teal-500","bg-orange-500","bg-cyan-500",
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

// ── Role Modal ────────────────────────────────────────────────────────────────
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
    } catch { toast.error("Failed to update roles"); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-5">
          <div className={`h-10 w-10 rounded-full ${avatarColor(user.name)} flex items-center justify-center shrink-0`}>
            <span className="text-sm font-bold text-white">{initials(user.name)}</span>
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">{user.name}</p>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Assign Roles</p>
        <div className="space-y-1 mb-6">
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
            {saving ? "Saving…" : "Save Roles"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ user, onClose, onSaved }: {
  user: User; onClose: () => void; onSaved: (u: User) => void;
}) {
  const [name, setName]   = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/edit`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() || null }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      onSaved({ ...user, name: name.trim(), phone: phone.trim() || null });
      toast.success("User updated"); onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4">
        <h3 className="text-base font-bold text-slate-900">Edit User</h3>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Name *</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Phone</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Optional"
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
        </div>
        <div className="flex gap-2 justify-end pt-1">
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

// ── Create User Modal ─────────────────────────────────────────────────────────
function CreateModal({ onClose, onCreated }: {
  onClose: () => void; onCreated: (u: User) => void;
}) {
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [selRoles, setSelRoles] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const toggleRole = (r: string) => setSelRoles(prev => {
    const n = new Set(prev); n.has(r) ? n.delete(r) : n.add(r); return n;
  });

  const create = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      toast.error("Name, email and password are required"); return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, roles: [...selRoles] }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      const user = await res.json() as User;
      onCreated(user);
      toast.success(`User "${user.name}" created`);
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-base font-bold text-slate-900">Create New User</h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-600">Full Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Rahim Uddin"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-600">Email *</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="user@example.com"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Password *</label>
            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Min 6 characters"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Phone</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="Optional"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold text-slate-600">Roles <span className="font-normal text-slate-400">(optional)</span></p>
          <div className="grid grid-cols-2 gap-1">
            {ALL_ROLES.map(r => (
              <label key={r.value} className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" checked={selRoles.has(r.value)} onChange={() => toggleRole(r.value)}
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-indigo-600" />
                <span className="text-xs font-medium text-slate-800">{r.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={create} disabled={saving}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
            {saving ? "Creating…" : "Create User"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
type SortKey = "name" | "createdAt" | "status";

export default function AdminUsersPage() {
  const [users, setUsers]             = useState<User[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [roleFilter, setRoleFilter]   = useState("All");
  const [sortKey]                     = useState<SortKey>("createdAt");
  const [sortAsc]                     = useState(false);
  const [page, setPage]               = useState(1);

  const [view, setView]               = useState<"grid" | "list">("grid");

  const [roleModal, setRoleModal]     = useState<User | null>(null);
  const [editModal, setEditModal]     = useState<User | null>(null);
  const [showCreate, setShowCreate]   = useState(false);
  const [toggling, setToggling]       = useState<string | null>(null);
  const [verifying, setVerifying]     = useState<string | null>(null);
  const [deleting, setDeleting]       = useState<string | null>(null);

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
      toast.success(`Account ${next === "ACTIVE" ? "activated" : "suspended"}`);
    } catch { toast.error("Failed"); } finally { setToggling(null); }
  };

  const toggleVerify = async (u: User) => {
    setVerifying(u.id);
    try {
      await fetch(`/api/admin/users/${u.id}/verify`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified: !u.isVerified }),
      });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, isVerified: !x.isVerified } : x));
      toast.success(u.isVerified ? "Verification removed" : "User verified");
    } catch { toast.error("Failed"); } finally { setVerifying(null); }
  };

  const deleteUser = async (u: User) => {
    if (!confirm(`Delete "${u.name}"? This cannot be undone.`)) return;
    setDeleting(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      setUsers(prev => prev.filter(x => x.id !== u.id));
      toast.success(`"${u.name}" deleted`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setDeleting(null); }
  };

  const exportCSV = () => {
    const header = "Name,Email,Phone,Roles,Status,Verified,Joined";
    const rows = users.map(u =>
      [u.name, u.email, u.phone ?? "", u.roles.map(r => ROLE_LABELS[r] ?? r).join(";"),
       u.status, u.isVerified ? "Yes" : "No",
       new Date(u.createdAt).toLocaleDateString()].join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  /* ── computed ── */
  const totalCount    = users.length;
  const activeCount   = users.filter(u => u.status === "ACTIVE").length;
  const suspendCount  = users.filter(u => u.status === "SUSPENDED").length;
  const pendingCount  = users.filter(u => u.status === "PENDING").length;
  const verifiedCount = users.filter(u => u.isVerified).length;

  const roleFilterVal = ALL_ROLES.find(r => r.label === roleFilter)?.value;

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    let list = users.filter(u => {
      const matchSearch = u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || (u.phone ?? "").includes(s);
      const matchStatus = statusFilter === "All" || u.status === statusFilter;
      const matchRole   = roleFilter === "All" || (roleFilterVal && u.roles.includes(roleFilterVal));
      return matchSearch && matchStatus && matchRole;
    });
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name")      cmp = a.name.localeCompare(b.name);
      if (sortKey === "createdAt") cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortKey === "status")    cmp = a.status.localeCompare(b.status);
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [users, search, statusFilter, roleFilter, roleFilterVal, sortKey, sortAsc]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const STATUS_TABS = [
    { label: "All",       count: totalCount,  color: "text-slate-700" },
    { label: "ACTIVE",    count: activeCount, color: "text-emerald-700" },
    { label: "SUSPENDED", count: suspendCount, color: "text-red-600" },
    { label: "PENDING",   count: pendingCount, color: "text-orange-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Modals */}
      {roleModal && (
        <RoleModal user={roleModal} onClose={() => setRoleModal(null)}
          onSaved={u => { setUsers(prev => prev.map(x => x.id === u.id ? u : x)); setRoleModal(null); }} />
      )}
      {editModal && (
        <EditModal user={editModal} onClose={() => setEditModal(null)}
          onSaved={u => { setUsers(prev => prev.map(x => x.id === u.id ? u : x)); setEditModal(null); }} />
      )}
      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)}
          onCreated={u => setUsers(prev => [u, ...prev])} />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All Users</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {loading ? "Loading…" : `${totalCount} registered accounts`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button type="button" onClick={() => setView("grid")}
              className={`px-2.5 py-1.5 transition ${view === "grid" ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-700"}`}
              title="Grid view">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
                <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
                <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
              </svg>
            </button>
            <button type="button" onClick={() => setView("list")}
              className={`px-2.5 py-1.5 border-l border-slate-200 transition ${view === "list" ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-700"}`}
              title="List view">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
                <rect x="1" y="2" width="14" height="2" rx="1"/><rect x="1" y="7" width="14" height="2" rx="1"/><rect x="1" y="12" width="14" height="2" rx="1"/>
              </svg>
            </button>
          </div>
          <button type="button" onClick={exportCSV}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a1 1 0 001 1h16a1 1 0 001-1v-3" />
            </svg>
            Export
          </button>
          <button type="button" onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition">
            + Add User
          </button>
        </div>
      </div>

      {/* Stat cards */}
      {!loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: "Total",     val: totalCount,    bg: "bg-slate-50",    text: "text-slate-900",   action: () => setStatusFilter("All") },
            { label: "Active",    val: activeCount,   bg: "bg-emerald-50",  text: "text-emerald-700", action: () => setStatusFilter("ACTIVE") },
            { label: "Suspended", val: suspendCount,  bg: "bg-red-50",      text: "text-red-600",     action: () => setStatusFilter("SUSPENDED") },
            { label: "Pending",   val: pendingCount,  bg: "bg-orange-50",   text: "text-orange-600",  action: () => setStatusFilter("PENDING") },
            { label: "Verified",  val: verifiedCount, bg: "bg-blue-50",     text: "text-blue-700",    action: () => {} },
          ].map(c => (
            <button key={c.label} type="button" onClick={() => { c.action(); setPage(1); }}
              className={`rounded-2xl border border-slate-100 ${c.bg} p-4 shadow-sm text-left hover:shadow-md transition`}>
              <p className="text-xs text-slate-500">{c.label}</p>
              <p className={`mt-1 text-2xl font-bold ${c.text}`}>{c.val}</p>
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3">
        {/* Status tabs */}
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit flex-wrap">
          {STATUS_TABS.map(t => (
            <button key={t.label} type="button"
              onClick={() => { setStatusFilter(t.label); setPage(1); }}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                statusFilter === t.label ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
              }`}>
              {t.label === "All" ? "All" : t.label.charAt(0) + t.label.slice(1).toLowerCase()}
              <span className={`ml-1 ${statusFilter === t.label ? t.color : "text-slate-400"}`}>{t.count}</span>
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
          {(search || statusFilter !== "All" || roleFilter !== "All") && (
            <button type="button" onClick={() => { setSearch(""); setStatusFilter("All"); setRoleFilter("All"); setPage(1); }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline">
              Clear filters
            </button>
          )}
          <span className="text-xs text-slate-400">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Cards / List */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-slate-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 rounded bg-slate-100" />
                  <div className="h-2.5 w-full rounded bg-slate-100" />
                </div>
              </div>
              <div className="h-5 w-2/3 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <p className="font-semibold text-slate-700">No users found</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters</p>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paginated.map(u => (
            <div key={u.id} className="flex flex-col bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-200 transition-colors">

              {/* Top row: avatar + name + delete */}
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  {u.photo ? (
                    <img src={u.photo} alt={u.name} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className={`h-10 w-10 rounded-full ${avatarColor(u.name)} flex items-center justify-center`}>
                      <span className="text-xs font-bold text-white">{initials(u.name)}</span>
                    </div>
                  )}
                  {u.isVerified && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-blue-500 ring-2 ring-white text-[7px] font-bold text-white">✓</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/users/${u.id}`} className="block truncate text-sm font-semibold text-slate-900 hover:text-indigo-700 leading-tight">
                    {u.name}
                  </Link>
                  <p className="truncate text-xs text-slate-400">{u.email}</p>
                </div>
                <button type="button" disabled={deleting === u.id} onClick={() => deleteUser(u)}
                  className="shrink-0 text-slate-300 hover:text-red-500 transition text-base leading-none disabled:opacity-30">
                  ✕
                </button>
              </div>

              {u.phone && <p className="mt-2 text-xs text-slate-400">{u.phone}</p>}

              <div className="mt-3 flex flex-wrap gap-1">
                {u.roles.length === 0 ? (
                  <span className="text-[11px] text-slate-300 italic">No roles</span>
                ) : u.roles.map(r => (
                  <span key={r} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                    {ROLE_LABELS[r] ?? r}
                  </span>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className={`text-[11px] font-semibold ${
                  u.status === "ACTIVE" ? "text-emerald-600" :
                  u.status === "SUSPENDED" ? "text-red-500" : "text-orange-500"
                }`}>
                  {u.status.charAt(0) + u.status.slice(1).toLowerCase()}
                </span>
                <span className="text-[11px] text-slate-400">
                  {new Date(u.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1 flex-wrap">
                <Link href={`/admin/users/${u.id}`} className="rounded px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition">View</Link>
                <button type="button" onClick={() => setEditModal(u)} className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition">Edit</button>
                <button type="button" onClick={() => setRoleModal(u)} className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition">Roles</button>
                <button type="button" disabled={verifying === u.id} onClick={() => toggleVerify(u)}
                  className={`rounded px-2 py-1 text-xs font-medium transition disabled:opacity-40 ${u.isVerified ? "text-slate-400 hover:bg-slate-100" : "text-blue-600 hover:bg-blue-50"}`}>
                  {verifying === u.id ? "…" : u.isVerified ? "Unverify" : "Verify"}
                </button>
                <button type="button" disabled={toggling === u.id} onClick={() => toggleStatus(u)}
                  className={`rounded px-2 py-1 text-xs font-medium transition disabled:opacity-40 ${u.status === "ACTIVE" ? "text-red-500 hover:bg-red-50" : "text-emerald-600 hover:bg-emerald-50"}`}>
                  {toggling === u.id ? "…" : u.status === "ACTIVE" ? "Suspend" : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── List view ── */
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Roles</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginated.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="relative shrink-0">
                        {u.photo ? (
                          <img src={u.photo} alt={u.name} className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className={`h-8 w-8 rounded-full ${avatarColor(u.name)} flex items-center justify-center`}>
                            <span className="text-[10px] font-bold text-white">{initials(u.name)}</span>
                          </div>
                        )}
                        {u.isVerified && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 flex items-center justify-center rounded-full bg-blue-500 ring-1 ring-white text-[6px] font-bold text-white">✓</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link href={`/admin/users/${u.id}`} className="block truncate text-sm font-semibold text-slate-900 hover:text-indigo-700 leading-tight">
                          {u.name}
                        </Link>
                        <p className="truncate text-xs text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{u.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 ? (
                        <span className="text-xs text-slate-300 italic">—</span>
                      ) : u.roles.map(r => (
                        <span key={r} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                          {ROLE_LABELS[r] ?? r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold ${
                      u.status === "ACTIVE" ? "text-emerald-600" :
                      u.status === "SUSPENDED" ? "text-red-500" : "text-orange-500"
                    }`}>
                      {u.status.charAt(0) + u.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {new Date(u.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/users/${u.id}`} className="rounded px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition">View</Link>
                      <button type="button" onClick={() => setEditModal(u)} className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition">Edit</button>
                      <button type="button" onClick={() => setRoleModal(u)} className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition">Roles</button>
                      <button type="button" disabled={verifying === u.id} onClick={() => toggleVerify(u)}
                        className={`rounded px-2 py-1 text-xs font-medium transition disabled:opacity-40 ${u.isVerified ? "text-slate-400 hover:bg-slate-100" : "text-blue-600 hover:bg-blue-50"}`}>
                        {verifying === u.id ? "…" : u.isVerified ? "Unverify" : "Verify"}
                      </button>
                      <button type="button" disabled={toggling === u.id} onClick={() => toggleStatus(u)}
                        className={`rounded px-2 py-1 text-xs font-medium transition disabled:opacity-40 ${u.status === "ACTIVE" ? "text-red-500 hover:bg-red-50" : "text-emerald-600 hover:bg-emerald-50"}`}>
                        {toggling === u.id ? "…" : u.status === "ACTIVE" ? "Suspend" : "Activate"}
                      </button>
                      <button type="button" disabled={deleting === u.id} onClick={() => deleteUser(u)}
                        className="rounded px-2 py-1 text-xs font-medium text-slate-300 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-30">
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > PAGE_SIZE && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-1" />
      )}
    </div>
  );
}
