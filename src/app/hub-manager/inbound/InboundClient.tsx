"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, CheckCircle, Package, Clock } from "lucide-react";
import api from "@/lib/api";
import type { FlowLot } from "@/lib/product-flow";
import Pagination from "@/components/Pagination";

type LotStatus = "Awaiting" | "Pending QC" | "QC Complete" | "Approved";

type InboundLot = {
    id: string;
    seller: string;
    sellerPhone: string;
    product: string;
    category: string;
    estQty: string;
    askingPricePerKg: string;
    storage: string;
    arrivedAt: string;
    status: LotStatus;
    isNew?: boolean;
};

function mapStatus(status: FlowLot["status"]): LotStatus {
    if (status === "PENDING_DELIVERY") return "Awaiting";
    if (status === "AT_HUB" || status === "IN_QC") return "Pending QC";
    if (status === "QC_SUBMITTED") return "QC Complete";
    return "Approved";
}

function toInboundLot(l: FlowLot): InboundLot {
    return {
        id: l.id,
        seller: l.sellerName,
        sellerPhone: l.sellerPhone ?? "N/A",
        product: l.title,
        category: l.category,
        estQty: `${l.quantity.toLocaleString()} ${l.unit}`,
        askingPricePerKg: `BDT ${l.askingPricePerKg}`,
        storage: l.storageType,
        arrivedAt: l.receivedAt ? new Date(l.receivedAt).toLocaleString() : "-",
        status: mapStatus(l.status),
        isNew: l.status === "PENDING_DELIVERY",
    };
}

const statusClasses: Record<LotStatus, string> = {
    Awaiting: "bg-orange-50 text-orange-600",
    "Pending QC": "bg-blue-50 text-blue-700",
    "QC Complete": "bg-violet-50 text-violet-700",
    Approved: "bg-emerald-50 text-emerald-700",
};

const PAGE_SIZE = 15;

export default function InboundClient() {
    const router = useRouter();
    const [lots, setLots] = useState<InboundLot[]>([]);
    const [page, setPage] = useState(1);

    const loadLots = async () => {
        try {
            const rows = await api.get<FlowLot[]>("/api/flow/lots");
            setLots(rows.filter((l) => l.status === "PENDING_DELIVERY").map(toInboundLot));
        } catch {
            toast.error("Could not load inbound lots.");
        }
    };

    useEffect(() => {
        void loadLots();
    }, []);
    const newCount = lots.filter((l) => l.isNew && l.status === "Awaiting").length;

    const receiveAll = () => {
        const run = async () => {
            const targets = lots.filter((l) => l.isNew && l.status === "Awaiting");
            await Promise.all(targets.map((l) => api.patch(`/api/flow/lots/${l.id}/receive`, {})));
            toast.success("All new lots logged as received", { description: "QC assignment is now pending." });
            router.push("/hub-manager/qc-assign");
        };
        void run();
    };

    const receiveLot = (id: string) => {
        const run = async () => {
            await api.patch(`/api/flow/lots/${id}/receive`, {});
            toast.success(`${id} logged as received`, { description: "Moving to Assign QC page." });
            router.push("/hub-manager/qc-assign");
        };
        void run();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold text-slate-900">Inbound Lots</h1>
                    <p className="text-slate-500">All lots arriving at Mirpur Hub — log receipt and track QC progress.</p>
                </div>
                <Link href="/hub-manager/inbound/receive" className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition">
                    + Receive New Lot
                </Link>
            </div>

            {/* New Lot Notification Banner */}
            {newCount > 0 && (
                <div className="flex items-start gap-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100">
                        <Bell size={16} className="text-orange-600" />
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold text-orange-800">
                            {newCount} new lot{newCount > 1 ? "s" : ""} submitted by sellers
                        </p>
                        <p className="mt-0.5 text-sm text-orange-600">
                            Goods have not yet arrived at the hub. Log receipt when the seller drops off the consignment.
                        </p>
                    </div>
                    {newCount > 1 && (
                        <button
                            type="button"
                            onClick={receiveAll}
                            className="shrink-0 rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-600 transition"
                        >
                            Receive All
                        </button>
                    )}
                </div>
            )}

            {/* Stats row */}
            <div className="grid gap-3 sm:grid-cols-4">
                {[
                    { label: "Awaiting Arrival", count: lots.filter((l) => l.status === "Awaiting").length, color: "text-orange-600", bg: "bg-orange-50", icon: <Clock size={14} /> },
                    { label: "In QC", count: 0, color: "text-blue-700", bg: "bg-blue-50", icon: <Package size={14} /> },
                    { label: "Leader Review", count: 0, color: "text-violet-700", bg: "bg-violet-50", icon: <Package size={14} /> },
                    { label: "Approved", count: 0, color: "text-emerald-700", bg: "bg-emerald-50", icon: <CheckCircle size={14} /> },
                ].map((s) => (
                    <div key={s.label} className={`rounded-xl border border-slate-100 p-4 ${s.bg}`}>
                        <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                        <p className="mt-0.5 text-xs font-medium text-slate-600">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <tr>
                            {["Lot ID", "Product", "Seller", "Qty", "Ask ৳", "Storage", "Arrived", "Status", "Action"].map((h) => (
                                <th key={h} className="px-4 py-3">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {lots.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((l) => (
                            <tr key={l.id} className={`hover:bg-slate-50 ${l.isNew ? "bg-orange-50/40" : ""}`}>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-mono text-xs text-slate-500">{l.id}</span>
                                        {l.isNew && <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-600">NEW</span>}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <p className="font-medium text-slate-900">{l.product}</p>
                                    <p className="text-xs text-slate-400">{l.category}</p>
                                </td>
                                <td className="px-4 py-3">
                                    <p className="text-xs font-medium text-slate-700">{l.seller}</p>
                                    <p className="text-xs text-slate-400">{l.sellerPhone}</p>
                                </td>
                                <td className="px-4 py-3 text-xs text-slate-600">{l.estQty}</td>
                                <td className="px-4 py-3 text-xs font-semibold text-slate-700">{l.askingPricePerKg}</td>
                                <td className="px-4 py-3 text-xs text-slate-500">{l.storage}</td>
                                <td className="px-4 py-3 text-xs text-slate-500">{l.arrivedAt}</td>
                                <td className="px-4 py-3">
                                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[l.status]}`}>
                                        {l.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    {l.status === "Awaiting" && (
                                        <button
                                            type="button"
                                            onClick={() => receiveLot(l.id)}
                                            className="rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-50 transition"
                                        >
                                            Log Receipt
                                        </button>
                                    )}
                                    {l.status === "Pending QC" && (
                                        <Link href="/hub-manager/qc-assign" className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 transition">
                                            Assign QC
                                        </Link>
                                    )}
                                    {l.status === "QC Complete" && (
                                        <span className="text-xs font-medium text-violet-500">Awaiting leader</span>
                                    )}
                                    {l.status === "Approved" && (
                                        <Link href="/hub-manager/inventory" className="text-xs font-semibold text-emerald-600 hover:underline">
                                            In Inventory →
                                        </Link>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Pagination page={page} totalPages={Math.ceil(lots.length / PAGE_SIZE)} onPageChange={setPage} className="mt-4" />
        </div>
    );
}
