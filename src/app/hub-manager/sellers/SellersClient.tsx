"use client";
import { useEffect, useState, useMemo } from "react";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 15;
import { Search, ChevronDown, ChevronUp, Phone, Mail, MapPin, Package, Hash, CalendarDays, Filter, ExternalLink } from "lucide-react";
import Link from "next/link";

type Seller = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  nid: string;
  joinedAt: string;
  categories: string[];
  totalLots: number;
  activeLots: number;
  status: "Active" | "Suspended" | "Pending Verification";
};

const sellers: Seller[] = [
  {
    id: "SEL-1001", name: "Rahman Traders", contact: "Abdul Rahman",
    phone: "01711-223344", email: "rahman.traders@gmail.com",
    address: "28, Mirpur-10 Market, Dhaka", nid: "1234567890",
    joinedAt: "Jan 12, 2025", categories: ["Rice", "Pulses"],
    totalLots: 14, activeLots: 2, status: "Active",
  },
  {
    id: "SEL-1002", name: "Green Farm Co.", contact: "Reza Karim",
    phone: "01912-555444", email: "greenfarm@bd.com",
    address: "Uttara Sector 7, Dhaka", nid: "9876543210",
    joinedAt: "Feb 3, 2025", categories: ["Vegetables", "Fruits"],
    totalLots: 9, activeLots: 1, status: "Active",
  },
  {
    id: "SEL-1003", name: "Sumon Agro", contact: "Sumon Mia",
    phone: "01812-987654", email: "sumonagro@outlook.com",
    address: "Rajshahi Sadar, Rajshahi", nid: "1122334455",
    joinedAt: "Mar 18, 2025", categories: ["Oil", "Seeds"],
    totalLots: 6, activeLots: 1, status: "Active",
  },
  {
    id: "SEL-1004", name: "Prime Spice Ltd.", contact: "Farid Ahmed",
    phone: "01611-778899", email: "primespice@yahoo.com",
    address: "Sadarghat, Old Dhaka", nid: "5566778899",
    joinedAt: "Apr 5, 2025", categories: ["Spices"],
    totalLots: 11, activeLots: 0, status: "Active",
  },
  {
    id: "SEL-1005", name: "Coastal Fisheries", contact: "Nurul Haq",
    phone: "01711-345678", email: "coastal.fish@gmail.com",
    address: "Patenga, Chittagong", nid: "9988776655",
    joinedAt: "May 20, 2025", categories: ["Fish", "Seafood"],
    totalLots: 5, activeLots: 1, status: "Active",
  },
  {
    id: "SEL-1006", name: "Rajshahi Farms", contact: "Rafiqul Islam",
    phone: "01911-223300", email: "rajshahifarms@gmail.com",
    address: "Boalia, Rajshahi", nid: "4455667788",
    joinedAt: "Jun 1, 2025", categories: ["Vegetables", "Grains"],
    totalLots: 3, activeLots: 1, status: "Pending Verification",
  },
  {
    id: "SEL-1007", name: "Sunflower Oils", contact: "Mahbub Alam",
    phone: "01511-990011", email: "sunfloweroils@bd.net",
    address: "BSCIC, Tongi, Gazipur", nid: "3344556677",
    joinedAt: "Aug 14, 2025", categories: ["Oil"],
    totalLots: 8, activeLots: 0, status: "Active",
  },
];

const STATUS_CHIP: Record<Seller["status"], string> = {
  Active:                 "bg-emerald-50 text-emerald-700 border-emerald-200",
  Suspended:              "bg-red-50 text-red-600 border-red-200",
  "Pending Verification": "bg-amber-50 text-amber-700 border-amber-200",
};

const AVATAR_COLOR: Record<Seller["status"], string> = {
  Active:                 "bg-emerald-100 text-emerald-700",
  Suspended:              "bg-red-100 text-red-600",
  "Pending Verification": "bg-amber-100 text-amber-700",
};

const allCategories = Array.from(new Set(sellers.flatMap((s) => s.categories))).sort();

