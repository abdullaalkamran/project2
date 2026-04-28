"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, ShieldCheck, Percent, Package, TrendingUp,
  CheckCircle2, Clock, Mail, Phone, Building2, CalendarDays,
  Edit2, Save, ChevronDown, ChevronUp, AlertTriangle,
  PowerOff, Power, ShieldOff, ShieldPlus,
} from "lucide-react";
import api from "@/lib/api";

type Order = {
  orderCode: string;
  product: string;
  qty: string;
  totalAmount: number;
  buyerName: string;
  arothStatus: string | null;
  arothSaleAmount: number | null;
  arothCommissionRate: number | null;
  arothCommission: number | null;
  arothNetAmount: number | null;
  arothPaymentSentAt: string | null;
  arothSettledAt: string | null;
  confirmedAt: string;
};

type ArothDetail = {
  assignmentId: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  joinedAt: string | null;
  hubName: string;
  hubLocation: string;
  commissionRate: number;
  allowedProducts: string[];
  allProducts: string[];
  isVerified: boolean;
  isActive: boolean;
  createdAt: string | null;
  summary: {
    totalOrders: number;
    activeOrders: number;
    settledOrders: number;
    awaitingPayment: number;
    totalSales: number;
    totalCommission: number;
    totalNet: number;
  };
  orders: Order[];
};

const STATUS: Record<string, { label: string; color: string }> = {
  PENDING:      { label: "Pending Receipt", color: "bg-amber-100 text-amber-700"     },
  RECEIVED:     { label: "Received",        color: "bg-blue-100 text-blue-700"       },
  SOLD:         { label: "Sold",            color: "bg-violet-100 text-violet-700"   },
  PAYMENT_SENT: { label: "Payment Sent",    color: "bg-orange-100 text-orange-700"   },
  SETTLED:      { label: "Settled",         color: "bg-emerald-100 text-emerald-700" },
};

