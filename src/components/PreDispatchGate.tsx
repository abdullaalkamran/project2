"use client";

import { useState, useRef } from "react";
import api from "@/lib/api";

export type GateData = {
  physicallyReceived: boolean;
  qualityChecked: boolean;
  packetQty: number;
  grossWeightKg: number;
  truckPriceBDT: number;
  hubManagerConfirmed: boolean;
  qcLeadConfirmed: boolean;
};

export type GateRole = "hub_manager" | "qc_leader" | "qc_checker" | string;

type Props = {
  orderCode: string;
  orderedQty: string;
  role: string;
  initialData: GateData;
  onUpdate?: (data: GateData) => void;
};

type FormState = GateData & {
  _packetQty: string;
  _grossWeightKg: string;
  _truckPriceBDT: string;
};

function toForm(d: GateData): FormState {
  return {
    ...d,
    _packetQty: String(d.packetQty),
    _grossWeightKg: String(d.grossWeightKg),
    _truckPriceBDT: String(d.truckPriceBDT),
  };
}

export function step2Done(f: GateData) {
  return f.qualityChecked && f.packetQty > 0 && f.grossWeightKg > 0;
}

export function currentStep(f: GateData): number {
  if (!f.physicallyReceived) return 1;
  if (!step2Done(f)) return 2;
  if (f.truckPriceBDT <= 0) return 3;
  if (!f.qcLeadConfirmed) return 4;
  if (!f.hubManagerConfirmed) return 5;
  return 6;
}

const CAN_STEP: Record<number, string[]> = {
  1: ["hub_manager"],
  2: ["hub_manager", "qc_leader"],
  3: ["qc_leader"],
  4: ["qc_leader"],
  5: ["hub_manager"],
};

export function canRoleAct(role: GateRole, step: number): boolean {
  return (CAN_STEP[step] ?? []).includes(role);
}

export function roleActionNeeded(data: GateData, role: GateRole): boolean {
  const step = currentStep(data);
  return step >= 1 && step <= 5 && canRoleAct(role, step);
}

export function gateReadyForDispatch(data: GateData): boolean {
  return (
    data.physicallyReceived &&
    step2Done(data) &&
    data.truckPriceBDT > 0 &&
    data.qcLeadConfirmed &&
    data.hubManagerConfirmed
  );
}

