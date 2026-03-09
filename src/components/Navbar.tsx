"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { NotificationBell } from "@/components/NotificationBell";
import { Role } from "@/types";

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
};

const INTERNAL_ROLES: Role[] = [
  "admin", "hub_manager", "qc_leader", "qc_checker",
  "delivery_hub_manager", "delivery_distributor",
];

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
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
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    setOpen(false);
    router.push("/");
  };

  const dashboardHref = role ? roleRedirects[role] : "/buyer-dashboard";
  const isInternalStaff = role ? INTERNAL_ROLES.includes(role) : false;

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
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href={isLoggedIn ? dashboardHref : "/"} className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white text-sm font-bold">
            P
          </span>
          <span>Paikari</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-700">
          {navList.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? "rounded-full bg-emerald-50 px-3 py-2 text-emerald-700"
                    : "rounded-full px-3 py-2 hover:bg-slate-100"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
          {isLoggedIn && <RoleSwitcher />}
          {isLoggedIn && <NotificationBell />}
          {isLoggedIn && role === "buyer" && walletBalance !== null && (
            <div className="rounded-full border border-slate-200 px-3 py-2">
              Balance: ৳ {walletBalance.toLocaleString("en-IN")}
            </div>
          )}
          {!isLoggedIn ? (
            <Link
              href="/auth/signin"
              className="rounded-full bg-emerald-500 px-3 py-2 text-white hover:bg-emerald-600"
            >
              Sign in
            </Link>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 transition hover:border-emerald-200"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                  {(user?.name ?? "U").slice(0, 1).toUpperCase()}
                </span>
                <span className="text-slate-900">{user?.name ?? "User"}</span>
              </button>
              {open && (
                <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-slate-100 bg-white p-2 shadow-lg">
                  <div className="px-3 py-2 text-xs font-semibold uppercase text-slate-500">Account</div>
                  <Link
                    href={dashboardHref}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                    onClick={() => setOpen(false)}
                  >
                    Dashboard
                  </Link>
                  {!isInternalStaff && (
                    <>
                      <Link
                        href="/buyer-dashboard/settings"
                        className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                        onClick={() => setOpen(false)}
                      >
                        My Account
                      </Link>
                      <Link
                        href="/buyer-dashboard/orders"
                        className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                        onClick={() => setOpen(false)}
                      >
                        My Orders
                      </Link>
                      <Link
                        href="/buyer-dashboard/messages"
                        className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                        onClick={() => setOpen(false)}
                      >
                        Messages
                      </Link>
                    </>
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
        </div>
      </div>
    </header>
  );
}
