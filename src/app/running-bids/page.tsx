import type { Metadata } from "next";
import ClientComponent from "./RunningBidsClient";

export const metadata: Metadata = {
  title: "Running Bids | Paikari",
  description: "Live bids happening right now across active auctions.",
};

export default function Page() {
  return <ClientComponent />;
}
