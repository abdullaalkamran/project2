"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ShieldCheck, X, ChevronDown, ChevronUp } from "lucide-react";
import api from "@/lib/api";

type ArothItem = {
  assignmentId: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  hubId: string;
  hubName: string;
  commissionRate: number;
  allowedProducts: string[];
  isVerified: boolean;
};

type ArothsData = {
  aroths: ArothItem[];
  allProducts: string[];
};

export default function HubArothsClient() {
  const [data, setData] = useState<ArothsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  // local draft of selected products per aroth (assignmentId → Set)
  const [productDrafts, setProductDrafts] = useState<Record<string, Set<string>>>({});
  const [search, setSearch] = useState<Record<string, string>>({});

  const load = useCallback(() =>
    api.get<ArothsData>("/api/hub-manager/aroths")
      .then((d) => {
        setData(d);
        // Init drafts from saved data
        const drafts: Record<string, Set<string>> = {};
        for (const a of d.aroths) {
          drafts[a.assignmentId] = new Set(a.allowedProducts);
        }
        setProductDrafts(drafts);
      })
      .finally(() => setLoading(false)),
    []
  );

  useEffect(() => { void load(); }, [load]);

  async function patch(assignmentId: string, body: object) {
    setBusy(assignmentId);
    try {
      await api.patch(`/api/hub-manager/aroths/${assignmentId}`, body);
      await load();
    } finally {
      setBusy(null);
    }
  }

  function toggleProduct(assignmentId: string, product: string) {
    setProductDrafts((prev) => {
      const set = new Set(prev[assignmentId] ?? []);
      if (set.has(product)) set.delete(product);
      else set.add(product);
      return { ...prev, [assignmentId]: set };
    });
  }

  function selectAll(assignmentId: string) {
    if (!data) return;
    setProductDrafts((prev) => ({ ...prev, [assignmentId]: new Set(data.allProducts) }));
  }

  function clearAll(assignmentId: string) {
    setProductDrafts((prev) => ({ ...prev, [assignmentId]: new Set() }));
  }

  async function saveProducts(aroth: ArothItem) {
    const products = Array.from(productDrafts[aroth.assignmentId] ?? []);
    await patch(aroth.assignmentId, { allowedProducts: products });
  }

  async function toggleVerify(aroth: ArothItem) {
    await patch(aroth.assignmentId, { isVerified: !aroth.isVerified });
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-100" />
        {[1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}
      </div>
    );
  }

  const aroths = data?.aroths ?? [];
  const allProducts = data?.allProducts ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Manage Aroths</h1>
        <p className="text-slate-500">Set allowed products and verify aroths under your hub.</p>
      </div>

      {aroths.length === 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
          <p className="text-slate-500">No aroths assigned to your hub yet.</p>
          <p className="mt-1 text-xs text-slate-400">Ask an admin to assign aroth accounts to this hub.</p>
        </div>
      )}

      <div className="space-y-4">
        {aroths.map((aroth) => {
          const draft = productDrafts[aroth.assignmentId] ?? new Set<string>();
          const isBusy = busy === aroth.assignmentId;
          const isOpen = expanded === aroth.assignmentId;
          const savedCount = aroth.allowedProducts.length;
          const draftCount = draft.size;
          const q = (search[aroth.assignmentId] ?? "").toLowerCase();
          const filtered = q ? allProducts.filter((p) => p.toLowerCase().includes(q)) : allProducts;
          const isDirty = JSON.stringify([...draft].sort()) !== JSON.stringify([...aroth.allowedProducts].sort());

          return (
            <div key={aroth.assignmentId} className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
              {/* Header row */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">{aroth.name}</p>
                      {aroth.isVerified ? (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          <ShieldCheck size={10} /> Verified
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          Unverified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{aroth.email}{aroth.phone ? ` · ${aroth.phone}` : ""}</p>
                    <p className="text-xs text-slate-400">
                      {aroth.hubName} · {aroth.commissionRate}% commission ·{" "}
                      <span className={savedCount === 0 ? "text-rose-500 font-medium" : "text-emerald-600 font-medium"}>
                        {savedCount === 0 ? "No products assigned" : `${savedCount} product${savedCount !== 1 ? "s" : ""} allowed`}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleVerify(aroth)}
                    disabled={isBusy}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40 ${
                      aroth.isVerified
                        ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    {aroth.isVerified ? <><X size={11} /> Unverify</> : <><CheckCircle2 size={11} /> Verify</>}
                  </button>
                  <button
                    onClick={() => setExpanded(isOpen ? null : aroth.assignmentId)}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                  >
                    {isOpen ? <><ChevronUp size={12} /> Close</> : <><ChevronDown size={12} /> Set Products</>}
                  </button>
                </div>
              </div>

              {/* Product assignment panel */}
              {isOpen && (
                <div className="border-t border-slate-100 px-5 py-4 space-y-3">
                  {/* Toolbar */}
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      placeholder="Search products…"
                      value={search[aroth.assignmentId] ?? ""}
                      onChange={(e) => setSearch((p) => ({ ...p, [aroth.assignmentId]: e.target.value }))}
                      className="flex-1 min-w-[160px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none focus:border-emerald-400 focus:bg-white transition"
                    />
                    <span className="text-xs text-slate-400">{draftCount} selected</span>
                    <button onClick={() => selectAll(aroth.assignmentId)} className="text-xs font-semibold text-emerald-600 hover:underline">Select all</button>
                    <button onClick={() => clearAll(aroth.assignmentId)} className="text-xs font-semibold text-slate-400 hover:underline">Clear all</button>
                  </div>

                  {/* Product checklist */}
                  <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50">
                    {filtered.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-slate-400">No products match.</p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {filtered.map((product) => {
                          const checked = draft.has(product);
                          return (
                            <label
                              key={product}
                              className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 transition hover:bg-white ${checked ? "bg-emerald-50" : ""}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleProduct(aroth.assignmentId, product)}
                                className="accent-emerald-600"
                              />
                              <span className={`text-sm ${checked ? "font-semibold text-emerald-800" : "text-slate-600"}`}>
                                {product}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Save button */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => saveProducts(aroth)}
                      disabled={isBusy || !isDirty}
                      className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 transition"
                    >
                      {isBusy ? "Saving…" : "Save Allowed Products"}
                    </button>
                    {isDirty && (
                      <span className="text-xs text-amber-600 font-medium">Unsaved changes</span>
                    )}
                    {!isDirty && savedCount > 0 && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <CheckCircle2 size={11} /> Saved
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
