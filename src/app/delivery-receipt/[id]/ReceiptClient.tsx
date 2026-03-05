"use client";

import { useEffect, useState } from "react";
import { Loader2, Download, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";

type Receipt = {
  orderCode: string; product: string; qty: string; buyerName: string; sellerName: string;
  deliveryPoint: string; assignedTruck: string | null; distributorName: string | null;
  distributorPhone: string | null; lotCode: string | null; hubId: string | null;
  winningBid: number; productAmount: number; transportCost: number;
  platformFeeRate: number; platformFee: number; sellerPayable: number; totalAmount: number;
  confirmedAt: string; arrivedAt: string | null; pickedUpAt: string | null; deliveredAt: string | null;
};

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" });
}

export default function ReceiptClient({ id }: { id: string }) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Mark body so global print CSS can hide navbar/footer
    document.body.setAttribute("data-receipt", "true");
    return () => document.body.removeAttribute("data-receipt");
  }, []);

  useEffect(() => {
    api.get<Receipt>(`/api/delivery/receipt/${id}`)
      .then(setReceipt)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load receipt"));
  }, [id]);

  if (error) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-2">
        <p className="text-red-600 font-semibold">{error}</p>
        <p className="text-slate-400 text-sm">Receipt is only available for delivered orders.</p>
      </div>
    </div>
  );

  if (!receipt) return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
    </div>
  );

  return (
    <>
      {/* Print button — hidden when printing */}
      <div className="no-print flex justify-center gap-3 p-4 bg-slate-100 border-b border-slate-200">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition"
        >
          <Download size={16} /> Download / Print PDF
        </button>
      </div>

      {/* Receipt — printed content */}
      <div id="receipt" className="mx-auto max-w-2xl px-6 py-6 font-sans text-slate-900">

        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-emerald-600 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-black text-emerald-700 tracking-tight">পাইকারি</h1>
            <p className="text-[11px] text-slate-500">Agricultural Wholesale Platform</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-slate-800">Delivery Receipt</p>
            <p className="text-[11px] text-slate-500">Issued: {fmt(receipt.deliveredAt ?? receipt.pickedUpAt)}</p>
          </div>
        </div>

        {/* Confirmed stamp */}
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
          <div>
            <p className="font-bold text-emerald-800 text-sm">Delivery Confirmed</p>
            <p className="text-[11px] text-emerald-600">Order successfully delivered and picked up by buyer.</p>
          </div>
        </div>

        {/* Order Info */}
        <div className="mb-4">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Order Details</h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Order ID",       value: receipt.orderCode },
              { label: "Lot Code",       value: receipt.lotCode ?? "—" },
              { label: "Product",        value: receipt.product },
              { label: "Quantity",       value: receipt.qty },
              { label: "Buyer",          value: receipt.buyerName },
              { label: "Seller",         value: receipt.sellerName },
              { label: "Delivery Point", value: receipt.deliveryPoint },
              { label: "Hub",            value: receipt.hubId ?? "—" },
              ...(receipt.distributorName ? [{ label: "Distributor", value: `${receipt.distributorName}${receipt.distributorPhone ? ` · ${receipt.distributorPhone}` : ""}` }] : [{ label: "Truck", value: receipt.assignedTruck ?? "—" }]),
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-800 truncate">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline + Financial side by side */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          {/* Timeline */}
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Delivery Timeline</h2>
            <div className="space-y-1.5">
              {[
                { label: "Order Confirmed",          date: receipt.confirmedAt,  done: true },
                { label: "Arrived at Hub",           date: receipt.arrivedAt,    done: !!receipt.arrivedAt },
                { label: "Picked Up by Distributor", date: null,                 done: !!receipt.pickedUpAt },
                { label: "Arrived at Delivery Point",date: receipt.arrivedAt,    done: !!receipt.arrivedAt },
                { label: "Delivered to Buyer",       date: receipt.pickedUpAt,   done: !!receipt.pickedUpAt },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`h-4 w-4 shrink-0 rounded-full flex items-center justify-center text-[9px] font-bold ${step.done ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}>
                    {step.done ? "✓" : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] leading-tight ${step.done ? "font-medium text-slate-800" : "text-slate-400"}`}>{step.label}</p>
                    {step.date && <p className="text-[10px] text-slate-400">{fmt(step.date)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Summary */}
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Financial Summary</h2>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-xs">
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-white">
                    <td className="px-3 py-1.5 text-slate-600">Product Value</td>
                    <td className="px-3 py-1.5 text-right font-semibold text-slate-800">৳ {receipt.productAmount.toLocaleString()}</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="px-3 py-1.5 text-slate-600">Transport Cost</td>
                    <td className="px-3 py-1.5 text-right font-semibold text-slate-800">৳ {receipt.transportCost.toLocaleString()}</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="px-3 py-1.5 text-slate-600">Platform Fee ({receipt.platformFeeRate}%)</td>
                    <td className="px-3 py-1.5 text-right font-semibold text-slate-800">৳ {receipt.platformFee.toLocaleString()}</td>
                  </tr>
                  <tr className="bg-emerald-50">
                    <td className="px-3 py-1.5 font-bold text-emerald-800">Total Paid</td>
                    <td className="px-3 py-1.5 text-right font-bold text-emerald-800">৳ {receipt.totalAmount.toLocaleString()}</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="px-3 py-1.5 text-slate-600">Seller Receivable</td>
                    <td className="px-3 py-1.5 text-right font-semibold text-violet-700">৳ {receipt.sellerPayable.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-3 flex items-start justify-between text-[10px] text-slate-400">
          <div>
            <p className="font-semibold text-slate-600">পাইকারি Platform</p>
            <p>Official delivery confirmation receipt.</p>
            <p>Generated on {new Date().toLocaleString("en-BD", { dateStyle: "long", timeStyle: "short" })}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-slate-500">{receipt.orderCode}</p>
            <p className="mt-0.5 text-slate-300">paikari.com</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          #receipt { margin: 0 !important; padding: 0 !important; max-width: none !important; }
        }
      `}</style>
    </>
  );
}
