import type { Metadata } from "next";
import ClientComponent from "./SellerFinanceClient";

export const metadata: Metadata = {
  title: "Finance | Seller | Paikari",
  description: "View your earnings, payouts, and transaction history.",
};

export default function Page() {
  return <ClientComponent />;
}
