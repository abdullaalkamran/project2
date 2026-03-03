import type { Metadata } from "next";
import MarketplaceClient from "./MarketplaceClient";

export const metadata: Metadata = {
  title: "Marketplace Products | Seller Dashboard | Paikari",
};

export default function SellerMarketplacePage() {
  return <MarketplaceClient />;
}
