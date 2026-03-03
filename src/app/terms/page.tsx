export const metadata = {
  title: "Terms | Paikari",
};

export default function TermsPage() {
  return (
    <div className="space-y-6 rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">Terms of Service</h1>
      <p className="text-sm text-slate-700">
        By using Paikari, you agree to comply with marketplace rules, verify business information, and
        transact only on approved payment channels. Sellers must honor listed specifications and
        timelines; buyers must complete payments for won lots promptly.
      </p>
      <p className="text-sm text-slate-700">
        Disputes are handled by Paikari support based on submitted evidence from both parties. Continued
        violations may lead to account suspension.
      </p>
    </div>
  );
}
