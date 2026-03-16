"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Plus,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  X,
  CheckCircle2,
  Clock,
  RefreshCw,
  ChevronRight,
  Banknote,
  CreditCard,
  Smartphone,
  XCircle,
  Hourglass,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  reference: string | null;
  createdAt: string;
}

interface OrderPayment {
  id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  createdAt: string;
}

interface DepositRequest {
  id: string;
  depositCode: string;
  amount: number;
  method: string;
  accountDetails: string | null;
  status: string; // PENDING | APPROVED | REJECTED
  rejectedReason: string | null;
  requestedAt: string;
  processedAt: string | null;
}

interface WalletData {
  balance: number;
  totalDeposited: number;
  totalSpent: number;
  transactions: WalletTransaction[];
  orderPayments: OrderPayment[];
  depositRequests: DepositRequest[];
}

type FilterTab = "all" | "deposit" | "payment" | "refund";

type UnifiedEntry = {
  key: string;
  type: string;
  rawType: string;
  amount: number;
  description: string;
  isCredit: boolean;
  date: string;
  dateRaw: Date;
  status: string;
  reference: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) => "৳ " + Math.round(n).toLocaleString("en-IN");

const METHODS = [
  { value: "bKash",         label: "bKash",         icon: <Smartphone size={15} className="text-pink-500" /> },
  { value: "Nagad",         label: "Nagad",         icon: <Smartphone size={15} className="text-orange-500" /> },
  { value: "Bank Transfer", label: "Bank Transfer", icon: <Banknote   size={15} className="text-blue-500"  /> },
  { value: "Card",          label: "Card",          icon: <CreditCard size={15} className="text-slate-500" /> },
];

function txTypeLabel(raw: string) {
  if (raw === "DEPOSIT") return "Deposit";
  if (raw === "REFUND")  return "Refund";
  if (raw === "PAYMENT") return "Payment";
  return raw.charAt(0) + raw.slice(1).toLowerCase();
}

