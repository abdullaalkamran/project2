"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CMSContent } from "@/lib/cms";
import { DEFAULT_CMS } from "@/lib/cms";

// ── helpers ────────────────────────────────────────────────────────────────────

type Status = "idle" | "saving" | "saved" | "error";

const TABS = [
  { key: "hero",         label: "Hero" },
  { key: "liveAuctions", label: "Live Auctions" },
  { key: "categories",   label: "Categories" },
  { key: "whyPaikari",   label: "Why Paikari" },
  { key: "newsletter",   label: "Newsletter" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ── sub-form components ────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  multiline = false,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  hint?: string;
}) {
  const base =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
      {multiline ? (
        <textarea rows={3} className={base} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input type="text" className={base} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function SectionGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2">{children}</div>;
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="col-span-2 -mb-1 border-b border-slate-100 pb-1.5 text-xs font-bold uppercase tracking-widest text-slate-400">
      {children}
    </h3>
  );
}

// ── section form panels ────────────────────────────────────────────────────────

const BG_SWATCHES = [
  { key: "light-green", label: "Light Green",  style: "linear-gradient(135deg,#ecfdf5,#d1fae5,#ecfdf5)" },
  { key: "white",        label: "White",         style: "linear-gradient(135deg,#ffffff,#f8fafc,#ffffff)" },
  { key: "sky",          label: "Sky Blue",      style: "linear-gradient(135deg,#f0f9ff,#e0f2fe,#f0f9ff)" },
  { key: "amber",        label: "Warm Amber",    style: "linear-gradient(135deg,#fffbeb,#fef3c7,#fffbeb)" },
  { key: "rose",         label: "Rose",          style: "linear-gradient(135deg,#fff1f2,#ffe4e6,#fff1f2)" },
  { key: "slate",        label: "Neutral",       style: "linear-gradient(135deg,#f8fafc,#f1f5f9,#f8fafc)" },
  { key: "dark",         label: "Dark",          style: "linear-gradient(135deg,#0f172a,#064e3b,#0f172a)" },
];

function HeroForm({ cms, set }: { cms: CMSContent; set: (c: CMSContent) => void }) {
  const h = cms.hero;
  const upd = (k: keyof CMSContent["hero"]) => (v: string) => set({ ...cms, hero: { ...h, [k]: v } });
  return (
    <SectionGrid>
      <SubHeading>Hero Background</SubHeading>
      <div className="sm:col-span-2 space-y-2">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Background theme</p>
        <div className="flex flex-wrap gap-3">
          {BG_SWATCHES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => upd("heroBg")(s.key)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 transition ${
                h.heroBg === s.key
                  ? "border-emerald-500 shadow-sm"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <span
                className="h-10 w-16 rounded-lg border border-slate-200"
                style={{ background: s.style }}
              />
              <span className="text-[10px] font-semibold text-slate-600">{s.label}</span>
            </button>
          ))}
        </div>
      </div>
      <SubHeading>Background Image</SubHeading>
      <div className="sm:col-span-2 space-y-3">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
          Upload image <span className="font-normal normal-case text-slate-400">(overrides color theme when set — jpg, png, webp)</span>
        </p>
        {h.heroBgImage && (
          <div className="relative w-fit rounded-xl overflow-hidden border border-slate-200">
            <img src={h.heroBgImage} alt="Hero background" className="h-24 w-48 object-cover" />
            <button
              type="button"
              onClick={() => upd("heroBgImage")("")}
              className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold hover:bg-red-600"
              title="Remove image"
            >✕</button>
          </div>
        )}
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition">
          <span>📁 Choose image…</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const fd = new FormData();
              fd.append("file", file);
              const res = await fetch("/api/cms/upload-image", { method: "POST", body: fd });
              const json = await res.json() as { url?: string; error?: string };
              if (json.url) upd("heroBgImage")(json.url);
              else alert(json.error ?? "Upload failed");
              e.target.value = "";
            }}
          />
        </label>
        {h.heroBgImage && (
          <p className="text-[11px] text-slate-400 break-all">{h.heroBgImage}</p>
        )}
      </div>
      <SubHeading>Badge &amp; Headline</SubHeading>
      <Field label="Trust badge" value={h.badge} onChange={upd("badge")} hint="Small pill above the headline" />
      <Field label="Headline (line 1)" value={h.headline} onChange={upd("headline")} />
      <Field label="Headline accent (line 2 — emerald)" value={h.headlineAccent} onChange={upd("headlineAccent")} />
      <div className="sm:col-span-2">
        <Field label="Sub-headline" value={h.subheadline} onChange={upd("subheadline")} multiline hint="Paragraph below the headline" />
      </div>
      <SubHeading>Feature pills (3-col grid)</SubHeading>
      <Field label="Pill 1 title" value={h.pill1Title} onChange={upd("pill1Title")} />
      <Field label="Pill 1 description" value={h.pill1Desc} onChange={upd("pill1Desc")} />
      <Field label="Pill 2 title" value={h.pill2Title} onChange={upd("pill2Title")} />
      <Field label="Pill 2 description" value={h.pill2Desc} onChange={upd("pill2Desc")} />
      <Field label="Pill 3 title" value={h.pill3Title} onChange={upd("pill3Title")} />
      <Field label="Pill 3 description" value={h.pill3Desc} onChange={upd("pill3Desc")} />
      <SubHeading>CTA buttons</SubHeading>
      <Field label="Primary CTA" value={h.ctaPrimary} onChange={upd("ctaPrimary")} />
      <Field label="Secondary CTA" value={h.ctaSecondary} onChange={upd("ctaSecondary")} />
      <SubHeading>Price tracker panel</SubHeading>
      <Field label="Tracker label (small caps)" value={h.trackerLabel} onChange={upd("trackerLabel")} />
      <Field label="Tracker title" value={h.trackerTitle} onChange={upd("trackerTitle")} />
    </SectionGrid>
  );
}