export default function PreDispatchGate({ orderCode, orderedQty, role, initialData, onUpdate }: Props) {
  const [form, setForm] = useState<FormState>(() => toForm(initialData));
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = currentStep(form);
  const canInteract = (step: number) => canRoleAct(role, step);

  async function save(patch: Partial<FormState>) {
    const merged = { ...form, ...patch };
    setForm(merged);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    try {
      const result = await api.patch<GateData>(`/api/flow/dispatch/orders/${orderCode}/pre-dispatch`, {
        physicallyReceived:  merged.physicallyReceived,
        qualityChecked:      merged.qualityChecked,
        packetQty:           Number(merged._packetQty || 0),
        grossWeightKg:       Number(merged._grossWeightKg || 0),
        truckPriceBDT:       Number(merged._truckPriceBDT || 0),
        hubManagerConfirmed: merged.hubManagerConfirmed,
        qcLeadConfirmed:     merged.qcLeadConfirmed,
      });
      const next = toForm(result);
      setForm(next);
      onUpdate?.(result);
      setFlash("Saved");
      setTimeout(() => setFlash(null), 1500);
    } catch {
      setFlash("Error saving");
      setTimeout(() => setFlash(null), 2500);
    } finally {
      setSaving(false);
    }
  }

  function toggle(key: keyof GateData) {
    const val = !form[key];
    void save({ [key]: val } as Partial<FormState>);
  }

  const allDone = active === 6;

  const steps = [
    {
      n: 1,
      title: "Product Reached Hub",
      desc: "Hub manager confirms physical arrival of the product at hub",
      done: form.physicallyReceived,
    },
    {
      n: 2,
      title: "Weight & Quality Check",
      desc: `Confirm actual weight and quality. Ordered: ${orderedQty}`,
      done: step2Done(form),
    },
    {
      n: 3,
      title: "Truck Price",
      desc: "QC team leader sets the transport cost (BDT)",
      done: form.truckPriceBDT > 0,
    },
    {
      n: 4,
      title: "QC Leader Confirmation",
      desc: "QC team leader reviews and confirms quality, weight, and truck price",
      done: form.qcLeadConfirmed,
    },
    {
      n: 5,
      title: "Manager Final Confirmation",
      desc: "Hub manager gives final approval — unlocks truck assignment",
      done: form.hubManagerConfirmed,
    },
  ];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Pre-Dispatch Gate
        </p>
        <div className="flex items-center gap-2">
          {saving && <span className="text-[10px] text-slate-400">Saving…</span>}
          {flash && !saving && (
            <span className={`text-[10px] font-semibold ${flash === "Saved" ? "text-emerald-600" : "text-red-500"}`}>
              {flash}
            </span>
          )}
          {allDone && (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
              ✓ Gate Complete
            </span>
          )}
        </div>
      </div>

      {/* Step list */}
      <div className="relative space-y-0">
        {steps.map((step, idx) => {
          const isActive  = step.n === active;
          const isDone    = step.done;
          const isLocked  = step.n > active && !isDone;
          const canAct    = canInteract(step.n);
          const unlocked  = step.n <= active || isDone;

          return (
            <div key={step.n} className="flex gap-3">
              {/* Connector column */}
              <div className="flex flex-col items-center">
                {/* Circle */}
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold transition-all ${
                    isDone
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : isActive
                        ? "border-amber-400 bg-amber-50 text-amber-700 ring-2 ring-amber-200 ring-offset-1"
                        : "border-slate-200 bg-white text-slate-300"
                  }`}
                >
                  {isDone ? (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isActive ? (
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                  ) : (
                    step.n
                  )}
                </div>
                {/* Line */}
                {idx < steps.length - 1 && (
                  <div className={`mt-0.5 w-0.5 flex-1 ${isDone ? "bg-emerald-300" : "bg-slate-100"}`}
                    style={{ minHeight: "20px" }}
                  />
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 pb-4 ${isLocked ? "opacity-40" : ""}`}>
                <div className="flex items-center gap-2 mb-0.5">
                  <p className={`text-xs font-semibold ${isDone ? "text-emerald-700" : isActive ? "text-slate-900" : "text-slate-400"}`}>
                    {step.title}
                  </p>
                  {isDone && (
                    <span className="rounded-full bg-emerald-50 px-1.5 py-0 text-[10px] font-semibold text-emerald-600 border border-emerald-200">
                      Done
                    </span>
                  )}
                  {isActive && !isDone && (
                    <span className="rounded-full bg-amber-50 px-1.5 py-0 text-[10px] font-semibold text-amber-600 border border-amber-200">
                      Action needed
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mb-1.5">{step.desc}</p>

                {/* Step inputs — only shown when unlocked */}
                {unlocked && (
                  <>
                    {/* Step 1 */}
                    {step.n === 1 && (
                      <div>
                        {isDone ? (
                          <p className="text-[11px] font-semibold text-emerald-600">
                            ✓ Hub manager confirmed physical arrival
                          </p>
                        ) : canAct ? (
                          <button
                            type="button"
                            onClick={() => toggle("physicallyReceived")}
                            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900 transition"
                          >
                            Mark as Received at Hub
                          </button>
                        ) : (
                          <p className="text-[11px] text-amber-600">Waiting for hub manager to confirm arrival…</p>
                        )}
                      </div>
                    )}

                    {/* Step 2 */}
                    {step.n === 2 && (
                      <div className="space-y-2">
                        <div className="grid gap-2 sm:grid-cols-3">
                          <div>
                            <label className="mb-0.5 block text-[10px] font-medium text-slate-500">Packet Qty</label>
                            <input
                              type="number"
                              min={0}
                              value={form._packetQty}
                              disabled={!canAct}
                              onChange={(e) => setForm((p) => ({ ...p, _packetQty: e.target.value }))}
                              onBlur={() => void save({ packetQty: Number(form._packetQty || 0) })}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-emerald-400 disabled:bg-slate-50 disabled:text-slate-400"
                            />
                          </div>
                          <div>
                            <label className="mb-0.5 block text-[10px] font-medium text-slate-500">
                              Actual Weight (kg)
                              {orderedQty && <span className="ml-1 text-slate-400">· ordered: {orderedQty}</span>}
                            </label>
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={form._grossWeightKg}
                              disabled={!canAct}
                              onChange={(e) => setForm((p) => ({ ...p, _grossWeightKg: e.target.value }))}
                              onBlur={() => void save({ grossWeightKg: Number(form._grossWeightKg || 0) })}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-emerald-400 disabled:bg-slate-50 disabled:text-slate-400"
                            />
                          </div>
                          <div className="flex flex-col justify-end">
                            <label className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer ${canAct ? "border-slate-200 bg-white hover:border-emerald-300" : "border-slate-100 bg-slate-50 cursor-default"}`}>
                              <input
                                type="checkbox"
                                checked={form.qualityChecked}
                                disabled={!canAct}
                                onChange={(e) => void save({ qualityChecked: e.target.checked })}
                                className="accent-emerald-500"
                              />
                              <span className={canAct ? "text-slate-700" : "text-slate-400"}>Quality Checked</span>
                            </label>
                          </div>
                        </div>
                        {form._grossWeightKg && Number(form._grossWeightKg) > 0 && (() => {
                          const ordered = parseFloat(orderedQty);
                          const actual = Number(form._grossWeightKg);
                          if (!isNaN(ordered) && actual < ordered * 0.95) {
                            return (
                              <p className="text-[11px] text-amber-700 font-medium">
                                ⚠ Actual weight ({actual} kg) is less than ordered ({ordered} kg). Manager and QC have adjusted the weight.
                              </p>
                            );
                          }
                          return null;
                        })()}
                        {!canAct && (
                          <p className="text-[11px] text-amber-600">
                            {isDone ? "Weight & quality check complete." : "Waiting for QC team to enter weight & quality check…"}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Step 3 */}
                    {step.n === 3 && (
                      <div>
                        {isDone ? (
                          <p className="text-[11px] font-semibold text-emerald-600">
                            ✓ Transport cost set: BDT {form.truckPriceBDT.toLocaleString()}
                          </p>
                        ) : canAct ? (
                          <div className="flex items-center gap-2">
                            <div>
                              <label className="mb-0.5 block text-[10px] font-medium text-slate-500">Transport Cost (BDT)</label>
                              <input
                                type="number"
                                min={0}
                                value={form._truckPriceBDT}
                                onChange={(e) => setForm((p) => ({ ...p, _truckPriceBDT: e.target.value }))}
                                onBlur={() => void save({ truckPriceBDT: Number(form._truckPriceBDT || 0) })}
                                placeholder="e.g. 5000"
                                className="w-36 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-emerald-400"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => void save({ truckPriceBDT: Number(form._truckPriceBDT || 0) })}
                              disabled={Number(form._truckPriceBDT || 0) <= 0}
                              className="mt-4 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-40 transition"
                            >
                              Set Price
                            </button>
                          </div>
                        ) : (
                          <p className="text-[11px] text-amber-600">Waiting for QC leader to set truck price…</p>
                        )}
                      </div>
                    )}

                    {/* Step 4 — QC leader confirmation */}
                    {step.n === 4 && (
                      <div>
                        {isDone ? (
                          <p className="text-[11px] font-semibold text-emerald-600">
                            ✓ QC leader confirmed quality, weight, and truck price
                          </p>
                        ) : canAct ? (
                          <button
                            type="button"
                            onClick={() => toggle("qcLeadConfirmed")}
                            className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 transition"
                          >
                            Confirm as QC Leader
                          </button>
                        ) : (
                          <p className="text-[11px] text-amber-600">Waiting for QC leader confirmation…</p>
                        )}
                      </div>
                    )}

                    {/* Step 5 — Hub manager final confirmation */}
                    {step.n === 5 && (
                      <div>
                        {isDone ? (
                          <p className="text-[11px] font-semibold text-emerald-600">
                            ✓ Hub manager gave final approval — gate complete
                          </p>
                        ) : canAct ? (
                          <button
                            type="button"
                            onClick={() => toggle("hubManagerConfirmed")}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                          >
                            Give Final Approval
                          </button>
                        ) : (
                          <p className="text-[11px] text-amber-600">Waiting for hub manager final approval…</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
