import type { Metadata } from "next";
import ConfirmedOrdersClient from "./ConfirmedOrdersClient";

export const metadata: Metadata = {
  title: "Confirmed Orders | Hub | Paikari",
  description: "Orders confirmed by sellers after winning bids.",
};

export default function HubConfirmedOrdersPage() {
  return <ConfirmedOrdersClient />;
}
