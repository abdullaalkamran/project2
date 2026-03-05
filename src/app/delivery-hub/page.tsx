import type { Metadata } from "next";
import { Suspense } from "react";
import DeliveryHubOverviewClient from "./OverviewClient";

export const metadata: Metadata = { title: "Delivery Hub Overview | Paikari" };

export default function DeliveryHubPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-slate-100" />}>
      <DeliveryHubOverviewClient />
    </Suspense>
  );
}
