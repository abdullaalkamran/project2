import type { Metadata } from "next";
import ReceiptClient from "./ReceiptClient";

export const metadata: Metadata = {
  title: "Seller Order Confirmation Receipt | Paikari",
};

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReceiptClient id={id} />;
}
