import { Suspense } from "react";
import ActiveDeliveriesClient from "./ActiveClient";

export default function ActiveDeliveriesPage() {
  return (
    <Suspense>
      <ActiveDeliveriesClient />
    </Suspense>
  );
}
