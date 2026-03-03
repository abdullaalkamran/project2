"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const topLinks = [{ label: "Overview", href: "/delivery-point" }];

const nav = [
  {
    group: "Incoming",
    items: [
      { label: "Incoming Orders", href: "/delivery-point/incoming", badge: "4" },
      { label: "Confirm Arrival", href: "/delivery-point/arrivals" },
    ],
  },
  {
    group: "Handover",
    items: [
      { label: "Buyer Pickup", href: "/delivery-point/pickup" },
      { label: "Dispatch to Courier", href: "/delivery-point/courier" },
    ],
  },
  {
    group: "Reports",
    items: [{ label: "Delivery Reports", href: "/delivery-point/reports" }],
  },
];

export default function DeliveryPointLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initialExpanded = () => {
    const set = new Set<string>();
    nav.forEach((s) => {
      if (s.items.some((item) => pathname.startsWith(item.href))) set.add(s.group);
    });
    return set;
  };
  const [expanded, setExpanded] = useState<Set<string>>(initialExpanded);

  const toggle = (group: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });

  return (
    <div className="flex min-h-[calc(100vh-80px)]">
      <button type="button" onClick={() => setMobileOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg lg:hidden" aria-label="Toggle menu">
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 overflow-y-auto border-r border-slate-100 bg-white px-3 py-6 shadow-sm transition-transform lg:static lg:translate-x-0 lg:shadow-none ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-6 px-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-500">Delivery Point</p>
        </div>
        <nav className="space-y-1">
          {topLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
                className={`flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}>
                {link.label}
              </Link>
            );
          })}
          {nav.map((section) => {
            const isExpanded = expanded.has(section.group);
            const hasActive = section.items.some((item) => pathname.startsWith(item.href));
            return (
              <div key={section.group}>
                <button type="button" onClick={() => toggle(section.group)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition ${hasActive ? "text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}>
                  <span>{section.group}</span>
                  <span className={`text-xs text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}>›</span>
                </button>
                {isExpanded && (
                  <ul className="mb-1 ml-4 mt-0.5 space-y-0.5 border-l border-slate-100 pl-3">
                    {section.items.map((item) => {
                      const active = pathname === item.href || pathname.startsWith(item.href + "/");
                      return (
                        <li key={item.href}>
                          <Link href={item.href} onClick={() => setMobileOpen(false)}
                            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${active ? "bg-blue-50 font-semibold text-blue-700" : "font-medium text-slate-600 hover:bg-slate-50"}`}>
                            {item.label}
                            {"badge" in item && item.badge && (
                              <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{item.badge}</span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/20 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <main className="min-w-0 flex-1 px-6 py-8 lg:px-8">{children}</main>
    </div>
  );
}
