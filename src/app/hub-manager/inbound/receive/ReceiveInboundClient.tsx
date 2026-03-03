"use client";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { receiveInboundSchema, ReceiveInboundFormData } from "@/lib/schemas";
import api from "@/lib/api";
import type { FlowLot } from "@/lib/product-flow";

type SellerLotRef = {
  product: string; seller: string; category: string;
  estQty: string; askingPricePerKg: string; storage: string; baggageType: string; hub: string;
};

export default function ReceiveLotPage() {
  const [lots, setLots] = useState<FlowLot[]>([]);
  const {
    register, handleSubmit, reset, watch,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<ReceiveInboundFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(receiveInboundSchema) as any,
    defaultValues: { condition: "GOOD" },
  });

  const watchedLotId = watch("lotId");
  const lotMap = useMemo(() => {
    const map: Record<string, SellerLotRef> = {};
    lots.forEach((l) => {
      map[l.id.toUpperCase()] = {
        product: l.title,
        seller: l.sellerName,
        category: l.category,
        estQty: `${l.quantity} ${l.unit}`,
        askingPricePerKg: `BDT ${l.askingPricePerKg}/${l.unit}`,
        storage: l.storageType,
        baggageType: l.baggageType,
        hub: l.hubId,
      };
    });
    return map;
  }, [lots]);
  const sellerRef = watchedLotId ? lotMap[watchedLotId.trim().toUpperCase()] : null;

  useEffect(() => {
    const load = async () => {
      const rows = await api.get<FlowLot[]>("/api/flow/lots");
      setLots(rows.filter((l) => l.status === "PENDING_DELIVERY"));
    };
    void load();
  }, []);

  const onSubmit = async (data: ReceiveInboundFormData) => {
    try {
      await api.patch(`/api/flow/lots/${data.lotId.trim().toUpperCase()}/receive`, {});
      toast.success(`Lot ${data.lotId} logged - ready for QC assignment`);
    } catch {
      toast.error("Could not log inbound receipt.");
      return;
    }
  };

  if (isSubmitSuccessful) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">✓</div>
        <h2 className="text-xl font-bold text-slate-900">Lot Received</h2>
        <p className="text-slate-500">
          Lot <span className="font-semibold text-slate-700">{watchedLotId}</span> has been logged.
        </p>
        <button type="button" onClick={() => reset()}
          className="mt-2 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-amber-600">
          Receive Another Lot
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Receive New Lot</h1>
        <p className="text-slate-500">Log a lot arriving at this hub and verify against the seller&apos;s submission.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Lot ID / Reference</label>
              <input {...register("lotId")} placeholder="e.g. LOT-1020"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none" />
              {errors.lotId && <p className="mt-1 text-xs text-red-500">{errors.lotId.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Confirmed Quantity / Weight</label>
              <input type="number" step="0.01" {...register("receivedQty")} placeholder="e.g. 498.5"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none" />
              {errors.receivedQty && <p className="mt-1 text-xs text-red-500">{errors.receivedQty.message}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Condition on Arrival</label>
              <select {...register("condition")}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none">
                <option value="GOOD">Good</option>
                <option value="PARTIAL">Partial — minor damage or short quantity</option>
                <option value="DAMAGED">Damaged — significant damage</option>
              </select>
              {errors.condition && <p className="mt-1 text-xs text-red-500">{errors.condition.message}</p>}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Notes <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea {...register("notes")} rows={3} placeholder="Any visible damage, packaging issues, etc."
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none resize-none" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Photos</label>
            <div className="flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-400 cursor-pointer hover:border-amber-300 hover:text-amber-500">
              Click to upload lot photos
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={isSubmitting}
              className="rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60">
              {isSubmitting ? "Saving…" : "Confirm Receipt"}
            </button>
            <button type="button" onClick={() => history.back()}
              className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </div>
        {sellerRef && (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">Seller Submission Reference</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
              {[
                { label: "Product", value: sellerRef.product },
                { label: "Seller", value: sellerRef.seller },
                { label: "Est. Qty", value: sellerRef.estQty },
                { label: "Asking Price", value: sellerRef.askingPricePerKg },
                { label: "Storage", value: sellerRef.storage },
                { label: "Baggage", value: sellerRef.baggageType },
                { label: "Hub", value: sellerRef.hub },
                { label: "Category", value: sellerRef.category },
              ].map((f) => (
                <div key={f.label}>
                  <p className="text-xs text-amber-600 font-medium">{f.label}</p>
                  <p className="text-slate-800 font-semibold text-sm">{f.value}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-amber-700">Verify confirmed quantity against the seller&apos;s estimate above.</p>
          </div>
        )}
      </form>
    </div>
  );
}
