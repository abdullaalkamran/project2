import { Suspense } from "react";
import ActiveDeliveriesClient from "../active/ActiveClient";

// Confirm Delivery shows the same active deliveries view — the "Confirm Arrival" button is the confirmation action.
export default function ConfirmDeliveryPage() {
  return (
    <Suspense>
      <ActiveDeliveriesClient />
    </Suspense>
  );
}
