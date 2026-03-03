"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  sellerProfileSchema,
  sellerBankSchema,
  changePasswordSchema,
  type SellerProfileFormData,
  type SellerBankFormData,
  type ChangePasswordFormData,
} from "@/lib/schemas";
import { toast } from "sonner";

const fieldCls =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";
const errorCls = "mt-1 text-xs text-rose-500";
const saveBtnCls =
  "rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60";

export default function SellerSettingsPage() {
  const [notifications, setNotifications] = useState({
    bidPlaced: true,
    outbid: true,
    lotClosed: true,
    orderUpdate: true,
    payoutReceived: true,
    newMessage: true,
    marketingEmails: false,
  });
  const [loadingData, setLoadingData] = useState(true);

  const setN = (k: string, v: boolean) =>
    setNotifications((p) => ({ ...p, [k]: v }));

  const {
    register: rP,
    handleSubmit: hsP,
    reset: resetProfile,
    formState: { errors: eP, isSubmitting: subP },
  } = useForm<SellerProfileFormData>({
    resolver: zodResolver(sellerProfileSchema),
  });

  const {
    register: rB,
    handleSubmit: hsB,
    reset: resetBank,
    formState: { errors: eB, isSubmitting: subB },
  } = useForm<SellerBankFormData>({
    resolver: zodResolver(sellerBankSchema),
  });

  const {
    register: rW,
    handleSubmit: hsW,
    reset: resetPw,
    formState: { errors: eW, isSubmitting: subW },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  // Load saved settings from API
  useEffect(() => {
    fetch("/api/seller-dashboard/settings")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => {
        if (d.profile) resetProfile(d.profile);
        if (d.bank) resetBank(d.bank);
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoadingData(false));
  }, [resetProfile, resetBank]);

  const onProfile = async (data: SellerProfileFormData) => {
    try {
      const res = await fetch("/api/seller-dashboard/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "profile", ...data }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || "Failed to save profile");
        return;
      }
      toast.success("Profile saved");
    } catch {
      toast.error("Something went wrong");
    }
  };

  const onBank = async (data: SellerBankFormData) => {
    try {
      const res = await fetch("/api/seller-dashboard/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "bank", ...data }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || "Failed to save bank details");
        return;
      }
      toast.success("Bank details saved");
    } catch {
      toast.error("Something went wrong");
    }
  };

  const onPw = async (data: ChangePasswordFormData) => {
    try {
      const res = await fetch("/api/seller-dashboard/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "password", current: data.current, password: data.password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || "Failed to update password");
        return;
      }
      toast.success("Password updated");
      resetPw();
    } catch {
      toast.error("Something went wrong");
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Settings &amp; Profile</h1>
        <p className="text-slate-500">Manage your business profile, bank details, and preferences.</p>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">✓</span>
        <div>
          <p className="text-sm font-semibold text-emerald-800">Account verified</p>
          <p className="text-xs text-emerald-700">Your business and identity documents are approved.</p>
        </div>
      </div>

      <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Business Profile</h2>
        <form onSubmit={hsP(onProfile)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                { label: "Business name", key: "businessName" },
                { label: "Owner / contact name", key: "ownerName" },
                { label: "Email", key: "email" },
                { label: "Phone", key: "phone" },
                { label: "NID number", key: "nid" },
                { label: "Trade license", key: "tradeLicense" },
              ] as { label: string; key: keyof SellerProfileFormData }[]
            ).map(({ label, key }) => (
              <div key={key}>
                <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
                <input type="text" {...rP(key)} className={fieldCls} />
                {eP[key] && <p className={errorCls}>{eP[key]?.message}</p>}
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Business address</label>
              <input type="text" {...rP("address")} className={fieldCls} />
              {eP.address && <p className={errorCls}>{eP.address.message}</p>}
            </div>
          </div>
          <div className="flex items-center gap-4 pt-2">
            <button type="submit" disabled={subP} className={saveBtnCls}>{subP ? "Saving…" : "Save profile"}</button>
          </div>
        </form>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Bank &amp; Payment Details</h2>
        <form onSubmit={hsB(onBank)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                { label: "Bank name", key: "bankName" },
                { label: "Account holder name", key: "accountName" },
                { label: "Account number", key: "accountNumber" },
                { label: "Routing number", key: "routingNumber" },
                { label: "Mobile banking (bKash / Nagad)", key: "mobileBanking" },
                { label: "Mobile banking number", key: "mobileNumber" },
              ] as { label: string; key: keyof SellerBankFormData }[]
            ).map(({ label, key }) => (
              <div key={key}>
                <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
                <input type="text" {...rB(key)} className={fieldCls} />
                {eB[key] && <p className={errorCls}>{eB[key]?.message}</p>}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 pt-2">
            <button type="submit" disabled={subB} className={saveBtnCls}>{subB ? "Saving…" : "Save bank details"}</button>
          </div>
        </form>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Change Password</h2>
        <form onSubmit={hsW(onPw)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {(
              [
                { label: "Current password", key: "current" },
                { label: "New password", key: "password" },
                { label: "Confirm new password", key: "confirm" },
              ] as { label: string; key: keyof ChangePasswordFormData }[]
            ).map(({ label, key }) => (
              <div key={key}>
                <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
                <input type="password" {...rW(key)} className={fieldCls} />
                {eW[key] && <p className={errorCls}>{eW[key]?.message}</p>}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 pt-2">
            <button type="submit" disabled={subW} className={saveBtnCls}>{subW ? "Updating…" : "Update password"}</button>
          </div>
        </form>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Notification Preferences</h2>
        <div className="space-y-3">
          {(
            [
              { label: "Bid placed on my lot", key: "bidPlaced" },
              { label: "Buyer outbid (auto-bid alert)", key: "outbid" },
              { label: "Lot closed", key: "lotClosed" },
              { label: "Order status updates", key: "orderUpdate" },
              { label: "Payout received", key: "payoutReceived" },
              { label: "New message from buyer", key: "newMessage" },
              { label: "Marketing & platform updates", key: "marketingEmails" },
            ] as { label: string; key: keyof typeof notifications }[]
          ).map(({ label, key }) => (
            <label
              key={key}
              className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-100 px-4 py-3 hover:bg-slate-50"
            >
              <span className="text-sm text-slate-800">{label}</span>
              <div
                onClick={() => setN(key, !notifications[key])}
                className={`relative h-6 w-11 overflow-hidden rounded-full transition-colors ${
                  notifications[key] ? "bg-emerald-500" : "bg-slate-200"
                }`}
              >
                <span
                  className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    notifications[key] ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </div>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-rose-100 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-rose-400">Danger Zone</h2>
        <p className="text-sm text-slate-500">Permanently deactivate your seller account. This cannot be undone.</p>
        <button
          type="button"
          className="rounded-full border border-rose-200 px-5 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
        >
          Deactivate account
        </button>
      </section>
    </div>
  );
}
