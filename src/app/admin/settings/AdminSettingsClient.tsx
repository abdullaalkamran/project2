"use client";

import { useEffect, useState } from "react";

type Settings = {
  buyerFee: number;
  sellerFee: number;
  minIncrement: number;
  payoutDays: number;
  manualPayout: boolean;
  kyc: boolean;
  emailNotif: boolean;
  smsNotif: boolean;
  maintenanceMode: boolean;
};

const DEFAULT: Settings = {
  buyerFee: 2.5,
  sellerFee: 5,
  minIncrement: 100,
  payoutDays: 7,
  manualPayout: false,
  kyc: true,
  emailNotif: true,
  smsNotif: true,
  maintenanceMode: false,
};

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors overflow-hidden ${checked ? "bg-indigo-600" : "bg-slate-200"}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-5">
      <div>
        <p className="font-semibold text-slate-900">{title}</p>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      {children}
    </div>
  );
}

type SaveState = "idle" | "saving" | "saved" | "error";

function SaveButton({ state, onClick }: { state: SaveState; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === "saving"}
      className={`rounded-xl px-5 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
        state === "saved" ? "bg-emerald-600" : state === "error" ? "bg-red-600" : "bg-indigo-600 hover:bg-indigo-700"
      }`}
    >
      {state === "saving" ? "Saving…" : state === "saved" ? "✓ Saved" : state === "error" ? "✗ Error" : "Save"}
    </button>
  );
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [feeState, setFeeState] = useState<SaveState>("idle");
  const [auctionState, setAuctionState] = useState<SaveState>("idle");
  const [payoutState, setPayoutState] = useState<SaveState>("idle");
  const [kycState, setKycState] = useState<SaveState>("idle");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => { setSettings({ ...DEFAULT, ...d }); setLoading(false); });
  }, []);

  function upd<K extends keyof Settings>(key: K, val: Settings[K]) {
    setSettings((prev) => ({ ...prev, [key]: val }));
  }

  async function save(patch: Partial<Settings>, setState: (s: SaveState) => void) {
    setState("saving");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      setState(res.ok ? "saved" : "error");
    } catch {
      setState("error");
    }
    setTimeout(() => setState("idle"), 2500);
  }

  if (loading) return <p className="text-sm text-slate-400 p-6">Loading settings…</p>;

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Platform Settings</h1>
        <p className="text-slate-500">Configure global platform behaviour, fees, and notifications.</p>
      </div>

      {/* Fees */}
      <Section title="Fee Configuration" description="Rates charged on successful transactions.">
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { label: "Buyer Transaction Fee (%)", key: "buyerFee" as const },
            { label: "Seller Commission (%)",     key: "sellerFee" as const },
          ].map((f) => (
            <div key={f.key}>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{f.label}</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={settings[f.key] as number}
                onChange={(e) => upd(f.key, parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
              />
            </div>
          ))}
        </div>
        <SaveButton
          state={feeState}
          onClick={() => save({ buyerFee: settings.buyerFee, sellerFee: settings.sellerFee }, setFeeState)}
        />
      </Section>

      {/* Auction Rules */}
      <Section title="Auction Rules">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Min Bid Increment (৳)</label>
            <input
              type="number"
              min="0"
              value={settings.minIncrement}
              onChange={(e) => upd("minIncrement", parseInt(e.target.value) || 0)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
            />
          </div>
        </div>
        <SaveButton
          state={auctionState}
          onClick={() => save({ minIncrement: settings.minIncrement }, setAuctionState)}
        />
      </Section>

      {/* Payout */}
      <Section title="Payout Schedule" description="Days after lot close before seller funds are released.">
        <div className="max-w-xs">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Holding Period (days)</label>
          <input
            type="number"
            min="1"
            value={settings.payoutDays}
            onChange={(e) => upd("payoutDays", parseInt(e.target.value) || 1)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
          />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-800">Manual Payout Approval</p>
            <p className="text-xs text-slate-500">Admin must approve each payout before release.</p>
          </div>
          <Toggle checked={settings.manualPayout} onChange={(v) => upd("manualPayout", v)} />
        </div>
        <SaveButton
          state={payoutState}
          onClick={() => save({ payoutDays: settings.payoutDays, manualPayout: settings.manualPayout }, setPayoutState)}
        />
      </Section>

      {/* KYC & Notifications */}
      <Section title="KYC & Notifications">
        <div className="space-y-3">
          {[
            { label: "Require KYC for Sellers",   sub: "Sellers must complete verification before listing lots.", key: "kyc" as const },
            { label: "Email Notifications",        sub: "Send transactional and alert emails to users.",          key: "emailNotif" as const },
            { label: "SMS Notifications",          sub: "Send OTPs and order alerts via SMS.",                    key: "smsNotif" as const },
          ].map((t) => (
            <div key={t.key} className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{t.label}</p>
                <p className="text-xs text-slate-500">{t.sub}</p>
              </div>
              <Toggle checked={settings[t.key] as boolean} onChange={(v) => upd(t.key, v)} />
            </div>
          ))}
        </div>
        <SaveButton
          state={kycState}
          onClick={() => save({ kyc: settings.kyc, emailNotif: settings.emailNotif, smsNotif: settings.smsNotif }, setKycState)}
        />
      </Section>

      {/* Danger Zone */}
      <Section title="Danger Zone">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-red-800">Maintenance Mode</p>
            <p className="text-xs text-red-500">Disables platform for all non-admin users.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !settings.maintenanceMode;
              upd("maintenanceMode", next);
              save({ maintenanceMode: next }, () => {});
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors overflow-hidden ${settings.maintenanceMode ? "bg-red-600" : "bg-slate-200"}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${settings.maintenanceMode ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>
      </Section>
    </div>
  );
}
