"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Menu, X } from "lucide-react";

const nav = [
  { label: "Overview", href: "/seller-dashboard" },
  { label: "My Lots", href: "/seller-dashboard/lots" },
  { label: "Create New Lot", href: "/seller-dashboard/create-lot" },
  { label: "My Marketplace Products", href: "/seller-dashboard/marketplace" },
  { label: "Orders", href: "/seller-dashboard/orders" },
  { label: "Earnings & Payouts", href: "/seller-dashboard/finance" },
  { label: "Messages", href: "/seller-dashboard/messages", badge: "3" },
  { label: "Performance", href: "/seller-dashboard/analytics" },
  { label: "Settings & Profile", href: "/seller-dashboard/settings" },
];

export default function SellerDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="mb-6 flex items-center justify-between px-1">
        <span className="text-lg font-bold text-slate-900">Seller Dashboard</span>
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
            (link.href !== "/seller-dashboard" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition
                ${active ? "bg-emerald-50 text-emerald-700" : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"}`}
            >
              {link.label}
              {link.badge && (
                <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {link.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Mobile header */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <span className="text-lg font-bold text-slate-900">Seller Dashboard</span>
        <button type="button" onClick={() => setMobileOpen((v) => !v)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Desktop sidebar */}
      {!sidebarHidden && (
        <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-slate-200 bg-white px-4 py-6 sticky top-0 h-screen overflow-y-auto">
          {sidebarContent}
        </aside>
      )}

      {/* Desktop show-sidebar tab */}
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

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto border-r border-slate-200 bg-white px-4 py-6 transition-transform duration-300 lg:hidden
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/20 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Main */}
      <main className="min-w-0 flex-1 px-6 py-8 pt-20 lg:pt-8">{children}</main>
    </div>
  );
}
