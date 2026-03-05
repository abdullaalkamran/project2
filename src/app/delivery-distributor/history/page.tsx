import { Suspense } from "react";
import DeliveryHistoryClient from "./HistoryClient";

export default function DeliveryHistoryPage() {
  return (
    <Suspense>
      <DeliveryHistoryClient />
    </Suspense>
  );
}
