import { Suspense } from "react";
import AssignedOrdersClient from "./OrdersClient";

export default function AssignedOrdersPage() {
  return (
    <Suspense>
      <AssignedOrdersClient />
    </Suspense>
  );
}