function LiveAuctionsForm({ cms, set }: { cms: CMSContent; set: (c: CMSContent) => void }) {
  const la = cms.liveAuctions;
  const upd = (k: keyof CMSContent["liveAuctions"]) => (v: string) =>
    set({ ...cms, liveAuctions: { ...la, [k]: v } });
  return (
    <SectionGrid>
      <Field label="Live badge text" value={la.badge} onChange={upd("badge")} />
      <Field label="Section heading" value={la.heading} onChange={upd("heading")} />
      <div className="sm:col-span-2">
        <Field label="Sub-heading" value={la.subheading} onChange={upd("subheading")} multiline />
      </div>
      <Field label="'Bid now' button label" value={la.ctaBid} onChange={upd("ctaBid")} />
      <Field label="'View lot' button label" value={la.ctaView} onChange={upd("ctaView")} />
    </SectionGrid>
  );
}

function CategoriesForm({ cms, set }: { cms: CMSContent; set: (c: CMSContent) => void }) {
  const c = cms.categories;
  const upd = (k: keyof CMSContent["categories"]) => (v: string) =>
    set({ ...cms, categories: { ...c, [k]: v } });
  return (
    <SectionGrid>
      <Field label="Section heading" value={c.heading} onChange={upd("heading")} />
      <Field label="Sub-heading" value={c.subheading} onChange={upd("subheading")} />
      <SubHeading>Vegetable category</SubHeading>
      <Field label="Title" value={c.vegetableTitle} onChange={upd("vegetableTitle")} />
      <Field label="Copy" value={c.vegetableCopy} onChange={upd("vegetableCopy")} />
      <SubHeading>Fruit category</SubHeading>
      <Field label="Title" value={c.fruitTitle} onChange={upd("fruitTitle")} />
      <Field label="Copy" value={c.fruitCopy} onChange={upd("fruitCopy")} />
      <SubHeading>Grain category</SubHeading>
      <Field label="Title" value={c.grainTitle} onChange={upd("grainTitle")} />
      <Field label="Copy" value={c.grainCopy} onChange={upd("grainCopy")} />
      <SubHeading>Spice category</SubHeading>
      <Field label="Title" value={c.spiceTitle} onChange={upd("spiceTitle")} />
      <Field label="Copy" value={c.spiceCopy} onChange={upd("spiceCopy")} />
    </SectionGrid>
  );
}

