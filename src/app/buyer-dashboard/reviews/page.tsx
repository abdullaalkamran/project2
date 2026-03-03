import type { Metadata } from "next";
import ClientComponent from "./BuyerReviewsClient";

export const metadata: Metadata = {
  title: "My Reviews | Buyer | Paikari",
  description: "Your submitted seller and product reviews.",
};

export default function Page() {
  return <ClientComponent />;
}
