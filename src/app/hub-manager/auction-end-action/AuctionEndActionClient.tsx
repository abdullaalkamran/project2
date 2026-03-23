"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { FlowLot } from "@/lib/product-flow";
import {
  AlertTriangle, RefreshCw, Tag, Clock,
  CheckCircle2, Phone, Package, User,
  Scale, BadgeIndianRupee, CalendarClock, ShieldCheck, X,
} from "lucide-react";
import Link from "next/link";

type ActionRow = {
  lotCode: string;
  product: string;
  seller: string;
  sellerPhone: string | null;
  qty: string;
  askingPrice: string;
  minBidRate: string | null;
  reason: "auction_unsold" | "fixed_price_review" | "auction_ended" | "rescheduled";
  auctionEndsAt: string | null;
  createdAt: string;
};

type StaffUser = { id: string; name: string };

const REASON_CONFIG = {
  auction_unsold: {
    label: "Auction Unsold",
    pill: "bg-orange-50 text-orange-700 border-orange-200",
    card: "border-l-orange-400",
    icon: <AlertTriangle size={14} />,
    desc: "Auction ended with no bids. Waiting for seller to reschedule or convert to fixed price.",
  },
  fixed_price_review: {
    label: "Fixed Price Review",
    pill: "bg-violet-50 text-violet-700 border-violet-200",
    card: "border-l-violet-400",
    icon: <Tag size={14} />,
    desc: "Seller converted to fixed price. Review and approve or reject.",
  },
  rescheduled: {
    label: "Rescheduled — Re-inspection Required",
    pill: "bg-sky-50 text-sky-700 border-sky-200",
    card: "border-l-sky-400",
    icon: <RefreshCw size={14} />,
    desc: "Seller set a new auction time. Assign QC team for re-inspection before going live.",
  },
  auction_ended: {
    label: "Auction Ended",
    pill: "bg-rose-50 text-rose-700 border-rose-200",
    card: "border-l-rose-400",
    icon: <Clock size={14} />,
    desc: "Auction cycle has ended. Awaiting seller action.",
  },
} as const;

