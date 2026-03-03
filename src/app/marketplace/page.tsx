import type { Metadata } from "next";
import ClientComponent from "./MarketplaceClient";

export const metadata: Metadata = {
  title: "Marketplace | Paikari",
  description: "Browse and bid on agricultural lots from verified sellers.",
};

export default function Page() {
  return <ClientComponent />;
}
