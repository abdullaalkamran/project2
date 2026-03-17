"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ClipboardCheck, Clock, Home, Menu, X } from "lucide-react";
import api from "@/lib/api";
import type { FlowLot } from "@/lib/product-flow";

type MeResponse = { name: string };

const navItems = [
  { label: "Overview", href: "/qc-checker", icon: Home },
  { label: "My Tasks", href: "/qc-checker/tasks", icon: ClipboardCheck },
  { label: "Inspection History", href: "/qc-checker/history", icon: Clock },
];

export default function QCCheckerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const me = await api.get<MeResponse>("/api/auth/me");
        const query = me?.id ? `?checkerId=${encodeURIComponent(me.id)}` : "";
        const rows = await api.get<FlowLot[]>(`/api/flow/tasks${query}`);
        setPendingCount(rows.filter((l) => l.qcTaskStatus !== "SUBMITTED" || l.status === "IN_QC").length);
      } catch {
        setPendingCount(0);
      }
    };
    void load();
  }, [pathname]);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="mb-6 flex items-center justify-between px-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-500">QC Checker</p>
          <p className="mt-0.5 text-[10px] text-slate-400">Quality Control Panel</p>
        </div>
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
        {navItems.map((link) => {
          const active =
            pathname === link.href ||
            (link.href !== "/qc-checker" && pathname.startsWith(link.href));
          const Icon = link.icon;
          const badge = link.href === "/qc-checker/tasks" && pendingCount > 0 ? String(pendingCount) : undefined;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition
                ${active ? "bg-sky-50 text-sky-700" : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"}`}
            >
              <Icon size={16} className={active ? "text-sky-600" : "text-slate-400"} />
              <span className="flex-1">{link.label}</span>
              {badge && (
                <span className="rounded-full bg-sky-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-slate-100 pt-4 px-3">
        <div className="rounded-xl bg-sky-50 p-3">
          <p className="text-xs font-semibold text-sky-700">Need help?</p>
          <p className="mt-0.5 text-[10px] text-sky-600 leading-relaxed">
            Contact your QC Team Leader for task assignment or inspection queries.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[calc(100vh-80px)]">
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-sky-600 text-white shadow-lg lg:hidden"
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
          className="fixed left-0 top-1/2 z-50 -translate-y-1/2 hidden lg:flex items-center justify-center rounded-r-xl bg-sky-500 px-1.5 py-4 shadow-lg hover:bg-sky-600 transition"
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

      <main className="min-w-0 flex-1 px-6 py-8 lg:px-10">{children}</main>
    </div>
  );
}
