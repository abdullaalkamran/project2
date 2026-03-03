export const metadata = {
  title: "Courier Assignments | Delivery | Paikari",
  description: "Manage courier dispatch assignments.",
};

const courierOrders = [
  { id: "ORD-5497", buyer: "Faruk Traders", lots: "LOT-1005", category: "Spices", weight: "90 kg", arrivedAt: "Jul 9 09:00" },
  { id: "ORD-5499", buyer: "Nurjahan Store", lots: "LOT-1004", category: "Oil", weight: "150 L", arrivedAt: "Jul 9 10:30" },
];

export default function DPCourierPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Dispatch to Courier</h1>
        <p className="text-slate-500">Orders to be handed over to courier service. Enter tracking number before handover.</p>
      </div>
      {courierOrders.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-slate-400 text-sm shadow-sm">No orders pending courier dispatch.</div>
      ) : (
        <div className="space-y-4">
          {courierOrders.map((o) => (
            <div key={o.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{o.id}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Buyer: {o.buyer} · {o.category} · {o.weight}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Arrived: {o.arrivedAt}</p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Awaiting Courier</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <input type="text" placeholder="Courier tracking number" className="flex-1 min-w-48 rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-400 focus:outline-none" />
                <button type="button" className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">Hand Over</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
