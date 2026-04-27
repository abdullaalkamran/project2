import type { Metadata } from "next";
import HubArothsClient from "./HubArothsClient";

export const metadata: Metadata = { title: "Manage Aroths | Hub Manager | Paikari" };

export default function Page() {
  return <HubArothsClient />;
}
