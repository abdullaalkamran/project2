"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { NotificationBell } from "@/components/NotificationBell";
import { Role } from "@/types";
import {
  Bookmark,
  Gavel,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  PanelLeft,
  Settings,
  Star,
  Wallet,
  X,
  Zap,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/live", label: "Live Auctions" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/running-bids", label: "My Bids" },
];

const roleRedirects: Record<Role, string> = {
  buyer:                "/buyer-dashboard",
  seller:               "/seller-dashboard",
  admin:                "/admin",
  hub_manager:          "/hub-manager",
  qc_leader:            "/qc-leader",
  qc_checker:           "/qc-checker",
  delivery_hub_manager: "/delivery-hub",
  delivery_distributor: "/delivery-distributor",
  aroth:                "/aroth-dashboard",
};

const INTERNAL_ROLES: Role[] = [
  "admin", "hub_manager", "qc_leader", "qc_checker",
  "delivery_hub_manager", "delivery_distributor", "aroth",
];

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const profileRef = useRef<HTMLDivElement | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [buyerMenuOpen, setBuyerMenuOpen] = useState(false);
  const { user, isLoggedIn, logout, role } = useAuth();
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    if (isLoggedIn && role === "buyer") {
      fetch("/api/buyer-dashboard/wallet")
        .then((r) => r.ok ? r.json() : null)
        .then((d) => { if (d?.balance !== undefined) setWalletBalance(d.balance); })
        .catch(() => {});
    } else {
      setWalletBalance(null);
    }
  }, [isLoggedIn, role]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => { setMobileOpen(false); setBuyerMenuOpen(false); }, [pathname]);

  const handleLogout = async () => {
    await logout();
    setProfileOpen(false);
    setMobileOpen(false);
    router.push("/");
  };

  const dashboardHref = role ? roleRedirects[role] : "/buyer-dashboard";
  const isInternalStaff = role ? INTERNAL_ROLES.includes(role) : false;
  const isLandingPage = pathname === "/";

  const hideForHomeWhenLoggedIn = pathname === "/" && isLoggedIn;
  if (hideForHomeWhenLoggedIn) return null;

  const navList = isLoggedIn && !isInternalStaff
    ? navItems.filter((item) => {
        if (item.href === "/") return false;
        if (item.href === "/running-bids" && role === "seller") return false;
        return true;
      })
    : [];

  return (
    <header
      className={
        isLandingPage
          ? "sticky top-0 z-50 border-b border-white/40 bg-white/35 backdrop-blur-md"
          : "sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur"
      }
    >
      {/* Main bar */}
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link
          href={isLoggedIn ? dashboardHref : "/"}
          className="flex items-center gap-2 font-semibold text-slate-900"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white text-sm font-bold">
            P
          </span>
          <span>Paikari</span>
        </Link>

        {/* Desktop nav links */}
        {navList.length > 0 && (
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-700">
            {navList.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    active
                      ? "rounded-full px-3 py-1.5 bg-emerald-50 text-emerald-700"
                      : "rounded-full px-3 py-1.5 hover:bg-slate-100"
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right side — desktop */}
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          {/* Role switcher + bell always visible */}
          {isLoggedIn && <RoleSwitcher />}
          {isLoggedIn && <NotificationBell />}

          {/* Buyer quick-menu icon — shown on marketplace/live pages */}
          {isLoggedIn && role === "buyer" && !pathname.startsWith("/buyer-dashboard") && (
            <button
              type="button"
              onClick={() => setBuyerMenuOpen(true)}
              className="flex items-center justify-center rounded-lg p-1.5 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 transition"
              title="My Dashboard"
            >
              <PanelLeft className="h-5 w-5" />
            </button>
          )}

          {/* Wallet — desktop only */}
          {isLoggedIn && role === "buyer" && walletBalance !== null && (
            <div className="hidden sm:block rounded-full border border-slate-200 px-3 py-1.5 text-xs">
              ৳ {walletBalance.toLocaleString("en-IN")}
            </div>
          )}

          {/* Sign in or profile */}
          {!isLoggedIn ? (
            <Link
              href="/auth/signin"
              className="rounded-full bg-emerald-500 px-3 py-1.5 text-white hover:bg-emerald-600"
            >
              Sign in
            </Link>
          ) : (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-slate-200 px-2 py-1.5 transition hover:border-emerald-200"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                  {(user?.name ?? "U").slice(0, 1).toUpperCase()}
                </span>
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-slate-100 bg-white p-2 shadow-lg z-50">
                  <div className="px-3 py-2 text-xs font-semibold uppercase text-slate-500">Account</div>
                  <Link
                    href={dashboardHref}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                    onClick={() => setProfileOpen(false)}
                  >
                    Dashboard
                  </Link>
                  {!isInternalStaff && (
                    <>
                      <Link
                        href="/buyer-dashboard/settings"
                        className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                        onClick={() => setProfileOpen(false)}
                      >
                        My Account
                      </Link>
                      <Link
                        href="/buyer-dashboard/orders"
                        className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                        onClick={() => setProfileOpen(false)}
                      >
                        My Orders
                      </Link>
                      <Link
                        href="/buyer-dashboard/messages"
                        className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                        onClick={() => setProfileOpen(false)}
                      >
                        Messages
                      </Link>
                    </>
                  )}
                  {/* Wallet inside dropdown on mobile */}
                  {role === "buyer" && walletBalance !== null && (
                    <div className="sm:hidden mx-3 my-1 rounded-lg border border-slate-100 px-3 py-2 text-xs text-slate-600">
                      Balance: ৳ {walletBalance.toLocaleString("en-IN")}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Hamburger — only when there are nav links on mobile */}
          {navList.length > 0 && (
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden flex items-center justify-center rounded-lg p-1.5 hover:bg-slate-100"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile nav dropdown */}
      {mobileOpen && navList.length > 0 && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 py-3 flex flex-col gap-1">
          {navList.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? "rounded-lg px-3 py-2 text-sm font-medium bg-emerald-50 text-emerald-700"
                    : "rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
      {/* Buyer side drawer */}
      {buyerMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setBuyerMenuOpen(false)} />
          {/* Drawer */}
          <aside className="relative z-10 flex w-72 flex-col bg-white shadow-2xl h-full overflow-y-auto px-4 py-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-white text-xs font-bold">
                  {(user?.name ?? "B")[0].toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800 leading-tight">{user?.name}</p>
                  <p className="text-[11px] text-slate-400">Buyer Account</p>
                </div>
              </div>
              <button type="button" onClick={() => setBuyerMenuOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>

            {/* Wallet */}
            {walletBalance !== null && (
              <div className="mb-4 flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <Wallet size={15} /> Wallet Balance
                </div>
                <span className="font-bold text-emerald-700">৳ {walletBalance.toLocaleString("en-IN")}</span>
              </div>
            )}

            {/* Nav */}
            <nav className="flex-1 space-y-0.5">
              {[
                { label: "Dashboard",        href: "/buyer-dashboard",                  icon: LayoutDashboard },
                { label: "Active Bids",      href: "/buyer-dashboard/my-bids",          icon: Gavel },
                { label: "Auto-bid",         href: "/buyer-dashboard/my-bids/auto-bid", icon: Zap },
                { label: "My Orders",        href: "/buyer-dashboard/orders",           icon: Package },
                { label: "Saved Lots",       href: "/buyer-dashboard/watchlist",        icon: Bookmark },
                { label: "Messages",         href: "/buyer-dashboard/messages",         icon: MessageSquare, badge: "2" },
                { label: "My Reviews",       href: "/buyer-dashboard/reviews",          icon: Star },
                { label: "Settings",         href: "/buyer-dashboard/settings",         icon: Settings },
              ].map(({ label, href, icon: Icon, badge }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                >
                  <Icon size={16} className="shrink-0 text-slate-400" />
                  <span className="flex-1">{label}</span>
                  {badge && <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{badge}</span>}
                </Link>
              ))}
            </nav>

            {/* Footer */}
            <div className="mt-4 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-500 hover:bg-rose-50 transition"
              >
                <LogOut size={16} className="shrink-0" /> Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}
