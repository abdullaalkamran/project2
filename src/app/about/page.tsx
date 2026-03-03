export const metadata = {
  title: "About | Paikari",
};

export default function AboutPage() {
  return (
    <div className="space-y-6 rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">About Paikari</h1>
      <p className="text-slate-700">
        Paikari is a wholesale-first marketplace built for fast, transparent trade. We connect trusted
        suppliers and buyers through live auctions and fixed-price listings, reducing friction across
        discovery, negotiation, and settlement.
      </p>
      <p className="text-slate-700">
        Our team brings experience across supply chain, fintech, and marketplace operations to help
        businesses source inventory with confidence.
      </p>
    </div>
  );
}