function WhyForm({ cms, set }: { cms: CMSContent; set: (c: CMSContent) => void }) {
  const w = cms.whyPaikari;
  const upd = (k: keyof CMSContent["whyPaikari"]) => (v: string) =>
    set({ ...cms, whyPaikari: { ...w, [k]: v } });
  const pointFields = (
    prefix: "qc" | "pricing" | "logistics" | "payment",
    label: string
  ) => (
    <>
      <SubHeading>{label}</SubHeading>
      <Field label="Title" value={w[`${prefix}Title`]} onChange={upd(`${prefix}Title`)} />
      <Field label="Short copy" value={w[`${prefix}Copy`]} onChange={upd(`${prefix}Copy`)} />
      <div className="sm:col-span-2">
        <Field label="Detail paragraph" value={w[`${prefix}Detail`]} onChange={upd(`${prefix}Detail`)} multiline />
      </div>
      <Field label="Stat number" value={w[`${prefix}Stat`]} onChange={upd(`${prefix}Stat`)} />
      <Field label="Stat label" value={w[`${prefix}StatLabel`]} onChange={upd(`${prefix}StatLabel`)} />
    </>
  );
  return (
    <SectionGrid>
      <Field label="Section heading" value={w.heading} onChange={upd("heading")} />
      <Field label="Sub-heading" value={w.subheading} onChange={upd("subheading")} />
      {pointFields("qc", "QC Verified")}
      {pointFields("pricing", "Live Pricing")}
      {pointFields("logistics", "Managed Logistics")}
      {pointFields("payment", "Secure Payment")}
    </SectionGrid>
  );
}

function NewsletterForm({ cms, set }: { cms: CMSContent; set: (c: CMSContent) => void }) {
  const n = cms.newsletter;
  const upd = (k: keyof CMSContent["newsletter"]) => (v: string) =>
    set({ ...cms, newsletter: { ...n, [k]: v } });
  return (
    <SectionGrid>
      <Field label="Heading" value={n.heading} onChange={upd("heading")} />
      <Field label="Sub-heading" value={n.subheading} onChange={upd("subheading")} />
      <Field label="Input placeholder" value={n.placeholder} onChange={upd("placeholder")} />
      <Field label="Button text" value={n.buttonText} onChange={upd("buttonText")} />
    </SectionGrid>
  );
}

// ── main page ──────────────────────────────────────────────────────────────────

export default function CMSAdminPage() {
  const [cms, setCms] = useState<CMSContent>(DEFAULT_CMS);
  const [tab, setTab] = useState<TabKey>("hero");
  const [status, setStatus] = useState<Status>("idle");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cms")
      .then((r) => r.json())
      .then((data: CMSContent) => { setCms(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const save = async () => {
    setStatus("saving");
    try {
      const r = await fetch("/api/cms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cms),
      });
      setStatus(r.ok ? "saved" : "error");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Landing Page</h1>
          <p className="mt-0.5 text-sm text-slate-500">Edit all visible text on the home page.</p>
        </div>
        <div className="flex items-center gap-3">
          {status === "saved" && (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">✓ Saved</span>
          )}
          {status === "error" && (
            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 ring-1 ring-rose-200">✗ Save failed</span>
          )}
          <Link
            href="/"
            target="_blank"
            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900"
          >
            View site ↗
          </Link>
          <button
            onClick={save}
            disabled={status === "saving"}
            className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {status === "saving" ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-slate-500">Loading content…</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Section tabs */}
          <div className="flex overflow-x-auto border-b border-slate-100 bg-slate-50/60">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`shrink-0 px-5 py-3 text-sm font-semibold transition-colors ${
                  tab === t.key
                    ? "border-b-2 border-emerald-500 bg-white text-emerald-700"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Form panel */}
          <div className="p-6 sm:p-8">
            {tab === "hero"         && <HeroForm         cms={cms} set={setCms} />}
            {tab === "liveAuctions" && <LiveAuctionsForm cms={cms} set={setCms} />}
            {tab === "categories"   && <CategoriesForm   cms={cms} set={setCms} />}
            {tab === "whyPaikari"   && <WhyForm          cms={cms} set={setCms} />}
            {tab === "newsletter"   && <NewsletterForm   cms={cms} set={setCms} />}
          </div>

          {/* Bottom save bar */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
            {status === "saved" && <span className="text-xs font-semibold text-emerald-600">✓ Changes saved!</span>}
            {status === "error" && <span className="text-xs font-semibold text-rose-600">✗ Save failed — check console</span>}
            <button
              onClick={save}
              disabled={status === "saving"}
              className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {status === "saving" ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
