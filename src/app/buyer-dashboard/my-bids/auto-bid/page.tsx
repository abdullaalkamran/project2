import type { Metadata } from "next";
import ClientComponent from "./AutoBidClient";

export const metadata: Metadata = {
  title: "Auto Bid | Buyer | Paikari",
  description: "Manage your automatic bidding rules.",
};

export default function Page() {
  return <ClientComponent />;
}
