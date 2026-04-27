import type { Metadata } from "next";
import HubArothFinanceClient from "./HubArothFinanceClient";

export const metadata: Metadata = { title: "Aroth Finance | Hub Manager | Paikari" };

export default function Page() {
  return <HubArothFinanceClient />;
}
