import type { Metadata } from "next";
import ClientComponent from "./SellerMessagesClient";

export const metadata: Metadata = {
  title: "Messages | Seller | Paikari",
  description: "Your conversations with buyers and support.",
};

export default function Page() {
  return <ClientComponent />;
}
