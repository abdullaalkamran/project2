import type { Metadata } from "next";
import ArothOrdersClient from "./ArothOrdersClient";

export const metadata: Metadata = { title: "My Orders | Aroth | Paikari" };

export default function Page() {
  return <ArothOrdersClient />;
}
