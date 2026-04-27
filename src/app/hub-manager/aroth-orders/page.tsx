import type { Metadata } from "next";
import HubArothOrdersClient from "./HubArothOrdersClient";

export const metadata: Metadata = { title: "Aroth Orders | Hub Manager | Paikari" };

export default function Page() {
  return <HubArothOrdersClient />;
}
