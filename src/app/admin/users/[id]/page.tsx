"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { HUB_OPTIONS } from "@/lib/hubs";

/* ── helpers ────────────────────────────────────────────────────────── */
const ROLE_LABELS: Record<string, string> = {
  buyer: "Buyer", seller: "Seller", admin: "Admin",
  hub_manager: "Hub Manager", qc_leader: "QC Leader",
  qc_checker: "QC Checker", delivery_hub_manager: "Delivery Hub Mgr",
  delivery_distributor: "Distributor",
};
const ROLE_COLORS: Record<string, string> = {
  buyer:                "bg-sky-50 text-sky-700 border-sky-200",
  seller:               "bg-amber-50 text-amber-700 border-amber-200",
  admin:                "bg-red-50 text-red-700 border-red-200",
  hub_manager:          "bg-violet-50 text-violet-700 border-violet-200",
  qc_leader:            "bg-teal-50 text-teal-700 border-teal-200",
  qc_checker:           "bg-teal-50 text-teal-600 border-teal-200",
  delivery_hub_manager: "bg-indigo-50 text-indigo-700 border-indigo-200",
  delivery_distributor: "bg-indigo-50 text-indigo-600 border-indigo-200",
};
const ROLE_BG: Record<string, string> = {
  buyer:                "from-sky-500 to-cyan-500",
  seller:               "from-amber-500 to-orange-500",
  admin:                "from-red-500 to-rose-500",
  hub_manager:          "from-violet-500 to-purple-500",
  qc_leader:            "from-teal-500 to-emerald-500",
  qc_checker:           "from-teal-400 to-cyan-500",
  delivery_hub_manager: "from-indigo-500 to-blue-500",
  delivery_distributor: "from-indigo-400 to-blue-400",
};
// roles that need hub assignment
const HUB_ROLES = ["hub_manager", "qc_leader", "qc_checker", "delivery_hub_manager", "delivery_distributor"];

const LOT_STATUS: Record<string, string> = {
  LIVE:             "bg-emerald-50 text-emerald-700",
  QC_PASSED:        "bg-blue-50 text-blue-700",
  IN_QC:            "bg-orange-50 text-orange-600",
  QC_SUBMITTED:     "bg-orange-50 text-orange-600",
  QC_FAILED:        "bg-red-50 text-red-600",
  AUCTION_ENDED:    "bg-slate-100 text-slate-500",
  PENDING_DELIVERY: "bg-slate-50 text-slate-600",
  AT_HUB:           "bg-sky-50 text-sky-700",
};
const DECISION_COLORS: Record<string, string> = {
  Approved:    "bg-emerald-50 text-emerald-700",
  Rejected:    "bg-red-50 text-red-600",
  Pending:     "bg-orange-50 text-orange-600",
  Conditional: "bg-blue-50 text-blue-700",
};
const AVATAR_GRADIENTS = [
  "from-indigo-500 to-violet-500", "from-pink-500 to-rose-500",
  "from-emerald-500 to-teal-500",  "from-amber-500 to-orange-500",
  "from-sky-500 to-cyan-500",      "from-violet-500 to-purple-500",
];

function getGradient(name: string) {
  let s = 0; for (const c of name) s += c.charCodeAt(0);
  return AVATAR_GRADIENTS[s % AVATAR_GRADIENTS.length];
}
function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}
function fmtBDT(n: number) { return "৳ " + n.toLocaleString("en-IN"); }

/* ── types ──────────────────────────────────────────────────────────── */
type WalletTx = { id: string; type: string; amount: number; description: string; createdAt: string };
type Order    = { id: string; orderCode: string; product: string; qty: string; amount: number; status: string; dispatched: boolean; date: string };
type Lot      = { id: string; lotCode: string; title: string; qty: string; status: string; hub: string; qcStatus: string | null; leaderDecision: string | null; createdAt: string };
type Bid      = { id: string; lotCode: string; lotTitle: string; amount: number; date: string };
type QCReport = { id: string; lotCode: string; lotTitle: string; lotStatus: string; hub: string | null; grade: string; verdict: string; minBidRate: number | null; notes: string | null; leaderDecision: string | null; submittedAt: string };
type QCLeaderLot = { id: string; lotCode: string; title: string; qty: string; hub: string | null; status: string; qcStatus: string | null; checkerName: string | null; decision: string | null; createdAt: string };
type HubLot   = { id: string; lotCode: string; title: string; seller: string; qty: string; hub: string; status: string; createdAt: string };
type SellerLotStats = { total: number; live: number; inQc: number; passed: number; failed: number; ended: number; pending: number; atHub: number };
type HubContext = { assignedHub: string | null; sellerPrimaryHub: string | null; checkerPrimaryHub: string | null; leaderPrimaryHub: string | null; managerHub: string | null };

type UserDetail = {
  id: string; name: string; email: string; phone: string | null; photo: string | null;
  hubId: string | null; isVerified: boolean; status: string; roles: string[];
  createdAt: string; updatedAt: string;
  hubContext: HubContext;
  wallet: { balance: number; transactions: WalletTx[] } | null;
  buyerOrders: Order[]; sellerOrders: Order[];
  sellerLots: Lot[]; sellerLotStats: SellerLotStats;
  bids: Bid[];
  qcReports: QCReport[]; qcLeaderLots: QCLeaderLot[]; hubLots: HubLot[];
};