export default function SellersClient() {
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState<string>("All");
  const [catFilter, setCat]       = useState<string>("All");
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [page, setPage]           = useState(1);
  const [statuses, setStatuses]   = useState<Record<string, Seller["status"]>>(
    () => Object.fromEntries(sellers.map((s) => [s.id, s.status]))
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sellers.filter((s) => {
      const st = statuses[s.id] ?? s.status;
      if (statusFilter !== "All" && st !== statusFilter) return false;
      if (catFilter !== "All" && !s.categories.includes(catFilter)) return false;
      return (
        s.name.toLowerCase().includes(q) ||
        s.contact.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.categories.some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [search, statusFilter, catFilter, statuses]);

  const counts = useMemo(() => ({
    total:   sellers.length,
    active:  Object.values(statuses).filter((v) => v === "Active").length,
    pending: Object.values(statuses).filter((v) => v === "Pending Verification").length,
    suspended: Object.values(statuses).filter((v) => v === "Suspended").length,
  }), [statuses]);

  useEffect(() => { setPage(1); }, [search, statusFilter, catFilter]);

  function toggleStatus(id: string) {
    setStatuses((prev) => ({
      ...prev,
      [id]: prev[id] === "Active" ? "Suspended" : "Active",
    }));
  }

  return (
    <div className="space-y-6">
      {/* Header + stats */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Registered Sellers</h1>
          <p className="mt-1 text-sm text-slate-500">Sellers assigned to this hub — manage and review their details.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Total",    value: counts.total,     color: "bg-slate-50 text-slate-700 border-slate-200" },
            { label: "Active",   value: counts.active,    color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
            { label: "Pending",  value: counts.pending,   color: "bg-amber-50 text-amber-700 border-amber-200" },
            { label: "Suspended",value: counts.suspended, color: "bg-red-50 text-red-600 border-red-200" },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border px-4 py-2 text-center min-w-[72px] ${s.color}`}>
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-[11px] font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, contact, phone or category…"
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-4 text-sm focus:border-emerald-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          <Filter size={13} className="text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Pending Verification">Pending</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          <Package size={13} className="text-slate-400" />
          <select
            value={catFilter}
            onChange={(e) => setCat(e.target.value)}
            className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none"
          >
            <option value="All">All Categories</option>
            {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Seller cards */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <p className="font-medium text-slate-500">No sellers match your filters.</p>
        </div>
      ) : (
        <>
        <div className="space-y-3">
          {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((s) => {
            const status  = statuses[s.id] ?? s.status;
            const isOpen  = expanded === s.id;
            const initials = s.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

            return (
              <div
                key={s.id}
                className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
                  status === "Suspended" ? "border-red-100" :
                  status === "Pending Verification" ? "border-amber-200" : "border-slate-100"
                }`}
              >
                {/* Main row */}
                <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                  {/* Avatar */}
                  <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${AVATAR_COLOR[status]}`}>
                    {initials}
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900">{s.name}</span>
                      <span className="font-mono text-[11px] text-slate-400">{s.id}</span>
                      <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_CHIP[status]}`}>
                        {status}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Phone size={10} /> {s.phone}</span>
                      <span className="flex items-center gap-1"><Mail size={10} /> {s.email}</span>
                      <span className="flex items-center gap-1"><MapPin size={10} /> {s.address}</span>
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="hidden sm:flex flex-wrap gap-1">
                    {s.categories.map((c) => (
                      <span key={c} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">{c}</span>
                    ))}
                  </div>

                  {/* Lots stat */}
                  <div className="text-center min-w-[60px]">
                    <p className="text-lg font-bold text-slate-800">{s.activeLots}</p>
                    <p className="text-[10px] text-slate-400">Active / {s.totalLots} lots</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleStatus(s.id)}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                        status === "Active"
                          ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      {status === "Active" ? "Suspend" : "Activate"}
                    </button>
                    <Link
                      href={`/marketplace?q=${encodeURIComponent(s.name)}`}
                      target="_blank"
                      className="flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                    >
                      <ExternalLink size={12} /> Visit Shop
                    </Link>
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : s.id)}
                      className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                    >
                      {isOpen ? <><ChevronUp size={12} /> Hide</> : <><ChevronDown size={12} /> Details</>}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-5">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 lg:grid-cols-4 text-sm">
                      {[
                        { icon: <Hash size={12} />,          label: "Seller ID",      value: s.id },
                        { icon: <Phone size={12} />,         label: "Contact Person",  value: s.contact },
                        { icon: <Phone size={12} />,         label: "Phone",           value: s.phone },
                        { icon: <Mail size={12} />,          label: "Email",           value: s.email },
                        { icon: <MapPin size={12} />,        label: "Address",         value: s.address },
                        { icon: <Hash size={12} />,          label: "NID",             value: s.nid },
                        { icon: <CalendarDays size={12} />,  label: "Joined",          value: s.joinedAt },
                        { icon: <Package size={12} />,       label: "Categories",      value: s.categories.join(", ") },
                        { icon: <Package size={12} />,       label: "Total Lots",      value: String(s.totalLots) },
                        { icon: <Package size={12} />,       label: "Active Lots",     value: String(s.activeLots) },
                      ].map((f) => (
                        <div key={f.label}>
                          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">
                            {f.icon} {f.label}
                          </p>
                          <p className="font-semibold text-slate-800 text-sm">{f.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Category pills (mobile visible here) */}
                    <div className="mt-4 flex flex-wrap gap-1.5 sm:hidden">
                      {s.categories.map((c) => (
                        <span key={c} className="rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <Pagination page={page} totalPages={Math.ceil(filtered.length / PAGE_SIZE)} onPageChange={setPage} className="mt-4" />
        </>
      )}
    </div>
  );
}
