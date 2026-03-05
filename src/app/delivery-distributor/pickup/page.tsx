import { Suspense } from "react";
import PickupClient from "./PickupClient";

export default function PickupPage() {
  return (
    <Suspense>
      <PickupClient />
    </Suspense>
  );
}
