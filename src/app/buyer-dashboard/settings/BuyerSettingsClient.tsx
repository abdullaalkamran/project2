"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  buyerProfileSchema,
  changePasswordSchema,
  type BuyerProfileFormData,
  type ChangePasswordFormData,
} from "@/lib/schemas";

const fieldCls =
  "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";
const errorCls = "text-xs text-rose-500 mt-1";
const saveBtnCls =
  "rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60";

export default function BuyerSettingsPage() {
  const [notif, setNotif] = useState({
    outbid: true,
    wonAuction: true,
    dispatch: true,
    newLot: false,
    newsletter: false,
  });
  const [profileSaved, setProfileSaved] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);

  const {
    register: rP,
    handleSubmit: hsP,
    formState: { errors: eP, isSubmitting: subP },
  } = useForm<BuyerProfileFormData>({
    resolver: zodResolver(buyerProfileSchema),
    defaultValues: {
      name: "Md. Abdullah",
      businessName: "Abdullah Traders",
      phone: "01700000000",
      email: "buyer@example.com",
      tradeLicense: "",
      nid: "",
    },
  });

  const {
    register: rW,
    handleSubmit: hsW,
    reset: resetPw,
    formState: { errors: eW, isSubmitting: subW },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onProfile = (_d: BuyerProfileFormData) => {
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  };
  const onPw = (_d: ChangePasswordFormData) => {
    setPwSaved(true);
    resetPw();
    setTimeout(() => setPwSaved(false), 2500);
  };

  return (
    <div className="space-y-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Settings &amp; Profile</h1>
        <p className="text-slate-500">Manage your account, delivery addresses, and preferences.</p>
      </div>

      {/* Profile */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Business Profile</h2>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <form onSubmit={hsP(onProfile)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  { label: "Full Name", key: "name", type: "text" },
                  { label: "Business Name", key: "businessName", type: "text" },
                  { label: "Phone", key: "phone", type: "tel" },
                  { label: "Email", key: "email", type: "email" },
                  { label: "Trade License No.", key: "tradeLicense", type: "text" },
                  { label: "NID Number", key: "nid", type: "text" },
                ] as { label: string; key: keyof BuyerProfileFormData; type: string }[]
              ).map(({ label, key, type }) => (
                <div key={key} className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">{label}</label>
                  <input type={type} {...rP(key)} className={fieldCls} />
                  {eP[key] && <p className={errorCls}>{eP[key]?.message}</p>}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <button type="submit" disabled={subP} className={saveBtnCls}>Save Profile</button>
              {profileSaved && <span className="text-sm font-medium text-emerald-600">Saved ✓</span>}
            </div>
          </form>
        </div>
      </section>

      {/* Delivery Addresses */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Delivery Addresses</h2>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
          {[
            { label: "Primary Address", value: "House 12, Road 4, Mirpur-10, Dhaka-1216", badge: "Default" },
            { label: "Warehouse Address", value: "Plot 7, Tongi Industrial Area, Gazipur", badge: "" },
          ].map((addr) => (
            <div key={addr.label} className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  {addr.label}
                  {addr.badge && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{addr.badge}</span>}
                </p>
                <p className="mt-0.5 text-sm text-slate-500">{addr.value}</p>
              </div>
              <button type="button" className="shrink-0 text-xs font-semibold text-emerald-700 hover:underline">Edit</button>
            </div>
          ))}
          <button type="button" className="text-sm font-semibold text-emerald-700 hover:underline">+ Add Address</button>
        </div>
      </section>

      {/* Notifications */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Notification Preferences</h2>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-3">
          {[
            { key: "outbid", label: "Outbid alerts", desc: "Get notified immediately when you\u2019re outbid" },
            { key: "wonAuction", label: "Won auction", desc: "Notify when you win a lot" },
            { key: "dispatch", label: "Order dispatched", desc: "Updates when your order is shipped" },
            { key: "newLot", label: "New lots from followed sellers", desc: "Alert when a followed seller creates a new lot" },
            { key: "newsletter", label: "Newsletter & promotions", desc: "Platform news and featured lots" },
          ].map((n) => (
            <div key={n.key} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <div>
                <p className="text-sm font-semibold text-slate-900">{n.label}</p>
                <p className="text-xs text-slate-400">{n.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => setNotif((p) => ({ ...p, [n.key]: !p[n.key as keyof typeof p] }))}
                className={`relative h-6 w-11 overflow-hidden rounded-full transition-colors ${notif[n.key as keyof typeof notif] ? "bg-emerald-500" : "bg-slate-200"}`}
                aria-label={n.label}
              >
                <span className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${notif[n.key as keyof typeof notif] ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Change Password */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Change Password</h2>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <form onSubmit={hsW(onPw)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {(
                [
                  { label: "Current Password", key: "current" },
                  { label: "New Password", key: "password" },
                  { label: "Confirm New Password", key: "confirm" },
                ] as { label: string; key: keyof ChangePasswordFormData }[]
              ).map(({ label, key }) => (
                <div key={key} className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">{label}</label>
                  <input type="password" {...rW(key)} className={fieldCls} />
                  {eW[key] && <p className={errorCls}>{eW[key]?.message}</p>}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <button type="submit" disabled={subW} className={saveBtnCls}>Update Password</button>
              {pwSaved && <span className="text-sm font-medium text-emerald-600">Password updated ✓</span>}
            </div>
          </form>
        </div>
      </section>

      {/* Danger zone */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-red-400">Danger Zone</h2>
        <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Close Account</p>
            <p className="text-xs text-slate-400">Permanently delete your account and all data. This cannot be undone.</p>
          </div>
          <button type="button" className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">Close Account</button>
        </div>
      </section>
    </div>
  );
}

