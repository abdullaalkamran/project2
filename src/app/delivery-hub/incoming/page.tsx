import type { Metadata } from "next";
import { Suspense } from "react";
import HubIncomingClient from "./IncomingClient";
export const metadata: Metadata = { title: "Incoming Shipments | Delivery Hub | Paikari" };
export default function HubIncomingPage() {
  return <Suspense fallback={<div className="space-y-4">{Array.from({length:3}).map((_,i)=><div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100"/>)}</div>}><HubIncomingClient /></Suspense>;
}
