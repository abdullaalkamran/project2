import type { Metadata } from "next";
import ShipmentDocumentClient from "./ShipmentDocumentClient";

export const metadata: Metadata = {
  title: "Hub Shipment Document | Paikari",
};

export default async function HubShipmentDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ShipmentDocumentClient id={id} />;
}
