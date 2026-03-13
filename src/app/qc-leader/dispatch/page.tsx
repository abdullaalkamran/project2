"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Truck, Package, MapPin, CheckCircle2, AlertTriangle,
  RefreshCw, ChevronRight, User, Phone, Plus, X, Upload,
  Link2, Send, Camera, FileText, Shield, Users, Clock, ChevronDown, ChevronUp, XCircle,
} from "lucide-react";
import api from "@/lib/api";
import PreDispatchGate, { gateReadyForDispatch, roleActionNeeded, type GateData } from "@/components/PreDispatchGate";

// ── Types ─────────────────────────────────────────────────────────────────────
type PendingDriver = {
  driverCode: string;
  name: string;
  phone: string;
  address: string | null;
  nid: string;
  nidPhotoUrl: string | null;
  photoUrl: string | null;
  license: string;
  licenseExpiry: string;
  licensePhotoUrl: string | null;
  emergencyContactName: string | null;
  emergencyContactRelation: string | null;
  emergencyContactPhone: string | null;
  emergencyContactAddress: string | null;
  emergencyContactPhotoUrl: string | null;
  emergencyContactNidPhotoUrl: string | null;
};

type PendingTruck = {
  id: string;
  reg: string;
  type: string;
  capacityKg: number;
  photoUrl: string | null;
  registrationStatus: string;
  registrationNote: string | null;
  submittedAt: string;
  submittedBy: string | null;
  submittedByName: string | null;
  hubId: string | null;
  hubName: string | null;
  driver: PendingDriver;
};

type DbTruck = {
  id: string;
  reg: string;
  type: string;
  capacityKg: number;
  status: string;
  photoUrl: string | null;
  driverName: string | null;
  driverPhone: string | null;
  driverPhotoUrl: string | null;
  currentDestination: string | null;
};

type OrderDispatch = {
  id: string;
  lotId: string;
  product: string;
  qty: string;
  freeQty: number;
  seller: string;
  buyer: string;
  deliveryPoint: string;
  winningBid: string;
  totalAmount: string;
  confirmedAt: string;
  assignedTruck: string | null;
  loadConfirmed: boolean;
  dispatched: boolean;
  status: string;
  preDispatch: GateData;
  packetQr: { total: number; scanned: number };
};

// ── Truck status config ───────────────────────────────────────────────────────
const TRUCK_STATUSES = [
  { value: "AVAILABLE",   label: "Available",   color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "LOADING",     label: "Loading",     color: "bg-amber-50 text-amber-700 border-amber-200"   },
  { value: "IN_TRANSIT",  label: "In Transit",  color: "bg-blue-50 text-blue-700 border-blue-200"      },
  { value: "MAINTENANCE", label: "Maintenance", color: "bg-red-50 text-red-600 border-red-200"         },
];

const TRUCK_TYPES = [
  "Covered Van",
  "Open Truck",
  "Mini Truck",
  "Refrigerated Van",
  "Flatbed",
  "Pick-up",
  "Other",
];

function getTruckStatusCfg(status: string) {
  return (
    TRUCK_STATUSES.find((s) =>
      s.value === status || s.label.toLowerCase() === status.toLowerCase()
    ) ?? { value: status, label: status, color: "bg-slate-100 text-slate-600 border-slate-200" }
  );
}

