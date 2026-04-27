import type { Metadata } from "next";
import ArothPricesClient from "./ArothPricesClient";

export const metadata: Metadata = { title: "Today's Price Chart | Aroth | Paikari" };

export default function Page() {
  return <ArothPricesClient />;
}
