import type { Metadata } from "next";
import ClientComponent from "./BuyerDashboardClient";

export const metadata: Metadata = {
  title: "Buyer Dashboard | Paikari",
  description: "Your buyer overview — active bids, orders, and wallet.",
};

export default function Page() {
  return <ClientComponent />;
}