function TxIcon({ type, isCredit }: { type: string; isCredit: boolean }) {
  if (type === "DEPOSIT")
    return <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100"><ArrowDownLeft size={17} className="text-emerald-600" /></div>;
  if (type === "REFUND")
    return <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100"><RotateCcw size={15} className="text-blue-600" /></div>;
  if (!isCredit)
    return <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50"><ArrowUpRight size={17} className="text-red-500" /></div>;
  return <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100"><ShoppingCart size={15} className="text-slate-500" /></div>;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "Completed")
    return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700"><CheckCircle2 size={10} />Completed</span>;
  if (status === "Pending")
    return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700"><Clock size={10} />Pending</span>;
  return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">{status}</span>;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PaymentsPage() {
  const [data, setData]           = useState<WalletData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefresh]  = useState(false);
  const [filter, setFilter]       = useState<FilterTab>("all");
  const [search, setSearch]       = useState("");

  // Deposit modal
  const [depositOpen, setDepositOpen]       = useState(false);
  const [depositSuccess, setDepositSuccess] = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [amount, setAmount]                 = useState("");
  const [method, setMethod]                 = useState("bKash");
  const [accountDetails, setAccountDetails] = useState("");
  const [amountError, setAmountError]       = useState("");

  const fetchWallet = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefresh(true);
    try {
      const res = await fetch("/api/buyer-dashboard/wallet");
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error("Failed to load wallet data");
    } finally {
      setLoading(false);
      setRefresh(false);
    }
  }, []);

  useEffect(() => { void fetchWallet(); }, [fetchWallet]);

  const openDeposit = () => {
    setAmount(""); setMethod("bKash"); setAccountDetails("");
    setAmountError(""); setDepositSuccess(false); setDepositOpen(true);
  };

  const handleDeposit = async () => {
    const num = Number(amount);
    if (!amount || isNaN(num) || num < 100)  { setAmountError("Minimum deposit is ৳ 100");       return; }
    if (num > 1_000_000)                     { setAmountError("Maximum deposit is ৳ 10,00,000"); return; }
    setAmountError("");
    setSubmitting(true);
    try {
      const res  = await fetch("/api/buyer-dashboard/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: num, method, accountDetails: accountDetails || undefined }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.message || "Deposit failed"); return; }
      setDepositSuccess(true);
      await fetchWallet(true);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Unified + filtered entries ─────────────────────────────────────────────
  const unified: UnifiedEntry[] = data ? [
    ...data.transactions.map((t) => ({
      key:       t.id,
      type:      txTypeLabel(t.type),
      rawType:   t.type,
      amount:    t.amount,
      description: t.description ?? "",
      isCredit:  t.type !== "PAYMENT",
      date:      new Date(t.createdAt).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" }),
      dateRaw:   new Date(t.createdAt),
      status:    "Completed",
      reference: t.reference ?? null,
    })),
    ...data.orderPayments.map((o) => ({
      key:       o.id,
      type:      "Payment",
      rawType:   "PAYMENT",
      amount:    o.amount,
      description: o.description,
      isCredit:  false,
      date:      new Date(o.createdAt).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" }),
      dateRaw:   new Date(o.createdAt),
      status:    o.status,
      reference: o.id,
    })),
  ].sort((a, b) => b.dateRaw.getTime() - a.dateRaw.getTime()) : [];

  const filtered = unified.filter((t) => {
    const matchFilter =
      filter === "all"     ? true :
      filter === "deposit" ? t.rawType === "DEPOSIT" :
      filter === "payment" ? t.rawType === "PAYMENT" :
      filter === "refund"  ? t.rawType === "REFUND"  : true;
    const matchSearch = search
      ? t.description.toLowerCase().includes(search.toLowerCase()) ||
        (t.reference ?? "").toLowerCase().includes(search.toLowerCase())
      : true;
    return matchFilter && matchSearch;
  });

  const depositCount  = unified.filter((t) => t.rawType === "DEPOSIT").length;
  const paymentCount  = unified.filter((t) => t.rawType === "PAYMENT").length;
  const refundCount   = unified.filter((t) => t.rawType === "REFUND").length;

  const FILTER_TABS: { key: FilterTab; label: string; count: number }[] = [
    { key: "all",     label: "All",      count: unified.length },
    { key: "deposit", label: "Deposits", count: depositCount   },
    { key: "payment", label: "Payments", count: paymentCount   },
    { key: "refund",  label: "Refunds",  count: refundCount    },
  ];

  return (
    <div className="space-y-7 pb-12">

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Wallet &amp; Payments</h1>
          <p className="text-slate-500 text-sm">Manage your balance, deposits, and full transaction history.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchWallet(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            onClick={openDeposit}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
          >
            <Plus size={15} />
            Add Funds
          </button>
        </div>
      </div>

      {/* ── Wallet hero card ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-7 text-white shadow-lg">
        {/* decorative circles */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5" />

        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-100">
              <Wallet size={16} />
              <span className="text-sm font-medium">Available Balance</span>
            </div>
            {loading ? (
              <div className="h-10 w-40 animate-pulse rounded-xl bg-white/20" />
            ) : (
              <p className="text-4xl font-bold tracking-tight">{fmt(data?.balance ?? 0)}</p>
            )}
            <p className="text-xs text-emerald-200 pt-0.5">Paikari Wallet · BDT</p>
          </div>

          <button
            type="button"
            onClick={openDeposit}
            className="flex items-center gap-2 rounded-2xl border border-white/30 bg-white/20 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/30 transition"
          >
            <Plus size={15} />
            Deposit
          </button>
        </div>

        {/* Stats strip */}
        <div className="relative mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            { label: "Total Deposited", value: data?.totalDeposited ?? 0, icon: <TrendingUp  size={14} />, color: "text-emerald-200" },
            { label: "Total Spent",     value: data?.totalSpent     ?? 0, icon: <TrendingDown size={14} />, color: "text-red-200"     },
            { label: "Transactions",    value: null, count: unified.length, icon: <ShoppingCart size={14} />, color: "text-blue-200" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <div className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${s.color}`}>
                {s.icon}
                {s.label}
              </div>
              {loading ? (
                <div className="mt-1.5 h-5 w-24 animate-pulse rounded bg-white/20" />
              ) : (
                <p className="mt-1.5 text-lg font-bold text-white">
                  {s.count !== undefined ? s.count : fmt(s.value!)}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Pending Deposit Requests ── */}
      {(data?.depositRequests ?? []).length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-800">Deposit Requests</h2>
          <div className="space-y-2">
            {(data?.depositRequests ?? []).map((dr) => (
              <div
                key={dr.id}
                className={`flex flex-wrap items-center gap-4 rounded-2xl border px-5 py-4 ${
                  dr.status === "PENDING"  ? "border-amber-200  bg-amber-50"   :
                  dr.status === "APPROVED" ? "border-emerald-200 bg-emerald-50" :
                                             "border-red-100    bg-red-50"
                }`}
              >
                {/* Icon */}
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  dr.status === "PENDING"  ? "bg-amber-100"   :
                  dr.status === "APPROVED" ? "bg-emerald-100" : "bg-red-100"
                }`}>
                  {dr.status === "PENDING"  && <Hourglass   size={15} className="text-amber-600"   />}
                  {dr.status === "APPROVED" && <CheckCircle2 size={15} className="text-emerald-600" />}
                  {dr.status === "REJECTED" && <XCircle      size={15} className="text-red-500"     />}
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-800 text-sm">Deposit Request</span>
                    <span className="font-mono text-[11px] text-slate-400">{dr.depositCode}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {dr.method}{dr.accountDetails ? ` · ${dr.accountDetails}` : ""}
                  </p>
                  {dr.status === "REJECTED" && dr.rejectedReason && (
                    <p className="text-xs text-red-600">Reason: {dr.rejectedReason}</p>
                  )}
                  <p className="text-[11px] text-slate-400">
                    Requested {new Date(dr.requestedAt).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" })}
                    {dr.processedAt && ` · Processed ${new Date(dr.processedAt).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" })}`}
                  </p>
                </div>

                {/* Amount + status */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-base font-bold text-slate-900 tabular-nums">{fmt(dr.amount)}</span>
                  {dr.status === "PENDING"  && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100   px-2.5 py-0.5 text-[11px] font-semibold text-amber-700"><Hourglass   size={10} />Awaiting Approval</span>}
                  {dr.status === "APPROVED" && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700"><CheckCircle2 size={10} />Approved</span>}
                  {dr.status === "REJECTED" && <span className="inline-flex items-center gap-1 rounded-full bg-red-100    px-2.5 py-0.5 text-[11px] font-semibold text-red-600"><XCircle      size={10} />Rejected</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Transaction History ── */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-800">Transaction History</h2>

          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by description or reference…"
            className="w-64 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setFilter(t.key)}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                filter === t.key
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              {t.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                filter === t.key ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"
              }`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* List */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {loading ? (
            <div className="divide-y divide-slate-50">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="h-9 w-9 animate-pulse rounded-full bg-slate-100" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-32 animate-pulse rounded bg-slate-100" />
                    <div className="h-3 w-48 animate-pulse rounded bg-slate-50" />
                  </div>
                  <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Wallet size={32} className="mb-3 text-slate-200" />
              <p className="font-medium">No transactions found</p>
              <p className="mt-1 text-sm">
                {filter !== "all" || search ? "Try changing your filter or search." : "Your transaction history will appear here."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filtered.map((t) => (
                <div
                  key={t.key}
                  className="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors"
                >
                  {/* Icon */}
                  <TxIcon type={t.rawType} isCredit={t.isCredit} />

                  {/* Details */}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-800 text-sm">{t.type}</span>
                      {t.rawType === "DEPOSIT" && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Credit</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate max-w-xs">
                      {t.description || (t.reference ? `Ref: ${t.reference}` : "—")}
                    </p>
                    <p className="text-[11px] text-slate-400">{t.date}</p>
                  </div>

                  {/* Amount + status */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`text-base font-bold tabular-nums ${t.isCredit ? "text-emerald-600" : "text-slate-900"}`}>
                      {t.isCredit ? "+" : "−"}{fmt(t.amount)}
                    </span>
                    <StatusBadge status={t.status} />
                  </div>

                  {/* Arrow */}
                  <ChevronRight size={14} className="text-slate-300 shrink-0 hidden sm:block" />
                </div>
              ))}
            </div>
          )}

          {/* Footer count */}
          {!loading && filtered.length > 0 && (
            <div className="border-t border-slate-50 px-5 py-3 text-xs text-slate-400">
              Showing {filtered.length} of {unified.length} transactions
            </div>
          )}
        </div>
      </div>

      {/* ── Deposit Modal ── */}
      {depositOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setDepositOpen(false); }}
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
            {depositSuccess ? (
              <div className="space-y-5 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                  <Hourglass size={32} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Request Submitted!</h3>
                  <p className="mt-1.5 text-sm text-slate-500">
                    Your deposit of <strong className="text-slate-800">{fmt(Number(amount))}</strong> via{" "}
                    <strong className="text-slate-800">{method}</strong> is awaiting admin approval.
                    Funds will be credited once approved.
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-3 text-sm flex items-center gap-3">
                  <Hourglass size={18} className="text-amber-500 shrink-0" />
                  <p className="text-amber-700 font-medium text-left">Pending admin approval — you will be notified once processed.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDepositOpen(false)}
                  className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Add Funds</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Minimum ৳ 100 · Maximum ৳ 10,00,000</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDepositOpen(false)}
                    className="rounded-full p-1.5 hover:bg-slate-100 transition"
                  >
                    <X size={16} className="text-slate-400" />
                  </button>
                </div>

                {/* Current balance */}
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Current Balance</span>
                  <span className="text-lg font-bold text-emerald-700">{fmt(data?.balance ?? 0)}</span>
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Amount (৳)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setAmountError(""); }}
                    placeholder="e.g. 5000"
                    className={`w-full rounded-xl border px-4 py-3 text-base font-semibold outline-none transition focus:ring-2 ${
                      amountError ? "border-red-300 focus:border-red-400 focus:ring-red-100" : "border-slate-200 focus:border-emerald-400 focus:ring-emerald-100"
                    }`}
                  />
                  {amountError && <p className="text-xs text-red-500">{amountError}</p>}
                  {/* Quick amounts */}
                  <div className="flex gap-2 pt-0.5">
                    {[500, 1000, 5000, 10000].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => { setAmount(String(v)); setAmountError(""); }}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 transition"
                      >
                        +{v.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Method */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    {METHODS.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setMethod(m.value)}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                          method === m.value
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {m.icon}
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Account reference */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Account / Reference <span className="font-normal text-slate-400">(optional)</span></label>
                  <input
                    type="text"
                    value={accountDetails}
                    onChange={(e) => setAccountDetails(e.target.value)}
                    placeholder="e.g. 017XXXXXXXX"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setDepositOpen(false)}
                    className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeposit}
                    disabled={submitting}
                    className="flex-1 rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
                  >
                    {submitting ? "Processing…" : `Deposit ${amount ? fmt(Number(amount)) : ""}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