export default function AuctionEndActionClient() {
  const [rows, setRows] = useState<ActionRow[]>([]);
  const [loading, setLoading] = useState(true);

  // QC assign modal state
  const [assignTarget, setAssignTarget] = useState<ActionRow | null>(null);
  const [leaders, setLeaders] = useState<StaffUser[]>([]);
  const [checkers, setCheckers] = useState<StaffUser[]>([]);
  const [selectedLeader, setSelectedLeader] = useState("");
  const [selectedChecker, setSelectedChecker] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [lots, orders] = await Promise.all([
          api.get<FlowLot[]>("/api/flow/lots"),
          api.get<{ lotId: string }[]>("/api/flow/dispatch/orders").catch(() => [] as { lotId: string }[]),
        ]);
        const confirmedLotIds = new Set(orders.map((o) => o.lotId));
        setRows(
          lots
            .filter((l) =>
              (["AUCTION_UNSOLD", "AUCTION_ENDED", "FIXED_PRICE_REVIEW"].includes(l.status) ||
               (l.status === "QC_PASSED" && l.leaderDecision === "Pending")) &&
              !confirmedLotIds.has(l.id)
            )
            .map((l) => ({
              lotCode: l.id,
              product: l.title,
              seller: l.sellerName,
              sellerPhone: l.sellerPhone ?? null,
              qty: `${l.quantity.toLocaleString()} ${l.unit}`,
              askingPrice: `৳${l.askingPricePerKg}/kg`,
              minBidRate: l.minBidRate ? `৳${l.minBidRate}/kg` : null,
              reason:
                l.status === "QC_PASSED" && l.leaderDecision === "Pending"
                  ? "rescheduled"
                  : l.status === "FIXED_PRICE_REVIEW"
                  ? "fixed_price_review"
                  : l.status === "AUCTION_UNSOLD"
                  ? "auction_unsold"
                  : "auction_ended",
              auctionEndsAt: l.auctionEndsAt ?? null,
              createdAt: new Date(l.createdAt).toLocaleDateString(),
            }))
        );
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  async function openAssignModal(row: ActionRow) {
    setAssignTarget(row);
    setSelectedLeader("");
    setSelectedChecker("");
    try {
      const staff = await api.get<{ leaders: StaffUser[]; checkers: StaffUser[] }>("/api/hub-manager/qc-staff");
      setLeaders(staff.leaders);
      setCheckers(staff.checkers);
    } catch {
      setLeaders([]);
      setCheckers([]);
    }
  }

  async function handleAssign() {
    if (!assignTarget || !selectedLeader || !selectedChecker) return;
    setAssigning(true);
    try {
      await api.patch(`/api/flow/lots/${assignTarget.lotCode}/assign`, {
        leaderId: selectedLeader,
        checkerId: selectedChecker,
      });
      setRows((p) => p.filter((r) => r.lotCode !== assignTarget.lotCode));
      setAssignTarget(null);
    } catch {
      // keep modal open on error
    } finally {
      setAssigning(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-300" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 py-16">
        <CheckCircle2 className="h-8 w-8 text-emerald-400" />
        <p className="text-sm font-semibold text-emerald-700">All clear — no pending auction actions.</p>
        <p className="text-xs text-emerald-500">Lots requiring seller or approval action will appear here.</p>
      </div>
    );
  }

  const grouped = rows.reduce<Record<ActionRow["reason"], ActionRow[]>>(
    (acc, r) => { acc[r.reason].push(r); return acc; },
    { rescheduled: [], fixed_price_review: [], auction_unsold: [], auction_ended: [] }
  );
  const order: ActionRow["reason"][] = ["rescheduled", "fixed_price_review", "auction_unsold", "auction_ended"];

  return (
    <>
      {/* ── QC Assign Modal ── */}
      {assignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <p className="font-bold text-slate-900">Assign QC Team for Re-inspection</p>
                <p className="mt-0.5 font-mono text-xs text-slate-400">{assignTarget.lotCode} · {assignTarget.product}</p>
              </div>
              <button type="button" onClick={() => setAssignTarget(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs text-sky-800">
                <p className="font-semibold">Re-inspection required before going live.</p>
                <p className="mt-0.5">Seller rescheduled this lot with a new auction time ending{" "}
                  {assignTarget.auctionEndsAt ? new Date(assignTarget.auctionEndsAt).toLocaleString() : "—"}.
                  Assign QC team to confirm product condition.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">QC Leader *</label>
                <select
                  value={selectedLeader}
                  onChange={(e) => setSelectedLeader(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
                >
                  <option value="">Select QC Leader</option>
                  {leaders.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">QC Checker *</label>
                <select
                  value={selectedChecker}
                  onChange={(e) => setSelectedChecker(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
                >
                  <option value="">Select QC Checker</option>
                  {checkers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleAssign}
                disabled={assigning || !selectedLeader || !selectedChecker}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
              >
                <ShieldCheck size={15} />
                {assigning ? "Assigning…" : "Assign & Start Re-inspection"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {/* Summary chips */}
        <div className="flex flex-wrap gap-3">
          {order.map((key) => {
            const cfg = REASON_CONFIG[key];
            const count = grouped[key].length;
            if (count === 0) return null;
            return (
              <div key={key} className={`flex items-center gap-2 rounded-xl border px-4 py-2 ${cfg.pill}`}>
                {cfg.icon}
                <span className="text-xs font-semibold">{cfg.label}</span>
                <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-bold">{count}</span>
              </div>
            );
          })}
        </div>

        {/* Cards grouped by reason */}
        {order.map((key) => {
          const group = grouped[key];
          if (group.length === 0) return null;
          const cfg = REASON_CONFIG[key];
          return (
            <section key={key} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${cfg.pill}`}>
                  {cfg.icon} {cfg.label}
                </span>
                <span className="text-xs text-slate-400">{cfg.desc}</span>
              </div>

              <div className="space-y-3">
                {group.map((row) => (
                  <div
                    key={row.lotCode}
                    className={`rounded-2xl border border-slate-100 bg-white shadow-sm border-l-4 ${cfg.card}`}
                  >
                    {/* Top row */}
                    <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-4 pb-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                          <Package size={18} className="text-slate-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{row.product}</p>
                          <p className="font-mono text-[11px] text-slate-400">{row.lotCode}</p>
                        </div>
                      </div>

                      {row.reason === "rescheduled" ? (
                        <button
                          type="button"
                          onClick={() => openAssignModal(row)}
                          className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-sky-700"
                        >
                          <ShieldCheck size={13} /> Assign for Re-inspection
                        </button>
                      ) : (
                        <Link
                          href={`/hub-manager/inventory/${row.lotCode}`}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                        >
                          View Details →
                        </Link>
                      )}
                    </div>

                    {/* Detail chips */}
                    <div className="flex flex-wrap gap-3 border-t border-slate-100 px-5 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <User size={12} className="text-slate-400" />
                        <span className="font-medium text-slate-700">{row.seller}</span>
                      </div>
                      {row.sellerPhone && (
                        <a href={`tel:${row.sellerPhone}`} className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:underline">
                          <Phone size={12} /> {row.sellerPhone}
                        </a>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Scale size={12} className="text-slate-400" /> {row.qty}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <BadgeIndianRupee size={12} className="text-slate-400" />
                        Asking: <span className="font-semibold text-slate-700">{row.askingPrice}</span>
                      </div>
                      {row.minBidRate && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <BadgeIndianRupee size={12} className="text-emerald-500" />
                          Market: <span className="font-semibold text-emerald-700">{row.minBidRate}</span>
                        </div>
                      )}
                      {row.reason === "rescheduled" && row.auctionEndsAt && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-700">
                          <CalendarClock size={12} /> New end: {new Date(row.auctionEndsAt).toLocaleString()}
                        </div>
                      )}
                      {row.reason !== "rescheduled" && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Clock size={12} /> {row.createdAt}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
