import type { Metadata } from "next";
import { Suspense } from "react";
import DistributionClient from "./DistributionClient";
export const metadata: Metadata = { title: "Assign Distributors | Delivery Hub | Paikari" };
export default function DistributionPage() {
  return <Suspense fallback={<div className="space-y-4">{Array.from({length:3}).map((_,i)=><div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100"/>)}</div>}><DistributionClient /></Suspense>;
}
