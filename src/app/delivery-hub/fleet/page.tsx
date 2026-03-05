import { Suspense } from "react";
import HubFleetClient from "./FleetClient";

export default function HubFleetPage() {
  return (
    <Suspense>
      <HubFleetClient />
    </Suspense>
  );
}
