"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

type Notif = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string;
  read: boolean;
  createdAt: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_ICON: Record<string, string> = {
  LOT_RECEIVED:    "📦",
  QC_ASSIGNED:     "🔬",
  QC_SUBMITTED:    "📋",
  QC_APPROVED:     "✅",
  QC_REJECTED:     "❌",
  ORDER_PLACED:    "🛒",
  ORDER_ACCEPTED:  "🤝",
  ORDER_DECLINED:  "🚫",
  ORDER_DISPATCHED:"🚚",
  TRUCK_SUBMITTED: "🚛",
  TRUCK_APPROVED:  "✅",
  TRUCK_REJECTED:  "🚫",
};

const TYPE_BG: Record<string, string> = {
  LOT_RECEIVED:    "bg-blue-100 text-blue-700",
  QC_ASSIGNED:     "bg-violet-100 text-violet-700",
  QC_SUBMITTED:    "bg-amber-100 text-amber-700",
  QC_APPROVED:     "bg-emerald-100 text-emerald-700",
  QC_REJECTED:     "bg-red-100 text-red-600",
  ORDER_PLACED:    "bg-orange-100 text-orange-600",
  ORDER_ACCEPTED:  "bg-emerald-100 text-emerald-700",
  ORDER_DECLINED:  "bg-red-100 text-red-600",
  ORDER_DISPATCHED:"bg-violet-100 text-violet-700",
  TRUCK_SUBMITTED: "bg-teal-100 text-teal-700",
  TRUCK_APPROVED:  "bg-emerald-100 text-emerald-700",
  TRUCK_REJECTED:  "bg-red-100 text-red-600",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function smartDateLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yestStart  = new Date(todayStart.getTime() - 86_400_000);
  const weekStart  = new Date(todayStart.getTime() - 6 * 86_400_000);

  if (d >= todayStart) return "Today";
  if (d >= yestStart)  return "Yesterday";
  if (d >= weekStart)  return "This Week";
  return d.toLocaleDateString("en-BD", { year: "numeric", month: "long", day: "numeric" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" });
}

function formatFull(iso: string): string {
  return new Date(iso).toLocaleDateString("en-BD", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function groupBySmartDate(notifs: Notif[]): [string, Notif[]][] {
  const map = new Map<string, Notif[]>();
  for (const n of notifs) {
    const label = smartDateLabel(n.createdAt);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(n);
  }
  return Array.from(map.entries());
}

// ── Notification card ─────────────────────────────────────────────────────────

function NotifCard({
  n,
  isNew,
  onClick,
}: {
  n: Notif;
  isNew: boolean;
  onClick: (n: Notif) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(n)}
      className={`flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-slate-50 ${
        isNew ? "bg-emerald-50/60" : "bg-white"
      }`}
    >
      {/* Icon badge */}
      <div
        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${
          TYPE_BG[n.type] ?? "bg-slate-100 text-slate-500"
        }`}
      >
        {TYPE_ICON[n.type] ?? "🔔"}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-semibold ${isNew ? "text-slate-900" : "text-slate-700"}`}>
            {n.title}
          </p>
          {isNew && <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
        </div>
        <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{n.message}</p>
        <p className="mt-1 text-[11px] text-slate-400">
          {smartDateLabel(n.createdAt) === "Today" || smartDateLabel(n.createdAt) === "Yesterday"
            ? formatTime(n.createdAt)
            : formatFull(n.createdAt)}
        </p>
      </div>

      {/* Chevron */}
      <svg
        className="mt-1.5 h-4 w-4 shrink-0 text-slate-300"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

function Divider() {
  return <div className="mx-5 h-px bg-slate-50" />;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const router = useRouter();
  const [all, setAll]           = useState<Notif[]>([]);
  const [unreadCount, setCount] = useState(0);
  const [loading, setLoading]   = useState(true);

  const fetchNotifs = useCallback(async () => {
    try {
      const data = await api.get<{ notifications: Notif[]; unreadCount: number }>(
        "/api/notifications"
      );
      setAll(data.notifications ?? []);
      setCount(data.unreadCount ?? 0);
    } catch {
      // unauthenticated — page shows empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  const markAllRead = async () => {
    await api.post("/api/notifications", {});
    setAll((prev) => prev.map((n) => ({ ...n, read: true })));
    setCount(0);
  };

  const handleClick = async (n: Notif) => {
    if (!n.read) {
      await api.patch(`/api/notifications/${n.id}/read`, {});
      setAll((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setCount((c) => Math.max(0, c - 1));
    }
    router.push(n.link);
  };

  const newNotifs  = all.filter((n) => !n.read);
  const prevNotifs = all.filter((n) => n.read);
  const prevGroups = groupBySmartDate(prevNotifs);

  // ── Loading skeleton
  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="h-8 w-52 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-5 w-72 animate-pulse rounded bg-slate-100" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">

      {/* ── Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">
            {all.length === 0
              ? "No notifications yet."
              : `${all.length} total · ${unreadCount} unread`}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="shrink-0 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* ── Empty state */}
      {all.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-24 text-center">
          <span className="text-5xl">🔔</span>
          <p className="mt-4 text-sm font-semibold text-slate-500">No notifications yet.</p>
          <p className="mt-1 text-xs text-slate-400">
            Updates about your lots, QC, and orders will appear here.
          </p>
        </div>
      )}

      {/* ══ NEW section ══ */}
      {newNotifs.length > 0 && (
        <section>
          {/* Section header */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
                {newNotifs.length}
              </span>
              <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-700">New</h2>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
            {newNotifs.map((n, idx) => (
              <div key={n.id}>
                <NotifCard n={n} isNew onClick={handleClick} />
                {idx < newNotifs.length - 1 && <Divider />}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ══ PREVIOUS section ══ */}
      {prevNotifs.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Previous</h2>
            <span className="text-xs text-slate-300">({prevNotifs.length})</span>
          </div>

          <div className="space-y-5">
            {prevGroups.map(([day, items]) => (
              <div key={day}>
                {/* Day label */}
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {day}
                </p>
                <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                  {items.map((n, idx) => (
                    <div key={n.id}>
                      <NotifCard n={n} isNew={false} onClick={handleClick} />
                      {idx < items.length - 1 && <Divider />}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Hint when all are new (nothing in previous yet) */}
      {all.length > 0 && prevNotifs.length === 0 && (
        <p className="text-center text-xs text-slate-400">
          Mark notifications as read to move them to the Previous section.
        </p>
      )}

    </div>
  );
}