/* ── small helpers ──────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const c = status === "ACTIVE"    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : status === "SUSPENDED" ? "bg-red-50 text-red-600 border-red-200"
    :                          "bg-orange-50 text-orange-600 border-orange-200";
  const dot = status === "ACTIVE" ? "bg-emerald-500" : status === "SUSPENDED" ? "bg-red-500" : "bg-orange-400";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${c}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function HubBadge({ hub, label }: { hub: string; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
      {label ? `${label}: ` : ""}{hub}
    </span>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 py-12 text-center">
      <p className="text-sm font-medium text-slate-400">No {label} yet</p>
      <p className="mt-1 text-xs text-slate-300">Activity will appear here as it happens</p>
    </div>
  );
}

function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">{children}</div>;
}
function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-5 py-3 text-sm ${className}`}>{children}</td>;
}

/* ── hub chip inside table ──────────────────────────────────────────── */
function HubChip({ hub }: { hub: string | null }) {
  if (!hub) return <span className="text-xs text-slate-300">—</span>;
  const short = hub.split("—")[0].trim();
  return (
    <span className="rounded-full border border-violet-100 bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
      {short}
    </span>
  );
}

/* ── role profile card ──────────────────────────────────────────────── */
type StatConfig = { label: string; value: string | number; tab?: string };

