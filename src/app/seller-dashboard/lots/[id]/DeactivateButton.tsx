"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  lotCode: string;
  lotStatus: string;
  hasPendingOrders: boolean;
}

const DEACTIVATABLE = ["QC_PASSED", "LIVE"];

export default function DeactivateButton({ lotCode, lotStatus, hasPendingOrders }: Props) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const isDeactivated = lotStatus === "DEACTIVATED";
  const canDeactivate = DEACTIVATABLE.includes(lotStatus);

  if (!canDeactivate && !isDeactivated) return null;

  const handleAction = async (endpoint: "deactivate" | "reactivate") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/seller-dashboard/lots/${lotCode}/${endpoint}`, {
        method: "PATCH",
      });
      const data = await res.json() as { message: string };
      if (!res.ok) {
        toast.error(data.message);
      } else {
        toast.success(data.message);
        router.refresh();
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  // ── Reactivate button (no confirmation needed) ────────────────────────────
  if (isDeactivated) {
    return (
      <button
        type="button"
        onClick={() => handleAction("reactivate")}
        disabled={loading}
        className="rounded-full border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60"
      >
        {loading ? "Reactivating…" : "Reactivate Lot"}
      </button>
    );
  }

  // ── Deactivate button + confirm modal ─────────────────────────────────────
  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (hasPendingOrders) {
            toast.error("You have pending orders awaiting your decision. Accept or decline them before deactivating.");
            return;
          }
          setShowConfirm(true);
        }}
        className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
      >
        Deactivate Lot
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Deactivate Lot?</h2>
            <p className="text-sm text-slate-600">
              This will remove <span className="font-semibold">{lotCode}</span> from the marketplace.
              Buyers will no longer be able to place orders or bids on it.
            </p>
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700 border border-amber-200">
              All currently accepted orders will not be affected — only new orders will be blocked.
              You can reactivate the lot at any time.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleAction("deactivate")}
                disabled={loading}
                className="flex-1 rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60 transition"
              >
                {loading ? "Deactivating…" : "Yes, Deactivate"}
              </button>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
