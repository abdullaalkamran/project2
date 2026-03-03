"use client";
import { useEffect, useState } from "react";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 15;

type BidWinner = {
  lotId: string;
  product: string;
  category: string;
  seller: string;
  sellerPhone: string;
  qcGrade: string;
  weight: string;
  askingPricePerKg: string;
  minBidRate: string;
  winningBid: string;
  winnerName: string;
  winnerPhone: string;
  winnerEmail: string;
  winnerAddress: string;
  auctionClosedAt: string;
  dispatchStatus: "Ready" | "Dispatched" | "Delivered";
  deliveryPoint: string;
};

const winners: BidWinner[] = [
  {
    lotId: "LOT-1016",
    product: "Miniket Rice",
    category: "Rice",
    seller: "Rahman Traders",
    sellerPhone: "01711-223344",
    qcGrade: "A",
    weight: "500 kg",
    askingPricePerKg: "৳65",
    minBidRate: "৳72",
    winningBid: "৳79",
    winnerName: "Dhaka Rice Depot",
    winnerPhone: "01811-556677",
    winnerEmail: "dhakarice@gmail.com",
    winnerAddress: "Kawran Bazar, Dhaka",
    auctionClosedAt: "Feb 20, 2026 18:00",
    dispatchStatus: "Dispatched",
    deliveryPoint: "Mirpur-10 DP",
  },
  {
    lotId: "LOT-1014",
    product: "Soybean Oil",
    category: "Oil",
    seller: "Sunflower Oils",
    sellerPhone: "01511-990011",
    qcGrade: "A",
    weight: "300 L",
    askingPricePerKg: "৳110",
    minBidRate: "৳118",
    winningBid: "৳125",
    winnerName: "City Mart",
    winnerPhone: "01611-334455",
    winnerEmail: "citymart@outlook.com",
    winnerAddress: "Dhanmondi 15, Dhaka",
    auctionClosedAt: "Feb 19, 2026 17:00",
    dispatchStatus: "Delivered",
    deliveryPoint: "Dhanmondi DP",
  },
  {
    lotId: "LOT-1009",
    product: "Chilli",
    category: "Spices",
    seller: "Prime Spice Ltd.",
    sellerPhone: "01611-778899",
    qcGrade: "B",
    weight: "120 kg",
    askingPricePerKg: "৳210",
    minBidRate: "৳225",
    winningBid: "৳240",
    winnerName: "Alam Bros",
    winnerPhone: "01711-667788",
    winnerEmail: "alambros@yahoo.com",
    winnerAddress: "Uttara Sector 4, Dhaka",
    auctionClosedAt: "Feb 20, 2026 19:30",
    dispatchStatus: "Ready",
    deliveryPoint: "Uttara DP",
  },
  {
    lotId: "LOT-1008",
    product: "Miniket Rice",
    category: "Rice",
    seller: "Green Harvest Co.",
    sellerPhone: "01912-555444",
    qcGrade: "A",
    weight: "500 kg",
    askingPricePerKg: "৳62",
    minBidRate: "৳68",
    winningBid: "৳76",
    winnerName: "Rahman Traders",
    winnerPhone: "01711-223344",
    winnerEmail: "rahman.traders@gmail.com",
    winnerAddress: "28, Mirpur-10 Market, Dhaka",
    auctionClosedAt: "Feb 20, 2026 18:00",
    dispatchStatus: "Ready",
    deliveryPoint: "Mirpur-10 DP",
  },
];

const gradeChip: Record<string, string> = {
  A: "bg-emerald-50 text-emerald-700",
  B: "bg-sky-50 text-sky-700",
  C: "bg-amber-50 text-amber-700",
};

const dispatchChip: Record<BidWinner["dispatchStatus"], string> = {
  Ready:      "bg-amber-50 text-amber-700",
  Dispatched: "bg-blue-50 text-blue-700",
  Delivered:  "bg-emerald-50 text-emerald-700",
};

