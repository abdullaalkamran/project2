"use client";

import { Bell, Truck } from "lucide-react";
import Link from "next/link";

const orders = [
    {
        orderId: "ORD-010", lotId: "LOT-1021", product: "BRRI Dhan 29", qty: "2,000 kg",
        seller: "Noor Agro", buyer: "Agro Wholesale BD",
        deliveryPoint: "Rajshahi Central Delivery Point",
        winningBid: "৳62/kg", totalAmount: "৳1,24,000",
        confirmedAt: "Feb 22, 01:00 AM",
        qcChecker: "Mamun Hossain",
        status: "Confirmed", isNew: true,
    },
    {
        orderId: "ORD-009", lotId: "LOT-1016", product: "Miniket Rice", qty: "500 kg",
        seller: "Rahman Traders", buyer: "Dhaka Wholesale Ltd",
        deliveryPoint: "Mirpur Delivery Point",
        winningBid: "৳75/kg", totalAmount: "৳37,500",
        confirmedAt: "Feb 21, 08:00 PM",
        qcChecker: "Mamun Hossain",
        status: "Confirmed", isNew: true,
    },
    {
        orderId: "ORD-007", lotId: "LOT-1008", product: "Miniket Rice", qty: "500 kg",
        seller: "Green Harvest Co.", buyer: "Dhaka Wholesale",
        deliveryPoint: "Mirpur Delivery Point",
        winningBid: "৳70/kg", totalAmount: "৳35,000",
        confirmedAt: "Feb 17, 08:00 PM",
        qcChecker: "Mamun Hossain",
        status: "Dispatched", isNew: false,
    },
];

const statusChip: Record<string, string> = {
    Confirmed: "bg-emerald-50 text-emerald-700",
    Dispatched: "bg-blue-50 text-blue-700",
    Delivered: "bg-slate-100 text-slate-500",
};

export default function QCLeaderConfirmedOrdersPage() {
    const newCount = orders.filter((o) => o.isNew).length;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold text-slate-900">Confirmed Orders</h1>
                    <p className="text-slate-500">
                        Orders confirmed by sellers — lots you inspected are ready for dispatch.
                    </p>
                </div>
                <Link href="/qc-leader/dispatch" className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition">
                    Go to Dispatch →
                </Link>
            </div>

            {/* Notification banner */}
            {newCount > 0 && (
                <div className="flex items-start gap-4 rounded-2xl border border-teal-200 bg-teal-50 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100">
                        <Bell size={16} className="text-teal-600" />
                    </div>
                    <div>
                        <p className="font-semibold text-teal-800">
                            {newCount} new confirmed order{newCount > 1 ? "s" : ""}!
                        </p>
                        <p className="mt-0.5 text-sm text-teal-600">
                            Sellers have accepted the winning bids. Proceed to Dispatch to assign trucks.
                        </p>
                    </div>
                </div>
            )}

            {/* Orders */}
            <div className="space-y-4">
                {orders.map((o) => (
                    <div key={o.orderId} className={`rounded-2xl border bg-white shadow-sm p-5 space-y-4 ${o.isNew ? "border-teal-200" : "border-slate-100"}`}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-0.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-xs text-slate-400">{o.orderId}</span>
                                    <span className="font-mono text-xs text-slate-400">{o.lotId}</span>
                                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusChip[o.status]}`}>{o.status}</span>
                                    {o.isNew && <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-700">NEW</span>}
                                </div>
                                <p className="text-base font-bold text-slate-900">{o.product}</p>
                                <p className="text-xs text-slate-500">{o.qty} · Inspector: {o.qcChecker}</p>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs space-y-0.5 min-w-[160px]">
                                <p className="font-semibold text-slate-800">{o.buyer}</p>
                                <p className="text-slate-400">Seller: {o.seller}</p>
                                <p className="text-slate-400">Confirmed: {o.confirmedAt}</p>
                            </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl bg-emerald-50 px-4 py-2.5 text-xs">
                                <p className="text-emerald-600">Winning Bid · Total</p>
                                <p className="mt-0.5 font-bold text-emerald-700">{o.winningBid} · {o.totalAmount}</p>
                            </div>
                            <div className="rounded-xl bg-slate-50 px-4 py-2.5 text-xs">
                                <p className="text-slate-400">Delivery Point</p>
                                <p className="mt-0.5 font-semibold text-teal-700">{o.deliveryPoint}</p>
                            </div>
                        </div>
                        {o.status === "Confirmed" && (
                            <Link href="/qc-leader/dispatch" className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-teal-700 transition w-fit">
                                <Truck size={13} /> Manage Dispatch
                            </Link>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
