"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

type Hub = { id: string; name: string; location: string; type: string; isActive: boolean; createdAt: string };
type Stats = {
  totalLots: number; activeLots: number; totalOrders: number; deliveredOrders: number;
  totalTrucks: number; totalStaff: number; lotStatusCounts: Record<string, number>;
};
type Lot = {
  id: string; lotCode: string; title: string; category: string; quantity: number; unit: string;
  status: string; sellerName: string; grade: string; saleType: string;
  leaderDecision: string | null; verdict: string | null; createdAt: string; receivedAt: string | null;
};
type Order = {
  id: string; orderCode: string; product: string; qty: string; buyerName: string;
  sellerName: string; status: string; totalAmount: number; dispatched: boolean; delivered: boolean;
  confirmedAt: string;
  distributorName: string | null; distributorPhone: string | null;
  deliveryPoint: string | null; assignedTruck: string | null;
  hubReceivedAt: string | null; arrivedAt: string | null;
  pickedUpAt: string | null; deliveredAt: string | null;
};
type StaffMember = {
  id: string; name: string; email: string; phone: string | null; status: string;
  roles: string[]; assignmentRoles: string[];
};
type Truck = {
  id: string; truckCode: string; reg: string; type: string;
  capacityKg: number; status: string; driverName: string | null; driverPhone: string | null;
};
type Manager = { assignmentId: string; role: string; userId: string; name: string; email: string };

type PersonEntry = { id: string | null; name: string; email: string | null; phone: string | null; status: string };
type SellerEntry = PersonEntry & { lotsCount: number };
type CheckerEntry = PersonEntry & { reportsCount: number };
type DeliveryManEntry = PersonEntry & { deliveriesCount: number };
type People = {
  sellers: SellerEntry[];
  qcCheckers: CheckerEntry[];
  qcLeaders: PersonEntry[];
  deliveryMen: DeliveryManEntry[];
};

type HubDetail = {
  hub: Hub; stats: Stats; lots: Lot[]; orders: Order[];
  staff: StaffMember[]; trucks: Truck[]; managers: Manager[];
  people: People;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  BOTH: "Receiving & Delivery", RECEIVING: "Receiving Only", DELIVERY: "Delivery Only",
};

const LOT_STATUS_COLORS: Record<string, string> = {
  PENDING_DELIVERY: "bg-slate-100 text-slate-600",
  AT_HUB:           "bg-sky-100 text-sky-700",
  IN_QC:            "bg-orange-100 text-orange-700",
  QC_SUBMITTED:     "bg-amber-100 text-amber-700",
  QC_PASSED:        "bg-blue-100 text-blue-700",
  QC_FAILED:        "bg-red-100 text-red-600",
  LIVE:             "bg-emerald-100 text-emerald-700",
  AUCTION_ENDED:    "bg-slate-100 text-slate-500",
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  CONFIRMED:       "bg-blue-50 text-blue-700",
  DISPATCHED:      "bg-amber-50 text-amber-700",
  HUB_RECEIVED:    "bg-sky-50 text-sky-700",
  OUT_FOR_DELIVERY:"bg-violet-50 text-violet-700",
  ARRIVED:         "bg-teal-50 text-teal-700",
  PICKED_UP:       "bg-emerald-50 text-emerald-700",
};

const ROLE_LABELS: Record<string, string> = {
  hub_manager: "Hub Mgr", qc_leader: "QC Leader", qc_checker: "QC Checker",
  delivery_hub_manager: "Delivery Hub Mgr", delivery_distributor: "Delivery Man",
  admin: "Admin", buyer: "Buyer", seller: "Seller",
};

const TRUCK_STATUS_COLORS: Record<string, string> = {
  Available: "bg-emerald-50 text-emerald-700",
  "On Route": "bg-amber-50 text-amber-700",
  Maintenance: "bg-red-50 text-red-600",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-BD", { day: "2-digit", month: "short", year: "numeric" });
}

