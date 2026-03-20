"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BANGLADESH_DISTRICTS } from "@/lib/bangladesh";

type DistrictRow = {
  id: string;
  name: string;
  userCount: number;
  createdAt: string;
  updatedAt: string;
};

export default function AdminDistrictsPage() {
  const [districts, setDistricts] = useState<DistrictRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [singleName, setSingleName] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [savingSingle, setSavingSingle] = useState(false);
  const [savingBulk, setSavingBulk] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadDistricts = async (withRefresh = false) => {
    if (withRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/districts");
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message ?? "Failed to load districts");
      }
      setDistricts(json.districts ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load districts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadDistricts();
  }, []);

  const filteredDistricts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return districts;
    return districts.filter((district) =>
      district.name.toLowerCase().includes(q) || district.id.toLowerCase().includes(q)
    );
  }, [districts, search]);

  const totalAssignedUsers = districts.reduce((sum, district) => sum + district.userCount, 0);

  const createSingle = async () => {
    if (!singleName.trim()) {
      toast.error("Enter a district name");
      return;
    }

    setSavingSingle(true);
    try {
      const res = await fetch("/api/admin/districts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: singleName }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message ?? "Failed to add district");
      }
      toast.success(json.message ?? "District added");
      setSingleName("");
      await loadDistricts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add district");
    } finally {
      setSavingSingle(false);
    }
  };

  const createBulk = async () => {
    if (!bulkText.trim()) {
      toast.error("Paste one or more district names");
      return;
    }

    setSavingBulk(true);
    try {
      const res = await fetch("/api/admin/districts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ namesText: bulkText }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message ?? "Failed to add districts");
      }
      toast.success(json.message ?? "Districts added");
      setBulkText("");
      await loadDistricts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add districts");
    } finally {
      setSavingBulk(false);
    }
  };

  const saveRename = async (id: string) => {
    if (!editingName.trim()) {
      toast.error("District name is required");
      return;
    }

    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/districts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message ?? "Failed to rename district");
      }
      setEditingId(null);
      setEditingName("");
      toast.success("District updated");
      await loadDistricts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to rename district");
    } finally {
      setBusyId(null);
    }
  };

  const removeDistrict = async (id: string, name: string) => {
    if (!window.confirm(`Delete district "${name}"?`)) return;

    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/districts/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message ?? "Failed to delete district");
      }
      toast.success("District deleted");
      await loadDistricts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete district");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Districts</h1>
          <p className="text-slate-500">Manage district records with stable IDs for signup and future location wiring.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadDistricts(true)}
          disabled={refreshing}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total districts</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{districts.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Assigned users</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totalAssignedUsers}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Search results</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{filteredDistricts.length}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">Add one district</h2>
            <p className="text-sm text-slate-500">Create a single district record. It will appear in signup immediately.</p>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={singleName}
              onChange={(event) => setSingleName(event.target.value)}
              placeholder="District name"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none ring-indigo-100 focus:ring-2"
            />
            <button
              type="button"
              onClick={() => void createSingle()}
              disabled={savingSingle}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {savingSingle ? "Adding..." : "Add district"}
            </button>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">Bulk add districts</h2>
              <p className="text-sm text-slate-500">Paste one district per line or separate by commas.</p>
            </div>
            <button
              type="button"
              onClick={() => setBulkText(BANGLADESH_DISTRICTS.join("\n"))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Load Bangladesh 64
            </button>
          </div>
          <textarea
            value={bulkText}
            onChange={(event) => setBulkText(event.target.value)}
            placeholder={"Dhaka\nGazipur\nNarayanganj"}
            rows={8}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none ring-indigo-100 focus:ring-2"
          />
          <button
            type="button"
            onClick={() => void createBulk()}
            disabled={savingBulk}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {savingBulk ? "Adding..." : "Bulk add districts"}
          </button>
        </section>
      </div>

      <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">District registry</h2>
            <p className="text-sm text-slate-500">Each row has a stable ID that can be referenced across the app.</p>
          </div>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or ID"
            className="w-full max-w-xs rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none ring-indigo-100 focus:ring-2"
          />
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">Loading districts...</div>
        ) : filteredDistricts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center text-sm text-slate-400">
            No districts match your search.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">District</th>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Users</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDistricts.map((district) => {
                  const isEditing = editingId === district.id;
                  const isBusy = busyId === district.id;

                  return (
                    <tr key={district.id} className="align-top">
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(event) => setEditingName(event.target.value)}
                            className="w-full min-w-48 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-indigo-100 focus:ring-2"
                          />
                        ) : (
                          <span className="font-medium text-slate-900">{district.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{district.id}</td>
                      <td className="px-4 py-3 text-slate-600">{district.userCount}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(district.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => void saveRename(district.id)}
                                disabled={isBusy}
                                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(null);
                                  setEditingName("");
                                }}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(district.id);
                                  setEditingName(district.name);
                                }}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                              >
                                Rename
                              </button>
                              <button
                                type="button"
                                onClick={() => void removeDistrict(district.id, district.name)}
                                disabled={isBusy}
                                className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
