export const metadata = {
  title: "Courier Not Required | Delivery | Paikari",
  description: "Delivery hub is the final handover point.",
};

export default function DPCourierPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">No Courier Step</h1>
        <p className="text-slate-500">Delivery point is the final handover location. Buyers collect directly from here.</p>
      </div>
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 text-sm text-emerald-800 shadow-sm">
        Courier/distribution handover has been removed from this flow.
      </div>
    </div>
  );
}
