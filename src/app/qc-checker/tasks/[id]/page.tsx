import { Suspense } from "react";
import type { Metadata } from "next";
import InspectClient from "./InspectClient";

export const metadata: Metadata = {
  title: "Inspection Form | QC Checker – Paikari",
  description: "Perform product quality check and submit QC report",
};

export default function InspectPage() {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse space-y-4 p-4">
          <div className="h-8 w-64 rounded-lg bg-slate-200" />
          <div className="h-96 rounded-2xl bg-slate-100" />
        </div>
      }
    >
      <InspectClient />
    </Suspense>
  );
}