function Badge({ label, color }: { label: string; color?: string }) {
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${color ?? "bg-slate-100 text-slate-600"}`}>
      {label}
    </span>
  );
}

// ─── Tab Components ───────────────────────────────────────────────────────────

const PIPELINE_STEPS = [
  // Lot flow
  { key: "PENDING_DELIVERY", label: "Lot Created",      sub: "Lot submitted",        icon: "📦", color: "bg-slate-100  text-slate-600",   bar: "bg-slate-400",   source: "lot" },
  { key: "AT_HUB",           label: "At Hub",           sub: "Arrived at hub",        icon: "🏭", color: "bg-sky-100   text-sky-700",      bar: "bg-sky-500",     source: "lot" },
  { key: "IN_QC",            label: "In QC",            sub: "Under inspection",      icon: "🔍", color: "bg-orange-100 text-orange-700",  bar: "bg-orange-500",  source: "lot" },
  { key: "QC_SUBMITTED",     label: "QC Done",          sub: "Report submitted",      icon: "📋", color: "bg-amber-100 text-amber-700",    bar: "bg-amber-500",   source: "lot" },
  { key: "QC_PASSED",        label: "QC Passed",        sub: "Approved for sale",     icon: "✅", color: "bg-blue-100  text-blue-700",     bar: "bg-blue-500",    source: "lot" },
  { key: "LIVE",             label: "On Market",        sub: "Listed for buyers",     icon: "🛒", color: "bg-emerald-100 text-emerald-700",bar: "bg-emerald-500", source: "lot" },
  // Order flow
  { key: "CONFIRMED",        label: "Order Placed",     sub: "Buyer confirmed",       icon: "🤝", color: "bg-violet-100 text-violet-700",  bar: "bg-violet-500",  source: "order" },
  { key: "DISPATCHED",       label: "Dispatched",       sub: "Left source hub",       icon: "🚛", color: "bg-amber-100 text-amber-700",    bar: "bg-amber-500",   source: "order" },
  { key: "HUB_RECEIVED",     label: "At Delivery Hub",  sub: "Arrived for handover",  icon: "🏪", color: "bg-sky-100   text-sky-700",      bar: "bg-sky-500",     source: "order" },
  { key: "OUT_FOR_DELIVERY", label: "Out for Delivery", sub: "Delivery man assigned", icon: "🛵", color: "bg-indigo-100 text-indigo-700",  bar: "bg-indigo-500",  source: "order" },
  { key: "ARRIVED",          label: "Arrived",          sub: "At buyer location",     icon: "📍", color: "bg-teal-100  text-teal-700",     bar: "bg-teal-500",    source: "order" },
  { key: "PICKED_UP",        label: "Delivered",        sub: "Order complete",        icon: "🎉", color: "bg-emerald-100 text-emerald-700",bar: "bg-emerald-500", source: "order" },
];

function PipelineProgress({ lots, orders }: { lots: Lot[]; orders: Order[] }) {
  const lotCounts: Record<string, number> = {};
  for (const l of lots) lotCounts[l.status] = (lotCounts[l.status] ?? 0) + 1;
  const orderCounts: Record<string, number> = {};
  for (const o of orders) orderCounts[o.status] = (orderCounts[o.status] ?? 0) + 1;

  const getCount = (step: typeof PIPELINE_STEPS[0]) =>
    step.source === "lot" ? (lotCounts[step.key] ?? 0) : (orderCounts[step.key] ?? 0);

  const maxCount = Math.max(1, ...PIPELINE_STEPS.map(getCount));

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700 mb-1">Full Journey Pipeline</h3>
      <p className="text-xs text-slate-400 mb-4">Lot creation → QC → Market → Order → Delivery</p>

      {/* Divider between lot and order sections */}
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-0">
          {PIPELINE_STEPS.map((step, i) => {
            const count = getCount(step);
            const isActive = count > 0;
            const barH = count > 0 ? Math.max(4, Math.round((count / maxCount) * 48)) : 4;
            const isOrderStart = step.key === "CONFIRMED";

            return (
              <div key={step.key} className="flex items-stretch">
                {/* Divider line between lot and order phases */}
                {isOrderStart && (
                  <div className="flex flex-col items-center justify-center mx-1 px-2">
                    <div className="h-full w-px bg-slate-200" />
                  </div>
                )}

                <div className="flex flex-col items-center w-[84px]">
                  {/* Bar chart */}
                  <div className="flex h-14 w-full items-end justify-center px-2">
                    <div
                      className={`w-8 rounded-t transition-all ${isActive ? step.bar : "bg-slate-100"}`}
                      style={{ height: `${barH}px` }}
                    />
                  </div>

                  {/* Count */}
                  <p className={`text-base font-bold ${isActive ? "text-slate-900" : "text-slate-300"}`}>
                    {count}
                  </p>

                  {/* Step info */}
                  <div className={`mt-1.5 w-full rounded-xl px-2 py-2 text-center ${isActive ? step.color : "bg-slate-50 text-slate-400"}`}>
                    <p className="text-sm">{step.icon}</p>
                    <p className="text-[10px] font-bold leading-tight mt-0.5">{step.label}</p>
                    <p className="text-[9px] opacity-70 leading-tight mt-0.5">{step.sub}</p>
                  </div>

                  {/* Arrow connector (not last) */}
                  {i < PIPELINE_STEPS.length - 1 && !PIPELINE_STEPS[i + 1]?.key.startsWith("CONFIRMED") && (
                    <div className="mt-2 text-slate-300 text-xs">→</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3 border-t border-slate-100 pt-3">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="h-2.5 w-2.5 rounded-sm bg-sky-400" />
          Lot Flow (creation → market)
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="h-2.5 w-2.5 rounded-sm bg-violet-400" />
          Order & Delivery Flow
        </div>
      </div>
    </div>
  );
}

function fmtTaka(n: number) {
  if (n >= 10_000_000) return `৳${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000)    return `৳${(n / 100_000).toFixed(2)} L`;
  if (n >= 1_000)      return `৳${(n / 1_000).toFixed(1)}K`;
  return `৳${n.toFixed(0)}`;
}

