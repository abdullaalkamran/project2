import { Suspense } from "react";
import type { Metadata } from "next";
import HistoryClient from "./HistoryClient";

export const metadata: Metadata = {
  title: "Inspection History | QC Checker – Paikari",
  description: "View your past QC inspection reports and their outcomes",
};

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse space-y-4 p-4">
          <div className="h-8 w-64 rounded-lg bg-slate-200" />
          <div className="h-4 w-48 rounded bg-slate-100" />
          <div className="space-y-3 mt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-slate-100" />
            ))}
          </div>
        </div>
      }
    >
      <HistoryClient />
    </Suspense>
  );
}
