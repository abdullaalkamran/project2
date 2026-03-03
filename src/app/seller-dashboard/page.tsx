import type { Metadata } from "next";
import ClientComponent from "./SellerDashboardClient";

export const metadata: Metadata = {
  title: "Seller Dashboard | Paikari",
  description: "Your seller overview — active lots, bids, and earnings.",
};

export default function Page() {
  return <ClientComponent />;
}
