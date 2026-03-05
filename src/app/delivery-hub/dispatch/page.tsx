import type { Metadata } from "next";
import { Suspense } from "react";
import DispatchTrackClient from "./DispatchTrackClient";
export const metadata: Metadata = { title: "Dispatch Tracking | Delivery Hub | Paikari" };
export default function HubDispatchPage() {
  return <Suspense fallback={<div className="space-y-4">{Array.from({length:3}).map((_,i)=><div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100"/>)}</div>}><DispatchTrackClient /></Suspense>;
}
