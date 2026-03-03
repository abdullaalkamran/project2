"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";

type MarketplaceLot = {
  id: string;
  title: string;
  category: string;
  quantity: number;
  unit: string;
  grade: string;
  hub: string;
  askingPricePerKg: number;
  minBidRate: number | null;
  status: string;
  bidCount: number;
  topBid: number | null;
  topBidder: string | null;
  soldQty: number;
  pendingQty: number;
  availableQty: number;
  imageUrl: string | null;
  createdAt: string;
};

type MarketplaceResponse = {
  lots: MarketplaceLot[];
};

export default function MarketplaceClient() {
  const [lots, setLots] = useState<MarketplaceLot[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<MarketplaceResponse>("/api/seller-dashboard/marketplace");
        setLots(res.lots ?? []);
      } catch {
        setLots([]);
      }
    };
    void load();
  }, []);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Products in Marketplace</h1>
        <p className="text-slate-500">Only your products currently visible in marketplace.</p>
      </div>

      <div className="space-y-3">
        {lots.length === 0 && (
          <div className="rounded-2xl border border-slate-100 bg-white p-5 text-sm text-slate-500 shadow-sm">
            No marketplace products yet.
          </div>
        )}
        {lots.map((lot) => (
          <div key={lot.id} className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="grid gap-3 p-4 md:grid-cols-12">
              <div className="md:col-span-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Lot ID</p>
                <p className="font-mono text-xs text-slate-600">{lot.id}</p>
              </div>
              <div className="md:col-span-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Product</p>
                <p className="text-sm font-semibold text-slate-900">{lot.title}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Qty</p>
                <p className="text-xs text-slate-700">{lot.quantity} {lot.unit}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Bid Status</p>
                <p className="text-xs text-slate-700">{lot.bidCount} bids · Top: {lot.topBid ? `৳ ${lot.topBid}` : "—"}</p>
              </div>
              <div className="md:col-span-1">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Available</p>
                <p className="text-xs font-semibold text-slate-700">{lot.availableQty} {lot.unit}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Status</p>
                <span className="mt-0.5 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  {lot.status}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs">
              <p className="text-slate-500">
                Ask: ৳ {lot.askingPricePerKg.toLocaleString()}/{lot.unit}
                {lot.minBidRate ? ` · Min Bid: ৳ ${lot.minBidRate.toLocaleString()}` : ""}
              </p>
              <div className="flex items-center gap-3">
                <Link href={`/seller-dashboard/lots/${lot.id}`} className="font-semibold text-emerald-700 hover:underline">
                  View details
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
