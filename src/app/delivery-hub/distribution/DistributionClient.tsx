"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Camera,
  CameraOff,
  CheckCircle2,
  ChevronRight,
  Loader2,
  PackageCheck,
  Phone,
  Scale,
  Truck,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import api from "@/lib/api";
import { buildShipmentScanCode } from "@/lib/shipment-scan";

type HubOrder = {
  id: string;
  product: string;
  qty: string;
  buyer: string;
  seller: string;
  deliveryPoint: string;
  status: string;
  confirmedAt: string;
  hubReceivedAt: string | null;
  distributorName: string | null;
  distributorPhone: string | null;
  distributorAssignedAt: string | null;
  pickedUpFromHubAt: string | null;
  handoverScannedAt: string | null;
  deliveryWeightKg: number | null;
  hasDamage: boolean;
  damageNotes: string | null;
  totalAmount: number;
  buyerPhone: string | null;
  truckDriverName: string | null;
  truckDriverPhone: string | null;
};

type DeliveryMan = { id: string; name: string; phone: string; hubId: string | null };

type Step = 1 | 2 | 3 | 4 | 5;

function stepLabel(step: Step) {
  return ["Assign", "Scan QR", "Weight & Damage", "Mark Arrived", "Mark Delivered"][step - 1];
}

function orderStep(o: HubOrder): Step {
  if (o.status === "PICKED_UP") return 5;
  if (o.status === "ARRIVED") return 5;
  if (o.status === "OUT_FOR_DELIVERY") return 4;
  if (o.handoverScannedAt) return 4;
  if (o.distributorName) return 2;
  return 1;
}

// ─── QR Scanner ─────────────────────────────────────────────────────────────

function QRScanner({ onScanned }: { onScanned: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const detectorRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCamera() {
    if (!("BarcodeDetector" in window)) {
      setCamError("QR scanner not supported in this browser — use manual entry.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      // @ts-expect-error BarcodeDetector not in TS lib
      detectorRef.current = new BarcodeDetector({ formats: ["qr_code"] });
      setScanning(true);
      scanLoop();
    } catch {
      setCamError("Camera access denied — use manual entry below.");
    }
  }

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  function scanLoop() {
    if (!detectorRef.current || !videoRef.current) return;
    const video = videoRef.current;
    rafRef.current = requestAnimationFrame(async () => {
      if (video.readyState >= 2) {
        try {
          const codes = await detectorRef.current.detect(video);
          if (codes.length > 0) {
            stopCamera();
            onScanned(codes[0].rawValue as string);
            return;
          }
        } catch { /* continue */ }
      }
      scanLoop();
    });
  }

  return (
    <div className="space-y-4">
      {!camError && (
        <div className="relative overflow-hidden rounded-2xl bg-black aspect-video">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          {scanning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-emerald-400 rounded-xl w-48 h-48 opacity-80" />
            </div>
          )}
          {!scanning && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <Loader2 size={32} className="animate-spin text-white" />
            </div>
          )}
        </div>
      )}
      {camError && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <CameraOff size={16} />
          <span>{camError}</span>
        </div>
      )}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500">Or type / paste QR code value:</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="e.g. HUBREC-ORD-123456"
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          />
          <button
            onClick={() => { if (manualCode.trim()) { stopCamera(); onScanned(manualCode.trim()); } }}
            disabled={!manualCode.trim()}
            className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-40 transition"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Step Progress Bar ───────────────────────────────────────────────────────

function StepBar({ current }: { current: Step }) {
  const steps: Step[] = [1, 2, 3, 4, 5];
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition
              ${s < current ? "bg-emerald-500 text-white" : s === current ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-400"}`}
          >
            {s < current ? <CheckCircle2 size={12} /> : s}
          </div>
          <span className={`text-[10px] whitespace-nowrap font-medium ${s === current ? "text-blue-600" : s < current ? "text-emerald-600" : "text-slate-400"}`}>
            {stepLabel(s)}
          </span>
          {i < steps.length - 1 && <ChevronRight size={10} className="text-slate-300 mx-0.5" />}
        </div>
      ))}
    </div>
  );
}

