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
      <div className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-end px-4 py-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-md bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-900"
          >
            <Download size={14} /> Download PDF
          </button>
        </div>
      </div>

      <div id="receipt" className="mx-auto my-5 max-w-4xl space-y-4 border border-slate-200 bg-white p-6 font-sans text-slate-900 shadow-sm">
        <div className="flex items-start justify-between border-b border-slate-300 pb-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">PAIKARI</p>
            <h1 className="text-lg font-bold text-slate-900">Delivery Completion Receipt</h1>
            <p className="text-xs text-slate-500">Official proof of buyer delivery handover</p>
          </div>
          <div className="text-right text-xs">
            <p className="font-semibold text-slate-700">Receipt Ref: {receipt.orderCode}</p>
            <p className="text-slate-500">Issued: {fmt(receipt.deliveredAt ?? receipt.pickedUpAt)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 border border-emerald-300 bg-emerald-50 px-3 py-2">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-emerald-800">Status: Delivery Confirmed</p>
            <p className="text-[11px] text-emerald-700">This order has been successfully delivered and acknowledged.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="overflow-hidden border border-slate-200">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-200">
                {[
                  ["Order ID", receipt.orderCode],
                  ["Lot Code", receipt.lotCode ?? "—"],
                  ["Product", receipt.product],
                  ["Quantity", receipt.qty],
                  ["Buyer", receipt.buyerName],
                  ["Seller", receipt.sellerName],
                  ["Delivery Hub", receipt.deliveryPoint],
                  ["Source Hub", receipt.hubId ?? "—"],
                  ["Carrier", receipt.distributorName ? `${receipt.distributorName}${receipt.distributorPhone ? ` · ${receipt.distributorPhone}` : ""}` : (receipt.assignedTruck ?? "—")],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td className="w-40 bg-slate-50 px-3 py-2 font-semibold text-slate-600">{k}</td>
                    <td className="px-3 py-2 text-slate-800">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="overflow-hidden border border-slate-200">
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600">Timeline Step</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600">Date/Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {[
                  ["Order Confirmed", receipt.confirmedAt],
                  ["Arrived at Hub", receipt.arrivedAt],
                  ["Picked by Delivery Man", receipt.pickedUpAt],
                  ["Delivered to Buyer", receipt.deliveredAt ?? receipt.pickedUpAt],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td className="px-3 py-2 text-slate-700">{k}</td>
                    <td className="px-3 py-2 text-slate-700">{fmt(v as string | null)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Financial Item</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">Amount (BDT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr><td className="px-3 py-2">Product Value</td><td className="px-3 py-2 text-right">৳ {receipt.productAmount.toLocaleString()}</td></tr>
              <tr><td className="px-3 py-2">Transport Cost</td><td className="px-3 py-2 text-right">৳ {receipt.transportCost.toLocaleString()}</td></tr>
              <tr><td className="px-3 py-2">Platform Fee ({receipt.platformFeeRate}%)</td><td className="px-3 py-2 text-right">৳ {receipt.platformFee.toLocaleString()}</td></tr>
              <tr className="bg-emerald-50"><td className="px-3 py-2 font-bold text-emerald-800">Total Paid by Buyer</td><td className="px-3 py-2 text-right font-bold text-emerald-800">৳ {receipt.totalAmount.toLocaleString()}</td></tr>
              <tr><td className="px-3 py-2 font-semibold text-violet-700">Seller Receivable</td><td className="px-3 py-2 text-right font-semibold text-violet-700">৳ {receipt.sellerPayable.toLocaleString()}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="grid gap-8 border-t border-slate-300 pt-6 text-xs sm:grid-cols-3">
          <div>
            <p className="mb-8 border-b border-slate-300 pb-1">Prepared By</p>
            <p className="text-slate-500">Paikari System</p>
          </div>
          <div>
            <p className="mb-8 border-b border-slate-300 pb-1">Checked By</p>
            <p className="text-slate-500">Delivery Hub Authority</p>
          </div>
          <div>
            <p className="mb-8 border-b border-slate-300 pb-1">Receiver Signature</p>
            <p className="text-slate-500">{receipt.buyerName}</p>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-2 text-[10px] text-slate-500">
          Generated on {new Date().toLocaleString("en-BD", { dateStyle: "long", timeStyle: "short" })} · Document Type: DELIVERY_RECEIPT
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
    </>
  );
}
