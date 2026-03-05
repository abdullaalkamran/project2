import { Suspense } from "react";
import DistributorOverviewClient from "./OverviewClient";

export default function DeliveryDistributorPage() {
  return (
    <Suspense>
      <DistributorOverviewClient />
    </Suspense>
  );
}