// ─── Order Card ─────────────────────────────────────────────────────────────

function OrderCard({
  order,
  deliveryMen,
  onUpdate,
}: {
  order: HubOrder;
  deliveryMen: DeliveryMan[];
  onUpdate: (updated: Partial<HubOrder> & { id: string }) => void;
}) {
  const currentStep = orderStep(order);
  const [busy, setBusy] = useState(false);
  const [selectedDistId, setSelectedDistId] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [scannedCode, setScannedCode] = useState("");
  const [scanValid, setScanValid] = useState<boolean | null>(null);
  const [weightKg, setWeightKg] = useState("");
  const [hasDamage, setHasDamage] = useState(false);
  const [damageNotes, setDamageNotes] = useState("");

  function handleScanned(raw: string) {
    setShowScanner(false);
    setScannedCode(raw);
    const expected = buildShipmentScanCode(order.id);
    const cleaned = raw.trim().toUpperCase();
    const valid = cleaned === expected || cleaned === order.id.toUpperCase() || cleaned.includes(order.id.toUpperCase());
    setScanValid(valid);
    if (!valid) toast.error("QR code doesn't match this order");
  }

  async function assignDeliveryMan() {
    const dist = deliveryMen.find((d) => d.id === selectedDistId);
    if (!dist) return;
    setBusy(true);
    try {
      await api.patch(`/api/delivery-hub/orders/${order.id}/assign`, {
        distributorId: dist.id,
        distributorName: dist.name,
        distributorPhone: dist.phone,
      });
      toast.success(`Assigned to ${dist.name}`);
      onUpdate({ id: order.id, distributorName: dist.name, distributorPhone: dist.phone, distributorAssignedAt: new Date().toISOString() });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Assignment failed");
    } finally {
      setBusy(false);
    }
  }

  async function confirmHandover() {
    const kg = parseFloat(weightKg);
    if (!scannedCode || !scanValid) { toast.error("Scan the QR code first"); return; }
    if (!kg || kg <= 0) { toast.error("Enter a valid weight"); return; }
    setBusy(true);
    try {
      await api.patch(`/api/delivery-hub/orders/${order.id}/handover`, {
        scannedCode,
        deliveryWeightKg: kg,
        hasDamage,
        damageNotes: hasDamage ? damageNotes : undefined,
      });
      toast.success("Handover confirmed — Out for delivery");
      onUpdate({
        id: order.id,
        status: "OUT_FOR_DELIVERY",
        handoverScannedAt: new Date().toISOString(),
        pickedUpFromHubAt: new Date().toISOString(),
        deliveryWeightKg: kg,
        hasDamage,
        damageNotes: hasDamage ? damageNotes : null,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Handover confirmation failed");
    } finally {
      setBusy(false);
    }
  }

  async function markArrived() {
    setBusy(true);
    try {
      await api.patch(`/api/delivery-hub/orders/${order.id}/arrived`, {});
      toast.success("Marked as arrived at delivery point");
      onUpdate({ id: order.id, status: "ARRIVED" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function markDelivered() {
    setBusy(true);
    try {
      await api.patch(`/api/delivery-hub/orders/${order.id}/mark-delivered`, {});
      toast.success("Order marked as delivered");
      onUpdate({ id: order.id, status: "PICKED_UP" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const isDone = order.status === "PICKED_UP";

  return (
    <div className={`rounded-2xl border bg-white shadow-sm overflow-hidden ${isDone ? "border-emerald-100" : "border-slate-100"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 p-5">
        <div className="space-y-1">
          <span className="font-mono text-xs text-slate-400">{order.id}</span>
          <p className="text-base font-bold text-slate-900">{order.product}</p>
          <p className="text-sm text-slate-500">
            {order.qty} · {order.buyer} → <span className="font-medium text-slate-700">{order.deliveryPoint}</span>
          </p>
          {order.distributorName && (
            <p className="text-xs font-semibold text-violet-700">
              Delivery Man: {order.distributorName}{order.distributorPhone ? ` · ${order.distributorPhone}` : ""}
            </p>
          )}
        </div>
        <p className="text-sm font-bold text-emerald-700">৳ {order.totalAmount.toLocaleString()}</p>
      </div>

      {/* Contact details — buyer + truck driver */}
      {(order.buyerPhone || order.truckDriverName) && (
        <div className="flex flex-wrap gap-2 px-5 pb-4">
          {order.buyerPhone && (
            <a href={`tel:${order.buyerPhone}`}
              className="flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition">
              <Phone size={12} /> Buyer: {order.buyer} · {order.buyerPhone}
            </a>
          )}
          {order.truckDriverName && (
            <a href={order.truckDriverPhone ? `tel:${order.truckDriverPhone}` : undefined}
              className="flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition">
              <Truck size={12} /> Driver: {order.truckDriverName}{order.truckDriverPhone ? ` · ${order.truckDriverPhone}` : ""}
            </a>
          )}
        </div>
      )}

      {!isDone && (
        <div className="border-t border-slate-50 px-5 pb-5 space-y-4">
          {currentStep === 1 && !order.distributorName && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <UserCheck size={15} className="text-amber-500" /> Assign Delivery Man
              </p>
              <div className="flex flex-wrap gap-2">
                <select
                  value={selectedDistId}
                  onChange={(e) => setSelectedDistId(e.target.value)}
                  className="flex-1 min-w-[220px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                >
                  <option value="">— Select delivery man —</option>
                  {deliveryMen.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} · {d.phone}</option>
                  ))}
                </select>
                <button
                  onClick={() => void assignDeliveryMan()}
                  disabled={busy || !selectedDistId}
                  className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-40 transition"
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                  {busy ? "Assigning…" : "Assign"}
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Camera size={15} className="text-blue-500" /> Scan Delivery Man&apos;s QR Code
              </p>
              <p className="text-xs text-slate-500">
                Expected: <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{buildShipmentScanCode(order.id)}</code>
              </p>

              {scannedCode ? (
                <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm
                  ${scanValid ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
                  {scanValid ? <CheckCircle2 size={15} /> : <X size={15} />}
                  <span className="font-mono text-xs flex-1 truncate">{scannedCode}</span>
                  <button onClick={() => { setScannedCode(""); setScanValid(null); }} className="text-xs underline shrink-0">Clear</button>
                </div>
              ) : (
                showScanner
                  ? <div className="space-y-3">
                      <QRScanner onScanned={handleScanned} />
                      <button onClick={() => setShowScanner(false)} className="text-xs text-slate-400 underline">Cancel camera</button>
                    </div>
                  : <button
                      onClick={() => setShowScanner(true)}
                      className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition"
                    >
                      <Camera size={15} /> Open Camera to Scan
                    </button>
              )}

              {scannedCode && scanValid && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Scale size={15} className="text-indigo-500" /> Confirm Weight &amp; Condition
                  </p>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Delivery Weight (kg)</label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      placeholder="e.g. 250.5"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasDamage}
                      onChange={(e) => setHasDamage(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <AlertTriangle size={14} className={hasDamage ? "text-red-500" : "text-slate-400"} />
                    <span className={`text-sm font-medium ${hasDamage ? "text-red-700" : "text-slate-600"}`}>
                      Damage observed at handover
                    </span>
                  </label>
                  {hasDamage && (
                    <textarea
                      value={damageNotes}
                      onChange={(e) => setDamageNotes(e.target.value)}
                      placeholder="Describe the damage (e.g. torn packaging, wet bags)…"
                      rows={2}
                      className="w-full rounded-xl border border-red-200 bg-red-50/50 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-red-400 focus:outline-none resize-none"
                    />
                  )}
                  <button
                    onClick={() => void confirmHandover()}
                    disabled={busy || !weightKg || parseFloat(weightKg) <= 0}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition"
                  >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <PackageCheck size={14} />}
                    {busy ? "Confirming…" : "Confirm Handover"}
                  </button>
                </div>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <PackageCheck size={15} className="text-emerald-500" /> Mark as Arrived at Delivery Point
              </p>
              {order.deliveryWeightKg && (
                <p className="text-xs text-slate-500">
                  Confirmed weight: <span className="font-semibold text-slate-700">{order.deliveryWeightKg} kg</span>
                  {order.hasDamage && <span className="ml-2 text-red-600 font-semibold">⚠ Damage recorded</span>}
                </p>
              )}
              <button
                onClick={() => void markArrived()}
                disabled={busy}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-40 transition"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {busy ? "Updating…" : "Mark Arrived at Point"}
              </button>
            </div>
          )}

          {currentStep === 5 && order.status === "ARRIVED" && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <CheckCircle2 size={15} className="text-teal-500" /> Final — Mark as Delivered
              </p>
              <button
                onClick={() => void markDelivered()}
                disabled={busy}
                className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-40 transition"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {busy ? "Updating…" : "Mark as Delivered"}
              </button>
            </div>
          )}
        </div>
      )}

      {isDone && (
        <div className="border-t border-emerald-100 bg-emerald-50 px-5 py-3 flex items-center gap-2 text-sm font-semibold text-emerald-700">
          <CheckCircle2 size={16} />
          Delivered
          {order.deliveryWeightKg && <span className="ml-auto text-xs text-emerald-600 font-normal">{order.deliveryWeightKg} kg</span>}
        </div>
      )}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function DistributionClient() {
  const [orders, setOrders] = useState<HubOrder[]>([]);
  const [deliveryMen, setDeliveryMen] = useState<DeliveryMan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<HubOrder[]>("/api/delivery-hub/orders?status=tracking"),
      api.get<DeliveryMan[]>("/api/delivery-hub/distributors"),
    ])
      .then(([o, d]) => { setOrders(o); setDeliveryMen(d); })
      .catch(() => toast.error("Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  function handleUpdate(updated: Partial<HubOrder> & { id: string }) {
    setOrders((prev) =>
      prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
    );
  }

  if (loading) return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-100" />)}
    </div>
  );

  const hubReceived = orders.filter((o) => o.status === "HUB_RECEIVED" && !o.distributorName);
  const inProgress  = orders.filter((o) => o.status !== "PICKED_UP" && (o.distributorName || o.status !== "HUB_RECEIVED"));
  const completed   = orders.filter((o) => o.status === "PICKED_UP");

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Delivery Management</h1>
          <p className="text-slate-500 text-sm mt-0.5">Assign delivery men, confirm QR handover, record weight &amp; condition, and track to final delivery.</p>
        </div>
        <div className="flex gap-2">
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-center">
            <p className="text-xl font-bold text-amber-700">{hubReceived.length}</p>
            <p className="text-xs text-amber-600">Unassigned</p>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-center">
            <p className="text-xl font-bold text-blue-700">{inProgress.length}</p>
            <p className="text-xs text-blue-600">In Progress</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-center">
            <p className="text-xl font-bold text-emerald-700">{completed.length}</p>
            <p className="text-xs text-emerald-600">Delivered</p>
          </div>
        </div>
      </div>

      {orders.length === 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
          <Users size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-500">No active orders</p>
          <p className="mt-1 text-sm text-slate-400">Orders received at the hub will appear here for delivery management.</p>
        </div>
      )}

      {hubReceived.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-600">Needs Delivery Man ({hubReceived.length})</h2>
          {hubReceived.map((o) => (
            <OrderCard key={o.id} order={o} deliveryMen={deliveryMen} onUpdate={handleUpdate} />
          ))}
        </section>
      )}

      {inProgress.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-blue-600">In Progress ({inProgress.length})</h2>
          {inProgress.map((o) => (
            <OrderCard key={o.id} order={o} deliveryMen={deliveryMen} onUpdate={handleUpdate} />
          ))}
        </section>
      )}

      {completed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-emerald-600">Delivered ({completed.length})</h2>
          {completed.map((o) => (
            <OrderCard key={o.id} order={o} deliveryMen={deliveryMen} onUpdate={handleUpdate} />
          ))}
        </section>
      )}
    </div>
  );
}
