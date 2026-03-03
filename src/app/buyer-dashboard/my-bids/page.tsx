import type { Metadata } from "next";
import ClientComponent from "./MyBidsClient";

export const metadata: Metadata = {
  title: "My Bids | Buyer | Paikari",
  description: "Overview of all your active and past bids.",
};

export default function Page() {
  return <ClientComponent />;
}