function RoleProfileCard({ role, user, onTabClick }: { role: string; user: UserDetail; onTabClick: (tab: string) => void }) {
  const gradient = ROLE_BG[role] ?? "from-slate-400 to-slate-500";

  // resolve hub for this role
  const hub = (() => {
    if (role === "hub_manager" || role === "delivery_hub_manager" || role === "delivery_distributor")
      return user.hubContext.managerHub;
    if (role === "qc_leader")   return user.hubContext.leaderPrimaryHub ?? user.hubContext.assignedHub;
    if (role === "qc_checker")  return user.hubContext.checkerPrimaryHub ?? user.hubContext.assignedHub;
    if (role === "seller")      return user.hubContext.sellerPrimaryHub;
    return null;
  })();

  const configs: Record<string, { title: string; stats: StatConfig[] }> = {
    buyer: {
      title: "Buyer",
      stats: [
        { label: "Total Orders",  value: user.buyerOrders.length, tab: "purchases" },
        { label: "Total Spent",   value: fmtBDT(user.buyerOrders.reduce((s, o) => s + o.amount, 0)), tab: "purchases" },
        { label: "Bids Placed",   value: user.bids.length, tab: "bids" },
        { label: "Highest Bid",   value: user.bids.length > 0 ? fmtBDT(Math.max(...user.bids.map(b => b.amount))) : "—", tab: "bids" },
      ],
    },
    seller: {
      title: "Seller",
      stats: [
        { label: "Lots Posted",  value: user.sellerLotStats.total, tab: "lots" },
        { label: "Live / In QC", value: `${user.sellerLotStats.live} / ${user.sellerLotStats.inQc}`, tab: "lots" },
        { label: "Total Sales",  value: user.sellerOrders.length, tab: "sales" },
        { label: "Total Earned", value: fmtBDT(user.sellerOrders.reduce((s, o) => s + o.amount, 0)), tab: "sales" },
      ],
    },
    qc_checker: {
      title: "QC Checker",
      stats: [
        { label: "Reports Filed",  value: user.qcReports.length, tab: "qc_reports" },
        { label: "Approved",       value: user.qcReports.filter(r => r.leaderDecision === "Approved").length, tab: "qc_reports" },
        { label: "Rejected",       value: user.qcReports.filter(r => r.leaderDecision === "Rejected").length, tab: "qc_reports" },
        { label: "Pending Review", value: user.qcReports.filter(r => !r.leaderDecision).length, tab: "qc_reports" },
      ],
    },
    qc_leader: {
      title: "QC Leader",
      stats: [
        { label: "Lots Assigned",    value: user.qcLeaderLots.length, tab: "qc_tasks" },
        { label: "Approved",         value: user.qcLeaderLots.filter(l => l.decision === "Approved").length, tab: "qc_tasks" },
        { label: "Rejected",         value: user.qcLeaderLots.filter(l => l.decision === "Rejected").length, tab: "qc_tasks" },
        { label: "Pending Decision", value: user.qcLeaderLots.filter(l => !l.decision).length, tab: "qc_tasks" },
      ],
    },
    hub_manager: {
      title: "Hub Manager",
      stats: [
        { label: "Lots in Pipeline", value: user.hubLots.length, tab: "hub_lots" },
        { label: "At Hub",           value: user.hubLots.filter(l => l.status === "AT_HUB").length, tab: "hub_lots" },
        { label: "In QC",            value: user.hubLots.filter(l => ["IN_QC", "QC_SUBMITTED"].includes(l.status)).length, tab: "hub_lots" },
        { label: "Live",             value: user.hubLots.filter(l => l.status === "LIVE").length, tab: "hub_lots" },
      ],
    },
    admin: {
      title: "Administrator",
      stats: [
        { label: "Access Level", value: "Full Platform" },
        { label: "Account",      value: user.status },
        { label: "Verified",     value: user.isVerified ? "Yes" : "No" },
        { label: "Member Since", value: user.createdAt },
      ],
    },
    delivery_hub_manager: {
      title: "Delivery Hub Manager",
      stats: [
        { label: "Scope",    value: "Delivery Hub" },
        { label: "Account",  value: user.status },
        { label: "Verified", value: user.isVerified ? "Yes" : "No" },
        { label: "Joined",   value: user.createdAt },
      ],
    },
    delivery_distributor: {
      title: "Delivery Distributor",
      stats: [
        { label: "Scope",    value: "Last Mile" },
        { label: "Account",  value: user.status },
        { label: "Verified", value: user.isVerified ? "Yes" : "No" },
        { label: "Joined",   value: user.createdAt },
      ],
    },
  };

  const cfg = configs[role];
  if (!cfg) return null;

  return (
    <div className={`rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white shadow-md`}>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-sm font-bold">{cfg.title}</p>
        <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${ROLE_COLORS[role] ?? "bg-white/10 text-white border-white/20"}`}>
          {ROLE_LABELS[role] ?? role}
        </span>
      </div>
      {/* hub line */}
      {hub ? (
        <p className="mb-3 text-[11px] text-white/70 truncate">
          Hub: <span className="font-semibold text-white/90">{hub}</span>
        </p>
      ) : (
        <p className="mb-3 text-[11px] text-white/50 italic">No hub assigned</p>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        {cfg.stats.map(s =>
          s.tab ? (
            <button key={s.label} type="button" onClick={() => onTabClick(s.tab!)}
              className="group rounded-xl bg-white/10 px-3 py-2.5 text-left transition hover:bg-white/25">
              <p className="text-[10px] uppercase tracking-wider opacity-70">{s.label}</p>
              <p className="mt-0.5 truncate text-base font-bold group-hover:underline">{s.value}</p>
            </button>
          ) : (
            <div key={s.label} className="rounded-xl bg-white/10 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider opacity-70">{s.label}</p>
              <p className="mt-0.5 truncate text-base font-bold">{s.value}</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* ── tabs ───────────────────────────────────────────────────────────── */
type TabDef = { id: string; label: string; badge?: number };

function getTabsForRoles(roles: string[], user: UserDetail): TabDef[] {
  const tabs: TabDef[] = [{ id: "overview", label: "Overview" }];
  if (roles.includes("buyer")) {
    tabs.push({ id: "purchases", label: "Purchases", badge: user.buyerOrders.length });
    tabs.push({ id: "bids",      label: "Bids",      badge: user.bids.length });
  }
  if (roles.includes("seller")) {
    tabs.push({ id: "lots",  label: "Lots Posted", badge: user.sellerLotStats.total });
    tabs.push({ id: "sales", label: "Sales",       badge: user.sellerOrders.length });
  }
  if (roles.includes("qc_checker")) {
    tabs.push({ id: "qc_reports", label: "QC Reports", badge: user.qcReports.length });
  }
  if (roles.includes("qc_leader")) {
    tabs.push({ id: "qc_tasks", label: "QC Tasks", badge: user.qcLeaderLots.length });
  }
  if (roles.includes("hub_manager")) {
    tabs.push({ id: "hub_lots", label: "Hub Lots", badge: user.hubLots.length });
  }
  if (user.wallet) {
    tabs.push({ id: "wallet", label: "Wallet" });
  }
  return tabs;
}

const TAB_BADGE: Record<string, string> = {
  purchases:  "bg-sky-100 text-sky-700",
  bids:       "bg-violet-100 text-violet-700",
  lots:       "bg-amber-100 text-amber-700",
  sales:      "bg-emerald-100 text-emerald-700",
  qc_reports: "bg-teal-100 text-teal-700",
  qc_tasks:   "bg-teal-100 text-teal-700",
  hub_lots:   "bg-violet-100 text-violet-700",
};

/* ── page ───────────────────────────────────────────────────────────── */
export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [user, setUser]       = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing]   = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  /* edit state */
  const [editing, setEditing]     = useState(false);
  const [editName, setEditName]   = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editHub, setEditHub]     = useState<string>("");
  const [saving, setSaving]       = useState(false);

  const fetchUser = useCallback(() => {
    fetch(`/api/admin/users/${id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d: UserDetail) => {
        setUser(d);
        setEditName(d.name);
        setEditPhone(d.phone ?? "");
        setEditHub(d.hubId ?? "");
      })
      .catch(() => toast.error("Failed to load user"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const tabs = useMemo(() => (user ? getTabsForRoles(user.roles, user) : []), [user]);

  useEffect(() => {
    if (tabs.length > 0 && !tabs.find(t => t.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab]);

  /* check if this user needs hub assignment */
  const needsHub = useMemo(() =>
    user?.roles.some(r => HUB_ROLES.includes(r)) ?? false,
  [user]);

  /* actions */
  const toggleStatus = async () => {
    if (!user) return;
    const next = user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setActing(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error();
      setUser(p => p ? { ...p, status: next } : p);
      toast.success(`Account ${next === "ACTIVE" ? "activated" : "suspended"}`);
    } catch { toast.error("Failed to update status"); } finally { setActing(false); }
  };

  const toggleVerify = async () => {
    if (!user) return;
    setActing(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/verify`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified: !user.isVerified }),
      });
      if (!res.ok) throw new Error();
      setUser(p => p ? { ...p, isVerified: !p.isVerified } : p);
      toast.success(user.isVerified ? "Verification removed" : "User verified");
    } catch { toast.error("Failed"); } finally { setActing(false); }
  };

  const handleSave = async () => {
    if (!user) return;
    const trimmedName = editName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      toast.error("Name must be at least 2 characters");
      return;
    }
    setSaving(true);
    try {
      // save name + phone
      const r1 = await fetch(`/api/admin/users/${user.id}/edit`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, phone: editPhone.trim() || null }),
      });
      if (!r1.ok) {
        const err = await r1.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Failed");
      }
      // save hub (for operations staff)
      if (needsHub) {
        const r2 = await fetch(`/api/admin/users/${user.id}/hub`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hubId: editHub || null }),
        });
        if (!r2.ok) throw new Error("Failed to save hub");
      }
      setUser(p => p ? {
        ...p,
        name: trimmedName,
        phone: editPhone.trim() || null,
        hubId: needsHub ? (editHub || null) : p.hubId,
        hubContext: needsHub
          ? { ...p.hubContext, assignedHub: editHub || null, managerHub: editHub || null }
          : p.hubContext,
      } : p);
      setEditing(false);
      toast.success("Profile updated");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally { setSaving(false); }
  };

  const handleCancel = () => {
    if (!user) return;
    setEditName(user.name);
    setEditPhone(user.phone ?? "");
    setEditHub(user.hubId ?? "");
    setEditing(false);
  };

  /* loading */
  if (loading) return (
    <div className="animate-pulse space-y-6">
      <div className="h-10 w-32 rounded-xl bg-slate-100" />
      <div className="h-56 rounded-2xl bg-slate-100" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-100" />)}
      </div>
      <div className="h-80 rounded-2xl bg-slate-100" />
    </div>
  );

  if (!user) return (
    <div className="py-24 text-center">
      <p className="font-medium text-slate-500">User not found</p>
      <Link href="/admin/users" className="mt-3 inline-block text-sm font-semibold text-indigo-600 hover:underline">
        Back to Users
      </Link>
    </div>
  );

  const gradient = getGradient(user.name);

  // hub to show in hero
  const heroHub = user.hubId
    ?? user.hubContext.sellerPrimaryHub
    ?? user.hubContext.checkerPrimaryHub
    ?? user.hubContext.leaderPrimaryHub;

  return (
    <div className="space-y-5 pb-12">

      {/* back + breadcrumb */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.back()}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <nav className="flex items-center gap-1.5 text-xs text-slate-400">
          <Link href="/admin/users" className="hover:text-indigo-600 transition">All Users</Link>
          <span>/</span>
          <span className="font-medium text-slate-700">{user.name}</span>
        </nav>
      </div>

      {/* ── profile hero ── */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className={`h-20 rounded-t-2xl bg-gradient-to-r ${gradient} opacity-30`} />
        <div className="px-6 pb-6">
          {/* avatar + actions row */}
          <div className="flex flex-wrap items-end justify-between gap-4" style={{ marginTop: "-36px" }}>
            <div className="relative">
              {user.photo ? (
                <img src={user.photo} alt={user.name}
                  className="h-20 w-20 rounded-2xl object-cover shadow-lg ring-4 ring-white" />
              ) : (
                <div className={`h-20 w-20 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg ring-4 ring-white`}>
                  <span className="text-2xl font-bold text-white">{getInitials(user.name)}</span>
                </div>
              )}
              {user.isVerified && (
                <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white ring-2 ring-white shadow">✓</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-10">
              <button type="button" onClick={() => setEditing(true)} disabled={editing}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40 transition">
                Edit Profile
              </button>
              <button type="button" onClick={toggleVerify} disabled={acting}
                className={`rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition disabled:opacity-50 ${user.isVerified ? "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
                {acting ? "…" : user.isVerified ? "Unverify" : "Verify"}
              </button>
              <button type="button" onClick={toggleStatus} disabled={acting}
                className={`rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition disabled:opacity-50 ${user.status === "ACTIVE" ? "bg-red-500 text-white hover:bg-red-600" : "bg-emerald-500 text-white hover:bg-emerald-600"}`}>
                {acting ? "…" : user.status === "ACTIVE" ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>

          {/* name / email / hub / roles */}
          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{user.name}</h1>
              <StatusBadge status={user.status} />
              {user.isVerified && (
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">Verified</span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-slate-500">{user.email}</p>
            {user.phone && <p className="mt-0.5 text-sm text-slate-400">{user.phone}</p>}

            {/* hub badge — prominently shown under name */}
            {heroHub && (
              <div className="mt-2">
                <HubBadge hub={heroHub} label={
                  user.roles.includes("hub_manager") ? "Manages"
                  : user.roles.includes("seller") ? "Primary Hub"
                  : user.roles.some(r => ["qc_leader","qc_checker"].includes(r)) ? "Hub"
                  : "Hub"
                } />
              </div>
            )}
            {/* alert if operations staff has no hub */}
            {needsHub && !heroHub && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                No hub assigned — click Edit Profile to assign
              </div>
            )}

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {user.roles.length === 0
                ? <span className="text-xs italic text-slate-300">No roles assigned</span>
                : user.roles.map(r => (
                  <span key={r} className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLORS[r] ?? "border-slate-200 bg-slate-50 text-slate-600"}`}>
                    {ROLE_LABELS[r] ?? r}
                  </span>
                ))
              }
            </div>
          </div>

          {/* meta strip */}
          <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-3 border-t border-slate-100 pt-5 sm:grid-cols-4">
            {[
              { label: "Member Since",  val: user.createdAt },
              { label: "Last Updated",  val: user.updatedAt },
              { label: "User ID",       val: <span className="font-mono text-xs">{user.id.slice(0, 16)}…</span> },
              { label: "Assigned Hub",  val: heroHub ?? <span className="italic text-slate-300">Not assigned</span> },
            ].map(m => (
              <div key={m.label}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{m.label}</p>
                <p className="mt-0.5 text-sm font-medium text-slate-700">{m.val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── edit form card ── */}
      {editing && (
        <div className="rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-semibold text-slate-700">Edit Profile</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">Full Name</label>
              <input value={editName} onChange={e => setEditName(e.target.value)}
                placeholder="Full name"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">Phone Number</label>
              <input value={editPhone} onChange={e => setEditPhone(e.target.value)}
                placeholder="Phone (optional)"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition" />
            </div>
            {needsHub && (
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                  Assigned Hub
                  <span className="ml-1.5 font-normal text-slate-400">
                    ({user.roles.filter(r => HUB_ROLES.includes(r)).map(r => ROLE_LABELS[r]).join(", ")})
                  </span>
                </label>
                <select value={editHub} onChange={e => setEditHub(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition bg-white">
                  <option value="">No hub assigned</option>
                  {HUB_OPTIONS.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="mt-5 flex items-center gap-3">
            <button type="button" onClick={handleSave} disabled={saving}
              className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition">
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <button type="button" onClick={handleCancel} disabled={saving}
              className="rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── wallet: always visible ── */}
      {user.wallet && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white shadow-md">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-200">Current Balance</p>
            <p className="mt-3 text-4xl font-bold tracking-tight">{fmtBDT(user.wallet.balance)}</p>
            <p className="mt-2 text-xs text-indigo-300">
              {user.wallet.transactions.length} recent transaction{user.wallet.transactions.length !== 1 ? "s" : ""}
            </p>
            <button type="button" onClick={() => setActiveTab("wallet")}
              className="mt-4 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/25 transition">
              View all transactions
            </button>
          </div>
          <div className="sm:col-span-2 rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Transaction History</p>
              <button type="button" onClick={() => setActiveTab("wallet")}
                className="text-xs font-semibold text-indigo-600 hover:underline">See all</button>
            </div>
            {user.wallet.transactions.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">No transactions yet</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {user.wallet.transactions.slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                    <span className={`w-20 flex-shrink-0 rounded-full px-2.5 py-0.5 text-center text-[11px] font-semibold ${t.amount >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                      {t.type}
                    </span>
                    <span className="flex-1 truncate text-sm text-slate-600">{t.description}</span>
                    <span className={`flex-shrink-0 text-sm font-bold ${t.amount >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                      {t.amount >= 0 ? "+" : ""}{fmtBDT(t.amount)}
                    </span>
                    <span className="flex-shrink-0 text-[11px] text-slate-400">{t.createdAt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── seller lot status breakdown ── */}
      {user.roles.includes("seller") && user.sellerLotStats.total > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Lot Pipeline Breakdown
            {user.hubContext.sellerPrimaryHub && (
              <span className="ml-2 normal-case font-normal text-slate-500">
                — Primary Hub: <span className="font-semibold text-violet-700">{user.hubContext.sellerPrimaryHub}</span>
              </span>
            )}
          </p>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
            {[
              { label: "Total",    value: user.sellerLotStats.total,   color: "text-slate-900",    bg: "bg-slate-50 border-slate-200" },
              { label: "Pending",  value: user.sellerLotStats.pending,  color: "text-slate-600",    bg: "bg-slate-50 border-slate-100" },
              { label: "At Hub",   value: user.sellerLotStats.atHub,    color: "text-sky-700",      bg: "bg-sky-50 border-sky-100" },
              { label: "In QC",    value: user.sellerLotStats.inQc,     color: "text-orange-600",   bg: "bg-orange-50 border-orange-100" },
              { label: "Passed",   value: user.sellerLotStats.passed,   color: "text-blue-700",     bg: "bg-blue-50 border-blue-100" },
              { label: "Live",     value: user.sellerLotStats.live,     color: "text-emerald-700",  bg: "bg-emerald-50 border-emerald-100" },
              { label: "Failed",   value: user.sellerLotStats.failed,   color: "text-red-600",      bg: "bg-red-50 border-red-100" },
              { label: "Ended",    value: user.sellerLotStats.ended,    color: "text-slate-500",    bg: "bg-slate-50 border-slate-100" },
            ].map(s => (
              <button key={s.label} type="button" onClick={() => setActiveTab("lots")}
                className={`rounded-xl border p-3 text-center transition hover:opacity-80 ${s.bg}`}>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">{s.label}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── role profile cards ── */}
      {user.roles.length > 0 && (
        <div className={`grid gap-4 ${
          user.roles.length === 1 ? "max-w-sm grid-cols-1"
          : user.roles.length === 2 ? "sm:grid-cols-2"
          : "sm:grid-cols-2 lg:grid-cols-3"
        }`}>
          {user.roles.map(r => (
            <RoleProfileCard key={r} role={r} user={user} onTabClick={setActiveTab} />
          ))}
        </div>
      )}

      {/* ── tabs ── */}
      <div>
        <div className="mb-5 flex gap-0.5 overflow-x-auto border-b border-slate-200">
          {tabs.map(t => (
            <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
              className={`relative flex-shrink-0 px-4 py-2.5 text-sm font-semibold transition ${activeTab === t.id ? "text-indigo-700" : "text-slate-500 hover:text-slate-800"}`}>
              {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${TAB_BADGE[t.id] ?? "bg-slate-100 text-slate-600"}`}>
                  {t.badge}
                </span>
              )}
              {activeTab === t.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-indigo-600" />}
            </button>
          ))}
        </div>

        {/* overview */}
        {activeTab === "overview" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Account Information</h3>
              {[
                { label: "Full Name",    val: user.name },
                { label: "Email",        val: user.email },
                { label: "Phone",        val: user.phone ?? "—" },
                { label: "Status",       val: <StatusBadge status={user.status} /> },
                { label: "Verified",     val: user.isVerified ? <span className="font-semibold text-blue-600">Yes — Verified</span> : <span className="text-slate-400">Not verified</span> },
                { label: "Assigned Hub", val: heroHub ? <HubBadge hub={heroHub} /> : <span className="italic text-slate-300">None</span> },
                { label: "Member Since", val: user.createdAt },
              ].map(r => (
                <div key={r.label} className="flex items-start justify-between gap-4 border-b border-slate-50 py-2.5 last:border-0">
                  <span className="w-32 flex-shrink-0 text-xs text-slate-400">{r.label}</span>
                  <span className="text-right text-sm font-medium text-slate-800">{r.val}</span>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Assigned Roles</h3>
                {user.roles.length === 0 ? (
                  <p className="text-sm italic text-slate-400">No roles assigned yet</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {user.roles.map(r => (
                      <span key={r} className={`rounded-xl border px-3 py-1.5 text-sm font-semibold ${ROLE_COLORS[r] ?? "border-slate-200 bg-slate-50 text-slate-600"}`}>
                        {ROLE_LABELS[r] ?? r}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Activity Summary</h3>
                <div className="space-y-1">
                  {([
                    user.roles.includes("buyer")       && { label: "Purchase orders",     val: user.buyerOrders.length,        color: "bg-sky-500",     tab: "purchases" },
                    user.roles.includes("buyer")       && { label: "Auction bids",         val: user.bids.length,               color: "bg-violet-500",  tab: "bids" },
                    user.roles.includes("seller")      && { label: "Lots posted",          val: user.sellerLotStats.total,      color: "bg-amber-500",   tab: "lots" },
                    user.roles.includes("seller")      && { label: "Sales received",       val: user.sellerOrders.length,       color: "bg-emerald-500", tab: "sales" },
                    user.roles.includes("qc_checker")  && { label: "QC reports filed",     val: user.qcReports.length,          color: "bg-teal-500",    tab: "qc_reports" },
                    user.roles.includes("qc_leader")   && { label: "QC tasks assigned",    val: user.qcLeaderLots.length,       color: "bg-teal-600",    tab: "qc_tasks" },
                    user.roles.includes("hub_manager") && { label: "Lots in hub pipeline", val: user.hubLots.length,            color: "bg-violet-500",  tab: "hub_lots" },
                  ] as (false | { label: string; val: number; color: string; tab: string })[])
                    .filter(Boolean)
                    .map(a => {
                      if (!a) return null;
                      return (
                        <button key={a.label} type="button" onClick={() => setActiveTab(a.tab)}
                          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50 transition">
                          <span className={`h-2 w-2 flex-shrink-0 rounded-full ${a.color}`} />
                          <span className="flex-1 text-sm text-slate-600">{a.label}</span>
                          <span className="text-sm font-bold text-slate-900">{a.val}</span>
                          <svg className="h-3.5 w-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      );
                    })
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* purchases */}
        {activeTab === "purchases" && (
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Purchase Orders
              {user.buyerOrders.length > 0 && (
                <span className="ml-2 normal-case font-normal text-slate-500">
                  · Total spent: {fmtBDT(user.buyerOrders.reduce((s, o) => s + o.amount, 0))}
                </span>
              )}
            </p>
            {user.buyerOrders.length === 0 ? <EmptyState label="purchase orders" /> : (
              <TableWrap>
                <table className="w-full">
                  <thead className="border-b border-slate-100 bg-slate-50/60"><tr>
                    <Th>Order ID</Th><Th>Product</Th><Th>Qty</Th><Th>Amount</Th><Th>Status</Th><Th>Date</Th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {user.buyerOrders.map(o => (
                      <tr key={o.id} className="hover:bg-slate-50/70">
                        <Td className="font-mono text-xs text-slate-500">{o.orderCode}</Td>
                        <Td className="font-medium text-slate-900">{o.product}</Td>
                        <Td className="text-slate-500">{o.qty}</Td>
                        <Td className="font-semibold text-sky-700">{fmtBDT(o.amount)}</Td>
                        <Td><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${o.dispatched ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>{o.dispatched ? "Dispatched" : o.status}</span></Td>
                        <Td className="text-xs text-slate-400">{o.date}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </div>
        )}

        {/* bids */}
        {activeTab === "bids" && (
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Auction Bid History
              {user.bids.length > 0 && <span className="ml-2 normal-case font-normal text-slate-500">· Highest: {fmtBDT(Math.max(...user.bids.map(b => b.amount)))}</span>}
            </p>
            {user.bids.length === 0 ? <EmptyState label="bids" /> : (
              <TableWrap>
                <table className="w-full">
                  <thead className="border-b border-slate-100 bg-slate-50/60"><tr>
                    <Th>Lot Code</Th><Th>Lot Title</Th><Th>Bid Amount</Th><Th>Date</Th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {user.bids.map(b => (
                      <tr key={b.id} className="hover:bg-slate-50/70">
                        <Td className="font-mono text-xs text-slate-500">{b.lotCode}</Td>
                        <Td className="font-medium text-slate-900">{b.lotTitle}</Td>
                        <Td className="font-semibold text-violet-700">{fmtBDT(b.amount)}</Td>
                        <Td className="text-xs text-slate-400">{b.date}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </div>
        )}

        {/* lots posted */}
        {activeTab === "lots" && (
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Lots Posted as Seller</p>
            {user.sellerLots.length === 0 ? <EmptyState label="lots" /> : (
              <TableWrap>
                <table className="w-full">
                  <thead className="border-b border-slate-100 bg-slate-50/60"><tr>
                    <Th>Lot ID</Th><Th>Title</Th><Th>Qty</Th><Th>Hub</Th><Th>Status</Th><Th>QC Status</Th><Th>Decision</Th><Th>Created</Th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {user.sellerLots.map(l => (
                      <tr key={l.id} className="hover:bg-slate-50/70">
                        <Td className="font-mono text-xs text-slate-500">{l.lotCode}</Td>
                        <Td className="font-medium text-slate-900">{l.title}</Td>
                        <Td className="text-slate-500">{l.qty}</Td>
                        <Td><HubChip hub={l.hub} /></Td>
                        <Td><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${LOT_STATUS[l.status] ?? "bg-slate-100 text-slate-500"}`}>{l.status}</span></Td>
                        <Td className="text-xs text-slate-500">{l.qcStatus ?? "—"}</Td>
                        <Td>{l.leaderDecision ? <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${DECISION_COLORS[l.leaderDecision] ?? "bg-slate-100 text-slate-500"}`}>{l.leaderDecision}</span> : <span className="text-xs text-slate-300">—</span>}</Td>
                        <Td className="text-xs text-slate-400">{l.createdAt}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </div>
        )}

        {/* sales */}
        {activeTab === "sales" && (
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Sales Received
              {user.sellerOrders.length > 0 && <span className="ml-2 normal-case font-normal text-slate-500">· Total earned: {fmtBDT(user.sellerOrders.reduce((s, o) => s + o.amount, 0))}</span>}
            </p>
            {user.sellerOrders.length === 0 ? <EmptyState label="sales" /> : (
              <TableWrap>
                <table className="w-full">
                  <thead className="border-b border-slate-100 bg-slate-50/60"><tr>
                    <Th>Order ID</Th><Th>Product</Th><Th>Qty</Th><Th>Amount</Th><Th>Status</Th><Th>Date</Th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {user.sellerOrders.map(o => (
                      <tr key={o.id} className="hover:bg-slate-50/70">
                        <Td className="font-mono text-xs text-slate-500">{o.orderCode}</Td>
                        <Td className="font-medium text-slate-900">{o.product}</Td>
                        <Td className="text-slate-500">{o.qty}</Td>
                        <Td className="font-semibold text-emerald-700">{fmtBDT(o.amount)}</Td>
                        <Td><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${o.dispatched ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>{o.dispatched ? "Dispatched" : o.status}</span></Td>
                        <Td className="text-xs text-slate-400">{o.date}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </div>
        )}

        {/* qc reports */}
        {activeTab === "qc_reports" && (
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              QC Reports Submitted
              {user.hubContext.checkerPrimaryHub && <span className="ml-2 normal-case font-normal">· Primary Hub: <span className="font-semibold text-violet-700">{user.hubContext.checkerPrimaryHub}</span></span>}
            </p>
            {user.qcReports.length === 0 ? <EmptyState label="QC reports" /> : (
              <TableWrap>
                <table className="w-full">
                  <thead className="border-b border-slate-100 bg-slate-50/60"><tr>
                    <Th>Lot</Th><Th>Title</Th><Th>Hub</Th><Th>Grade</Th><Th>Verdict</Th><Th>Min Bid</Th><Th>Leader Decision</Th><Th>Submitted</Th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {user.qcReports.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/70">
                        <Td className="font-mono text-xs text-slate-500">{r.lotCode}</Td>
                        <Td className="font-medium text-slate-900">{r.lotTitle}</Td>
                        <Td><HubChip hub={r.hub} /></Td>
                        <Td><span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">{r.grade}</span></Td>
                        <Td className="text-slate-600">{r.verdict}</Td>
                        <Td className="text-slate-500">{r.minBidRate ? fmtBDT(r.minBidRate) : "—"}</Td>
                        <Td>{r.leaderDecision ? <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${DECISION_COLORS[r.leaderDecision] ?? "bg-slate-100 text-slate-500"}`}>{r.leaderDecision}</span> : <span className="text-xs text-slate-300">Pending</span>}</Td>
                        <Td className="text-xs text-slate-400">{r.submittedAt}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </div>
        )}

        {/* qc tasks */}
        {activeTab === "qc_tasks" && (
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Lots Assigned for QC Leadership
              {user.hubContext.leaderPrimaryHub && <span className="ml-2 normal-case font-normal">· Primary Hub: <span className="font-semibold text-violet-700">{user.hubContext.leaderPrimaryHub}</span></span>}
            </p>
            {user.qcLeaderLots.length === 0 ? <EmptyState label="QC tasks" /> : (
              <TableWrap>
                <table className="w-full">
                  <thead className="border-b border-slate-100 bg-slate-50/60"><tr>
                    <Th>Lot</Th><Th>Title</Th><Th>Hub</Th><Th>Qty</Th><Th>Status</Th><Th>QC Task</Th><Th>Checker</Th><Th>Decision</Th><Th>Date</Th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {user.qcLeaderLots.map(l => (
                      <tr key={l.id} className="hover:bg-slate-50/70">
                        <Td className="font-mono text-xs text-slate-500">{l.lotCode}</Td>
                        <Td className="font-medium text-slate-900">{l.title}</Td>
                        <Td><HubChip hub={l.hub} /></Td>
                        <Td className="text-slate-500">{l.qty}</Td>
                        <Td><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${LOT_STATUS[l.status] ?? "bg-slate-100 text-slate-500"}`}>{l.status}</span></Td>
                        <Td className="text-xs text-slate-500">{l.qcStatus ?? "—"}</Td>
                        <Td className="text-slate-500">{l.checkerName ?? "—"}</Td>
                        <Td>{l.decision ? <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${DECISION_COLORS[l.decision] ?? "bg-slate-100 text-slate-500"}`}>{l.decision}</span> : <span className="text-xs text-slate-300">Pending</span>}</Td>
                        <Td className="text-xs text-slate-400">{l.createdAt}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </div>
        )}

        {/* hub lots */}
        {activeTab === "hub_lots" && (
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Hub Pipeline — {user.hubContext.managerHub ?? "All Hubs"}
              {!user.hubContext.managerHub && (
                <span className="ml-2 normal-case font-normal text-orange-500">Assign a hub in Edit Profile to filter by hub</span>
              )}
            </p>
            {user.hubLots.length === 0 ? <EmptyState label="hub lots" /> : (
              <TableWrap>
                <table className="w-full">
                  <thead className="border-b border-slate-100 bg-slate-50/60"><tr>
                    <Th>Lot</Th><Th>Title</Th><Th>Seller</Th><Th>Hub</Th><Th>Qty</Th><Th>Status</Th><Th>Created</Th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {user.hubLots.map(l => (
                      <tr key={l.id} className="hover:bg-slate-50/70">
                        <Td className="font-mono text-xs text-slate-500">{l.lotCode}</Td>
                        <Td className="font-medium text-slate-900">{l.title}</Td>
                        <Td className="text-slate-500">{l.seller}</Td>
                        <Td><HubChip hub={l.hub} /></Td>
                        <Td className="text-slate-500">{l.qty}</Td>
                        <Td><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${LOT_STATUS[l.status] ?? "bg-slate-100 text-slate-500"}`}>{l.status}</span></Td>
                        <Td className="text-xs text-slate-400">{l.createdAt}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </div>
        )}

        {/* wallet full */}
        {activeTab === "wallet" && (
          <div className="space-y-4">
            {user.wallet ? (
              <>
                <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white shadow-lg">
                  <p className="text-sm font-medium text-indigo-200">Current Balance</p>
                  <p className="mt-2 text-4xl font-bold tracking-tight">{fmtBDT(user.wallet.balance)}</p>
                  <p className="mt-1.5 text-sm text-indigo-300">{user.wallet.transactions.length} recent transactions shown</p>
                </div>
                {user.wallet.transactions.length === 0 ? <EmptyState label="transactions" /> : (
                  <TableWrap>
                    <table className="w-full">
                      <thead className="border-b border-slate-100 bg-slate-50/60"><tr>
                        <Th>Type</Th><Th>Description</Th><Th>Amount</Th><Th>Date</Th>
                      </tr></thead>
                      <tbody className="divide-y divide-slate-50">
                        {user.wallet.transactions.map(t => (
                          <tr key={t.id} className="hover:bg-slate-50/70">
                            <Td><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${t.amount >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>{t.type}</span></Td>
                            <Td className="text-slate-600">{t.description}</Td>
                            <Td className={`font-bold ${t.amount >= 0 ? "text-emerald-700" : "text-red-600"}`}>{t.amount >= 0 ? "+" : ""}{fmtBDT(t.amount)}</Td>
                            <Td className="text-xs text-slate-400">{t.createdAt}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TableWrap>
                )}
              </>
            ) : <EmptyState label="wallet" />}
          </div>
        )}
      </div>
    </div>
  );
}
