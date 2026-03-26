"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import Pagination from "@/components/Pagination";
import {
  Check,
  ChevronDown,
  Download,
  Pencil,
  Plus,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserX,
  X,
  Users,
} from "lucide-react";

const PAGE_SIZE = 15;

const ALL_ROLES = [
  { value: "buyer",                label: "Buyer",            color: "bg-emerald-100 text-emerald-700" },
  { value: "seller",               label: "Seller",           color: "bg-sky-100 text-sky-700" },
  { value: "admin",                label: "Admin",            color: "bg-rose-100 text-rose-700" },
  { value: "hub_manager",          label: "Hub Manager",      color: "bg-violet-100 text-violet-700" },
  { value: "qc_leader",            label: "QC Leader",        color: "bg-amber-100 text-amber-700" },
  { value: "qc_checker",           label: "QC Checker",       color: "bg-orange-100 text-orange-700" },
  { value: "delivery_hub_manager", label: "Delivery Hub Mgr", color: "bg-teal-100 text-teal-700" },
  { value: "delivery_distributor", label: "Delivery Man",     color: "bg-cyan-100 text-cyan-700" },
];

const ROLE_META: Record<string, { label: string; color: string }> = Object.fromEntries(
  ALL_ROLES.map(r => [r.value, { label: r.label, color: r.color }])
);

const AVATAR_COLORS = [
  "from-indigo-500 to-violet-500","from-pink-500 to-rose-500",
  "from-emerald-500 to-teal-500","from-amber-500 to-orange-500",
  "from-sky-500 to-cyan-500","from-violet-500 to-purple-500",
];

function avatarGradient(name: string) {
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

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  ACTIVE:           { label: "Active",           dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  PENDING_APPROVAL: { label: "Awaiting Approval", dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 ring-amber-200" },
  SUSPENDED:        { label: "Suspended",         dot: "bg-red-500",     badge: "bg-red-50 text-red-600 ring-red-200" },
  PENDING:          { label: "Pending",           dot: "bg-orange-400",  badge: "bg-orange-50 text-orange-600 ring-orange-200" },
};

// ── Modals ────────────────────────────────────────────────────────────────────
function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-sm">
        <button type="button" onClick={onClose}
          className="absolute -top-3 -right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md text-slate-500 hover:text-slate-800">
          <X size={14} />
        </button>
        {children}
      </div>
    </div>
  );
}

