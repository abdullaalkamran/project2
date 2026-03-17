"use client";

import { useEffect, useState } from "react";
import InventoryClient from "./InventoryClient";
import DispatchClient from "../dispatch/DispatchClient";
import ConfirmedOrdersClient from "../confirmed-orders/ConfirmedOrdersClient";
import BidWinnersClient from "../bid-winners/BidWinnersClient";
import PendingOrdersClient from "../pending-orders/PendingOrdersClient";

const TABS = [
  { key: "inventory",       label: "Hub Inventory" },
  { key: "dispatch",        label: "Outbound Dispatch" },
  { key: "orders",          label: "Confirmed Orders" },
  { key: "pending-orders",  label: "Pending Orders" },
  { key: "bid",             label: "Bid Winners" },
] as const;

type Tab = (typeof TABS)[number]["key"];

export default function InventoryManagementPage() {
  const [tab, setTab] = useState<Tab>("inventory");
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetch("/api/hub-manager/pending-orders")
      .then((r) => r.json())
      .then((d: unknown) => setPendingCount(Array.isArray(d) ? (d as unknown[]).length : 0))
      .catch(() => setPendingCount(0));
  }, []);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Inventory Management</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage hub stock, outbound dispatch, confirmed orders, and bid winners.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-100 bg-slate-50 p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-semibold transition ${
              tab === t.key
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
            {t.key === "pending-orders" && pendingCount > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                tab === "pending-orders" ? "bg-white text-emerald-700" : "bg-amber-500 text-white"
              }`}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "inventory"      && <InventoryClient />}
      {tab === "dispatch"       && <DispatchClient />}
      {tab === "orders"         && <ConfirmedOrdersClient />}
      {tab === "pending-orders" && <PendingOrdersClient onCountChange={setPendingCount} />}
      {tab === "bid"            && <BidWinnersClient />}
    </div>
  );
}
