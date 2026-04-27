"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ChevronLeft, ChevronRight, Menu, X,
  LayoutDashboard, ShoppingBag, History, TrendingUp,
} from "lucide-react";

const nav = [
  { label: "Overview",        href: "/aroth-dashboard",         icon: LayoutDashboard },
  { label: "Price Chart",     href: "/aroth-dashboard/prices",  icon: TrendingUp },
  { label: "My Orders",       href: "/aroth-dashboard/orders",  icon: ShoppingBag },
  { label: "Settled History", href: "/aroth-dashboard/history", icon: History },
];

export default function ArothLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="mb-6 flex items-center justify-between px-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">Aroth Panel</p>
        <button
          type="button"
          onClick={() => setSidebarHidden(true)}
          className="hidden lg:flex rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          title="Hide sidebar"
        >
          <ChevronLeft size={16} />
        </button>
      </div>
      <nav className="flex-1 space-y-1">
        {nav.map((link) => {
          const active =
            pathname === link.href ||
            (link.href !== "/aroth-dashboard" && pathname.startsWith(link.href));
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition
                ${active ? "bg-emerald-50 text-emerald-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
            >
              <Icon size={17} className={active ? "text-emerald-600" : "text-slate-400"} />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="flex min-h-[calc(100vh-80px)]">
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg lg:hidden"
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {!sidebarHidden && (
        <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-slate-100 bg-white px-3 py-6 shadow-sm sticky top-0 h-screen overflow-y-auto">
          {sidebarContent}
        </aside>
      )}

      {sidebarHidden && (
        <button
          type="button"
          onClick={() => setSidebarHidden(false)}
          className="fixed left-0 top-1/2 z-50 -translate-y-1/2 hidden lg:flex items-center justify-center rounded-r-xl bg-emerald-600 px-1.5 py-4 shadow-lg hover:bg-emerald-700 transition"
          title="Show sidebar"
        >
          <ChevronRight size={15} className="text-white" />
        </button>
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto border-r border-slate-100 bg-white px-3 py-6 shadow-sm transition-transform lg:hidden
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/20 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <main className="min-w-0 flex-1 px-6 py-8 lg:px-8">{children}</main>
    </div>
  );
}
