"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";

type SellerAnalyticsStat = {
  label: string;
  value: string;
  color: string;
};

type SellerLotPerformance = {
  lot: string;
  views: number;
  bids: number;
  reserve: string;
  closing: string;
  vs: string;
  bidders: number;
  status: string;
};

type SellerUpcomingLot = {
  title: string;
  date: string;
  time: string;
};

type AnalyticsResponse = {
  analyticsStats: SellerAnalyticsStat[];
  lotPerformance: SellerLotPerformance[];
  upcomingLots: SellerUpcomingLot[];
};

const statusColors: Record<string, string> = {
  Live: "bg-emerald-50 text-emerald-700",
  "Approved in Marketplace": "bg-emerald-50 text-emerald-700",
  "QC Passed": "bg-emerald-50 text-emerald-700",
  Sold: "bg-blue-50 text-blue-700",
  Unsold: "bg-rose-50 text-rose-600",
};

export default function AnalyticsClient() {
  const [summaryStats, setSummaryStats] = useState<SellerAnalyticsStat[]>([]);
  const [lotPerformance, setLotPerformance] = useState<SellerLotPerformance[]>([]);
  const [upcomingLots, setUpcomingLots] = useState<SellerUpcomingLot[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<AnalyticsResponse>("/api/seller-dashboard/analytics");
        setSummaryStats(res.analyticsStats ?? []);
        setLotPerformance(res.lotPerformance ?? []);
        setUpcomingLots(res.upcomingLots ?? []);
      } catch {
        setSummaryStats([]);
        setLotPerformance([]);
        setUpcomingLots([]);
      }
    };
    void load();
  }, []);

  return (
    <div className="space-y-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Performance Analytics</h1>
        <p className="text-slate-500">Real lot views, bid counts, closing price vs reserve, and buyer trends.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {summaryStats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-1 text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Lot Performance</h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3 text-left">Lot</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Views</th>
                <th className="px-5 py-3 text-left">Bids</th>
                <th className="px-5 py-3 text-left">Unique bidders</th>
                <th className="px-5 py-3 text-left">Reserve</th>
                <th className="px-5 py-3 text-left">Closing</th>
                <th className="px-5 py-3 text-left">vs Reserve</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {lotPerformance.map((lot) => (
                <tr key={lot.lot} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-medium text-slate-900">{lot.lot}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[lot.status] ?? "bg-slate-100 text-slate-600"}`}>{lot.status}</span>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{lot.views}</td>
                  <td className="px-5 py-4 text-slate-600">{lot.bids}</td>
                  <td className="px-5 py-4 text-slate-600">{lot.bidders}</td>
                  <td className="px-5 py-4 text-slate-500">{lot.reserve}</td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{lot.closing}</td>
                  <td className={`px-5 py-4 font-semibold ${lot.vs === "—" ? "text-slate-400" : "text-emerald-700"}`}>{lot.vs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Upcoming Auction Calendar</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {upcomingLots.length === 0 && (
            <div className="rounded-2xl border border-slate-100 bg-white p-5 text-sm text-slate-500 shadow-sm">
              No upcoming lots.
            </div>
          )}
          {upcomingLots.map((lot) => (
            <div key={lot.title} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <p className="font-semibold text-slate-900">{lot.title}</p>
              <p className="mt-1 text-sm text-slate-500">{lot.date} at {lot.time}</p>
              <Link
                href="/seller-dashboard/lots"
                className="mt-3 inline-block text-sm font-semibold text-emerald-700 underline underline-offset-2"
              >
                View lot →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
