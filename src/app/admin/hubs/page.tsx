"use client";

import { useEffect, useState, useMemo } from "react";

type HubManager = { assignmentId: string; role: string; userId: string; name: string; email: string };
type Hub = {
  id: string; name: string; location: string; type: string;
  isActive: boolean; createdAt: string;
  lots: number; activeLots: number; trucks: number;
  managers: HubManager[];
};
type EligibleUser = { id: string; name: string; email: string; roles: string[] };

const TYPE_LABELS: Record<string, string> = {
  BOTH: "Receiving & Delivery",
  RECEIVING: "Receiving Only",
  DELIVERY: "Delivery Only",
};

const ROLE_LABELS: Record<string, string> = {
  hub_manager: "Hub Manager",
  delivery_hub_manager: "Delivery Hub Manager",
};

export default function AdminHubsPage() {
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedHub, setExpandedHub] = useState<string | null>(null);

  // Create hub modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", location: "", type: "BOTH" });
  const [creating, setCreating] = useState(false);

  // Edit hub modal
  const [editHub, setEditHub] = useState<Hub | null>(null);
  const [editForm, setEditForm] = useState({ name: "", location: "", type: "BOTH", isActive: true });
  const [saving, setSaving] = useState(false);

  // Manager assignment panel per hub
  const [managingHub, setManagingHub] = useState<Hub | null>(null);
  const [eligibleUsers, setEligibleUsers] = useState<EligibleUser[]>([]);
  const [assignRole, setAssignRole] = useState("hub_manager");
  const [assignUserId, setAssignUserId] = useState("");
  const [assigning, setAssigning] = useState(false);

  const fetchHubs = () => {
    setLoading(true);
    fetch("/api/admin/hubs")
      .then((r) => r.json())
      .then((d) => setHubs(d.hubs ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchHubs(); }, []);

  const filteredHubs = useMemo(() =>
    hubs.filter((h) =>
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.location.toLowerCase().includes(search.toLowerCase())
    ),
    [hubs, search]
  );

  // ── Create hub ─────────────────────────────────────────────────────────────
  const createHub = async () => {
    if (!createForm.name.trim() || !createForm.location.trim()) return;
    setCreating(true);
    await fetch("/api/admin/hubs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm),
    });
    setCreating(false);
    setShowCreate(false);
    setCreateForm({ name: "", location: "", type: "BOTH" });
    fetchHubs();
  };

  // ── Edit hub ───────────────────────────────────────────────────────────────
  const openEdit = (hub: Hub) => {
    setEditHub(hub);
    setEditForm({ name: hub.name, location: hub.location, type: hub.type, isActive: hub.isActive });
  };

  const saveEdit = async () => {
    if (!editHub) return;
    setSaving(true);
    await fetch(`/api/admin/hubs/${editHub.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setSaving(false);
    setEditHub(null);
    fetchHubs();
  };

  // ── Delete hub ─────────────────────────────────────────────────────────────
  const deleteHub = async (hub: Hub) => {
    if (!confirm(`Delete "${hub.name}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/hubs/${hub.id}`, { method: "DELETE" });
    fetchHubs();
  };

  // ── Manage managers ────────────────────────────────────────────────────────
  const openManage = async (hub: Hub) => {
    setManagingHub(hub);
    setAssignUserId("");
    setAssignRole("hub_manager");
    const data = await fetch(`/api/admin/hubs/${hub.id}/managers`).then((r) => r.json());
    setEligibleUsers(data.eligibleUsers ?? []);
  };

  const assignManager = async () => {
    if (!managingHub || !assignUserId) return;
    setAssigning(true);
    await fetch(`/api/admin/hubs/${managingHub.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: assignUserId, role: assignRole }),
    });
    setAssigning(false);
    fetchHubs();
    // refresh managing hub managers list
    const updated = await fetch("/api/admin/hubs").then((r) => r.json());
    const found = (updated.hubs ?? []).find((h: Hub) => h.id === managingHub.id);
    if (found) setManagingHub(found);
    setAssignUserId("");
  };

  const removeManager = async (hub: Hub, userId: string, role: string) => {
    await fetch(`/api/admin/hubs/${hub.id}/assign`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    fetchHubs();
    const updated = await fetch("/api/admin/hubs").then((r) => r.json());
    const found = (updated.hubs ?? []).find((h: Hub) => h.id === hub.id);
    if (found) setManagingHub(found);
  };

  const totalLots = hubs.reduce((s, h) => s + h.lots, 0);
  const totalActive = hubs.reduce((s, h) => s + h.activeLots, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Hub Management</h1>
          <p className="text-slate-500">
            {loading ? "Loading…" : `${hubs.length} hub${hubs.length !== 1 ? "s" : ""} · ${totalLots} lots total`}
          </p>
        </div>
        <button type="button" onClick={() => setShowCreate(true)}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition">
          + Create Hub
        </button>
      </div>

      {/* Summary stats */}
      {!loading && hubs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total Hubs", value: hubs.length, color: "text-slate-900", bg: "bg-slate-50" },
            { label: "Total Lots", value: totalLots, color: "text-indigo-700", bg: "bg-indigo-50" },
            { label: "Active Lots", value: totalActive, color: "text-emerald-700", bg: "bg-emerald-50" },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl border border-slate-100 p-5 shadow-sm ${s.bg}`}>
              <p className="text-sm text-slate-500">{s.label}</p>
              <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      {!loading && (
        <input type="text" placeholder="Search hubs…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none ring-indigo-100 focus:ring-2" />
      )}

      {/* Hub list */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : filteredHubs.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-slate-400 shadow-sm">
          {search ? "No hubs match your search." : "No hubs yet. Create your first hub above."}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredHubs.map((h) => (
            <div key={h.id} className={`rounded-2xl border bg-white p-5 shadow-sm transition ${
              expandedHub === h.id ? "border-indigo-300 ring-2 ring-indigo-100" : "border-slate-100"
            }`}>
              {/* Hub header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">{h.name}</p>
                  <p className="text-xs text-slate-400 truncate">{h.location}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    h.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                  }`}>{h.isActive ? "Active" : "Inactive"}</span>
                </div>
              </div>

              <p className="mt-1.5 text-[11px] text-slate-400">{TYPE_LABELS[h.type] ?? h.type}</p>

              {/* Stats */}
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-slate-50 py-2">
                  <p className="text-lg font-bold text-slate-900">{h.lots}</p>
                  <p className="text-[10px] text-slate-400">Lots</p>
                </div>
                <div className="rounded-xl bg-emerald-50 py-2">
                  <p className="text-lg font-bold text-emerald-700">{h.activeLots}</p>
                  <p className="text-[10px] text-slate-400">Active</p>
                </div>
                <div className="rounded-xl bg-violet-50 py-2">
                  <p className="text-lg font-bold text-violet-700">{h.managers.length}</p>
                  <p className="text-[10px] text-slate-400">Managers</p>
                </div>
              </div>

              {/* Managers preview */}
              {h.managers.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {h.managers.slice(0, 3).map((m) => (
                    <span key={m.assignmentId} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                      {m.name} <span className="text-slate-400">({m.role === "hub_manager" ? "HM" : "DHM"})</span>
                    </span>
                  ))}
                  {h.managers.length > 3 && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">+{h.managers.length - 3} more</span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                <button type="button" onClick={() => openManage(h)}
                  className="flex-1 rounded-lg bg-violet-50 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition">
                  Managers
                </button>
                <button type="button" onClick={() => openEdit(h)}
                  className="flex-1 rounded-lg bg-slate-50 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition">
                  Edit
                </button>
                <button type="button" onClick={() => deleteHub(h)}
                  className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition">
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create Hub Modal ────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Create Hub</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Hub Name *</label>
                <input type="text" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. Dhaka Hub"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none ring-indigo-100 focus:ring-2" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Location *</label>
                <input type="text" value={createForm.location} onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                  placeholder="e.g. Mirpur, Dhaka"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none ring-indigo-100 focus:ring-2" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Type</label>
                <select value={createForm.type} onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none">
                  <option value="BOTH">Receiving &amp; Delivery</option>
                  <option value="RECEIVING">Receiving Only</option>
                  <option value="DELIVERY">Delivery Only</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
                Cancel
              </button>
              <button type="button" onClick={createHub} disabled={creating || !createForm.name.trim() || !createForm.location.trim()}
                className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition">
                {creating ? "Creating…" : "Create Hub"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Hub Modal ──────────────────────────────────────────────────── */}
      {editHub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Edit Hub</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Hub Name</label>
                <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none ring-indigo-100 focus:ring-2" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Location</label>
                <input type="text" value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none ring-indigo-100 focus:ring-2" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Type</label>
                <select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none">
                  <option value="BOTH">Receiving &amp; Delivery</option>
                  <option value="RECEIVING">Receiving Only</option>
                  <option value="DELIVERY">Delivery Only</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="h-4 w-4 rounded accent-indigo-600" />
                <span className="text-sm font-medium text-slate-700">Hub is active</span>
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditHub(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
                Cancel
              </button>
              <button type="button" onClick={saveEdit} disabled={saving}
                className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition">
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Manage Managers Modal ───────────────────────────────────────────── */}
      {managingHub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Manage Managers</h2>
                <p className="text-xs text-slate-500">{managingHub.name} · {managingHub.location}</p>
              </div>
              <button type="button" onClick={() => setManagingHub(null)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                Close
              </button>
            </div>

            {/* Current assignments */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Assigned Managers</p>
              {managingHub.managers.length === 0 ? (
                <p className="text-sm text-slate-400">No managers assigned yet.</p>
              ) : (
                <div className="space-y-2">
                  {managingHub.managers.map((m) => (
                    <div key={m.assignmentId} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{m.name}</p>
                        <p className="text-xs text-slate-400">{m.email} · <span className="text-violet-600">{ROLE_LABELS[m.role] ?? m.role}</span></p>
                      </div>
                      <button type="button" onClick={() => removeManager(managingHub, m.userId, m.role)}
                        className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add assignment */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Assign Manager</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-500">Role</label>
                  <select value={assignRole} onChange={(e) => setAssignRole(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none">
                    <option value="hub_manager">Hub Manager</option>
                    <option value="delivery_hub_manager">Delivery Hub Manager</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-500">User</label>
                  <select value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none">
                    <option value="">Select user…</option>
                    {eligibleUsers
                      .filter((u) => u.roles.includes(assignRole))
                      .map((u) => (
                        <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                      ))
                    }
                  </select>
                </div>
              </div>
              <button type="button" onClick={assignManager} disabled={assigning || !assignUserId}
                className="w-full rounded-xl bg-violet-600 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition">
                {assigning ? "Assigning…" : "Assign to Hub"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
