"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function NotificationBell() {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifs = useCallback(async () => {
    try {
      const data = await api.get<{ notifications: Notif[]; unreadCount: number }>(
        "/api/notifications"
      );
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // silently ignore (unauthenticated pages)
    }
  }, []);

  // Initial load + poll every 30 seconds
  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleMarkAllRead = async () => {
    await api.post("/api/notifications", {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleClick = async (n: Notif) => {
    if (!n.read) {
      await api.patch(`/api/notifications/${n.id}/read`, {});
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    router.push(n.link);
  };

  const preview = notifications.slice(0, 8);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white transition hover:border-emerald-300 hover:bg-emerald-50"
        aria-label="Notifications"
      >
        <svg
          className="h-4.5 w-4.5 text-slate-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[9px] font-bold text-white leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-slate-100 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto">
            {preview.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-slate-400">No notifications yet.</p>
              </div>
            ) : (
              <ul>
                {preview.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleClick(n)}
                      className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-slate-50 ${
                        !n.read ? "bg-emerald-50/60" : ""
                      }`}
                    >
                      <span className="mt-0.5 shrink-0 text-lg leading-none">
                        {TYPE_ICON[n.type] ?? "🔔"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`truncate text-xs font-semibold ${!n.read ? "text-slate-900" : "text-slate-700"}`}>
                            {n.title}
                          </p>
                          <span className="shrink-0 text-[10px] text-slate-400">
                            {timeAgo(n.createdAt)}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                          {n.message}
                        </p>
                      </div>
                      {!n.read && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                      )}
                    </button>
                    <div className="mx-4 h-px bg-slate-50" />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-50 px-4 py-2.5">
            <button
              type="button"
              onClick={() => { setOpen(false); router.push("/notifications"); }}
              className="w-full rounded-lg py-1.5 text-center text-xs font-semibold text-emerald-600 hover:bg-emerald-50"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
