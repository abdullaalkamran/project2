"use client";

import { useState } from "react";
import InboundClient from "../inbound/InboundClient";
import ReceiveInboundClient from "../inbound/receive/ReceiveInboundClient";

const TABS = [
  { key: "incoming", label: "Incoming Lots" },
  { key: "receive",  label: "Receive Goods" },
] as const;

type Tab = (typeof TABS)[number]["key"];

export default function LotsManagementPage() {
  const [tab, setTab] = useState<Tab>("incoming");

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">New Lots Management</h1>
        <p className="mt-1 text-sm text-slate-500">
          Track incoming lots and confirm receipt of goods at the hub.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-slate-100 bg-slate-50 p-1 w-fit">
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
      {tab === "incoming" && <InboundClient />}
      {tab === "receive"  && <ReceiveInboundClient />}
    </div>
  );
}
