import { Suspense } from "react";
import BuyerOrdersClient from "./BuyerOrdersClient";

export const metadata = {
  title: "My Orders | Buyer | Paikari",
  description: "Track delivery status for all your purchased lots.",
};

export default function OrdersPage() {
  return (
    <Suspense>
      <BuyerOrdersClient />
    </Suspense>
  );
}
