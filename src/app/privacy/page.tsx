export const metadata = {
  title: "Privacy Policy | Paikari",
};

export default function PrivacyPage() {
  return (
    <div className="space-y-6 rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">Privacy Policy</h1>
      <p className="text-sm text-slate-700">
        We collect account, billing, and usage data to operate the Paikari marketplace. Data is stored
        securely and shared only with service providers that help us deliver the platform.
      </p>
      <p className="text-sm text-slate-700">
        You can request data deletion or export by contacting support@paikari.example. We respond to all
        verified requests within 30 days.
      </p>
    </div>
  );
}
