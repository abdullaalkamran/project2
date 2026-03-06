"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Download, Loader2 } from "lucide-react";
import api from "@/lib/api";

type ConfirmationReceipt = {
  orderCode: string;
  lotCode: string | null;
  product: string;
  qty: string;
  sellerName: string;
  buyerName: string;
  deliveryPoint: string;
  hubId: string | null;
  sellerStatus: string;
  winningBid: number;
  productAmount: number;
  transportCost: number;
  platformFeeRate: number;
  platformFee: number;
  sellerPayable: number;
  totalAmount: number;
  confirmedAt: string;
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" });

export default function SellerConfirmationReceiptClient({ id }: { id: string }) {
  const [data, setData] = useState<ConfirmationReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.setAttribute("data-receipt", "true");
    return () => document.body.removeAttribute("data-receipt");
  }, []);

  useEffect(() => {
    api.get<ConfirmationReceipt>(`/api/orders/confirmation/${id}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load confirmation receipt"));
  }, [id]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <p className="text-sm font-semibold text-red-600">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <>
      <div className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-end px-4 py-3">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-md bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-900"
          >
            <Download size={14} />
            Download PDF
          </button>
        </div>
      </div>

      <div id="receipt" className="mx-auto my-5 max-w-4xl space-y-3 border border-slate-200 bg-white p-5 text-slate-900 shadow-sm">
        <div className="flex items-start justify-between border-b border-slate-300 pb-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">PAIKARI</p>
            <h1 className="text-lg font-bold text-slate-900">Seller Order Confirmation Receipt</h1>
            <p className="text-xs text-slate-500">Official confirmation after seller acceptance</p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p className="font-semibold text-slate-700">Receipt Ref: {data.orderCode}</p>
            <p>Issued: {fmt(data.confirmedAt)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 border border-emerald-300 bg-emerald-50 px-3 py-2">
          <CheckCircle2 className="text-emerald-600" size={20} />
          <div>
            <p className="text-xs font-bold text-emerald-800">Status: Seller Confirmed</p>
            <p className="text-[11px] text-emerald-700">{data.sellerStatus === "ACCEPTED" ? "Accepted by Seller" : "Auto-confirmed by system"}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="overflow-hidden border border-slate-200">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-200">
                {[
                  ["Order ID", data.orderCode],
                  ["Lot Code", data.lotCode ?? "—"],
                  ["Product", data.product],
                  ["Quantity", data.qty],
                  ["Seller", data.sellerName],
                  ["Buyer", data.buyerName],
                  ["Delivery Hub", data.deliveryPoint],
                  ["Source Hub", data.hubId ?? "—"],
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
                  <th className="px-3 py-2 text-left font-semibold text-slate-600">Financial Item</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-600">Amount (BDT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr><td className="px-3 py-2">Winning Bid</td><td className="px-3 py-2 text-right">৳ {data.winningBid.toLocaleString()}</td></tr>
                <tr><td className="px-3 py-2">Product Amount</td><td className="px-3 py-2 text-right">৳ {data.productAmount.toLocaleString()}</td></tr>
                <tr><td className="px-3 py-2">Transport Cost</td><td className="px-3 py-2 text-right">৳ {data.transportCost.toLocaleString()}</td></tr>
                <tr><td className="px-3 py-2">Platform Fee ({data.platformFeeRate}%)</td><td className="px-3 py-2 text-right">৳ {data.platformFee.toLocaleString()}</td></tr>
                <tr className="bg-emerald-50"><td className="px-3 py-2 font-bold text-emerald-800">Buyer Total</td><td className="px-3 py-2 text-right font-bold text-emerald-800">৳ {data.totalAmount.toLocaleString()}</td></tr>
                <tr><td className="px-3 py-2 font-semibold text-violet-700">Seller Receivable</td><td className="px-3 py-2 text-right font-semibold text-violet-700">৳ {data.sellerPayable.toLocaleString()}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid gap-4 border-t border-slate-300 pt-4 text-xs sm:grid-cols-3">
          <div>
            <p className="mb-5 border-b border-slate-300 pb-1">Seller Signature</p>
            <p className="text-slate-500">{data.sellerName}</p>
          </div>
          <div>
            <p className="mb-5 border-b border-slate-300 pb-1">Buyer Acknowledgement</p>
            <p className="text-slate-500">{data.buyerName}</p>
          </div>
          <div>
            <p className="mb-5 border-b border-slate-300 pb-1">Hub Verification</p>
            <p className="text-slate-500">{data.hubId ?? "—"}</p>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-2 text-[10px] text-slate-500">
          Generated on {new Date().toLocaleString("en-BD", { dateStyle: "long", timeStyle: "short" })} · Document Type: ORDER_CONFIRMATION_RECEIPT
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          html, body { margin: 0; padding: 0; }
          #receipt {
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            page-break-inside: avoid;
          }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          @page { size: A4 portrait; margin: 10mm; }
        }
      `}</style>
    </>
  );
}