export default function BidWinnersClient() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = winners.filter(
    (w) =>
      w.product.toLowerCase().includes(search.toLowerCase()) ||
      w.seller.toLowerCase().includes(search.toLowerCase()) ||
      w.winnerName.toLowerCase().includes(search.toLowerCase()) ||
      w.lotId.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => { setPage(1); }, [search]);

  const toggle = (id: string) => setExpanded((p) => (p === id ? null : id));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Auction Bid Winners</h1>
          <p className="text-slate-500">
            Completed auction results — winning buyers, product details, and dispatch status.
          </p>
        </div>
        <div className="flex gap-3">
          {(["Ready", "Dispatched", "Delivered"] as const).map((s) => (
            <div key={s} className={`rounded-xl border px-4 py-2 text-center ${dispatchChip[s]}`}>
              <p className="text-xl font-bold">{winners.filter((w) => w.dispatchStatus === s).length}</p>
              <p className="text-xs">{s}</p>
            </div>
          ))}
        </div>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by product, seller, winner or lot ID…"
        className="w-full max-w-md rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none"
      />

      <div className="space-y-4">
        {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((w) => {
          const open = expanded === w.lotId;
          return (
            <div key={w.lotId}
              className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
              {/* collapsed summary row */}
              <button
                type="button"
                onClick={() => toggle(w.lotId)}
                className="w-full flex flex-wrap items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs text-slate-400 shrink-0">{w.lotId}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold shrink-0 ${gradeChip[w.qcGrade]}`}>Grade {w.qcGrade}</span>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{w.product}</p>
                    <p className="text-xs text-slate-500 truncate">{w.category} · {w.weight} · Seller: {w.seller}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Winning Bid</p>
                    <p className="font-bold text-emerald-700">{w.winningBid}/kg</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Winner</p>
                    <p className="font-semibold text-slate-800 text-sm">{w.winnerName}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${dispatchChip[w.dispatchStatus]}`}>
                    {w.dispatchStatus}
                  </span>
                  <span className={`text-slate-400 text-sm transition-transform duration-200 ${open ? "rotate-90" : ""}`}>›</span>
                </div>
              </button>

              {/* expanded detail */}
              {open && (
                <div className="border-t border-slate-100 px-5 py-5 space-y-5 bg-slate-50">
                  {/* product info */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Product & QC Details</p>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-4 text-sm">
                      {[
                        { label: "Lot ID", value: w.lotId },
                        { label: "Product", value: w.product },
                        { label: "Category", value: w.category },
                        { label: "Weight", value: w.weight },
                        { label: "QC Grade", value: w.qcGrade },
                        { label: "Asking Price/kg", value: w.askingPricePerKg },
                        { label: "Min Bid Rate", value: w.minBidRate },
                        { label: "Winning Bid", value: w.winningBid },
                      ].map((f) => (
                        <div key={f.label}>
                          <p className="text-xs text-slate-400 font-medium">{f.label}</p>
                          <p className="font-semibold text-slate-800">{f.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* seller info */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Seller</p>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3 text-sm">
                      {[
                        { label: "Business Name", value: w.seller },
                        { label: "Phone", value: w.sellerPhone },
                      ].map((f) => (
                        <div key={f.label}>
                          <p className="text-xs text-slate-400 font-medium">{f.label}</p>
                          <p className="font-semibold text-slate-800">{f.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* winner info */}
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700 mb-3">Winning Buyer</p>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-4 text-sm">
                      {[
                        { label: "Business Name", value: w.winnerName },
                        { label: "Phone", value: w.winnerPhone },
                        { label: "Email", value: w.winnerEmail },
                        { label: "Address", value: w.winnerAddress },
                        { label: "Delivery Point", value: w.deliveryPoint },
                        { label: "Auction Closed", value: w.auctionClosedAt },
                        { label: "Dispatch Status", value: w.dispatchStatus },
                      ].map((f) => (
                        <div key={f.label}>
                          <p className="text-xs text-emerald-600 font-medium">{f.label}</p>
                          <p className="font-semibold text-slate-800">{f.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">No results match your search.</p>
        )}
      </div>
      <Pagination page={page} totalPages={Math.ceil(filtered.length / PAGE_SIZE)} onPageChange={setPage} className="mt-4" />
    </div>
  );
}