function isAvailable(status: string) {
  return status === "AVAILABLE" || status.toLowerCase() === "available";
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseKg(qty: string): number {
  const n = parseFloat(qty.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

function effectiveQtyLabel(o: OrderDispatch): string {
  const unit = o.qty.split(" ")[1] ?? "";
  return o.freeQty > 0 ? `${o.qty} + ${o.freeQty} ${unit} free` : o.qty;
}

function effectiveQtyKg(o: OrderDispatch): number {
  return parseKg(o.qty) + (o.freeQty ?? 0);
}

// ── Photo upload widget ───────────────────────────────────────────────────────
function PhotoUploader({
  label, category, value, onChange,
}: {
  label: string;
  category: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", category);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      onChange(data.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <div
        onClick={() => inputRef.current?.click()}
        className="relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 cursor-pointer hover:border-teal-400 hover:bg-teal-50/30 transition"
      >
        {value ? (
          <>
            <img src={value} alt={label} className="h-24 w-full object-cover rounded-lg" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              className="absolute right-2 top-2 rounded-full bg-white/80 p-0.5 shadow hover:bg-red-50"
            >
              <X size={12} className="text-red-500" />
            </button>
          </>
        ) : uploading ? (
          <div className="flex flex-col items-center gap-1.5 text-teal-600">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
            <span className="text-[10px]">Uploading…</span>
          </div>
        ) : (
          <>
            <Upload size={18} className="text-slate-300" />
            <span className="text-[10px] text-slate-400">Click to upload</span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

// ── Form field helpers ────────────────────────────────────────────────────────
function Field({
  label, required, children,
}: {
  label: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:border-teal-400 focus:outline-none";
const selectCls = inputCls + " appearance-none cursor-pointer";

// ── Add Truck Modal ───────────────────────────────────────────────────────────
type HubOption = { id: string; name: string };

type AddTruckForm = {
  // Truck info
  reg: string;
  type: string;
  capacityKg: string;
  photoUrl: string;
  hubId: string;
  hubName: string;
  // Driver info
  driverName: string;
  driverPhone: string;
  driverAddress: string;
  driverNid: string;
  driverNidPhotoUrl: string;
  driverPhotoUrl: string;
  licenseNumber: string;
  licenseExpiry: string;
  licensePhotoUrl: string;
  // Emergency contact
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
  emergencyContactAddress: string;
  emergencyContactPhotoUrl: string;
  emergencyContactNidPhotoUrl: string;
};

const BLANK_FORM: AddTruckForm = {
  reg: "", type: "", capacityKg: "", photoUrl: "", hubId: "", hubName: "",
  driverName: "", driverPhone: "", driverAddress: "", driverNid: "",
  driverNidPhotoUrl: "", driverPhotoUrl: "", licenseNumber: "",
  licenseExpiry: "", licensePhotoUrl: "",
  emergencyContactName: "", emergencyContactRelation: "",
  emergencyContactPhone: "", emergencyContactAddress: "",
  emergencyContactPhotoUrl: "", emergencyContactNidPhotoUrl: "",
};

type FormSection = "truck" | "driver" | "emergency" | "review";

function RequiredPhotoUploader({
  label, category, value, onChange, required, showError,
}: {
  label: string; category: string; value: string;
  onChange: (url: string) => void; required?: boolean; showError?: boolean;
}) {
  return (
    <div className="space-y-1">
      <PhotoUploader label={label} category={category} value={value} onChange={onChange} />
      {required && showError && !value && (
        <p className="text-[10px] font-semibold text-red-500">Required — please upload a photo</p>
      )}
    </div>
  );
}

function AddTruckModal({
  onClose, onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm]       = useState<AddTruckForm>(BLANK_FORM);
  const [section, setSection] = useState<FormSection>("truck");
  const [saving, setSaving]   = useState(false);
  const [hubs, setHubs]       = useState<HubOption[]>([]);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    api.get<HubOption[]>("/api/flow/hubs")
      .then(setHubs)
      .catch(() => {/* non-fatal */});
  }, []);

  const set = (k: keyof AddTruckForm, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  function goToDriver() {
    if (!form.reg || !form.type || !form.capacityKg || !form.photoUrl || !form.hubId) {
      setShowErrors(true);
      toast.error("Please fill in all required fields and upload the truck photo");
      return;
    }
    setShowErrors(false);
    setSection("driver");
  }

  function goToEmergency() {
    if (!form.driverName || !form.driverPhone || !form.driverNid || !form.licenseNumber || !form.licenseExpiry
      || !form.driverPhotoUrl || !form.driverNidPhotoUrl || !form.licensePhotoUrl) {
      setShowErrors(true);
      toast.error("Please fill in all required fields and upload all driver photos");
      return;
    }
    setShowErrors(false);
    setSection("emergency");
  }

  function goToReview() {
    setSection("review");
  }

  async function submit() {
    setSaving(true);
    try {
      await api.post("/api/flow/trucks", {
        ...form,
        capacityKg: Number(form.capacityKg),
      });
      toast.success("Registration submitted!", { description: "Awaiting hub manager approval." });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Could not register truck", { description: msg });
    } finally {
      setSaving(false);
    }
  }

  const STEPS: { key: FormSection; label: string; icon: React.ReactNode }[] = [
    { key: "truck",     label: "Truck",     icon: <Truck size={13} />      },
    { key: "driver",    label: "Driver",    icon: <User size={13} />       },
    { key: "emergency", label: "Emergency", icon: <Shield size={13} />     },
    { key: "review",    label: "Review",    icon: <FileText size={13} />   },
  ];

  const stepIndex = STEPS.findIndex((s) => s.key === section);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Register New Truck</h2>
            <p className="text-xs text-slate-400">Fill in all details — photos are mandatory</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex border-b border-slate-100">
          {STEPS.map((s, i) => (
            <div key={s.key}
              className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-3 text-[11px] font-semibold transition select-none ${
                section === s.key
                  ? "border-b-2 border-teal-500 text-teal-700 bg-teal-50/40"
                  : i < stepIndex ? "text-emerald-600" : "text-slate-300"
              }`}
            >
              <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                section === s.key ? "bg-teal-500 text-white"
                : i < stepIndex ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-400"
              }`}>
                {i < stepIndex ? "✓" : i + 1}
              </span>
              {s.icon}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="max-h-[65vh] overflow-y-auto px-6 py-5 space-y-5">

          {/* ── Step 1: Truck ── */}
          {section === "truck" && (
            <>
              <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-2.5 text-xs text-teal-700 font-medium">
                Truck ID will be auto-assigned by the system after hub manager approval.
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Registration Plate" required>
                  <input className={inputCls} placeholder="e.g. Dhaka Metro-TA-11-2345" value={form.reg}
                    onChange={(e) => set("reg", e.target.value)} />
                  {showErrors && !form.reg && <p className="text-[10px] text-red-500 font-semibold mt-0.5">Required</p>}
                </Field>
                <Field label="Truck Type" required>
                  <select className={selectCls} value={form.type} onChange={(e) => set("type", e.target.value)}>
                    <option value="">— Select type —</option>
                    {TRUCK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {showErrors && !form.type && <p className="text-[10px] text-red-500 font-semibold mt-0.5">Required</p>}
                </Field>
                <Field label="Capacity (kg)" required>
                  <input className={inputCls} type="number" min="100" placeholder="e.g. 5000" value={form.capacityKg}
                    onChange={(e) => set("capacityKg", e.target.value)} />
                  {showErrors && !form.capacityKg && <p className="text-[10px] text-red-500 font-semibold mt-0.5">Required</p>}
                </Field>
                <Field label="Hub / Station" required>
                  <select className={selectCls} value={form.hubId}
                    onChange={(e) => {
                      const opt = hubs.find((h) => h.id === e.target.value);
                      set("hubId", e.target.value);
                      set("hubName", opt?.name ?? "");
                    }}>
                    <option value="">— Select hub —</option>
                    {hubs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                  {showErrors && !form.hubId && <p className="text-[10px] text-red-500 font-semibold mt-0.5">Required</p>}
                </Field>
              </div>

              {/* Truck photos — mandatory */}
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-4 space-y-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <FileText size={12} /> Truck Photo <span className="text-red-500 normal-case font-bold">*</span>
                </p>
                <RequiredPhotoUploader label="Truck Photo" category="trucks"
                  value={form.photoUrl} onChange={(v) => set("photoUrl", v)}
                  required showError={showErrors} />
              </div>

              <div className="flex justify-end">
                <button type="button" onClick={goToDriver}
                  className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 transition">
                  Next: Driver Info <ChevronRight size={15} />
                </button>
              </div>
            </>
          )}

          {/* ── Step 2: Driver ── */}
          {section === "driver" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Driver Full Name" required>
                  <input className={inputCls} placeholder="e.g. Abdul Karim" value={form.driverName}
                    onChange={(e) => set("driverName", e.target.value)} />
                  {showErrors && !form.driverName && <p className="text-[10px] text-red-500 font-semibold mt-0.5">Required</p>}
                </Field>
                <Field label="Phone Number" required>
                  <input className={inputCls} placeholder="e.g. 01712345678" value={form.driverPhone}
                    onChange={(e) => set("driverPhone", e.target.value)} />
                  {showErrors && !form.driverPhone && <p className="text-[10px] text-red-500 font-semibold mt-0.5">Required</p>}
                </Field>
                <Field label="NID Number" required>
                  <input className={inputCls} placeholder="National ID number" value={form.driverNid}
                    onChange={(e) => set("driverNid", e.target.value)} />
                  {showErrors && !form.driverNid && <p className="text-[10px] text-red-500 font-semibold mt-0.5">Required</p>}
                </Field>
                <Field label="Address">
                  <input className={inputCls} placeholder="Village/Upazila/District" value={form.driverAddress}
                    onChange={(e) => set("driverAddress", e.target.value)} />
                </Field>
                <Field label="Driving License No." required>
                  <input className={inputCls} placeholder="License number" value={form.licenseNumber}
                    onChange={(e) => set("licenseNumber", e.target.value)} />
                  {showErrors && !form.licenseNumber && <p className="text-[10px] text-red-500 font-semibold mt-0.5">Required</p>}
                </Field>
                <Field label="License Expiry Date" required>
                  <input className={inputCls} type="date" value={form.licenseExpiry}
                    onChange={(e) => set("licenseExpiry", e.target.value)} />
                  {showErrors && !form.licenseExpiry && <p className="text-[10px] text-red-500 font-semibold mt-0.5">Required</p>}
                </Field>
              </div>

              {/* Driver photos — all mandatory */}
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-4 space-y-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <Camera size={12} /> Driver Photos &amp; Documents <span className="text-red-500 normal-case font-bold">* all required</span>
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <RequiredPhotoUploader label="Driver Photo" category="trucks"
                    value={form.driverPhotoUrl} onChange={(v) => set("driverPhotoUrl", v)}
                    required showError={showErrors} />
                  <RequiredPhotoUploader label="License Photo" category="trucks"
                    value={form.licensePhotoUrl} onChange={(v) => set("licensePhotoUrl", v)}
                    required showError={showErrors} />
                  <RequiredPhotoUploader label="NID Photo" category="trucks"
                    value={form.driverNidPhotoUrl} onChange={(v) => set("driverNidPhotoUrl", v)}
                    required showError={showErrors} />
                </div>
              </div>

              <div className="flex justify-between">
                <button type="button" onClick={() => setSection("truck")}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                  ← Back
                </button>
                <button type="button" onClick={goToEmergency}
                  className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 transition">
                  Next: Emergency Contact <ChevronRight size={15} />
                </button>
              </div>
            </>
          )}

          {/* ── Step 3: Emergency contact ── */}
          {section === "emergency" && (
            <>
              <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                  <Users size={13} /> Emergency Contact — must be a family member who knows the driver
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Contact Full Name">
                  <input className={inputCls} placeholder="e.g. Rahim Khan (father)" value={form.emergencyContactName}
                    onChange={(e) => set("emergencyContactName", e.target.value)} />
                </Field>
                <Field label="Relationship to Driver">
                  <select className={selectCls} value={form.emergencyContactRelation}
                    onChange={(e) => set("emergencyContactRelation", e.target.value)}>
                    <option value="">— Select relation —</option>
                    {["Father", "Mother", "Spouse", "Brother", "Sister", "Son", "Daughter", "Uncle", "Other"].map((r) =>
                      <option key={r} value={r}>{r}</option>
                    )}
                  </select>
                </Field>
                <Field label="Phone Number">
                  <input className={inputCls} placeholder="01712345678" value={form.emergencyContactPhone}
                    onChange={(e) => set("emergencyContactPhone", e.target.value)} />
                </Field>
                <Field label="Address">
                  <input className={inputCls} placeholder="Village/Upazila/District" value={form.emergencyContactAddress}
                    onChange={(e) => set("emergencyContactAddress", e.target.value)} />
                </Field>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-4 space-y-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <Camera size={12} /> Contact Verification Photos
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <PhotoUploader label="Contact Person Photo" category="trucks"
                    value={form.emergencyContactPhotoUrl} onChange={(v) => set("emergencyContactPhotoUrl", v)} />
                  <PhotoUploader label="Contact Person NID Photo" category="trucks"
                    value={form.emergencyContactNidPhotoUrl} onChange={(v) => set("emergencyContactNidPhotoUrl", v)} />
                </div>
              </div>

              <div className="flex justify-between">
                <button type="button" onClick={() => setSection("driver")}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                  ← Back
                </button>
                <button type="button" onClick={goToReview}
                  className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 transition">
                  Review &amp; Submit <ChevronRight size={15} />
                </button>
              </div>
            </>
          )}

          {/* ── Step 4: Review ── */}
          {section === "review" && (
            <>
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700 font-medium">
                Please review all details carefully before submitting. Once submitted, a hub manager must approve this registration.
              </div>

              {/* Truck summary */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Truck Details</p>
                <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-3">
                  <div className="flex items-start gap-4">
                    {form.photoUrl ? (
                      <img src={form.photoUrl} alt="Truck" className="h-24 w-36 flex-shrink-0 rounded-xl object-cover border border-slate-100" />
                    ) : (
                      <div className="flex h-24 w-36 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100">
                        <Truck size={28} className="text-slate-300" />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs flex-1">
                      <div><span className="font-semibold text-slate-500">Plate:</span> <span className="text-slate-800">{form.reg}</span></div>
                      <div><span className="font-semibold text-slate-500">Type:</span> <span className="text-slate-800">{form.type}</span></div>
                      <div><span className="font-semibold text-slate-500">Capacity:</span> <span className="text-slate-800">{form.capacityKg} kg</span></div>
                      <div><span className="font-semibold text-slate-500">Hub:</span> <span className="text-slate-800">{form.hubName || "—"}</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Driver summary */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Driver Details</p>
                <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-3">
                  <div className="flex items-start gap-4">
                    {form.driverPhotoUrl ? (
                      <img src={form.driverPhotoUrl} alt="Driver" className="h-20 w-20 flex-shrink-0 rounded-xl object-cover border border-slate-100" />
                    ) : (
                      <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100">
                        <User size={22} className="text-slate-300" />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs flex-1">
                      <div><span className="font-semibold text-slate-500">Name:</span> <span className="text-slate-800">{form.driverName}</span></div>
                      <div><span className="font-semibold text-slate-500">Phone:</span> <span className="text-slate-800">{form.driverPhone}</span></div>
                      <div><span className="font-semibold text-slate-500">NID:</span> <span className="text-slate-800">{form.driverNid}</span></div>
                      <div><span className="font-semibold text-slate-500">License:</span> <span className="text-slate-800">{form.licenseNumber}</span></div>
                      <div><span className="font-semibold text-slate-500">Expiry:</span> <span className="text-slate-800">{form.licenseExpiry}</span></div>
                      {form.driverAddress && <div className="col-span-2"><span className="font-semibold text-slate-500">Address:</span> <span className="text-slate-800">{form.driverAddress}</span></div>}
                    </div>
                  </div>
                  {/* Driver doc photos */}
                  <div className="flex flex-wrap gap-3 pt-1">
                    {form.licensePhotoUrl && (
                      <div><p className="mb-1 text-[10px] font-semibold text-slate-400">License</p>
                        <img src={form.licensePhotoUrl} alt="License" className="h-20 w-28 rounded-lg object-cover border border-slate-100" /></div>
                    )}
                    {form.driverNidPhotoUrl && (
                      <div><p className="mb-1 text-[10px] font-semibold text-slate-400">NID</p>
                        <img src={form.driverNidPhotoUrl} alt="NID" className="h-20 w-28 rounded-lg object-cover border border-slate-100" /></div>
                    )}
                  </div>
                </div>
              </div>

              {/* Emergency contact summary */}
              {form.emergencyContactName && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Emergency Contact</p>
                  <div className="rounded-xl border border-slate-100 bg-white p-4">
                    <div className="flex items-start gap-4">
                      {form.emergencyContactPhotoUrl ? (
                        <img src={form.emergencyContactPhotoUrl} alt="Contact" className="h-16 w-16 flex-shrink-0 rounded-xl object-cover border border-slate-100" />
                      ) : (
                        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100">
                          <Users size={18} className="text-slate-300" />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs flex-1">
                        <div><span className="font-semibold text-slate-500">Name:</span> <span className="text-slate-800">{form.emergencyContactName}</span></div>
                        {form.emergencyContactRelation && <div><span className="font-semibold text-slate-500">Relation:</span> <span className="text-slate-800">{form.emergencyContactRelation}</span></div>}
                        {form.emergencyContactPhone && <div><span className="font-semibold text-slate-500">Phone:</span> <span className="text-slate-800">{form.emergencyContactPhone}</span></div>}
                        {form.emergencyContactAddress && <div className="col-span-2"><span className="font-semibold text-slate-500">Address:</span> <span className="text-slate-800">{form.emergencyContactAddress}</span></div>}
                      </div>
                    </div>
                    {form.emergencyContactNidPhotoUrl && (
                      <div className="mt-3">
                        <p className="mb-1 text-[10px] font-semibold text-slate-400">NID</p>
                        <img src={form.emergencyContactNidPhotoUrl} alt="Contact NID" className="h-20 w-28 rounded-lg object-cover border border-slate-100" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-1">
                <button type="button" onClick={() => setSection("emergency")}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                  ← Edit
                </button>
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {saving ? (
                    <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Submitting…</>
                  ) : (
                    <><CheckCircle2 size={15} /> Submit Registration</>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Send Invite Modal ─────────────────────────────────────────────────────────
function SendInviteModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail]   = useState("");
  const [phone, setPhone]   = useState("");
  const [note, setNote]     = useState("");
  const [sending, setSending] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);

  async function generate() {
    setSending(true);
    try {
      const res = await api.post<{ link: string; expiresAt: string }>("/api/flow/trucks/invite", {
        email: email || undefined,
        phone: phone || undefined,
        note:  note  || undefined,
      });
      setGeneratedLink(res.link);
    } catch {
      toast.error("Could not generate invite link");
    } finally {
      setSending(false);
    }
  }

  function copyLink() {
    void navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied!");
  }

  const whatsappHref = phone
    ? `https://wa.me/88${phone.replace(/^0/, "")}?text=${encodeURIComponent(`You have been invited to register your truck on Paikari. Click the link below to fill in the details:\n\n${generatedLink}\n\nThis link is valid for 7 days.`)}`
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Send Truck Registration Invite</h2>
            <p className="text-xs text-slate-400">Generate a link for a truck owner to self-register</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {!generatedLink ? (
            <>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Phone Number (optional)
                </label>
                <input
                  className={inputCls}
                  placeholder="01712345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Email (optional)
                </label>
                <input
                  className={inputCls}
                  type="email"
                  placeholder="owner@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Note for recipient (optional)
                </label>
                <textarea
                  className={inputCls + " resize-none"}
                  rows={2}
                  placeholder="e.g. Please register your truck within 7 days"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => void generate()}
                disabled={sending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700 transition disabled:opacity-50"
              >
                {sending
                  ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Generating…</>
                  : <><Link2 size={15} /> Generate Invite Link</>
                }
              </button>
            </>
          ) : (
            <>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
                  Invite Link (valid for 7 days)
                </p>
                <p className="break-all text-xs font-mono text-slate-700 select-all">{generatedLink}</p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={copyLink}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  {copied ? <CheckCircle2 size={15} className="text-emerald-500" /> : <Link2 size={15} />}
                  {copied ? "Copied!" : "Copy Link"}
                </button>

                {phone && (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
                  >
                    <Send size={15} /> Send via WhatsApp
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setGeneratedLink("")}
                  className="text-center text-xs text-slate-400 hover:text-slate-600 transition"
                >
                  Generate another link
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Capacity bar (dispatch tab) ───────────────────────────────────────────────
function TruckCapacityBar({
  truckId, capacityKg, orders, previewQtyKg = 0, currentOrderId,
}: {
  truckId: string; capacityKg: number; orders: OrderDispatch[];
  previewQtyKg?: number; currentOrderId?: string;
}) {
  const confirmedKg = orders
    .filter((o) => o.assignedTruck === truckId && o.loadConfirmed && o.id !== currentOrderId)
    .reduce((s, o) => s + effectiveQtyKg(o), 0);
  const assignedKg = orders
    .filter((o) => o.assignedTruck === truckId && !o.loadConfirmed && o.id !== currentOrderId)
    .reduce((s, o) => s + effectiveQtyKg(o), 0);

  const cap          = capacityKg > 0 ? capacityKg : 1;
  const confirmedPct = Math.min(100, (confirmedKg / cap) * 100);
  const assignedPct  = Math.min(100 - confirmedPct, (assignedKg / cap) * 100);
  const previewPct   = Math.min(100 - confirmedPct - assignedPct, (previewQtyKg / cap) * 100);
  const totalUsed    = confirmedKg + assignedKg + previewQtyKg;
  const totalPct     = Math.min(100, Math.round((totalUsed / cap) * 100));
  const isOver       = totalUsed > cap;

  return (
    <div className="space-y-1.5">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-teal-500 transition-all" style={{ width: `${confirmedPct}%` }} title={`Confirmed: ${confirmedKg} kg`} />
        <div className="h-full bg-teal-200 transition-all" style={{ width: `${assignedPct}%` }} title={`Assigned: ${assignedKg} kg`} />
        {previewQtyKg > 0 && (
          <div className={`h-full transition-all ${isOver ? "bg-red-400" : "bg-amber-400"}`} style={{ width: `${previewPct}%` }} />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px]">
        {confirmedKg > 0 && <span className="flex items-center gap-1 text-teal-700"><span className="inline-block h-1.5 w-1.5 rounded-full bg-teal-500" />{confirmedKg} kg confirmed</span>}
        {assignedKg  > 0 && <span className="flex items-center gap-1 text-teal-500"><span className="inline-block h-1.5 w-1.5 rounded-full bg-teal-200" />{assignedKg} kg assigned</span>}
        {previewQtyKg > 0 && (
          <span className={`flex items-center gap-1 ${isOver ? "text-red-600 font-semibold" : "text-amber-600"}`}>
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${isOver ? "bg-red-400" : "bg-amber-400"}`} />
            +{previewQtyKg} kg (this order)
          </span>
        )}
        <span className="ml-auto text-slate-400">
          {totalUsed} / {capacityKg} kg · {totalPct}%
          {isOver && <span className="ml-1 font-bold text-red-600">OVERLOAD</span>}
        </span>
      </div>
    </div>
  );
}

// ── Simple load bar (fleet tab) ───────────────────────────────────────────────
function LoadBar({ used, capacity }: { used: number; capacity: number }) {
  const pct   = capacity > 0 ? Math.min(100, Math.round((used / capacity) * 100)) : 0;
  const color = pct >= 90 ? "bg-red-500" : pct >= 65 ? "bg-amber-400" : "bg-teal-500";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] text-slate-500">
        <span>{used} kg used</span>
        <span className={`font-semibold ${pct >= 90 ? "text-red-600" : pct >= 65 ? "text-amber-600" : "text-teal-600"}`}>{pct}%</span>
        <span>{capacity} kg cap</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`text-[10px] font-medium ${pct >= 90 ? "text-red-500" : pct >= 65 ? "text-amber-600" : "text-slate-400"}`}>
        {capacity - used} kg remaining
      </p>
    </div>
  );
}

// ── Step badge ────────────────────────────────────────────────────────────────
function StepBadge({ step }: { step: 0 | 1 | 2 }) {
  const steps = ["Assign Truck", "Confirm Load", "Dispatch"];
  return (
    <div className="flex items-center gap-1">
      {steps.map((label, i) => {
        const done    = i < step;
        const current = i === step;
        return (
          <div key={label} className="flex items-center gap-1">
            <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${
              done ? "bg-teal-500 text-white" : current ? "bg-teal-600 text-white ring-2 ring-teal-200" : "border border-slate-200 bg-white text-slate-400"
            }`}>
              {done ? "✓" : i + 1}
            </div>
            <span className={`text-[10px] font-medium ${done ? "text-teal-600" : current ? "text-teal-700 font-semibold" : "text-slate-300"}`}>
              {label}
            </span>
            {i < steps.length - 1 && (
              <ChevronRight size={10} className={i < step ? "text-teal-400" : "text-slate-200"} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function DispatchAndFleetPage() {
  const [tab, setTab]       = useState<"dispatch" | "fleet" | "pending">("dispatch");
  const [orders, setOrders] = useState<OrderDispatch[]>([]);
  const [trucks, setTrucks] = useState<DbTruck[]>([]);
  const [loading, setLoading]       = useState(true);
  const [acting, setActing]         = useState<string | null>(null);
  const [changingStatus, setChangingStatus] = useState<string | null>(null);
  const [donePage, setDonePage]     = useState(1);
  const DONE_PAGE_SIZE              = 10;
  const [showAddTruck, setShowAddTruck]   = useState(false);
  const [showInvite,   setShowInvite]     = useState(false);
  const [pendingTrucks, setPendingTrucks] = useState<PendingTruck[]>([]);
  const [expanded,     setExpanded]       = useState<string | null>(null);
  const [gateOpen,     setGateOpen]       = useState<Record<string, boolean>>({});

  const reload = useCallback(async () => {
    const [orderRows, truckRows, pendingRows] = await Promise.all([
      api.get<OrderDispatch[]>("/api/flow/dispatch/orders"),
      api.get<DbTruck[]>("/api/flow/trucks"),
      api.get<PendingTruck[]>("/api/flow/trucks/registrations?status=ALL"),
    ]);
    setOrders(orderRows);
    setTrucks(truckRows);
    setPendingTrucks(pendingRows);
  }, []);

  useEffect(() => {
    void reload().finally(() => setLoading(false));
    const id = setInterval(() => {
      void reload();
    }, 5000);
    return () => clearInterval(id);
  }, [reload]);

  // ── Dispatch actions ──────────────────────────────────────────────────────
  async function doAction(orderId: string, payload: Record<string, unknown>, successMsg: string, desc?: string) {
    setActing(orderId);
    try {
      await api.patch(`/api/flow/dispatch/orders/${orderId}`, payload);
      await reload();
      toast.success(successMsg, { description: desc });
    } catch (err: unknown) {
      toast.error("Action failed", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setActing(null);
    }
  }

  // ── Truck status change ───────────────────────────────────────────────────
  async function changeStatus(truckId: string, newStatus: string) {
    setChangingStatus(truckId);
    try {
      await api.patch(`/api/flow/trucks/${truckId}`, { status: newStatus });
      await reload();
      const cfg = getTruckStatusCfg(newStatus);
      toast.success(`${truckId} → ${cfg.label}`);
    } catch {
      toast.error("Could not update truck status.");
    } finally {
      setChangingStatus(null);
    }
  }

  // ── Derived lists ─────────────────────────────────────────────────────────
  const availableTrucks = trucks.filter((t) => isAvailable(t.status));
  const pending         = orders.filter((o) => !o.dispatched);
  const done            = orders.filter((o) => o.dispatched);

  const statusCounts = {
    available:   trucks.filter((t) => isAvailable(t.status)).length,
    loading:     trucks.filter((t) => t.status === "LOADING"     || t.status.toLowerCase() === "loading").length,
    inTransit:   trucks.filter((t) => t.status === "IN_TRANSIT"  || t.status.toLowerCase() === "in transit").length,
    maintenance: trucks.filter((t) => t.status === "MAINTENANCE" || t.status.toLowerCase() === "maintenance").length,
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-100" />
        <div className="flex gap-1"><div className="h-10 w-28 animate-pulse rounded-xl bg-slate-100" /><div className="h-10 w-28 animate-pulse rounded-xl bg-slate-100" /></div>
        <div className="grid gap-3 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}</div>
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />)}
      </div>
    );
  }

  return (
    <>
      {showAddTruck && (
        <AddTruckModal
          onClose={() => setShowAddTruck(false)}
          onSuccess={() => void reload()}
        />
      )}
      {showInvite && (
        <SendInviteModal onClose={() => setShowInvite(false)} />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-900">Transport Management</h1>
            <p className="text-slate-500">Manage truck assignments, confirm loads, dispatch orders, and control fleet status.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition"
            >
              <Send size={13} /> Send Invite
            </button>
            <button
              type="button"
              onClick={() => { setShowAddTruck(true); setTab("fleet"); }}
              className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 transition"
            >
              <Plus size={14} /> Add Truck
            </button>
            <button
              type="button"
              onClick={() => void reload()}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200">
          {([
            { key: "dispatch", label: "Dispatch",             badge: pending.length > 0 ? String(pending.length) : null },
            { key: "fleet",    label: "Truck Fleet",          badge: String(trucks.length) },
            { key: "pending",  label: "Registrations", badge: pendingTrucks.filter(t => t.registrationStatus === "PENDING").length > 0 ? String(pendingTrucks.filter(t => t.registrationStatus === "PENDING").length) : null },
          ] as const).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`relative flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-colors ${
                tab === t.key
                  ? "text-emerald-700 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-emerald-500"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {t.label}
              {t.badge && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  tab === t.key ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* Tab: Dispatch                                                     */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === "dispatch" && (
          <>
            {/* Stats */}
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                { label: "Pending dispatch",  value: pending.filter((o) => !o.loadConfirmed).length, color: "text-orange-600", bg: "bg-orange-50" },
                { label: "Load confirmed",    value: pending.filter((o) => o.loadConfirmed).length,  color: "text-amber-700",  bg: "bg-amber-50"  },
                { label: "Dispatched",        value: done.length,                                     color: "text-teal-700",   bg: "bg-teal-50"   },
                { label: "Available trucks",  value: availableTrucks.length,                          color: "text-slate-700",  bg: "bg-slate-100" },
              ].map((s) => (
                <div key={s.label} className={`rounded-xl border border-slate-100 px-4 py-3 ${s.bg}`}>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="mt-0.5 text-xs font-medium text-slate-600">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Fleet capacity overview strip */}
            {trucks.length > 0 && (
              <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Fleet Capacity Overview</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {trucks.map((t) => {
                    const confirmedKg = orders.filter((o) => o.assignedTruck === t.id && o.loadConfirmed).reduce((s, o) => s + effectiveQtyKg(o), 0);
                    const assignedKg  = orders.filter((o) => o.assignedTruck === t.id && !o.loadConfirmed).reduce((s, o) => s + effectiveQtyKg(o), 0);
                    const totalKg     = confirmedKg + assignedKg;
                    const cap         = t.capacityKg > 0 ? t.capacityKg : 1;
                    const confirmedPct = Math.min(100, (confirmedKg / cap) * 100);
                    const assignedPct  = Math.min(100 - confirmedPct, (assignedKg / cap) * 100);
                    const pct          = Math.min(100, Math.round((totalKg / cap) * 100));
                    const cfg          = getTruckStatusCfg(t.status);
                    return (
                      <div key={t.id} className={`rounded-xl border px-3 py-2.5 space-y-1.5 ${isAvailable(t.status) ? "border-slate-100 bg-slate-50" : "border-blue-100 bg-blue-50"}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-800">{t.id}</span>
                            <span className="ml-1.5 text-[10px] text-slate-400">{t.reg}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                            <span className={`text-[10px] font-semibold ${pct >= 90 ? "text-red-600" : pct >= 65 ? "text-amber-600" : "text-teal-600"}`}>{pct}%</span>
                          </div>
                        </div>
                        <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full bg-teal-500 transition-all" style={{ width: `${confirmedPct}%` }} />
                          <div className="h-full bg-teal-200 transition-all" style={{ width: `${assignedPct}%` }} />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>{t.driverName ?? "No driver"}</span>
                          <span>{totalKg} / {t.capacityKg} kg</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pending dispatch orders */}
            {pending.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Awaiting Dispatch ({pending.length})
                </h2>
                {pending.map((o) => {
                  const step: 0 | 1 | 2     = o.loadConfirmed ? 2 : o.assignedTruck ? 1 : 0;
                  const assignedTruckData    = o.assignedTruck ? trucks.find((t) => t.id === o.assignedTruck) : null;
                  const isActing             = acting === o.id;
                  const gateReady            = gateReadyForDispatch(o.preDispatch);
                  const qrReady              = (o.packetQr?.total ?? 0) > 0;
                  const myActionNeeded       = roleActionNeeded(o.preDispatch, "qc_leader");
                  // Auto-open when action needed; respect manual toggle otherwise
                  const isGateOpen           = o.id in gateOpen ? gateOpen[o.id] : myActionNeeded;

                  return (
                    <div
                      key={o.id}
                      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
                        o.loadConfirmed ? "border-amber-200" : o.assignedTruck ? "border-sky-200" : "border-teal-100"
                      }`}
                    >
                      <div className={`px-5 py-3 ${o.loadConfirmed ? "bg-amber-50" : o.assignedTruck ? "bg-sky-50" : "bg-teal-50"}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[11px] text-slate-400">{o.id}</span>
                            <span className="font-mono text-[11px] text-slate-400">{o.lotId}</span>
                          </div>
                          <StepBadge step={step} />
                        </div>
                      </div>

                      <div className="space-y-4 px-5 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-bold text-slate-900">{o.product}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{effectiveQtyLabel(o)} · Seller: <span className="font-medium">{o.seller}</span></p>
                          </div>
                          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs space-y-0.5 min-w-[180px]">
                            <p className="font-semibold text-slate-800">{o.buyer}</p>
                            <p className="text-slate-400">Placed: {new Date(o.confirmedAt).toLocaleDateString("en-BD", { month: "short", day: "numeric" })}</p>
                            <p className="font-semibold text-emerald-700">{o.totalAmount}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-xs text-slate-700">
                          <MapPin size={13} className="text-teal-500 flex-shrink-0" />
                          <span>Delivery: <span className="font-semibold text-slate-900">{o.deliveryPoint}</span></span>
                        </div>

                        {/* Pre-dispatch gate — collapsible */}
                        <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                          {/* Gate header / toggle */}
                          <button
                            type="button"
                            onClick={() => setGateOpen((p) => ({ ...p, [o.id]: !isGateOpen }))}
                            className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-slate-100 transition"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Pre-Dispatch Gate</span>
                              {gateReady ? (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">✓ Complete</span>
                              ) : (
                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 animate-pulse">Action Required</span>
                              )}
                            </div>
                            {isGateOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                          </button>

                          {/* Gate body */}
                          {isGateOpen && (
                            <div className="border-t border-slate-200 p-4">
                              <PreDispatchGate
                                orderCode={o.id}
                                orderedQty={effectiveQtyLabel(o)}
                                role="qc_leader"
                                initialData={o.preDispatch}
                                onUpdate={(updated) =>
                                  setOrders((prev) =>
                                    prev.map((ord) => (ord.id === o.id ? { ...ord, preDispatch: updated } : ord))
                                  )
                                }
                              />

                              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs">
                                <p className="text-violet-700">
                                  Packet QR: <span className="font-semibold">{o.packetQr?.total ?? 0}</span> generated,{" "}
                                  scanned <span className="font-semibold">{o.packetQr?.scanned ?? 0}</span>
                                </p>
                                <a
                                  href={`/hub-shipment/${o.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-md border border-violet-300 bg-white px-2.5 py-1 font-semibold text-violet-700 hover:bg-violet-100"
                                >
                                  Generate / Print Packet QR
                                </a>
                              </div>
                              {(!gateReady || !qrReady) && (
                                <p className="mt-2 text-[11px] text-amber-700">
                                  Complete all 4 gate steps and generate packet QR before assigning truck.
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-end gap-3 border-t border-slate-50 pt-3">
                          {/* Step 1 */}
                          <div className="flex-1 min-w-[180px]">
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Step 1 — Assign Truck</label>
                            {o.loadConfirmed ? (
                              <div className="flex items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                                <Truck size={13} className="text-slate-400" />
                                <span className="font-medium">{o.assignedTruck}</span>
                                {assignedTruckData && <span className="text-slate-400">— {assignedTruckData.reg}</span>}
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <select
                                  value={o.assignedTruck ?? ""}
                                  onChange={(e) => void doAction(o.id, { assignedTruck: e.target.value || null }, "Truck assigned")}
                                  disabled={isActing || !gateReady || !qrReady}
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs focus:border-teal-400 focus:outline-none disabled:opacity-50"
                                >
                                  <option value="">— Select truck —</option>
                                  {trucks.map((t) => {
                                    const loadedKg = orders.filter((ord) => ord.assignedTruck === t.id && ord.loadConfirmed).reduce((s, ord) => s + effectiveQtyKg(ord), 0);
                                    const free     = t.capacityKg - loadedKg;
                                    const canFit   = free >= effectiveQtyKg(o);
                                    return (
                                      <option key={t.id} value={t.id} disabled={!canFit || !isAvailable(t.status)}>
                                        {t.id} ({t.reg}) · {t.type} · {free} kg free
                                        {!canFit ? " — FULL" : ""}
                                        {!isAvailable(t.status) ? ` [${getTruckStatusCfg(t.status).label}]` : ""}
                                      </option>
                                    );
                                  })}
                                </select>
                                {assignedTruckData && (
                                  <TruckCapacityBar
                                    truckId={o.assignedTruck!}
                                    capacityKg={assignedTruckData.capacityKg}
                                    orders={orders}
                                    previewQtyKg={effectiveQtyKg(o)}
                                    currentOrderId={o.id}
                                  />
                                )}
                              </div>
                            )}
                          </div>

                          {/* Step 2 */}
                          <div>
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Step 2 — Confirm Load</label>
                            {o.loadConfirmed ? (
                              <span className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-700">
                                <CheckCircle2 size={13} /> Load Confirmed
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={!o.assignedTruck || isActing}
                                onClick={() => void doAction(o.id, { loadConfirmed: true }, "Load confirmed!", `Order ${o.id} loaded onto ${o.assignedTruck}`)}
                                className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-amber-600 transition disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Package size={13} />
                                {isActing ? "Working…" : "Confirm Load"}
                              </button>
                            )}
                          </div>

                          {/* Step 3 */}
                          <div>
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Step 3 — Dispatch</label>
                            {o.loadConfirmed ? (
                              <button
                                type="button"
                                disabled={isActing}
                                onClick={() => void doAction(o.id, { dispatched: true }, "Truck dispatched!", `${o.assignedTruck} en route to ${o.deliveryPoint}`)}
                                className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-teal-700 transition disabled:opacity-50"
                              >
                                <Truck size={13} />
                                {isActing ? "Dispatching…" : "Dispatch to Delivery Point"}
                              </button>
                            ) : (
                              <span className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-400">
                                <AlertTriangle size={12} /> Load first
                              </span>
                            )}
                          </div>
                        </div>

                        {o.loadConfirmed && assignedTruckData && (
                          <div className="rounded-xl bg-slate-50 px-4 py-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{assignedTruckData.id} — Total Load</p>
                              {assignedTruckData.driverName && (
                                <p className="text-[11px] text-slate-500">
                                  <span className="font-semibold">{assignedTruckData.driverName}</span>
                                  {assignedTruckData.driverPhone && <span className="text-slate-400"> · {assignedTruckData.driverPhone}</span>}
                                </p>
                              )}
                            </div>
                            <TruckCapacityBar truckId={o.assignedTruck!} capacityKg={assignedTruckData.capacityKg} orders={orders} currentOrderId={o.id} />
                            {orders.filter((x) => x.assignedTruck === o.assignedTruck && x.loadConfirmed).length > 0 && (
                              <div className="mt-1 space-y-1">
                                {orders.filter((x) => x.assignedTruck === o.assignedTruck && x.loadConfirmed).map((x) => (
                                  <div key={x.id} className="flex items-center justify-between text-[11px]">
                                    <span className={`font-medium ${x.id === o.id ? "text-teal-700" : "text-slate-600"}`}>{x.product}</span>
                                    <span className="text-slate-400">{effectiveQtyLabel(x)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {pending.length === 0 && done.length === 0 && (
              <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center">
                <Truck size={32} className="mx-auto text-slate-300 mb-3" />
                <p className="font-semibold text-slate-500">No orders awaiting dispatch</p>
                <p className="mt-1 text-sm text-slate-400">Seller-accepted orders will appear here ready for truck assignment.</p>
              </div>
            )}

            {done.length > 0 && (() => {
              const totalPages  = Math.ceil(done.length / DONE_PAGE_SIZE);
              const safePage    = Math.min(donePage, totalPages);
              const pageSlice   = done.slice((safePage - 1) * DONE_PAGE_SIZE, safePage * DONE_PAGE_SIZE);
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                      Dispatched ({done.length})
                    </h2>
                    {totalPages > 1 && (
                      <span className="text-xs text-slate-400">
                        Showing {(safePage - 1) * DONE_PAGE_SIZE + 1}–{Math.min(safePage * DONE_PAGE_SIZE, done.length)} of {done.length}
                      </span>
                    )}
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <table className="w-full min-w-[600px] text-sm">
                      <thead className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        <tr>{["Order", "Product", "Qty", "Buyer", "Truck", "Driver", "Delivery Point", "Total"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left">{h}</th>
                        ))}</tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {pageSlice.map((o) => {
                          const truckData = o.assignedTruck ? trucks.find((t) => t.id === o.assignedTruck) : null;
                          return (
                            <tr key={o.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-mono text-xs text-slate-400">{o.id}</td>
                              <td className="px-4 py-3 font-medium text-slate-900">{o.product}</td>
                              <td className="px-4 py-3 text-xs text-slate-500">{effectiveQtyLabel(o)}</td>
                              <td className="px-4 py-3 text-xs text-slate-600">{o.buyer}</td>
                              <td className="px-4 py-3"><span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700">{o.assignedTruck ?? "—"}</span></td>
                              <td className="px-4 py-3 text-xs text-slate-500">{truckData?.driverName ?? "—"}</td>
                              <td className="px-4 py-3 text-xs font-medium text-teal-700">{o.deliveryPoint}</td>
                              <td className="px-4 py-3 text-xs font-semibold text-emerald-700">{o.totalAmount}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-1 pt-1">
                      <button type="button" disabled={safePage === 1} onClick={() => setDonePage(1)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-30">«</button>
                      <button type="button" disabled={safePage === 1} onClick={() => setDonePage((p) => p - 1)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-30">‹ Prev</button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        const near = Math.abs(page - safePage) <= 1 || page === 1 || page === totalPages;
                        if (!near) {
                          if (page === safePage - 2 || page === safePage + 2)
                            return <span key={page} className="px-1 text-xs text-slate-300">…</span>;
                          return null;
                        }
                        return (
                          <button key={page} type="button" onClick={() => setDonePage(page)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                              page === safePage ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                            }`}>{page}</button>
                        );
                      })}
                      <button type="button" disabled={safePage === totalPages} onClick={() => setDonePage((p) => p + 1)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-30">Next ›</button>
                      <button type="button" disabled={safePage === totalPages} onClick={() => setDonePage(totalPages)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-30">»</button>
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* Tab: Pending Registrations                                        */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === "pending" && (() => {
          const awaitingTrucks = pendingTrucks.filter((t) => t.registrationStatus === "PENDING");
          const rejectedTrucks = pendingTrucks.filter((t) => t.registrationStatus === "REJECTED");

          const renderTruckCard = (t: PendingTruck, isRejected: boolean) => {
            const isOpen = expanded === t.id;
            const d = t.driver;
            const borderColor = isRejected ? "border-red-200" : "border-amber-200";
            return (
              <div key={t.id} className={`overflow-hidden rounded-2xl border ${borderColor} bg-white shadow-sm`}>
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="flex items-center gap-3">
                    {t.photoUrl ? (
                      <img src={t.photoUrl} alt={t.id} className="h-14 w-20 flex-shrink-0 rounded-xl border border-slate-100 object-cover" />
                    ) : (
                      <div className="flex h-14 w-20 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100">
                        <Truck size={22} className="text-slate-400" />
                      </div>
                    )}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900">{t.id}</span>
                        <span className="font-mono text-sm text-slate-400">{t.reg}</span>
                        {isRejected ? (
                          <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-700">
                            Rejected
                          </span>
                        ) : (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                            Pending Approval
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {t.type} · {t.capacityKg.toLocaleString()} kg
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-3 text-[11px]">
                        {t.hubName && (
                          <span className="flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-blue-700 font-medium">
                            <MapPin size={9} /> {t.hubName}
                          </span>
                        )}
                        {t.submittedByName && (
                          <span className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-600 font-medium">
                            <User size={9} /> Submitted by {t.submittedByName}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock size={9} /> {new Date(t.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      {isRejected && t.registrationNote && (
                        <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700 max-w-sm">
                          <XCircle size={11} className="mt-0.5 shrink-0" />
                          <span><span className="font-semibold">Reason:</span> {t.registrationNote}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : t.id)}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                  >
                    {isOpen ? <><ChevronUp size={13} /> Hide Details</> : <><ChevronDown size={13} /> View Details</>}
                  </button>
                </div>

                {/* Expanded details */}
                {isOpen && d && (
                  <div className="border-t border-slate-100 px-5 py-4 space-y-5 bg-slate-50/50">
                    {/* Driver info */}
                    <div>
                      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Driver Information</p>
                      <div className="flex flex-wrap gap-4 items-start">
                        {d.photoUrl && (
                          <div>
                            <p className="mb-1 text-[10px] font-semibold text-slate-400">Photo</p>
                            <img src={d.photoUrl} alt="Driver" className="h-20 w-20 rounded-xl object-cover border border-slate-200" />
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs flex-1">
                          <div><span className="font-semibold text-slate-500">Name:</span> <span className="text-slate-800">{d.name}</span></div>
                          <div><span className="font-semibold text-slate-500">Phone:</span> <span className="text-slate-800">{d.phone}</span></div>
                          {d.address && <div className="col-span-2"><span className="font-semibold text-slate-500">Address:</span> <span className="text-slate-800">{d.address}</span></div>}
                          <div><span className="font-semibold text-slate-500">NID:</span> <span className="text-slate-800">{d.nid}</span></div>
                          <div><span className="font-semibold text-slate-500">License:</span> <span className="text-slate-800">{d.license}</span></div>
                          <div><span className="font-semibold text-slate-500">License Expiry:</span> <span className="text-slate-800">{d.licenseExpiry}</span></div>
                        </div>
                      </div>
                      {(d.nidPhotoUrl || d.licensePhotoUrl) && (
                        <div className="mt-3 flex flex-wrap gap-3">
                          {d.nidPhotoUrl && (
                            <div>
                              <p className="mb-1 text-[10px] font-semibold text-slate-400">NID Photo</p>
                              <img src={d.nidPhotoUrl} alt="NID" className="h-24 w-36 rounded-xl object-cover border border-slate-200" />
                            </div>
                          )}
                          {d.licensePhotoUrl && (
                            <div>
                              <p className="mb-1 text-[10px] font-semibold text-slate-400">License Photo</p>
                              <img src={d.licensePhotoUrl} alt="License" className="h-24 w-36 rounded-xl object-cover border border-slate-200" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Emergency contact */}
                    {d.emergencyContactName && (
                      <div>
                        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Emergency Contact</p>
                        <div className="flex flex-wrap gap-4 items-start">
                          {d.emergencyContactPhotoUrl && (
                            <div>
                              <p className="mb-1 text-[10px] font-semibold text-slate-400">Photo</p>
                              <img src={d.emergencyContactPhotoUrl} alt="Contact" className="h-20 w-20 rounded-xl object-cover border border-slate-200" />
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs flex-1">
                            <div><span className="font-semibold text-slate-500">Name:</span> <span className="text-slate-800">{d.emergencyContactName}</span></div>
                            {d.emergencyContactRelation && <div><span className="font-semibold text-slate-500">Relation:</span> <span className="text-slate-800">{d.emergencyContactRelation}</span></div>}
                            {d.emergencyContactPhone && <div><span className="font-semibold text-slate-500">Phone:</span> <span className="text-slate-800">{d.emergencyContactPhone}</span></div>}
                            {d.emergencyContactAddress && <div className="col-span-2"><span className="font-semibold text-slate-500">Address:</span> <span className="text-slate-800">{d.emergencyContactAddress}</span></div>}
                          </div>
                        </div>
                        {d.emergencyContactNidPhotoUrl && (
                          <div className="mt-3">
                            <p className="mb-1 text-[10px] font-semibold text-slate-400">NID Photo</p>
                            <img src={d.emergencyContactNidPhotoUrl} alt="Contact NID" className="h-24 w-36 rounded-xl object-cover border border-slate-200" />
                          </div>
                        )}
                      </div>
                    )}

                    {isRejected ? (
                      <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">
                        <XCircle size={13} />
                        This registration was rejected by the hub manager.
                        {t.registrationNote && <span className="ml-1 font-medium">Reason: {t.registrationNote}</span>}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                        <Clock size={13} />
                        Waiting for hub manager to review and approve this registration.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          };

          return (
            <div className="space-y-8">
              {/* Awaiting Approval section */}
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-700">Awaiting Approval</h3>
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    {awaitingTrucks.length}
                  </span>
                </div>
                {awaitingTrucks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
                    <CheckCircle2 size={28} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-medium text-slate-500">No pending registrations</p>
                    <p className="mt-0.5 text-xs text-slate-400">All submitted trucks have been reviewed by the hub manager.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-400">These trucks are awaiting approval by the hub manager.</p>
                    {awaitingTrucks.map((t) => renderTruckCard(t, false))}
                  </div>
                )}
              </div>

              {/* Rejected History section */}
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-700">Rejected — History</h3>
                  <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    {rejectedTrucks.length}
                  </span>
                </div>
                {rejectedTrucks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
                    <p className="text-sm text-slate-400">No rejected registrations.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-400">These registrations were rejected by the hub manager. Rejection reasons are shown below.</p>
                    {rejectedTrucks.map((t) => renderTruckCard(t, true))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* Tab: Truck Fleet                                                  */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === "fleet" && (
          <>
            {/* Stats */}
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                { label: "Available",   count: statusCounts.available,   color: "text-emerald-700", bg: "bg-emerald-50" },
                { label: "Loading",     count: statusCounts.loading,     color: "text-amber-700",   bg: "bg-amber-50"   },
                { label: "In Transit",  count: statusCounts.inTransit,   color: "text-blue-700",    bg: "bg-blue-50"    },
                { label: "Maintenance", count: statusCounts.maintenance, color: "text-red-600",     bg: "bg-red-50"     },
              ].map((s) => (
                <div key={s.label} className={`rounded-xl border border-slate-100 px-4 py-3 ${s.bg}`}>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                  <p className="mt-0.5 text-xs font-medium text-slate-600">{s.label}</p>
                </div>
              ))}
            </div>

            {trucks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
                <Truck size={36} className="mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500 font-medium">No trucks in fleet yet</p>
                <p className="mt-1 text-sm text-slate-400 mb-4">Add a truck or send an invite link to a truck owner.</p>
                <div className="flex items-center justify-center gap-3">
                  <button type="button" onClick={() => setShowAddTruck(true)}
                    className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 transition">
                    <Plus size={15} /> Add Truck
                  </button>
                  <button type="button" onClick={() => setShowInvite(true)}
                    className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-5 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-100 transition">
                    <Send size={15} /> Send Invite
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {trucks.map((t) => {
                  const truckOrders   = orders.filter((o) => o.assignedTruck === t.id);
                  const loadedOrders  = truckOrders.filter((o) => o.loadConfirmed);
                  const usedKgVal     = loadedOrders.reduce((s, o) => s + effectiveQtyKg(o), 0);
                  const cfg           = getTruckStatusCfg(t.status);
                  const isChanging    = changingStatus === t.id;

                  return (
                    <div
                      key={t.id}
                      className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
                        t.status === "IN_TRANSIT"  || t.status.toLowerCase() === "in transit"  ? "border-blue-200"   :
                        t.status === "LOADING"     || t.status.toLowerCase() === "loading"     ? "border-amber-200"  :
                        t.status === "MAINTENANCE" || t.status.toLowerCase() === "maintenance" ? "border-red-200"    : "border-slate-100"
                      }`}
                    >
                      {/* Card header */}
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                        <div className="flex items-start gap-3">
                          {/* Truck photo */}
                          {t.photoUrl ? (
                            <img src={t.photoUrl} alt={t.id} className="h-14 w-20 rounded-xl object-cover border border-slate-100 flex-shrink-0" />
                          ) : (
                            <div className="flex h-14 w-20 items-center justify-center rounded-xl bg-slate-100 flex-shrink-0">
                              <Truck size={22} className="text-slate-400" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900">{t.id}</span>
                              <span className="text-sm text-slate-400 font-mono">{t.reg}</span>
                              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{t.type} · {t.capacityKg.toLocaleString()} kg capacity</p>
                          </div>
                        </div>

                        {/* Driver info */}
                        {t.driverName ? (
                          <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                            {t.driverPhotoUrl ? (
                              <img src={t.driverPhotoUrl} alt={t.driverName} className="h-8 w-8 rounded-full object-cover border border-slate-200" />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200">
                                <User size={13} className="text-slate-400" />
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-slate-700">{t.driverName}</div>
                              {t.driverPhone && (
                                <div className="flex items-center gap-1 text-slate-400">
                                  <Phone size={10} /> {t.driverPhone}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No driver assigned</span>
                        )}
                      </div>

                      {/* Card body */}
                      <div className="space-y-4 px-5 py-4">
                        {/* ── Status change ── */}
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 space-y-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Change Status</p>
                          <div className="flex flex-wrap gap-2">
                            {TRUCK_STATUSES.map((s) => {
                              const isActive = cfg.value === s.value || t.status.toLowerCase() === s.label.toLowerCase();
                              return (
                                <button
                                  key={s.value}
                                  type="button"
                                  disabled={isActive || isChanging}
                                  onClick={() => changeStatus(t.id, s.value)}
                                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                    isActive
                                      ? `${s.color} cursor-default`
                                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                                  }`}
                                >
                                  {isActive && "✓ "}{s.label}
                                </button>
                              );
                            })}
                            {isChanging && <span className="self-center text-xs text-slate-400 italic">Saving…</span>}
                          </div>
                        </div>

                        {/* Load bar */}
                        {t.capacityKg > 0 && (
                          <div>
                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Load Progress</p>
                            <LoadBar used={usedKgVal} capacity={t.capacityKg} />
                          </div>
                        )}

                        {/* Active orders on truck */}
                        {truckOrders.length > 0 && (
                          <div>
                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Active Orders ({truckOrders.length})</p>
                            <div className="space-y-2">
                              {truckOrders.map((o) => (
                                <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2.5 text-xs">
                                  <div className="flex items-center gap-2">
                                    <Package size={12} className="text-slate-400 flex-shrink-0" />
                                    <span className="font-medium text-slate-800">{o.product}</span>
                                    <span className="text-slate-400">{effectiveQtyLabel(o)}</span>
                                    <span className="font-mono text-[10px] text-slate-300">{o.id}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-500">{o.buyer}</span>
                                    {o.dispatched
                                      ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Dispatched</span>
                                      : o.loadConfirmed
                                      ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Loaded</span>
                                      : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Assigned</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {truckOrders.length === 0 && (
                          <p className="text-xs text-slate-400 italic">No orders assigned to this truck.</p>
                        )}

                        {t.currentDestination && (
                          <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-700">
                            <MapPin size={12} />
                            <span className="font-medium">En route to:</span>
                            <span>{t.currentDestination}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