const bdt = (n: number) => `৳${n.toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;
const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-BD", { dateStyle: "medium" }) : "—";

export default function ArothDetailClient() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [detail, setDetail]       = useState<ArothDetail | null>(null);
  const [loading, setLoading]     = useState(true);
  const [busy, setBusy]           = useState<string | null>(null);

  // Commission editor
  const [editingRate, setEditingRate]   = useState(false);
  const [rateInput,   setRateInput]     = useState("");

  // Product panel
  const [showProducts, setShowProducts]     = useState(false);
  const [productDraft, setProductDraft]     = useState<Set<string>>(new Set());
  const [productSearch, setProductSearch]   = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    return api.get<ArothDetail>(`/api/hub-manager/aroths/${id}`)
      .then((d) => {
        setDetail(d);
        setProductDraft(new Set(d.allowedProducts));
        setRateInput(String(d.commissionRate));
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  async function patch(body: object, label: string) {
    setBusy(label);
    try {
      await api.patch(`/api/hub-manager/aroths/${id}`, body);
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function saveRate() {
    const rate = parseFloat(rateInput);
    if (isNaN(rate) || rate < 0 || rate > 100) return;
    await patch({ commissionRate: rate }, "rate");
    setEditingRate(false);
  }

  async function saveProducts() {
    await patch({ allowedProducts: Array.from(productDraft) }, "products");
    setShowProducts(false);
  }

  async function confirmPayment(orderCode: string) {
    setBusy(orderCode);
    try {
      await api.patch(`/api/hub-manager/aroth-orders/${orderCode}/confirm-payment`, {});
      await load();
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-36 animate-pulse rounded-2xl bg-slate-100" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
        <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
        <p className="text-slate-500">Aroth not found.</p>
      </div>
    );
  }

  const { summary } = detail;
  const filteredProducts = productSearch
    ? detail.allProducts.filter((p) => p.toLowerCase().includes(productSearch.toLowerCase()))
    : detail.allProducts;
  const isDirty = JSON.stringify([...productDraft].sort()) !== JSON.stringify([...detail.allowedProducts].sort());

  return (
    <div className="space-y-8">
      {/* Back */}
      <button type="button" onClick={() => router.back()}
        className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition">
        <ArrowLeft size={16} /> Back to Aroths
      </button>

      {/* Profile card */}
      <div className={`rounded-2xl border p-6 shadow-sm ${detail.isActive ? "border-slate-100 bg-white" : "border-slate-200 bg-slate-50"}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Avatar + info */}
          <div className="flex items-center gap-4">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-bold ${detail.isActive ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-500"}`}>
              {detail.name.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{detail.name}</h1>
                {!detail.isActive && (
                  <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-500">Inactive</span>
                )}
                {detail.isVerified ? (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                    <ShieldCheck size={11} /> Verified
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">Unverified</span>
                )}
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Mail size={11} />{detail.email}</span>
                {detail.phone && <span className="flex items-center gap-1"><Phone size={11} />{detail.phone}</span>}
                <span className="flex items-center gap-1"><Building2 size={11} />{detail.hubName} · {detail.hubLocation}</span>
                {detail.createdAt && <span className="flex items-center gap-1"><CalendarDays size={11} />Assigned {fmt(detail.createdAt)}</span>}
              </div>
            </div>
          </div>

        </div>

        {/* Commission rate editor */}
        <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
          <Percent size={14} className="text-amber-500" />
          <p className="text-xs font-semibold text-slate-500">Commission Rate</p>
          {editingRate ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                className="w-20 rounded-lg border border-amber-300 px-2 py-1 text-sm font-semibold text-amber-700 outline-none focus:border-amber-400"
                autoFocus
              />
              <span className="text-sm font-semibold text-slate-500">%</span>
              <button onClick={saveRate} disabled={busy === "rate"}
                className="flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-40 transition">
                <Save size={11} /> {busy === "rate" ? "Saving…" : "Save"}
              </button>
              <button onClick={() => { setEditingRate(false); setRateInput(String(detail.commissionRate)); }}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 transition">
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-0.5 text-sm font-bold text-amber-700">
                {detail.commissionRate}%
              </span>
              <button onClick={() => setEditingRate(true)}
                className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-700 transition">
                <Edit2 size={11} /> Edit
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => patch({ isActive: !detail.isActive }, "active")}
          disabled={busy === "active"}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40 ${
            detail.isActive
              ? "border-slate-200 bg-white text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          }`}
        >
          {detail.isActive
            ? <><PowerOff size={12} /> {busy === "active" ? "Deactivating…" : "Deactivate"}</>
            : <><Power size={12} /> {busy === "active" ? "Activating…" : "Activate"}</>}
        </button>

        <button
          onClick={() => patch({ isVerified: !detail.isVerified }, "verify")}
          disabled={busy === "verify"}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40 ${
            detail.isVerified
              ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          }`}
        >
          {detail.isVerified
            ? <><ShieldOff size={12} /> {busy === "verify" ? "Unverifying…" : "Unverify"}</>
            : <><ShieldPlus size={12} /> {busy === "verify" ? "Verifying…" : "Verify"}</>}
        </button>

        <button
          onClick={() => {
            setShowProducts(true);
            setTimeout(() => {
              document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 50);
          }}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          <Package size={12} />
          Set Products
          {detail.allowedProducts.length === 0 && (
            <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">!</span>
          )}
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400"><Clock size={15} /><p className="text-xs font-semibold uppercase tracking-wide">Active Orders</p></div>
          <p className="mt-2 text-2xl font-bold text-slate-800">{summary.activeOrders}</p>
          <p className="mt-0.5 text-xs text-slate-400">{summary.awaitingPayment} awaiting confirmation</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600"><TrendingUp size={15} /><p className="text-xs font-semibold uppercase tracking-wide">Total Sales</p></div>
          <p className="mt-2 text-2xl font-bold text-emerald-800">{bdt(summary.totalSales)}</p>
          <p className="mt-0.5 text-xs text-emerald-600">{summary.settledOrders} settled</p>
        </div>
        <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-violet-600"><Percent size={15} /><p className="text-xs font-semibold uppercase tracking-wide">Commission</p></div>
          <p className="mt-2 text-2xl font-bold text-violet-800">{bdt(summary.totalCommission)}</p>
          <p className="mt-0.5 text-xs text-violet-600">Aroth&apos;s earnings</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600"><CheckCircle2 size={15} /><p className="text-xs font-semibold uppercase tracking-wide">Net to Hub</p></div>
          <p className="mt-2 text-2xl font-bold text-blue-800">{bdt(summary.totalNet)}</p>
          <p className="mt-0.5 text-xs text-blue-600">After deduction</p>
        </div>
      </div>

      {/* Allowed products */}
      <div id="products-section" className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowProducts((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition"
        >
          <div className="flex items-center gap-2">
            <Package size={15} className="text-slate-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Allowed Products
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${detail.allowedProducts.length === 0 ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-700"}`}>
              {detail.allowedProducts.length === 0 ? "None assigned" : `${detail.allowedProducts.length} products`}
            </span>
          </div>
          {showProducts ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
        </button>

        {showProducts && (
          <div className="border-t border-slate-100 px-6 py-4 space-y-3">
            {detail.allowedProducts.length === 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                <p className="text-xs font-medium text-amber-700">No products assigned. This aroth cannot sell anything until products are added.</p>
              </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Search products…"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="flex-1 min-w-[180px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none focus:border-emerald-400 focus:bg-white transition"
              />
              <span className="text-xs text-slate-400">{productDraft.size} selected</span>
              <button onClick={() => setProductDraft(new Set(detail.allProducts))} className="text-xs font-semibold text-emerald-600 hover:underline">Select all</button>
              <button onClick={() => setProductDraft(new Set())} className="text-xs font-semibold text-slate-400 hover:underline">Clear all</button>
            </div>

            {/* Checklist */}
            <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50">
              {filteredProducts.length === 0 ? (
                <p className="px-4 py-3 text-xs text-slate-400">No products match.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredProducts.map((p) => {
                    const checked = productDraft.has(p);
                    return (
                      <label key={p} className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 transition hover:bg-white ${checked ? "bg-emerald-50" : ""}`}>
                        <input type="checkbox" checked={checked}
                          onChange={() => {
                            setProductDraft((prev) => {
                              const s = new Set(prev);
                              s.has(p) ? s.delete(p) : s.add(p);
                              return s;
                            });
                          }}
                          className="accent-emerald-600" />
                        <span className={`text-sm ${checked ? "font-semibold text-emerald-800" : "text-slate-600"}`}>{p}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Save */}
            <div className="flex items-center gap-3">
              <button onClick={saveProducts} disabled={busy === "products" || !isDirty}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 transition">
                {busy === "products" ? "Saving…" : "Save Products"}
              </button>
              {isDirty && <span className="text-xs font-medium text-amber-600">Unsaved changes</span>}
              {!isDirty && detail.allowedProducts.length > 0 && (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600"><CheckCircle2 size={11} /> Saved</span>
              )}
            </div>
          </div>
        )}

        {/* Chips when collapsed */}
        {!showProducts && detail.allowedProducts.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-slate-50 px-6 py-4">
            {detail.allowedProducts.map((p) => (
              <span key={p} className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{p}</span>
            ))}
          </div>
        )}
      </div>

      {/* Order history */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Order History ({detail.orders.length})
          </h2>
          {summary.awaitingPayment > 0 && (
            <span className="rounded-full bg-orange-500 px-2.5 py-1 text-xs font-bold text-white">
              {summary.awaitingPayment} payment{summary.awaitingPayment !== 1 ? "s" : ""} to confirm
            </span>
          )}
        </div>

        {detail.orders.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
            <p className="text-slate-500">No orders routed to this aroth yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full min-w-[740px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Order / Product</th>
                  <th className="px-4 py-3 text-left">Buyer</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Buyer Paid</th>
                  <th className="px-4 py-3 text-right">Sale</th>
                  <th className="px-4 py-3 text-right">Commission</th>
                  <th className="px-4 py-3 text-right">Net</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {detail.orders.map((o) => {
                  const badge = STATUS[o.arothStatus ?? "PENDING"] ?? { label: o.arothStatus, color: "bg-slate-100 text-slate-600" };
                  return (
                    <tr key={o.orderCode} className={`hover:bg-slate-50 ${o.arothStatus === "PAYMENT_SENT" ? "bg-orange-50/40" : ""}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{o.product}</p>
                        <p className="font-mono text-[10px] text-slate-400">{o.orderCode}</p>
                        <p className="text-[10px] text-slate-400">{o.qty}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{o.buyerName}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${badge.color}`}>{badge.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-slate-500">{bdt(o.totalAmount)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">{o.arothSaleAmount != null ? bdt(o.arothSaleAmount) : "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-violet-700">
                        {o.arothCommission != null ? bdt(o.arothCommission) : "—"}
                        {o.arothCommissionRate != null && <span className="ml-1 text-[10px] text-slate-400">({o.arothCommissionRate}%)</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-700">{o.arothNetAmount != null ? bdt(o.arothNetAmount) : "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        <p>{fmt(o.confirmedAt)}</p>
                        {o.arothSettledAt && <p className="font-semibold text-emerald-600">✓ {fmt(o.arothSettledAt)}</p>}
                        {o.arothPaymentSentAt && !o.arothSettledAt && <p className="text-orange-500">Paid {fmt(o.arothPaymentSentAt)}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {o.arothStatus === "PAYMENT_SENT" && (
                          <button onClick={() => confirmPayment(o.orderCode)} disabled={busy === o.orderCode}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 transition whitespace-nowrap">
                            {busy === o.orderCode ? "Confirming…" : "Confirm Payment"}
                          </button>
                        )}
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
