import type { Metadata } from "next";
import ClientComponent from "./BuyerMessagesClient";

export const metadata: Metadata = {
  title: "Messages | Buyer | Paikari",
  description: "Your conversations with sellers and support.",
};

export default function Page() {
  return <ClientComponent />;
}
