"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  BarChart3,
  Building2,
  ChevronLeft,
  ChevronRight,
  FileCheck,
  Gavel,
  Globe,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Package,
  PiggyBank,
  Settings,
  ShieldAlert,
  Sliders,
  Users,
  X,
} from "lucide-react";

type Badges = {
  disputes: number;
  pendingUsers: number;
  pendingPayments: number;
  pendingQC: number;
  pendingDeposits: number;
};

const NAV_GROUPS = (badges: Badges) => [
  {
    group: "Dashboard",
    items: [
      { label: "Overview", href: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    group: "Users",
    items: [
      { label: "All Users",   href: "/admin/users",   icon: Users,   badge: badges.pendingUsers > 0 ? String(badges.pendingUsers) : undefined, badgeColor: "bg-orange-500" },
      { label: "Buyers",      href: "/admin/users/buyers",  icon: Users },
      { label: "Sellers",     href: "/admin/users/sellers", icon: Users },
      { label: "Staff",       href: "/admin/users/staff",   icon: Users },
    ],
  },
  {
    group: "Marketplace",
    items: [
      { label: "Auctions",    href: "/admin/auctions",  icon: Gavel },
      { label: "Orders",      href: "/admin/orders",    icon: Package },
      { label: "QC Reports",  href: "/admin/qc-reports",icon: FileCheck, badge: badges.pendingQC > 0 ? String(badges.pendingQC) : undefined, badgeColor: "bg-teal-500" },
      { label: "Disputes",    href: "/admin/disputes",  icon: ShieldAlert, badge: badges.disputes > 0 ? String(badges.disputes) : undefined, badgeColor: "bg-red-500" },
    ],
  },
  {
    group: "Finance",
    items: [
      { label: "Revenue & Payouts", href: "/admin/finance",          icon: BarChart3, badge: badges.pendingPayments > 0 ? String(badges.pendingPayments) : undefined, badgeColor: "bg-amber-500" },
      { label: "Deposit Requests",  href: "/admin/deposit-requests", icon: PiggyBank, badge: badges.pendingDeposits > 0 ? String(badges.pendingDeposits) : undefined, badgeColor: "bg-emerald-500" },
    ],
  },
  {
    group: "Infrastructure",
    items: [
      { label: "Hubs",            href: "/admin/hubs",       icon: Building2 },
      { label: "Districts",       href: "/admin/districts",  icon: MapPin },
      { label: "Delivery Points", href: "/admin/delivery-points", icon: Package },
    ],
  },
  {
    group: "Config",
    items: [
      { label: "Settings",        href: "/admin/settings",          icon: Settings },
      { label: "Landing Page",    href: "/admin/cms",               icon: Globe },
      { label: "Lot Field Options", href: "/admin/cms/lot-options", icon: Sliders },
    ],
  },
];

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
};

function SidebarContent({
  badges,
  pathname,
  onClose,
  onHide,
}: {
  badges: Badges;
  pathname: string;
  onClose?: () => void;
  onHide?: () => void;
}) {
  const { user } = useAuth();
  const groups = NAV_GROUPS(badges);

  const totalBadge = badges.disputes + badges.pendingUsers + badges.pendingPayments + badges.pendingQC + badges.pendingDeposits;

  return (
    <div className="flex h-full flex-col">

      {/* Brand header */}
      <div className="flex items-center justify-between px-2 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-green-400 to-emerald-400 shadow-md shadow-green-100">
            <ShieldAlert size={15} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-green-500">Super Admin</p>
            <p className="text-xs font-extrabold text-slate-800 leading-tight">Control Panel</p>
          </div>
        </div>
        {onHide && (
          <button type="button" onClick={onHide}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
            <ChevronLeft size={15} />
          </button>
        )}
      </div>

      {/* Admin profile */}
      {user && (
        <div className="mx-1 mb-5 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 px-3 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 text-sm font-bold text-white shadow">
            {user.name?.[0]?.toUpperCase() ?? "A"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">{user.name}</p>
            <p className="text-[11px] text-green-500 font-medium">Super Admin</p>
          </div>
          {totalBadge > 0 && (
            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
              {totalBadge}
            </span>
          )}
        </div>
      )}

      {/* Nav groups */}
      <nav className="flex-1 space-y-4 overflow-y-auto pr-0.5">
        {groups.map(group => (
          <div key={group.group}>
            <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {group.group}
            </p>
            <div className="space-y-0.5">
              {(group.items as NavItem[]).map(item => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/admin" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all
                      ${active
                        ? "bg-green-500 text-white shadow-md shadow-green-300/40"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                  >
                    <Icon size={15} className={`shrink-0 ${active ? "text-white" : "text-slate-400 group-hover:text-slate-600"}`} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-white/25 text-white" : `${item.badgeColor ?? "bg-red-500"} text-white`}`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-4 border-t border-slate-100 pt-4 space-y-0.5">
        <Link href="/" onClick={onClose}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition">
          <Globe size={15} className="shrink-0 text-slate-400" /> View Site
        </Link>
        <Link href="/api/auth/logout"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-500 hover:bg-rose-50 transition">
          <LogOut size={15} className="shrink-0" /> Sign Out
        </Link>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [badges, setBadges] = useState<Badges>({
    disputes: 0, pendingUsers: 0, pendingPayments: 0, pendingQC: 0, pendingDeposits: 0,
  });

  useEffect(() => {
    const load = () => {
      fetch("/api/admin/overview")
        .then(r => r.json())
        .then((d: { badges?: Badges }) => { if (d.badges) setBadges(d.badges); })
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <div className="flex min-h-[calc(100vh-80px)]">

      {/* Mobile FAB */}
      <button type="button" onClick={() => setMobileOpen(v => !v)}
        className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-white shadow-lg lg:hidden"
        aria-label="Toggle menu">
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Desktop sidebar */}
      {!sidebarHidden && (
        <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-slate-100 bg-white px-3 py-5 sticky top-0 h-screen overflow-y-auto">
          <SidebarContent
            badges={badges}
            pathname={pathname}
            onHide={() => setSidebarHidden(true)}
          />
        </aside>
      )}

      {/* Collapse tab */}
      {sidebarHidden && (
        <button type="button" onClick={() => setSidebarHidden(false)}
          className="fixed left-0 top-1/2 z-50 -translate-y-1/2 hidden lg:flex items-center justify-center rounded-r-xl bg-green-500 px-1.5 py-4 shadow-lg hover:bg-green-600 transition">
          <ChevronRight size={15} className="text-white" />
        </button>
      )}

      {/* Mobile drawer */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto border-r border-slate-100 bg-white px-3 py-5 shadow-xl transition-transform lg:hidden
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <SidebarContent
          badges={badges}
          pathname={pathname}
          onClose={() => setMobileOpen(false)}
        />
      </aside>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
