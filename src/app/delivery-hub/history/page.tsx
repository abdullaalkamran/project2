import { Suspense } from "react";
import HubDeliveryHistoryClient from "./HistoryClient";

export default function HubDeliveryHistoryPage() {
  return (
    <Suspense>
      <HubDeliveryHistoryClient />
    </Suspense>
  );
}
