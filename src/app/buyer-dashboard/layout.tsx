"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart2,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Gavel,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Menu,
  Package,
  Settings,
  ShoppingBag,
  Star,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const nav = [
  {
    group: "Main",
    items: [
      { label: "Overview",         href: "/buyer-dashboard",                  icon: LayoutDashboard },
      { label: "Active Bids",      href: "/buyer-dashboard/my-bids",          icon: Gavel },
      { label: "Auto-bid",         href: "/buyer-dashboard/my-bids/auto-bid", icon: Zap },
    ],
  },
  {
    group: "Orders",
    items: [
      { label: "My Orders",        href: "/buyer-dashboard/orders",   icon: Package },
      { label: "Wallet & History", href: "/buyer-dashboard/payments", icon: Wallet },
      { label: "Saved Lots",       href: "/buyer-dashboard/watchlist",icon: Bookmark },
    ],
  },
  {
    group: "Account",
    items: [
      { label: "Messages",         href: "/buyer-dashboard/messages", icon: MessageSquare, badge: "2" },
      { label: "My Reviews",       href: "/buyer-dashboard/reviews",  icon: Star },
      { label: "Settings",         href: "/buyer-dashboard/settings", icon: Settings },
    ],
  },
];

function SidebarContent({ onClose, onHide }: { onClose?: () => void; onHide?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-2 mb-5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 shadow-sm">
            <ShoppingBag size={14} className="text-white" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Buyer Panel</span>
        </div>
        {onHide && (
          <button
            type="button"
            onClick={onHide}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <ChevronLeft size={15} />
          </button>
        )}
      </div>

      {/* User profile strip */}
      {user && (
        <div className="mx-2 mb-5 flex items-center gap-3 rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-emerald-50/40 px-3 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-sm font-bold text-white shadow">
            {user.name?.[0]?.toUpperCase() ?? "B"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">{user.name}</p>
            <p className="truncate text-[11px] text-slate-400">Buyer Account</p>
          </div>
        </div>
      )}

      {/* Nav groups */}
      <nav className="flex-1 space-y-5 overflow-y-auto">
        {nav.map((group) => (
          <div key={group.group}>
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {group.group}
            </p>
            <div className="space-y-0.5">
              {group.items.map((link) => {
                const active =
                  pathname === link.href ||
                  (link.href !== "/buyer-dashboard" && pathname.startsWith(link.href));
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={onClose}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all
                      ${active
                        ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                  >
                    <Icon
                      size={16}
                      className={`shrink-0 transition-colors ${active ? "text-white" : "text-slate-400 group-hover:text-slate-600"}`}
                    />
                    <span className="flex-1 truncate">{link.label}</span>
                    {link.badge && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-white/25 text-white" : "bg-emerald-500 text-white"}`}>
                        {link.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer links */}
      <div className="mt-4 space-y-0.5 border-t border-slate-100 pt-4">
        <Link
          href="/marketplace"
          onClick={onClose}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
        >
          <BarChart2 size={16} className="shrink-0 text-slate-400" />
          Browse Marketplace
        </Link>
        <Link
          href="/api/auth/logout"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-500 hover:bg-rose-50 transition"
        >
          <LogOut size={16} className="shrink-0" />
          Sign Out
        </Link>
      </div>
    </div>
  );
}

export default function BuyerDashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);

  return (
    <div className="flex min-h-[calc(100vh-80px)]">
      {/* Mobile FAB */}
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg lg:hidden"
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Desktop sidebar */}
      {!sidebarHidden && (
        <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-slate-100 bg-white px-3 py-5 sticky top-0 h-screen overflow-y-auto">
          <SidebarContent onHide={() => setSidebarHidden(true)} />
        </aside>
      )}

      {/* Desktop collapse tab */}
      {sidebarHidden && (
        <button
          type="button"
          onClick={() => setSidebarHidden(false)}
          className="fixed left-0 top-1/2 z-50 -translate-y-1/2 hidden lg:flex items-center justify-center rounded-r-xl bg-emerald-500 px-1.5 py-4 shadow-lg hover:bg-emerald-600 transition"
          title="Show sidebar"
        >
          <ChevronRight size={15} className="text-white" />
        </button>
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto border-r border-slate-100 bg-white px-3 py-5 shadow-xl transition-transform lg:hidden
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </aside>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
