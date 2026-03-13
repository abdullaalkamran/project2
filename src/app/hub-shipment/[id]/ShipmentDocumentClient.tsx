"use client";

import { useEffect, useState } from "react";
import { Download, Loader2, QrCode } from "lucide-react";
import api from "@/lib/api";

type ShipmentDoc = {
  orderCode: string;
  lotCode: string | null;
  product: string;
  qty: string;
  sellerName: string;
  buyerName: string;
  deliveryPoint: string;
  hubId: string | null;
  assignedTruck: string | null;
  confirmedAt: string;
  sellerStatus: string;
  status: string;
  scanCode: string;
  scanUrl: string | null;
  qrImageUrl: string;
  gatePacketQty: number;
  packetSummary: { totalPackets: number; scannedCount: number } | null;
};

type PacketManifestResponse = {
  orderCode: string;
  totalPackets: number;
  scannedCount: number;
  packetCodes: string[];
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" });

export default function ShipmentDocumentClient({ id }: { id: string }) {
  const [doc, setDoc] = useState<ShipmentDoc | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [packetCodes, setPacketCodes] = useState<string[]>([]);
  const [scannedCount, setScannedCount] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [packetsLoaded, setPacketsLoaded] = useState(false);

  useEffect(() => {
    document.body.setAttribute("data-receipt", "true");
    return () => document.body.removeAttribute("data-receipt");
  }, []);

  useEffect(() => {
    api.get<ShipmentDoc>(`/api/hub-shipment/${id}`)
      .then(setDoc)
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Failed to load shipment document"));
  }, [id]);

  useEffect(() => {
    api
      .get<PacketManifestResponse>(`/api/hub-shipment/${id}/packets`)
      .then((data) => {
        setPacketCodes(data.packetCodes ?? []);
        setScannedCount(data.scannedCount ?? 0);
      })
      .catch(() => {
        setPacketCodes([]);
        setScannedCount(0);
      })
      .finally(() => setPacketsLoaded(true));
  }, [id]);

  // Auto-generate once BOTH doc and packets manifest are loaded
  useEffect(() => {
    if (!doc || !packetsLoaded || doc.gatePacketQty < 1 || packetCodes.length > 0 || generating) return;
    setGenerating(true);
    setGenError(null);
    api
      .post<PacketManifestResponse>(`/api/hub-shipment/${id}/packets`, { packetCount: doc.gatePacketQty })
      .then((data) => {
        setPacketCodes(data.packetCodes ?? []);
        setScannedCount(data.scannedCount ?? 0);
      })
      .catch((e) => setGenError(e instanceof Error ? e.message : "Auto-generation failed"))
      .finally(() => setGenerating(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packetsLoaded, doc?.gatePacketQty]);

  async function regeneratePacketQrs() {
    if (!doc || doc.gatePacketQty < 1) return;
    setGenerating(true);
    setGenError(null);
    try {
      const data = await api.post<PacketManifestResponse>(`/api/hub-shipment/${id}/packets`, { packetCount: doc.gatePacketQty });
      setPacketCodes(data.packetCodes ?? []);
      setScannedCount(data.scannedCount ?? 0);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Failed to generate packet QR codes");
    } finally {
      setGenerating(false);
    }
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <p className="text-sm font-semibold text-red-600">{loadError}</p>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <>
      <div className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">{doc.gatePacketQty}</span> packets (from gate)
            </span>
            <button
              onClick={() => void regeneratePacketQrs()}
              disabled={generating || doc.gatePacketQty < 1}
              className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              {generating ? "Generating..." : "Regenerate QR"}
            </button>
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-md bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-900"
          >
            <Download size={14} />
            Download PDF
          </button>
        </div>
      </div>

      <div id="receipt" className="mx-auto my-5 max-w-4xl space-y-4 border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
        <div className="flex items-start justify-between border-b border-slate-300 pb-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">PAIKARI</p>
            <h1 className="text-lg font-bold text-slate-900">Hub Shipment & Transit Document</h1>
            <p className="text-xs text-slate-500">Attach with shipment</p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p className="font-semibold text-slate-700">Shipment Ref: {doc.orderCode}</p>
            <p>Created: {fmt(doc.confirmedAt)}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <div className="overflow-hidden border border-slate-300 bg-white">
              <table className="w-full table-fixed text-xs">
                <tbody>
                  <tr className="align-top [&>td]:border-b [&>td]:border-r [&>td]:border-slate-200 [&>td:last-child]:border-r-0">
                    {[
                      ["Order ID", doc.orderCode],
                      ["Product", doc.product],
                      ["Quantity", doc.qty],
                      ["Truck", doc.assignedTruck ?? "—"],
                    ].map(([k, v]) => (
                      <td key={k} className="px-3 py-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{k}</p>
                        <p className="mt-1 break-words font-semibold text-slate-800">{v}</p>
                      </td>
                    ))}
                  </tr>
                  <tr className="align-top [&>td]:border-r [&>td]:border-slate-200 [&>td:last-child]:border-r-0">
                    {[
                      ["Seller", doc.sellerName],
                      ["Buyer", doc.buyerName],
                      ["Delivery Hub", doc.deliveryPoint],
                      ["Status", doc.status],
                    ].map(([k, v]) => (
                      <td key={k} className="px-3 py-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{k}</p>
                        <p className="mt-1 break-words font-semibold text-slate-800">{v}</p>
                      </td>
                    ))}
                  </tr>
                  <tr className="align-top [&>td]:border-t [&>td]:border-r [&>td]:border-slate-200 [&>td:last-child]:border-r-0">
                    {[
                      ["Lot Code", doc.lotCode ?? "—"],
                      ["Source Hub", doc.hubId ?? "—"],
                      ["Seller Status", doc.sellerStatus],
                      ["Confirmed At", fmt(doc.confirmedAt)],
                    ].map(([k, v]) => (
                      <td key={k} className="px-3 py-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{k}</p>
                        <p className="mt-1 break-words font-semibold text-slate-800">{v}</p>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid gap-8 border-t border-slate-300 pt-6 text-xs sm:grid-cols-3">
              <div>
                <p className="mb-8 border-b border-slate-300 pb-1">Hub Dispatch Officer</p>
                <p className="text-slate-500">Name & Signature</p>
              </div>
              <div>
                <p className="mb-8 border-b border-slate-300 pb-1">Delivery Man / Carrier</p>
                <p className="text-slate-500">Name & Signature</p>
              </div>
              <div>
                <p className="mb-8 border-b border-slate-300 pb-1">Receiving Hub Officer</p>
                <p className="text-slate-500">Name & Signature</p>
              </div>
            </div>
          </div>

          <div className="border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center gap-2 text-slate-700">
              <QrCode size={15} />
              <p className="text-xs font-bold">Master Scan</p>
            </div>
            <img
              src={doc.qrImageUrl}
              alt="Shipment QR"
              className="mx-auto h-48 w-48 border border-slate-300 bg-white p-2"
            />
            <p className="mt-2 text-[11px] text-slate-600">Use for non-packet shipments only.</p>
            <p className="mt-2 border border-slate-300 bg-white px-2 py-1 font-mono text-[10px] text-slate-700">{doc.scanCode}</p>
          </div>
        </div>

        <div className="border border-slate-200 bg-slate-50 p-3">
          <div className="mb-3 flex items-center justify-between text-xs">
            <p className="font-semibold text-slate-800">Packet QR Sheet</p>
            <p className="text-slate-600">
              Total: <span className="font-semibold">{packetCodes.length}</span>
              {" "}· Scanned: <span className="font-semibold">{scannedCount}</span>
            </p>
          </div>

          {packetCodes.length === 0 ? (
            <p className="text-xs text-slate-500">
              No packet QR generated yet. Enter packet count and click "Generate Packet QR".
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
              {packetCodes.map((code, idx) => {
                const qrPayload = [
                  code,
                  `P:${doc.product.trim()}`,
                  `Q:${doc.qty.trim()}`,
                  `B:${doc.buyerName.trim()}`,
                  `H:${doc.deliveryPoint.trim()}`,
                  `PK:${idx + 1}/${packetCodes.length}`,
                ].join("|");
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrPayload)}`;
                return (
                  <div
                    key={code}
                    className="break-inside-avoid relative border-2 border-dashed border-slate-300 bg-white p-2"
                  >
                    <div className="mb-1 flex items-center justify-between border-b border-slate-200 pb-1">
                      <p className="text-[10px] font-bold text-slate-700">Packet Ticket</p>
                      <p className="text-[9px] font-semibold text-slate-500">
                        {idx + 1}/{packetCodes.length}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <img src={qrUrl} alt={code} className="h-16 w-16 border border-slate-200 bg-white p-1" />
                      <div className="min-w-0 text-[9px] leading-tight text-slate-700">
                        <p className="break-words font-semibold">{doc.product}</p>
                        <p className="break-words">{doc.qty}</p>
                        <p className="break-words">{doc.buyerName}</p>
                        <p className="break-words">{doc.deliveryPoint}</p>
                      </div>
                    </div>
                    <p className="mt-1 border-t border-slate-200 pt-1 break-all text-center font-mono text-[8px] text-slate-600">
                      {code}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 pt-2 text-[10px] text-slate-500">
          Generated on {new Date().toLocaleString("en-BD", { dateStyle: "long", timeStyle: "short" })} · Document Type: HUB_SHIPMENT_DOCUMENT
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
    </>
  );
}