function RoleModal({ user, onClose, onSaved }: { user: User; onClose: () => void; onSaved: (u: User) => void }) {
  const [sel, setSel] = useState(new Set(user.roles));
  const [saving, setSaving] = useState(false);
  const toggle = (r: string) => setSel(prev => { const n = new Set(prev); n.has(r) ? n.delete(r) : n.add(r); return n; });
  const save = async () => {
    setSaving(true);
    try {
      const toAdd    = ALL_ROLES.map(r => r.value).filter(r => sel.has(r) && !user.roles.includes(r));
      const toRemove = user.roles.filter(r => !sel.has(r));
      for (const role of toAdd)    await fetch(`/api/admin/users/${user.id}/roles`, { method: "POST",   headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
      for (const role of toRemove) await fetch(`/api/admin/users/${user.id}/roles`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
      onSaved({ ...user, roles: [...sel] }); toast.success("Roles updated"); onClose();
    } catch { toast.error("Failed"); } finally { setSaving(false); }
  };
  return (
    <Modal onClose={onClose}>
      <div className="rounded-2xl bg-white p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${avatarGradient(user.name)} flex items-center justify-center shrink-0`}>
            <span className="text-sm font-bold text-white">{initials(user.name)}</span>
          </div>
          <div>
            <p className="font-semibold text-slate-900">{user.name}</p>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Assign Roles</p>
        <div className="grid grid-cols-2 gap-1">
          {ALL_ROLES.map(r => (
            <label key={r.value} className="flex items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-slate-50 cursor-pointer">
              <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${sel.has(r.value) ? "border-indigo-500 bg-indigo-500" : "border-slate-300"}`}
                onClick={() => toggle(r.value)}>
                {sel.has(r.value) && <Check size={10} className="text-white" />}
              </div>
              <span className="text-xs font-medium text-slate-700">{r.label}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={save} disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
            {saving ? "Saving…" : "Save Roles"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function EditModal({ user, onClose, onSaved }: { user: User; onClose: () => void; onSaved: (u: User) => void }) {
  const [name, setName]   = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/edit`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), phone: phone.trim() || null }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      onSaved({ ...user, name: name.trim(), phone: phone.trim() || null }); toast.success("Updated"); onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setSaving(false); }
  };
  return (
    <Modal onClose={onClose}>
      <div className="rounded-2xl bg-white p-6 shadow-2xl space-y-4">
        <h3 className="font-bold text-slate-900">Edit User</h3>
        {[{ label: "Full Name *", val: name, set: setName, ph: "", type: "text" }, { label: "Phone", val: phone, set: setPhone, ph: "Optional", type: "tel" }].map(f => (
          <div key={f.label}>
            <label className="mb-1 block text-xs font-semibold text-slate-500">{f.label}</label>
            <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} type={f.type}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
          </div>
        ))}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={save} disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (u: User) => void }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [selRoles, setSelRoles] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const toggleRole = (r: string) => setSelRoles(prev => { const n = new Set(prev); n.has(r) ? n.delete(r) : n.add(r); return n; });
  const create = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password) { toast.error("Name, email and password are required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, roles: [...selRoles] }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      const user = await res.json() as User;
      onCreated(user); toast.success(`"${user.name}" created`); onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"><X size={16} /></button>
        <h3 className="font-bold text-slate-900 text-base">Create New Account</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Full Name *", key: "name", ph: "e.g. Rahim Uddin", span: true, type: "text" },
            { label: "Email *",     key: "email", ph: "user@example.com", span: true, type: "email" },
            { label: "Password *",  key: "password", ph: "Min 6 chars", span: false, type: "password" },
            { label: "Phone",       key: "phone", ph: "Optional", span: false, type: "tel" },
          ].map(f => (
            <div key={f.key} className={f.span ? "col-span-2" : ""}>
              <label className="mb-1 block text-xs font-semibold text-slate-500">{f.label}</label>
              <input type={f.type} value={form[f.key as keyof typeof form]} placeholder={f.ph}
                onChange={e => setForm(x => ({ ...x, [f.key]: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
            </div>
          ))}
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-500">Roles <span className="font-normal text-slate-400">(optional)</span></p>
          <div className="grid grid-cols-2 gap-1">
            {ALL_ROLES.map(r => (
              <label key={r.value} className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-slate-50 cursor-pointer">
                <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${selRoles.has(r.value) ? "border-indigo-500 bg-indigo-500" : "border-slate-300"}`}
                  onClick={() => toggleRole(r.value)}>
                  {selRoles.has(r.value) && <Check size={10} className="text-white" />}
                </div>
                <span className="text-xs font-medium text-slate-700">{r.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={create} disabled={saving} className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
            {saving ? "Creating…" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Actions Dropdown ──────────────────────────────────────────────────────────
function ActionsMenu({ u, onEdit, onRoles, onToggleVerify, onToggleStatus, onDelete, toggling, verifying, deleting }: {
  u: User;
  onEdit: () => void; onRoles: () => void;
  onToggleVerify: () => void; onToggleStatus: () => void; onDelete: () => void;
  toggling: boolean; verifying: boolean; deleting: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
        Actions <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-slate-100 bg-white py-1.5 shadow-xl">
            <button type="button" onClick={() => { setOpen(false); onEdit(); }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
              <Pencil size={13} className="text-slate-400" /> Edit Info
            </button>
            <button type="button" onClick={() => { setOpen(false); onRoles(); }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
              <Shield size={13} className="text-slate-400" /> Manage Roles
            </button>
            <button type="button" disabled={verifying} onClick={() => { setOpen(false); onToggleVerify(); }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40">
              <UserCheck size={13} className="text-slate-400" /> {u.isVerified ? "Remove Verify" : "Verify"}
            </button>
            <div className="my-1 border-t border-slate-100" />
            <button type="button" disabled={toggling} onClick={() => { setOpen(false); onToggleStatus(); }}
              className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium hover:bg-slate-50 disabled:opacity-40 ${u.status === "ACTIVE" ? "text-red-500" : "text-emerald-600"}`}>
              <UserX size={13} /> {u.status === "ACTIVE" ? "Suspend" : "Activate"}
            </button>
            <button type="button" disabled={deleting} onClick={() => { setOpen(false); onDelete(); }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-40">
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const [users, setUsers]             = useState<User[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [roleFilter, setRoleFilter]   = useState("All");
  const [page, setPage]               = useState(1);

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

  const approveUser = async (u: User) => {
    setToggling(u.id);
    try {
      await fetch(`/api/admin/users/${u.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "ACTIVE" }) });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: "ACTIVE" } : x));
      toast.success(`"${u.name}" approved`);
    } catch { toast.error("Failed"); } finally { setToggling(null); }
  };

  const rejectUser = async (u: User) => {
    if (!confirm(`Reject "${u.name}"?`)) return;
    setToggling(u.id);
    try {
      await fetch(`/api/admin/users/${u.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "SUSPENDED" }) });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: "SUSPENDED" } : x));
      toast.success(`"${u.name}" rejected`);
    } catch { toast.error("Failed"); } finally { setToggling(null); }
  };

  const toggleStatus = async (u: User) => {
    const next = u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setToggling(u.id);
    try {
      await fetch(`/api/admin/users/${u.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: next } : x));
      toast.success(`Account ${next === "ACTIVE" ? "activated" : "suspended"}`);
    } catch { toast.error("Failed"); } finally { setToggling(null); }
  };

  const toggleVerify = async (u: User) => {
    setVerifying(u.id);
    try {
      await fetch(`/api/admin/users/${u.id}/verify`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isVerified: !u.isVerified }) });
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
    const rows = users.map(u => [u.name, u.email, u.phone ?? "", u.roles.map(r => ROLE_META[r]?.label ?? r).join(";"), u.status, u.isVerified ? "Yes" : "No", new Date(u.createdAt).toLocaleDateString()].join(","));
    const blob = new Blob([["Name,Email,Phone,Roles,Status,Verified,Joined", ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  /* ── stats ── */
  const totalCount      = users.length;
  const activeCount     = users.filter(u => u.status === "ACTIVE").length;
  const suspendCount    = users.filter(u => u.status === "SUSPENDED").length;
  const pendingApproval = users.filter(u => u.status === "PENDING_APPROVAL").length;
  const verifiedCount   = users.filter(u => u.isVerified).length;

  const roleFilterVal = ALL_ROLES.find(r => r.label === roleFilter)?.value;

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return users
      .filter(u => {
        const matchSearch = u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || (u.phone ?? "").includes(s);
        const matchStatus = statusFilter === "All" || u.status === statusFilter;
        const matchRole   = roleFilter === "All" || (roleFilterVal && u.roles.includes(roleFilterVal));
        return matchSearch && matchStatus && matchRole;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [users, search, statusFilter, roleFilter, roleFilterVal]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const STATUS_TABS = [
    { val: "All",              label: "All",             count: totalCount },
    { val: "ACTIVE",           label: "Active",          count: activeCount },
    { val: "PENDING_APPROVAL", label: "Needs Approval",  count: pendingApproval },
    { val: "SUSPENDED",        label: "Suspended",       count: suspendCount },
  ];

  return (
    <div className="space-y-6">
      {/* Modals */}
      {roleModal  && <RoleModal  user={roleModal}  onClose={() => setRoleModal(null)}  onSaved={u => { setUsers(prev => prev.map(x => x.id === u.id ? u : x)); setRoleModal(null); }} />}
      {editModal  && <EditModal  user={editModal}  onClose={() => setEditModal(null)}  onSaved={u => { setUsers(prev => prev.map(x => x.id === u.id ? u : x)); setEditModal(null); }} />}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={u => setUsers(prev => [u, ...prev])} />}

      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200">
            <Users size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">All Users</h1>
            <p className="text-sm text-slate-400">{loading ? "Loading…" : `${totalCount} registered accounts`}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={exportCSV}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition shadow-sm">
            <Download size={15} /> Export
          </button>
          <button type="button" onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition shadow-sm shadow-indigo-200">
            <Plus size={15} /> Add User
          </button>
        </div>
      </div>

      {/* ── Pending Approval Banner ── */}
      {pendingApproval > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
            </span>
            <div>
              <p className="text-sm font-semibold text-amber-800">{pendingApproval} account{pendingApproval > 1 ? "s" : ""} awaiting approval</p>
              <p className="text-xs text-amber-600">Review and approve or reject new registrations below.</p>
            </div>
          </div>
          <button type="button" onClick={() => { setStatusFilter("PENDING_APPROVAL"); setPage(1); }}
            className="rounded-xl bg-amber-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-amber-600 transition">
            Review
          </button>
        </div>
      )}

      {/* ── Stat Cards ── */}
      {!loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Users",   val: totalCount,      color: "text-slate-900",   bg: "bg-slate-50",    border: "border-slate-200",  action: () => setStatusFilter("All") },
            { label: "Active",        val: activeCount,     color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200", action: () => setStatusFilter("ACTIVE") },
            { label: "Suspended",     val: suspendCount,    color: "text-red-600",     bg: "bg-red-50",      border: "border-red-200",     action: () => setStatusFilter("SUSPENDED") },
            { label: "Verified",      val: verifiedCount,   color: "text-indigo-600",  bg: "bg-indigo-50",   border: "border-indigo-200",  action: () => {} },
          ].map(c => (
            <button key={c.label} type="button" onClick={() => { c.action(); setPage(1); }}
              className={`rounded-2xl border ${c.border} ${c.bg} px-5 py-4 text-left hover:shadow-md transition`}>
              <p className="text-xs font-medium text-slate-500">{c.label}</p>
              <p className={`mt-1 text-3xl font-bold ${c.color}`}>{c.val}</p>
            </button>
          ))}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm space-y-3">
        {/* Status tabs */}
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map(t => (
            <button key={t.val} type="button" onClick={() => { setStatusFilter(t.val); setPage(1); }}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                statusFilter === t.val
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}>
              {t.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${statusFilter === t.val ? "bg-white/25 text-white" : "bg-white text-slate-500"}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search + role filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search name, email, phone…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-xl border border-slate-200 py-2 pl-8 pr-4 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
          </div>
          <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 bg-white text-slate-600">
            <option value="All">All Roles</option>
            {ALL_ROLES.map(r => <option key={r.value} value={r.label}>{r.label}</option>)}
          </select>
          {(search || statusFilter !== "All" || roleFilter !== "All") && (
            <button type="button" onClick={() => { setSearch(""); setStatusFilter("All"); setRoleFilter("All"); setPage(1); }}
              className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50">
              <X size={12} /> Clear
            </button>
          )}
          <span className="text-xs text-slate-400 ml-auto">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-20 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <Users size={22} className="text-slate-400" />
          </div>
          <p className="font-semibold text-slate-700">No users found</p>
          <p className="mt-1 text-xs text-slate-400">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["User", "Contact", "Roles", "Status", "Joined", ""].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginated.map(u => {
                const sc = STATUS_CONFIG[u.status] ?? STATUS_CONFIG.PENDING;
                return (
                  <tr key={u.id} className="group hover:bg-slate-50/60 transition-colors">
                    {/* User */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          {u.photo ? (
                            <img src={u.photo} alt={u.name} className="h-9 w-9 rounded-xl object-cover" />
                          ) : (
                            <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${avatarGradient(u.name)} flex items-center justify-center`}>
                              <span className="text-xs font-bold text-white">{initials(u.name)}</span>
                            </div>
                          )}
                          {u.isVerified && (
                            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 ring-2 ring-white">
                              <Check size={8} className="text-white" strokeWidth={3} />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link href={`/admin/users/${u.id}`} className="block truncate font-semibold text-slate-900 hover:text-indigo-700 transition text-sm leading-tight">
                            {u.name}
                          </Link>
                          <p className="truncate text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-5 py-3.5">
                      <p className="text-xs text-slate-500">{u.phone ?? <span className="text-slate-300">—</span>}</p>
                    </td>

                    {/* Roles */}
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0 ? (
                          <span className="text-xs text-slate-300 italic">No roles</span>
                        ) : u.roles.map(r => (
                          <span key={r} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ROLE_META[r]?.color ?? "bg-slate-100 text-slate-600"}`}>
                            {ROLE_META[r]?.label ?? r}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      {u.status === "PENDING_APPROVAL" ? (
                        <div className="flex items-center gap-1.5">
                          <button type="button" disabled={toggling === u.id} onClick={() => approveUser(u)}
                            className="rounded-lg bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-600 transition disabled:opacity-40">
                            {toggling === u.id ? "…" : "Approve"}
                          </button>
                          <button type="button" disabled={toggling === u.id} onClick={() => rejectUser(u)}
                            className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-100 transition disabled:opacity-40">
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${sc.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                          {sc.label}
                        </span>
                      )}
                    </td>

                    {/* Joined */}
                    <td className="px-5 py-3.5">
                      <p className="text-xs text-slate-400">
                        {new Date(u.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      {u.status !== "PENDING_APPROVAL" && (
                        <ActionsMenu
                          u={u}
                          onEdit={() => setEditModal(u)}
                          onRoles={() => setRoleModal(u)}
                          onToggleVerify={() => toggleVerify(u)}
                          onToggleStatus={() => toggleStatus(u)}
                          onDelete={() => deleteUser(u)}
                          toggling={toggling === u.id}
                          verifying={verifying === u.id}
                          deleting={deleting === u.id}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
