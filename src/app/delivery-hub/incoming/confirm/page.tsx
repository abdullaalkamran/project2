import { Suspense } from "react";
import HubIncomingClient from "../IncomingClient";

// Confirm Arrival reuses the Incoming Shipments view — receipt confirmation happens on each order card.
export default function ConfirmArrivalPage() {
  return (
    <Suspense>
      <HubIncomingClient />
    </Suspense>
  );
}