function FinancialSummary({ orders }: { orders: Order[] }) {
  const totalGMV      = orders.reduce((s, o) => s + (o.totalAmount ?? 0), 0);
  const deliveredRev  = orders.filter(o => o.delivered).reduce((s, o) => s + (o.totalAmount ?? 0), 0);
  const inTransitRev  = orders.filter(o => !o.delivered && o.dispatched).reduce((s, o) => s + (o.totalAmount ?? 0), 0);
  const pendingRev    = orders.filter(o => !o.dispatched && !o.delivered).reduce((s, o) => s + (o.totalAmount ?? 0), 0);
  const avgOrderVal   = orders.length ? totalGMV / orders.length : 0;
  const deliveryRate  = orders.length ? Math.round((orders.filter(o => o.delivered).length / orders.length) * 100) : 0;

  const finCards = [
    { label: "Total GMV",        val: fmtTaka(totalGMV),     sub: `${orders.length} orders total`,            color: "text-violet-700", bg: "bg-violet-50",  border: "border-violet-100" },
    { label: "Delivered",        val: fmtTaka(deliveredRev), sub: `${deliveryRate}% delivery rate`,           color: "text-emerald-700",bg: "bg-emerald-50", border: "border-emerald-100" },
    { label: "In Transit",       val: fmtTaka(inTransitRev), sub: "dispatched, not yet delivered",            color: "text-amber-700",  bg: "bg-amber-50",   border: "border-amber-100" },
    { label: "Avg Order Value",  val: fmtTaka(avgOrderVal),  sub: "per confirmed order",                      color: "text-sky-700",    bg: "bg-sky-50",     border: "border-sky-100" },
  ];

  // Revenue by order status
  const STATUS_DISPLAY: { key: string; label: string; color: string }[] = [
    { key: "CONFIRMED",        label: "Confirmed",        color: "bg-blue-400" },
    { key: "DISPATCHED",       label: "Dispatched",       color: "bg-amber-400" },
    { key: "HUB_RECEIVED",     label: "At Hub",           color: "bg-sky-400" },
    { key: "OUT_FOR_DELIVERY", label: "Out for Delivery", color: "bg-violet-400" },
    { key: "ARRIVED",          label: "Arrived",          color: "bg-teal-400" },
    { key: "PICKED_UP",        label: "Delivered",        color: "bg-emerald-500" },
  ];

  const revenueByStatus = STATUS_DISPLAY.map(s => ({
    ...s,
    amount: orders.filter(o => o.status === s.key).reduce((sum, o) => sum + (o.totalAmount ?? 0), 0),
    count:  orders.filter(o => o.status === s.key).length,
  }));

  const maxAmount = Math.max(1, ...revenueByStatus.map(r => r.amount));

  return (
    <div className="space-y-4">
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {finCards.map(c => (
          <div key={c.label} className={`rounded-2xl border ${c.border} ${c.bg} p-4 shadow-sm`}>
            <p className="text-xs text-slate-500">{c.label}</p>
            <p className={`mt-1 text-2xl font-bold ${c.color}`}>{c.val}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue by Stage */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-1">Revenue by Delivery Stage</h3>
        <p className="text-xs text-slate-400 mb-4">Total order value grouped by current order status</p>
        <div className="space-y-2.5">
          {revenueByStatus.map(s => (
            <div key={s.key} className="flex items-center gap-3">
              <div className="w-28 shrink-0 text-right text-[11px] font-semibold text-slate-600">{s.label}</div>
              <div className="flex-1 h-5 bg-slate-50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${s.color}`}
                  style={{ width: `${s.amount > 0 ? Math.max(2, (s.amount / maxAmount) * 100) : 0}%` }}
                />
              </div>
              <div className="w-24 shrink-0 text-[11px] font-bold text-slate-700">{fmtTaka(s.amount)}</div>
              <div className="w-12 shrink-0 text-[11px] text-slate-400 text-right">{s.count} ord</div>
            </div>
          ))}
        </div>

        {/* Totals row */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 border border-slate-100">
          <div className="text-xs font-semibold text-slate-600">Total Revenue (all stages)</div>
          <div className="text-base font-bold text-slate-900">{fmtTaka(totalGMV)}</div>
        </div>
      </div>

      {/* Pending vs dispatched breakdown */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Revenue Breakdown</h3>
        <div className="grid grid-cols-3 divide-x divide-slate-100">
          {[
            { label: "Collected",   amount: deliveredRev,  count: orders.filter(o => o.delivered).length,              color: "text-emerald-700" },
            { label: "In Transit",  amount: inTransitRev,  count: orders.filter(o => !o.delivered && o.dispatched).length, color: "text-amber-700" },
            { label: "Pending",     amount: pendingRev,    count: orders.filter(o => !o.dispatched && !o.delivered).length, color: "text-blue-700" },
          ].map(item => (
            <div key={item.label} className="px-4 text-center">
              <p className="text-[11px] text-slate-500">{item.label}</p>
              <p className={`text-xl font-bold mt-1 ${item.color}`}>{fmtTaka(item.amount)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{item.count} orders</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ data }: { data: HubDetail }) {
  const { hub, stats, managers, lots, orders } = data;
  const statCards = [
    { label: "Total Lots", val: stats.totalLots, sub: `${stats.activeLots} active`, color: "text-violet-700", bg: "bg-violet-50" },
    { label: "Orders", val: stats.totalOrders, sub: `${stats.deliveredOrders} delivered`, color: "text-emerald-700", bg: "bg-emerald-50" },
    { label: "Fleet", val: stats.totalTrucks, sub: "trucks assigned", color: "text-amber-700", bg: "bg-amber-50" },
    { label: "Staff", val: stats.totalStaff, sub: "assigned members", color: "text-sky-700", bg: "bg-sky-50" },
  ];

  return (
    <div className="space-y-6">
      {/* Hub Info */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{hub.name}</h2>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${hub.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                {hub.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="text-sm text-slate-500">{hub.location}</p>
            <div className="flex gap-2 flex-wrap mt-1">
              <Badge label={TYPE_LABELS[hub.type] ?? hub.type} color="bg-violet-100 text-violet-700" />
              <Badge label={`Created ${fmt(hub.createdAt)}`} color="bg-slate-100 text-slate-500" />
            </div>
          </div>
          <Link href="/admin/hubs"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition">
            ← Back to Hubs
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map(c => (
          <div key={c.label} className={`rounded-2xl border border-slate-100 ${c.bg} p-4 shadow-sm`}>
            <p className="text-xs text-slate-500">{c.label}</p>
            <p className={`mt-1 text-3xl font-bold ${c.color}`}>{c.val}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Financial Summary */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Financial Overview</h3>
        <FinancialSummary orders={orders} />
      </div>

      {/* Full pipeline */}
      <PipelineProgress lots={lots} orders={orders} />

      {/* Managers */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Hub Managers ({managers.length})</h3>
        {managers.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No managers assigned</p>
        ) : (
          <div className="space-y-2">
            {managers.map(m => (
              <div key={m.assignmentId} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{m.name}</p>
                  <p className="text-xs text-slate-400">{m.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge label={ROLE_LABELS[m.role] ?? m.role} color="bg-violet-100 text-violet-700" />
                  <Link href={`/admin/users/${m.userId}`}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition">
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LotsTab({ lots }: { lots: Lot[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const statuses = ["All", ...Array.from(new Set(lots.map(l => l.status)))];

  const filtered = lots.filter(l => {
    const matchSearch = l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.lotCode.toLowerCase().includes(search.toLowerCase()) ||
      l.sellerName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input type="text" placeholder="Search lots…" value={search} onChange={e => setSearch(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 w-56" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 bg-white">
          {statuses.map(s => <option key={s} value={s}>{s === "All" ? "All Status" : s.replace(/_/g, " ")}</option>)}
        </select>
        <span className="self-center text-xs text-slate-400">{filtered.length} lots</span>
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-400">No lots found</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Lot</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Seller</th>
                <th className="px-4 py-3 text-left">Qty</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">QC</th>
                <th className="px-4 py-3 text-left">Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(l => (
                <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{l.title}</p>
                    <p className="font-mono text-[11px] text-slate-400">{l.lotCode}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{l.category}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{l.sellerName}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{l.quantity} {l.unit}</td>
                  <td className="px-4 py-3">
                    <Badge label={l.status.replace(/_/g, " ")} color={LOT_STATUS_COLORS[l.status]} />
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {l.verdict ? <Badge label={l.verdict} color={l.verdict === "PASSED" ? "bg-emerald-50 text-emerald-700" : l.verdict === "FAILED" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-700"} /> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{l.receivedAt ? fmt(l.receivedAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function OrdersTab({ orders }: { orders: Order[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const statuses = ["All", ...Array.from(new Set(orders.map(o => o.status)))];

  const filtered = orders.filter(o => {
    const matchSearch = o.product.toLowerCase().includes(search.toLowerCase()) ||
      o.orderCode.toLowerCase().includes(search.toLowerCase()) ||
      o.buyerName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input type="text" placeholder="Search orders…" value={search} onChange={e => setSearch(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 w-56" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 bg-white">
          {statuses.map(s => <option key={s} value={s}>{s === "All" ? "All Status" : s.replace(/_/g, " ")}</option>)}
        </select>
        <span className="self-center text-xs text-slate-400">{filtered.length} orders</span>
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-400">No orders found</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Order</th>
                <th className="px-4 py-3 text-left">Buyer</th>
                <th className="px-4 py-3 text-left">Seller</th>
                <th className="px-4 py-3 text-left">Qty</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(o => (
                <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{o.product}</p>
                    <p className="font-mono text-[11px] text-slate-400">{o.orderCode}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{o.buyerName}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{o.sellerName}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{o.qty}</td>
                  <td className="px-4 py-3 text-right text-xs font-semibold text-slate-700">৳ {o.totalAmount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <Badge label={o.status.replace(/_/g, " ")} color={ORDER_STATUS_COLORS[o.status]} />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{fmt(o.confirmedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StaffCard({ id, name, email, phone, status, badges }: {
  id: string; name: string; email: string; phone?: string | null; status: string; badges: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm hover:border-indigo-200 transition-colors flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
          <p className="truncate text-xs text-slate-400">{email}</p>
          {phone && <p className="text-xs text-slate-400">{phone}</p>}
        </div>
        <span className={`shrink-0 text-[10px] font-semibold rounded-full px-2 py-0.5 ${status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
          {status.charAt(0) + status.slice(1).toLowerCase()}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">{badges}</div>
      {id && (
        <Link href={`/admin/users/${id}`}
          className="mt-auto block w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-center text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition">
          View Details
        </Link>
      )}
    </div>
  );
}

function StaffGroup({ title, color, count, children }: { title: string; color: string; count: number; children: ReactNode }) {
  if (count === 0) return null;
  return (
    <div className="space-y-3">
      <h3 className={`text-sm font-bold ${color}`}>{title} <span className="font-normal text-slate-400">({count})</span></h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}

function StaffTab({ staff, people }: { staff: StaffMember[]; people: People }) {
  const [search, setSearch] = useState("");
  const q = search.toLowerCase();

  const hubStaff = staff.filter(s =>
    s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
  );
  const qcLeaders = people.qcLeaders.filter(p =>
    p.name.toLowerCase().includes(q) || (p.email ?? "").toLowerCase().includes(q)
  );
  const qcCheckers = people.qcCheckers.filter(p =>
    p.name.toLowerCase().includes(q) || (p.email ?? "").toLowerCase().includes(q)
  );
  const deliveryMen = people.deliveryMen.filter(p =>
    p.name.toLowerCase().includes(q) || (p.email ?? "").toLowerCase().includes(q)
  );

  const total = hubStaff.length + qcLeaders.length + qcCheckers.length + deliveryMen.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <input type="text" placeholder="Search staff…" value={search} onChange={e => setSearch(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 w-56" />
        <span className="self-center text-xs text-slate-400">{total} total</span>
      </div>

      {total === 0 ? (
        <p className="py-12 text-center text-sm text-slate-400">No staff found</p>
      ) : (
        <>
          <StaffGroup title="Hub Staff" color="text-violet-700" count={hubStaff.length}>
            {hubStaff.map(s => (
              <StaffCard key={s.id} id={s.id} name={s.name} email={s.email} phone={s.phone} status={s.status}
                badges={s.roles.map(r => (
                  <Badge key={r} label={ROLE_LABELS[r] ?? r}
                    color={r.includes("hub") ? "bg-violet-100 text-violet-700" : r.includes("qc") ? "bg-teal-100 text-teal-700" : r.includes("delivery") ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"} />
                ))} />
            ))}
          </StaffGroup>

          <StaffGroup title="QC Team Leads" color="text-amber-700" count={qcLeaders.length}>
            {qcLeaders.map(l => (
              <StaffCard key={l.id ?? l.name} id={l.id ?? ""} name={l.name} email={l.email ?? ""} phone={l.phone} status={l.status}
                badges={<Badge label="QC Leader" color="bg-amber-100 text-amber-700" />} />
            ))}
          </StaffGroup>

          <StaffGroup title="QC Checkers" color="text-teal-700" count={qcCheckers.length}>
            {qcCheckers.map(c => (
              <StaffCard key={c.id ?? c.name} id={c.id ?? ""} name={c.name} email={c.email ?? ""} phone={c.phone} status={c.status}
                badges={<><Badge label="QC Checker" color="bg-teal-100 text-teal-700" /><span className="text-[11px] text-slate-400 ml-1">{c.reportsCount} report{c.reportsCount !== 1 ? "s" : ""}</span></>} />
            ))}
          </StaffGroup>

          <StaffGroup title="Delivery Men" color="text-indigo-700" count={deliveryMen.length}>
            {deliveryMen.map(d => (
              <StaffCard key={d.id ?? d.name} id={d.id ?? ""} name={d.name} email={d.email ?? ""} phone={d.phone} status={d.status}
                badges={<><Badge label="Delivery Man" color="bg-indigo-100 text-indigo-700" /><span className="text-[11px] text-slate-400 ml-1">{d.deliveriesCount} deliver{d.deliveriesCount !== 1 ? "ies" : "y"}</span></>} />
            ))}
          </StaffGroup>
        </>
      )}
    </div>
  );
}

function FleetTab({ trucks }: { trucks: Truck[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const statuses = ["All", ...Array.from(new Set(trucks.map(t => t.status)))];

  const filtered = trucks.filter(t => {
    const matchSearch = t.reg.toLowerCase().includes(search.toLowerCase()) ||
      t.truckCode.toLowerCase().includes(search.toLowerCase()) ||
      t.type.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input type="text" placeholder="Search trucks…" value={search} onChange={e => setSearch(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 w-56" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 bg-white">
          {statuses.map(s => <option key={s} value={s}>{s === "All" ? "All Status" : s}</option>)}
        </select>
        <span className="self-center text-xs text-slate-400">{filtered.length} trucks</span>
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-400">No trucks assigned to this hub</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(t => (
            <div key={t.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{t.reg}</p>
                  <p className="font-mono text-[11px] text-slate-400">{t.truckCode}</p>
                </div>
                <Badge label={t.status} color={TRUCK_STATUS_COLORS[t.status] ?? "bg-slate-100 text-slate-600"} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-slate-400">Type</p>
                  <p className="font-medium text-slate-700">{t.type}</p>
                </div>
                <div>
                  <p className="text-slate-400">Capacity</p>
                  <p className="font-medium text-slate-700">{t.capacityKg.toLocaleString()} kg</p>
                </div>
                {t.driverName && (
                  <div className="col-span-2">
                    <p className="text-slate-400">Driver</p>
                    <p className="font-medium text-slate-700">{t.driverName}{t.driverPhone ? ` · ${t.driverPhone}` : ""}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PersonCard({ person, sub }: { person: PersonEntry; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm hover:border-indigo-200 transition-colors flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{person.name}</p>
          {person.email && <p className="truncate text-xs text-slate-400">{person.email}</p>}
          {person.phone && <p className="text-xs text-slate-400">{person.phone}</p>}
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${person.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
          {person.status.charAt(0) + person.status.slice(1).toLowerCase()}
        </span>
      </div>
      {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
      {person.id && (
        <Link href={`/admin/users/${person.id}`}
          className="mt-auto block w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-center text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition">
          View Details
        </Link>
      )}
    </div>
  );
}

function SellersTab({ sellers }: { sellers: SellerEntry[] }) {
  const [search, setSearch] = useState("");
  const filtered = sellers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input type="text" placeholder="Search sellers…" value={search} onChange={e => setSearch(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 w-56" />
        <span className="self-center text-xs text-slate-400">{filtered.length} sellers</span>
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-400">No sellers have submitted lots to this hub yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(s => (
            <PersonCard key={s.id ?? s.name} person={s} sub={`${s.lotsCount} lot${s.lotsCount !== 1 ? "s" : ""} submitted`} />
          ))}
        </div>
      )}
    </div>
  );
}

const DELIVERY_STAGES = [
  { key: "HUB_RECEIVED",    label: "At Delivery Hub",    color: "bg-sky-100 text-sky-700",        dot: "bg-sky-500"      },
  { key: "OUT_FOR_DELIVERY",label: "Out for Delivery",   color: "bg-violet-100 text-violet-700",  dot: "bg-violet-500"   },
  { key: "ARRIVED",         label: "Arrived at Point",   color: "bg-teal-100 text-teal-700",      dot: "bg-teal-500"     },
  { key: "PICKED_UP",       label: "Delivered",          color: "bg-emerald-100 text-emerald-700",dot: "bg-emerald-500"  },
];

// All steps in order from order confirmed to delivery
const ORDER_STEPS = [
  { key: "CONFIRMED",        label: "Order Confirmed",  icon: "🤝" },
  { key: "DISPATCHED",       label: "Dispatched",       icon: "🚛" },
  { key: "HUB_RECEIVED",     label: "At Hub",           icon: "🏪" },
  { key: "OUT_FOR_DELIVERY", label: "Out for Delivery", icon: "🛵" },
  { key: "ARRIVED",          label: "Arrived",          icon: "📍" },
  { key: "PICKED_UP",        label: "Delivered",        icon: "✅" },
];

const STEP_ORDER = ORDER_STEPS.map(s => s.key);

function OrderStepBar({ status }: { status: string }) {
  const currentIdx = STEP_ORDER.indexOf(status);

  return (
    <div className="flex items-center gap-0 overflow-x-auto py-1">
      {ORDER_STEPS.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;

        return (
          <div key={step.key} className="flex items-center">
            {/* Step node */}
            <div className="flex flex-col items-center min-w-[60px]">
              <div className={`flex h-8 w-8 shrink-0 grow-0 items-center justify-center rounded-full border-2 leading-none transition-all
                ${done    ? "border-emerald-500 bg-emerald-500 text-white"
                  : active  ? "border-indigo-500 bg-indigo-500 text-white shadow-md shadow-indigo-200"
                  : "border-slate-200 bg-white text-slate-300"}`}>
                <span className="text-xs leading-none">{done ? "✓" : step.icon}</span>
              </div>
              <p className={`mt-1 text-center text-[9px] font-semibold leading-tight max-w-[60px]
                ${done ? "text-emerald-600" : active ? "text-indigo-700" : "text-slate-300"}`}>
                {step.label}
              </p>
            </div>

            {/* Connector line */}
            {i < ORDER_STEPS.length - 1 && (
              <div className={`mb-4 h-0.5 w-6 shrink-0 ${i < currentIdx ? "bg-emerald-400" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function fmtDt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-BD", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function DeliveryTab({ orders }: { orders: Order[] }) {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("All");

  const deliveryOrders = orders.filter(o =>
    ["DISPATCHED","HUB_RECEIVED","OUT_FOR_DELIVERY","ARRIVED","PICKED_UP"].includes(o.status)
  );

  const filtered = deliveryOrders.filter(o => {
    const q = search.toLowerCase();
    const matchSearch = o.orderCode.toLowerCase().includes(q) ||
      o.product.toLowerCase().includes(q) ||
      o.buyerName.toLowerCase().includes(q) ||
      (o.distributorName ?? "").toLowerCase().includes(q);
    const matchStage = stageFilter === "All" || o.status === stageFilter;
    return matchSearch && matchStage;
  });

  const stageCounts = DELIVERY_STAGES.reduce<Record<string, number>>((acc, s) => {
    acc[s.key] = deliveryOrders.filter(o => o.status === s.key).length;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* Stage summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {DELIVERY_STAGES.map(s => (
          <button key={s.key} type="button"
            onClick={() => setStageFilter(stageFilter === s.key ? "All" : s.key)}
            className={`rounded-2xl border p-4 text-left transition ${stageFilter === s.key ? "border-indigo-300 ring-2 ring-indigo-100" : "border-slate-100"} ${s.color}`}>
            <p className="text-2xl font-bold">{stageCounts[s.key] ?? 0}</p>
            <p className="text-[11px] font-medium mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex flex-wrap gap-2">
        <input type="text" placeholder="Search orders…" value={search} onChange={e => setSearch(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 w-56" />
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 bg-white">
          <option value="All">All Stages</option>
          {DELIVERY_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <span className="self-center text-xs text-slate-400">{filtered.length} orders</span>
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-400">No delivery orders found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(o => {
            const stage = DELIVERY_STAGES.find(s => s.key === o.status);
            return (
              <div key={o.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{o.product}</p>
                    <p className="font-mono text-xs text-slate-400">{o.orderCode}</p>
                  </div>
                  {stage && (
                    <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${stage.color}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${stage.dot}`} />
                      {stage.label}
                    </span>
                  )}
                </div>

                {/* Details grid */}
                <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <p className="text-slate-400">Buyer</p>
                    <p className="font-medium text-slate-700">{o.buyerName}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Delivery Point</p>
                    <p className="font-medium text-slate-700">{o.deliveryPoint ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Qty</p>
                    <p className="font-medium text-slate-700">{o.qty}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Delivery Man</p>
                    <p className="font-medium text-slate-700">
                      {o.distributorName
                        ? `${o.distributorName}${o.distributorPhone ? ` · ${o.distributorPhone}` : ""}`
                        : (o.assignedTruck ?? "—")}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Amount</p>
                    <p className="font-medium text-slate-700">৳ {o.totalAmount.toLocaleString()}</p>
                  </div>
                </div>

                {/* Step progress bar */}
                <div className="border-t border-slate-100 pt-3">
                  <OrderStepBar status={o.status} />
                </div>

                {/* Timestamps */}
                <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs sm:grid-cols-4">
                  {[
                    { label: "Hub Received",    val: o.hubReceivedAt },
                    { label: "Out for Delivery",val: o.arrivedAt === null && o.status === "OUT_FOR_DELIVERY" ? o.confirmedAt : o.arrivedAt },
                    { label: "Arrived",         val: o.arrivedAt },
                    { label: "Delivered",       val: o.deliveredAt ?? o.pickedUpAt },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <p className="text-slate-400">{label}</p>
                      <p className={`font-medium ${val ? "text-emerald-700" : "text-slate-300"}`}>{fmtDt(val ?? null)}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "overview",  label: "Overview" },
  { id: "lots",      label: "Lots" },
  { id: "orders",    label: "Orders" },
  { id: "delivery",  label: "Delivery" },
  { id: "sellers",   label: "Sellers" },
  { id: "staff",     label: "Staff" },
  { id: "fleet",     label: "Fleet" },
];

export default function HubDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData]   = useState<HubDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetch(`/api/admin/hubs/${id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => toast.error("Failed to load hub details"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}
    </div>
  );

  if (!data) return (
    <div className="py-24 text-center">
      <p className="font-semibold text-slate-600">Hub not found</p>
      <Link href="/admin/hubs" className="mt-3 inline-block text-sm font-semibold text-indigo-600 hover:underline">← All Hubs</Link>
    </div>
  );

  const staffTotal = data.staff.length + data.people.qcLeaders.length +
    data.people.qcCheckers.length + data.people.deliveryMen.length;
  const deliveryCount = data.orders.filter(o =>
    ["DISPATCHED","HUB_RECEIVED","OUT_FOR_DELIVERY","ARRIVED","PICKED_UP"].includes(o.status)
  ).length;
  const tabCounts: Record<string, number> = {
    lots: data.lots.length, orders: data.orders.length, delivery: deliveryCount,
    sellers: data.people.sellers.length, staff: staffTotal, fleet: data.trucks.length,
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-400">
        <Link href="/admin" className="hover:text-slate-700">Admin</Link>
        <span>/</span>
        <Link href="/admin/hubs" className="hover:text-slate-700">Hubs</Link>
        <span>/</span>
        <span className="text-slate-700 font-medium">{data.hub.name}</span>
      </nav>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition
              ${activeTab === t.id
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            {t.label}
            {tabCounts[t.id] !== undefined && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold
                ${activeTab === t.id ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"}`}>
                {tabCounts[t.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && <OverviewTab data={data} />}
      {activeTab === "lots"     && <LotsTab lots={data.lots} />}
      {activeTab === "orders"   && <OrdersTab orders={data.orders} />}
      {activeTab === "delivery" && <DeliveryTab orders={data.orders} />}
      {activeTab === "sellers"  && <SellersTab sellers={data.people.sellers} />}
      {activeTab === "staff"    && <StaffTab staff={data.staff} people={data.people} />}
      {activeTab === "fleet"    && <FleetTab trucks={data.trucks} />}
    </div>
  );
}
