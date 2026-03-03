"use client";

import { useState } from "react";
import InventoryClient from "./InventoryClient";
import DispatchClient from "../dispatch/DispatchClient";
import ConfirmedOrdersClient from "../confirmed-orders/ConfirmedOrdersClient";
import BidWinnersClient from "../bid-winners/BidWinnersClient";

const TABS = [
  { key: "inventory",  label: "Hub Inventory" },
  { key: "dispatch",   label: "Outbound Dispatch" },
  { key: "orders",     label: "Confirmed Orders" },
  { key: "bid",        label: "Bid Winners" },
] as const;

type Tab = (typeof TABS)[number]["key"];

export default function InventoryManagementPage() {
  const [tab, setTab] = useState<Tab>("inventory");

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
            className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${
              tab === t.key
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "inventory" && <InventoryClient />}
      {tab === "dispatch"  && <DispatchClient />}
      {tab === "orders"    && <ConfirmedOrdersClient />}
      {tab === "bid"       && <BidWinnersClient />}
    </div>
  );
}
