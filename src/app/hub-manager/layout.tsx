"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChevronLeft, ChevronRight, Menu, X,
  LayoutDashboard, Package, ShieldCheck, Layers,
  Users, Truck, UserCog, BarChart3, SendHorizonal, Store, BadgeDollarSign,
} from "lucide-react";

const nav = [
  { label: "Overview",           href: "/hub-manager",           icon: LayoutDashboard },
  { label: "New Lots",           href: "/hub-manager/lots",      icon: Package },
  { label: "QC Management",      href: "/hub-manager/qc",        icon: ShieldCheck },
  { label: "Inventory",          href: "/hub-manager/inventory", icon: Layers },
  { label: "Outbound Dispatch",  href: "/hub-manager/dispatch",  icon: SendHorizonal },
  { label: "Registered Sellers", href: "/hub-manager/sellers",   icon: Users },
  { label: "Transport",          href: "/hub-manager/trucks",    icon: Truck },
  { label: "Manage Staff",       href: "/hub-manager/staff",     icon: UserCog },
  { label: "Manage Aroths",       href: "/hub-manager/aroths",       icon: Users },
  { label: "Aroth Orders",        href: "/hub-manager/aroth-orders",  icon: Store },
  { label: "Aroth Finance",      href: "/hub-manager/aroth-finance", icon: BadgeDollarSign },
  { label: "Hub Reports",        href: "/hub-manager/reports",       icon: BarChart3 },
];

export default function HubManagerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [pendingTrucks, setPendingTrucks] = useState(0);
  const [pendingDispatch, setPendingDispatch] = useState(0);

  useEffect(() => {
    type DispatchOrder = { dispatched: boolean };
    Promise.all([
      fetch("/api/flow/trucks/registrations").then((r) => r.ok ? r.json() as Promise<unknown[]> : Promise.resolve([])),
      fetch("/api/flow/dispatch/orders").then((r) => r.ok ? r.json() as Promise<DispatchOrder[]> : Promise.resolve([])),
    ])
      .then(([trucks, orders]) => {
        setPendingTrucks(Array.isArray(trucks) ? trucks.length : 0);
        setPendingDispatch(Array.isArray(orders) ? orders.filter((o) => !o.dispatched).length : 0);
      })
      .catch(() => { setPendingTrucks(0); setPendingDispatch(0); });
  }, [pathname]);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="mb-6 flex items-center justify-between px-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-500">Hub Manager</p>
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
            (link.href !== "/hub-manager" && pathname.startsWith(link.href));
          const badge =
            link.href === "/hub-manager/trucks" && pendingTrucks > 0
              ? String(pendingTrucks)
              : link.href === "/hub-manager/dispatch" && pendingDispatch > 0
              ? String(pendingDispatch)
              : undefined;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`flex w-full items-center gap-3 justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition
                ${active ? "bg-amber-50 text-amber-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
            >
              <span className="flex items-center gap-3">
                <Icon size={17} className={active ? "text-amber-600" : "text-slate-400"} />
                {link.label}
              </span>
              {badge && (
                <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="flex min-h-[calc(100vh-80px)]">
      <button type="button" onClick={() => setMobileOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg lg:hidden" aria-label="Toggle menu">
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
          className="fixed left-0 top-1/2 z-50 -translate-y-1/2 hidden lg:flex items-center justify-center rounded-r-xl bg-emerald-500 px-1.5 py-4 shadow-lg hover:bg-emerald-600 transition"
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

      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/20 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <main className="min-w-0 flex-1 px-6 py-8 lg:px-8">{children}</main>
    </div>
  );
}
