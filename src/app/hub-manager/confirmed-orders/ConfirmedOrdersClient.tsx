"use client";

import { useState } from "react";
import { Bell, Truck } from "lucide-react";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 15;

type OrderStatus = "Confirmed" | "Dispatched" | "Delivered";

type ConfirmedOrder = {
    orderId: string;
    lotId: string;
    product: string;
    qty: string;
    seller: string;
    sellerPhone: string;
    buyer: string;
    buyerPhone: string;
    deliveryPoint: string;
    winningBid: string;
    totalAmount: string;
    confirmedAt: string;
    qcLeader: string;
    qcChecker: string;
    status: OrderStatus;
    isNew?: boolean;
};

const orders: ConfirmedOrder[] = [
    {
        orderId: "ORD-010", lotId: "LOT-1021", product: "BRRI Dhan 29", qty: "2,000 kg",
        seller: "Noor Agro", sellerPhone: "01711-889900",
        buyer: "Agro Wholesale BD", buyerPhone: "01711-667788",
        deliveryPoint: "Rajshahi Central Delivery Point",
        winningBid: "৳62/kg", totalAmount: "৳1,24,000",
        confirmedAt: "Feb 22, 01:00 AM", qcLeader: "Rina Begum", qcChecker: "Mamun Hossain",
        status: "Confirmed", isNew: true,
    },
    {
        orderId: "ORD-009", lotId: "LOT-1016", product: "Miniket Rice", qty: "500 kg",
        seller: "Rahman Traders", sellerPhone: "01711-223344",
        buyer: "Dhaka Wholesale Ltd", buyerPhone: "01911-223344",
        deliveryPoint: "Mirpur Delivery Point",
        winningBid: "৳75/kg", totalAmount: "৳37,500",
        confirmedAt: "Feb 21, 08:00 PM", qcLeader: "Rina Begum", qcChecker: "Mamun Hossain",
        status: "Confirmed", isNew: true,
    },
    {
        orderId: "ORD-007", lotId: "LOT-1008", product: "Miniket Rice", qty: "500 kg",
        seller: "Green Harvest Co.", sellerPhone: "01811-112233",
        buyer: "Dhaka Wholesale", buyerPhone: "01811-445566",
        deliveryPoint: "Mirpur Delivery Point",
        winningBid: "৳70/kg", totalAmount: "৳35,000",
        confirmedAt: "Feb 17, 08:00 PM", qcLeader: "Rina Begum", qcChecker: "Mamun Hossain",
        status: "Dispatched",
    },
];

const statusChip: Record<OrderStatus, string> = {
    Confirmed: "bg-emerald-50 text-emerald-700",
    Dispatched: "bg-blue-50 text-blue-700",
    Delivered: "bg-slate-100 text-slate-500",
};

export default function ConfirmedOrdersClient() {
    const [list] = useState<ConfirmedOrder[]>(orders);
    const [page, setPage] = useState(1);
    const newCount = list.filter((o) => o.isNew).length;

    return (
        <div className="space-y-6">
            {newCount > 0 && (
                <div className="flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
                        <Bell size={16} className="text-amber-600" />
                    </div>
                    <div>
                        <p className="font-semibold text-amber-800">
                            {newCount} new confirmed order{newCount > 1 ? "s" : ""}!
                        </p>
                        <p className="mt-0.5 text-sm text-amber-700">
                            Sellers have accepted the winning bids. QC Team Leader will manage truck dispatch.
                        </p>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((o) => (
                    <div key={o.orderId} className={`rounded-2xl border bg-white shadow-sm p-5 space-y-4 ${o.isNew ? "border-amber-200" : "border-slate-100"}`}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-0.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-xs text-slate-400">{o.orderId}</span>
                                    <span className="font-mono text-xs text-slate-400">{o.lotId}</span>
                                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusChip[o.status]}`}>{o.status}</span>
                                    {o.isNew && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">NEW</span>}
                                </div>
                                <p className="text-base font-bold text-slate-900">{o.product}</p>
                                <p className="text-xs text-slate-500">{o.qty} · Confirmed: {o.confirmedAt}</p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs space-y-0.5 min-w-[160px]">
                                    <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide">Seller</p>
                                    <p className="font-semibold text-slate-800">{o.seller}</p>
                                    <p className="text-slate-400">{o.sellerPhone}</p>
                                </div>
                                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs space-y-0.5 min-w-[160px]">
                                    <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide">Buyer</p>
                                    <p className="font-semibold text-slate-800">{o.buyer}</p>
                                    <p className="text-slate-400">{o.buyerPhone}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-xl bg-emerald-50 px-4 py-2.5 text-xs">
                                <p className="text-emerald-600">Winning Bid · Total</p>
                                <p className="mt-0.5 font-bold text-emerald-700">{o.winningBid} · {o.totalAmount}</p>
                            </div>
                            <div className="rounded-xl bg-slate-50 px-4 py-2.5 text-xs">
                                <p className="text-slate-400">Delivery Point</p>
                                <p className="mt-0.5 font-semibold text-slate-700">{o.deliveryPoint}</p>
                            </div>
                            <div className="rounded-xl bg-slate-50 px-4 py-2.5 text-xs">
                                <p className="text-slate-400">QC Team</p>
                                <p className="mt-0.5 font-semibold text-slate-700">Leader: {o.qcLeader}</p>
                                <p className="text-slate-500">Checker: {o.qcChecker}</p>
                            </div>
                        </div>

                        {o.status === "Confirmed" && (
                            <div className="flex items-center gap-2 rounded-xl border border-teal-100 bg-teal-50 px-4 py-2.5 text-xs text-teal-700">
                                <Truck size={13} />
                                <span>QC Team Leader is managing truck assignment and dispatch for this order.</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <Pagination page={page} totalPages={Math.ceil(list.length / PAGE_SIZE)} onPageChange={setPage} className="mt-4" />
        </div>
    );
}
