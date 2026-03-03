import type { Metadata } from "next";
import ClientComponent from "./PaymentsClient";

export const metadata: Metadata = {
  title: "Wallet & Payments | Buyer | Paikari",
  description: "Manage your wallet balance, deposits, and withdrawals.",
};

export default function Page() {
  return <ClientComponent />;
}
