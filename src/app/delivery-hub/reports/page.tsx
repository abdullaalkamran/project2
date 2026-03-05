import type { Metadata } from "next";
import { Suspense } from "react";
import HubReportsClient from "./ReportsClient";
export const metadata: Metadata = { title: "Delivery Reports | Delivery Hub | Paikari" };
export default function HubReportsPage() {
  return <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-slate-100"/>}><HubReportsClient /></Suspense>;
}
