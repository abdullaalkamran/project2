"use client";

import { useState } from "react";
import QCAssignClient from "../qc-assign/QCAssignClient";
import WaitingQCClient from "../qc-waiting/WaitingQCClient";

const TABS = [
  { key: "assign",  label: "Assign QC" },
  { key: "waiting", label: "Waiting for QC Check" },
] as const;

type Tab = (typeof TABS)[number]["key"];

export default function QCManagementPage() {
  const [tab, setTab] = useState<Tab>("assign");

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">QC Management</h1>
        <p className="mt-1 text-sm text-slate-500">
          Assign lots for quality control and monitor pending inspections.
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
      {tab === "assign"  && <QCAssignClient />}
      {tab === "waiting" && <WaitingQCClient />}
    </div>
  );
}
