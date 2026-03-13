"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import type { FlowOrder } from "@/lib/product-flow";
import {
  Camera, CameraOff, CheckCircle2, AlertTriangle, Package,
  QrCode, ChevronDown, ChevronUp, RefreshCw,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type Condition = "GOOD" | "PARTIAL" | "DAMAGED";

type Inspection = {
  open: boolean;
  step: 1 | 2 | 3; // 1=arrived, 2=inspected, 3=ready
  weightKg: string;
  actualQty: string;
  condition: Condition;
  damageNotes: string;
  scannedPackets: string[];
  scanInput: string;
  saving: boolean;
  done: boolean;
  confirmingLost: boolean; // show lost-packet confirmation panel
  lostReason: string;      // reason entered when packets are missing
};

function defaultInspection(): Inspection {
  return {
    open: false,
    step: 1,
    weightKg: "",
    actualQty: "",
    condition: "GOOD",
    damageNotes: "",
    scannedPackets: [],
    scanInput: "",
    saving: false,
    done: false,
    confirmingLost: false,
    lostReason: "",
  };
}

function parseExpectedQty(qty: string): number {
  const n = parseFloat(qty.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : Math.round(n);
}

// ── 3-step mini progress bar ─────────────────────────────────────────────────

const STEPS = ["Hub Received", "Inspection Done", "Ready for Pickup"] as const;

function MiniStepBar({ step }: { step: 1 | 2 | 3 }) {
  const active = step - 1; // 0-indexed completed count
  return (
    <div className="flex items-center">
      {STEPS.map((label, i) => {
        const isDone = i < active;
        const isActive = i === active;
        const isLast = i === STEPS.length - 1;
        return (
          <div key={i} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <div className={`h-0.5 flex-1 ${i === 0 ? "invisible" : isDone ? "bg-emerald-400" : isActive ? "bg-gradient-to-r from-emerald-400 to-slate-200" : "bg-slate-200"}`} />
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-all ${
                isDone ? "border-emerald-500 bg-emerald-500 text-white" : isActive ? "border-blue-500 bg-white text-blue-600 shadow-[0_0_0_4px_rgba(59,130,246,0.14)]" : "border-slate-200 bg-white text-slate-400"
              }`}>
                {isDone
                  ? <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  : isActive ? <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  : <span>{i + 1}</span>
                }
              </div>
              <div className={`h-0.5 flex-1 ${isLast ? "invisible" : isDone ? "bg-emerald-400" : "bg-slate-200"}`} />
            </div>
            <p className={`mt-1 text-center text-[9px] font-semibold leading-tight ${isDone ? "text-emerald-700" : isActive ? "text-blue-700" : "text-slate-400"}`}>{label}</p>
          </div>
        );
      })}
    </div>
  );
}

// ── QR Camera Scanner ────────────────────────────────────────────────────────

function QRScannerModal({
  onScan,
  onClose,
}: {
  onScan: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [lastScan, setLastScan] = useState<string | null>(null);
  const detectorRef = useRef<unknown>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let active = true;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;

        // Try BarcodeDetector
        if ("BarcodeDetector" in window) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          detectorRef.current = new (window as any).BarcodeDetector({ formats: ["qr_code", "code_128", "ean_13"] });
          intervalRef.current = setInterval(async () => {
            if (!videoRef.current || !detectorRef.current) return;
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const codes = await (detectorRef.current as any).detect(videoRef.current);
              if (codes.length > 0) {
                const code = codes[0].rawValue as string;
                setLastScan(code);
                onScan(code);
              }
            } catch { /* ignore frame errors */ }
          }, 500);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Camera unavailable");
      }
    }

    void startCamera();
    return () => {
      active = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [onScan]);

  function submitManual() {
    const v = manualInput.trim();
    if (!v) return;
    setLastScan(v);
    onScan(v);
    setManualInput("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div className="flex items-center gap-2 font-semibold text-slate-800"><QrCode size={16} /> QR / Barcode Scanner</div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><CameraOff size={16} /></button>
        </div>

        {error ? (
          <div className="p-6 text-center space-y-2">
            <Camera size={32} className="mx-auto text-slate-300" />
            <p className="text-sm text-red-500">{error}</p>
            <p className="text-xs text-slate-400">Camera access denied. Use manual entry below.</p>
          </div>
        ) : (
          <div className="relative bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-60 object-cover" />
            {/* scan frame overlay */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-36 w-36 rounded-lg border-2 border-emerald-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
            </div>
            {"BarcodeDetector" in window ? (
              <p className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-white/70">Point camera at QR code</p>
            ) : (
              <p className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-amber-300">Auto-detect unavailable — use manual entry</p>
            )}
          </div>
        )}

        {lastScan && (
          <div className="border-t border-emerald-100 bg-emerald-50 px-5 py-2 text-xs font-semibold text-emerald-700">
            ✓ Last scanned: {lastScan}
          </div>
        )}

        <div className="p-4 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Manual entry</p>
          <div className="flex gap-2">
            <input
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitManual(); }}
              placeholder="Packet ID / barcode"
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            />
            <button type="button" onClick={submitManual} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Add</button>
          </div>
          <button type="button" onClick={onClose} className="w-full rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Done Scanning</button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DPArrivalsPage() {
  const [orders, setOrders] = useState<FlowOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [inspections, setInspections] = useState<Record<string, Inspection>>({});
  const [scannerFor, setScannerFor] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    const rows = await api.get<FlowOrder[]>("/api/flow/delivery/incoming");
    setOrders(rows.filter((o) => o.status === "DISPATCHED" || o.status === "HUB_RECEIVED" || o.status === "OUT_FOR_DELIVERY" || o.status === "ARRIVED"));
  }, []);

  useEffect(() => {
    void loadOrders().finally(() => setLoading(false));
  }, [loadOrders]);

  function getInspection(orderId: string): Inspection {
    return inspections[orderId] ?? defaultInspection();
  }

  function patchInspection(orderId: string, patch: Partial<Inspection>) {
    setInspections((prev) => ({
      ...prev,
      [orderId]: { ...(prev[orderId] ?? defaultInspection()), ...patch },
    }));
  }

  function handleScan(orderId: string, code: string) {
    const ins = getInspection(orderId);
    if (ins.scannedPackets.includes(code)) return; // already scanned
    patchInspection(orderId, { scannedPackets: [...ins.scannedPackets, code] });
  }

  async function submitInspection(order: FlowOrder) {
    const ins = getInspection(order.id);
    const expectedPackets = (order.packetQty ?? 0) > 0 ? order.packetQty! : parseExpectedQty(order.qty);
    const lostPacketCount = expectedPackets > ins.scannedPackets.length
      ? expectedPackets - ins.scannedPackets.length
      : 0;
    patchInspection(order.id, { saving: true });
    try {
      await api.patch(`/api/flow/delivery/orders/${order.id}/arrive`, {
        weightKg: parseFloat(ins.weightKg) || null,
        actualQty: parseFloat(ins.actualQty) || null,
        condition: ins.condition,
        damageNotes: ins.condition !== "GOOD" ? ins.damageNotes : "",
        scannedPackets: ins.scannedPackets,
        lostPacketCount,
        lostReason: lostPacketCount > 0 ? ins.lostReason : "",
      });
      patchInspection(order.id, { step: 3, done: true, saving: false });
      void loadOrders();
    } catch {
      patchInspection(order.id, { saving: false });
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-100" />
        {[0,1].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Delivery Inspection</h1>
          <p className="text-slate-500 text-sm mt-0.5">Receive orders, check weight & QC, scan packets, mark ready for pickup.</p>
        </div>
        <button type="button" onClick={() => void loadOrders()}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {orders.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center">
          <Package size={28} className="mx-auto mb-3 text-slate-300" strokeWidth={1.5} />
          <p className="text-sm text-slate-400">No orders dispatched to this delivery point.</p>
        </div>
      )}

      <div className="space-y-4">
        {orders.map((order) => {
          const ins = getInspection(order.id);
          const expectedPackets = (order.packetQty ?? 0) > 0 ? order.packetQty! : parseExpectedQty(order.qty);
          const scannedCount = ins.scannedPackets.length;
          const allScanned = expectedPackets > 0 && scannedCount >= expectedPackets;
          const missingPackets = expectedPackets > 0 ? expectedPackets - scannedCount : 0;
          const inspectionReady =
            ins.weightKg.trim() !== "" &&
            ins.actualQty.trim() !== "" &&
            (ins.condition === "GOOD" || ins.damageNotes.trim() !== "");

          return (
            <div key={order.id} className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
              {/* Card header */}
              <div className="flex items-center gap-3 border-b border-slate-50 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900">{order.product}</span>
                    <span className="font-mono text-xs text-slate-400">{order.id}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                    {(order.packetQty ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                        <Package size={9} /> {order.packetQty} packets
                      </span>
                    )}
                    <span className="text-xs text-slate-500">Ordered: {order.qty}</span>
                    {(order.freeQty ?? 0) > 0 && (
                      <span className="text-xs font-semibold text-emerald-600">+{order.freeQty} free</span>
                    )}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  ins.done ? "bg-emerald-50 text-emerald-700" :
                  order.status === "DISPATCHED" ? "bg-violet-50 text-violet-700" :
                  "bg-blue-50 text-blue-700"
                }`}>
                  {ins.done ? "Ready for Pickup" : order.status === "DISPATCHED" ? "Dispatched" : order.status.replace(/_/g," ")}
                </span>
                <button type="button" onClick={() => patchInspection(order.id, { open: !ins.open })}
                  className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                  {ins.open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {/* Mini 3-step bar */}
              <div className="px-5 py-4">
                <MiniStepBar step={ins.step} />
              </div>

              {/* Inspection panel */}
              {ins.open && !ins.done && (
                <div className="border-t border-slate-50 px-5 pb-5 space-y-5">

                  {/* Step 1 → Mark Arrived */}
                  {ins.step === 1 && (
                    <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                      <div className="flex-1 text-xs text-blue-700">
                        <p className="font-semibold">Confirm order arrived at this delivery point</p>
                        <p className="mt-0.5 text-blue-500">Seller: {order.seller} · Buyer: {order.buyer}</p>
                      </div>
                      <button type="button"
                        onClick={() => patchInspection(order.id, { step: 2 })}
                        className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">
                        ✓ Arrived
                      </button>
                    </div>
                  )}

                  {/* Step 2 → Full inspection */}
                  {ins.step === 2 && (
                    <div className="space-y-5">

                      {/* Weight & Qty */}
                      <div>
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Weight & Quantity Check</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">Actual Weight (kg)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={ins.weightKg}
                              onChange={(e) => patchInspection(order.id, { weightKg: e.target.value })}
                              placeholder="e.g. 245.5"
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">Actual Qty (ordered: {order.qty})</label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={ins.actualQty}
                              onChange={(e) => patchInspection(order.id, { actualQty: e.target.value })}
                              placeholder={`Expected: ${expectedPackets}`}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* QC & Damage Check */}
                      <div>
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">QC & Damage Check</p>
                        <div className="flex gap-2">
                          {(["GOOD", "PARTIAL", "DAMAGED"] as Condition[]).map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => patchInspection(order.id, { condition: c })}
                              className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition ${
                                ins.condition === c
                                  ? c === "GOOD" ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                                    : c === "PARTIAL" ? "border-amber-400 bg-amber-50 text-amber-700"
                                    : "border-red-400 bg-red-50 text-red-700"
                                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                              }`}
                            >
                              {c === "GOOD" ? "✓ Good" : c === "PARTIAL" ? "⚠ Partial" : "✕ Damaged"}
                            </button>
                          ))}
                        </div>
                        {ins.condition !== "GOOD" && (
                          <div className="mt-3">
                            <label className="mb-1 block text-xs font-medium text-slate-600">
                              {ins.condition === "DAMAGED" ? "Damage Report" : "Partial Damage Notes"}
                              <span className="ml-1 text-red-400">*</span>
                            </label>
                            <textarea
                              rows={3}
                              value={ins.damageNotes}
                              onChange={(e) => patchInspection(order.id, { damageNotes: e.target.value })}
                              placeholder="Describe the damage or issue in detail…"
                              className="w-full resize-none rounded-xl border border-amber-200 bg-amber-50/50 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                            />
                          </div>
                        )}
                      </div>

                      {/* Packet QR Scanner */}
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Packet Receipt Confirmation</p>
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            allScanned ? "bg-emerald-100 text-emerald-700" :
                            scannedCount > 0 ? "bg-amber-100 text-amber-700" :
                            "bg-slate-100 text-slate-500"
                          }`}>
                            {scannedCount} / {expectedPackets > 0 ? expectedPackets : "?"} packets
                          </span>
                        </div>

                        {/* Progress bar */}
                        {expectedPackets > 0 && (
                          <div className="mb-3 h-2 w-full rounded-full bg-slate-100">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${allScanned ? "bg-emerald-500" : "bg-blue-400"}`}
                              style={{ width: `${Math.min(100, (scannedCount / expectedPackets) * 100)}%` }}
                            />
                          </div>
                        )}

                        {/* Scanned list */}
                        {ins.scannedPackets.length > 0 && (
                          <div className="mb-3 flex flex-wrap gap-1.5">
                            {ins.scannedPackets.map((code, i) => (
                              <span key={i} className="flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-mono text-emerald-700">
                                <CheckCircle2 size={9} /> {code}
                                <button type="button" onClick={() => patchInspection(order.id, {
                                  scannedPackets: ins.scannedPackets.filter((_, j) => j !== i),
                                })} className="ml-0.5 text-emerald-400 hover:text-red-500">×</button>
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setScannerFor(order.id)}
                            className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
                          >
                            <Camera size={13} /> Open Camera Scanner
                          </button>
                          <div className="flex flex-1 gap-2">
                            <input
                              value={ins.scanInput}
                              onChange={(e) => patchInspection(order.id, { scanInput: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && ins.scanInput.trim()) {
                                  handleScan(order.id, ins.scanInput.trim());
                                  patchInspection(order.id, { scanInput: "" });
                                }
                              }}
                              placeholder="Type & press Enter"
                              className="flex-1 min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-400 focus:outline-none"
                            />
                          </div>
                        </div>

                        {allScanned && (
                          <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 size={12} /> All {expectedPackets} packets confirmed received!
                          </div>
                        )}
                        {!allScanned && scannedCount > 0 && expectedPackets > 0 && (
                          <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
                            <AlertTriangle size={12} /> {missingPackets} packet{missingPackets !== 1 ? "s" : ""} not yet scanned
                          </div>
                        )}
                        {expectedPackets > 0 && scannedCount === 0 && (
                          <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-500">
                            <QrCode size={12} /> Scan all {expectedPackets} packet QR codes to confirm receipt
                          </div>
                        )}
                      </div>

                      {/* Submit — all packets received */}
                      {(allScanned || expectedPackets === 0) && !ins.confirmingLost && (
                        <div className="flex items-center gap-3 border-t border-slate-50 pt-3">
                          <button
                            type="button"
                            disabled={!inspectionReady || ins.saving}
                            onClick={() => void submitInspection(order)}
                            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 transition"
                          >
                            {ins.saving ? "Saving…" : `✓ Confirm All ${expectedPackets > 0 ? expectedPackets + " " : ""}Packets Received`}
                          </button>
                          {!inspectionReady && <p className="text-xs text-slate-400">Fill weight, qty, and condition to continue.</p>}
                        </div>
                      )}

                      {/* Submit — packets missing, not yet confirming */}
                      {!allScanned && expectedPackets > 0 && inspectionReady && !ins.confirmingLost && (
                        <div className="flex items-center gap-3 border-t border-slate-50 pt-3">
                          <button
                            type="button"
                            onClick={() => patchInspection(order.id, { confirmingLost: true })}
                            className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-100 transition"
                          >
                            <AlertTriangle size={14} /> {missingPackets} Packet{missingPackets !== 1 ? "s" : ""} Missing — Report Loss
                          </button>
                        </div>
                      )}

                      {/* Lost-packet confirmation panel */}
                      {ins.confirmingLost && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
                          <div className="flex items-start gap-2 text-red-700">
                            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                            <div>
                              <p className="font-semibold text-sm">{missingPackets} packet{missingPackets !== 1 ? "s" : ""} will be recorded as LOST</p>
                              <p className="text-xs mt-0.5 text-red-600">Only {scannedCount} of {expectedPackets} packets scanned. Missing packets will be flagged for investigation.</p>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-red-700 mb-1">
                              Reason for missing packets <span className="text-red-400">*</span>
                            </label>
                            <textarea
                              rows={3}
                              value={ins.lostReason}
                              onChange={(e) => patchInspection(order.id, { lostReason: e.target.value })}
                              placeholder="Describe what happened to the missing packets…"
                              className="w-full resize-none rounded-xl border border-red-200 bg-white px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => patchInspection(order.id, { confirmingLost: false })}
                              className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              Cancel — Keep Scanning
                            </button>
                            <button
                              type="button"
                              disabled={!ins.lostReason.trim() || ins.saving}
                              onClick={() => void submitInspection(order)}
                              className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40 transition"
                            >
                              {ins.saving ? "Saving…" : "Confirm & Submit Report"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Done state */}
              {ins.done && (
                <div className="border-t border-emerald-50 bg-emerald-50/50 px-5 py-3 flex flex-wrap items-center gap-4 text-xs text-emerald-700">
                  <span className="font-semibold">✓ Inspection complete</span>
                  {ins.weightKg && <span>Weight: {ins.weightKg} kg</span>}
                  {ins.actualQty && <span>Qty: {ins.actualQty}</span>}
                  <span>{ins.condition}</span>
                  {ins.scannedPackets.length > 0 && <span>{ins.scannedPackets.length} packets scanned</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* QR scanner modal */}
      {scannerFor && (
        <QRScannerModal
          onScan={(code) => handleScan(scannerFor, code)}
          onClose={() => setScannerFor(null)}
        />
      )}
    </div>
  );
}
