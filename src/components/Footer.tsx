"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

const footerLinks = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/live", label: "Live Auctions" },
  { href: "/running-bids", label: "My Bids" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/faq", label: "FAQ" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function Footer() {
  const { isLoggedIn } = useAuth();

  if (isLoggedIn) return null;

  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
        <div className="flex flex-wrap gap-3 text-sm text-slate-700">
          {footerLinks.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-emerald-600">
              {item.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-slate-500">
          <p className="font-semibold text-slate-800">Paikari</p>
          <p>© {year} Paikari. All rights reserved.</p>
          <p className="text-slate-600">Built for fast, transparent auctions.</p>
        </div>
      </div>
    </footer>
  );
}
