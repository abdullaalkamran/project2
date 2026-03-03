import type { Metadata } from "next";
import { Suspense } from "react";
import ClientComponent from "./ProductDetailsIdClient";

export const metadata: Metadata = {
  title: "Product Details | Paikari",
  description: "Full details and ordering for this wholesale lot.",
};

export default function Page() {
  return (
    <Suspense>
      <ClientComponent />
    </Suspense>
  );
}
