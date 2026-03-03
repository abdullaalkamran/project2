const faqs = [
  {
    q: "How do I join live auctions?",
    a: "Create an account, verify your business, and browse the Live page to enter ongoing lots.",
  },
  {
    q: "How are payments handled?",
    a: "Payments are captured securely with milestone-based releases for sellers.",
  },
  {
    q: "Can I request samples?",
    a: "Yes, use the Request sample action on any product detail page to message the seller.",
  },
];

export const metadata = {
  title: "FAQ | Paikari",
};

export default function FaqPage() {
  return (
    <div className="space-y-6 rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">Frequently asked questions</h1>
      <div className="space-y-4">
        {faqs.map((item) => (
          <div key={item.q} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">{item.q}</p>
            <p className="text-sm text-slate-700">{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
