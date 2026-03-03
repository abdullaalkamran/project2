import type { Metadata } from "next";
import ClientComponent from "./ReceiveInboundClient";

export const metadata: Metadata = {
  title: "Receive Inbound | Hub | Paikari",
  description: "Log and confirm received lot shipments.",
};

export default function Page() {
  return <ClientComponent />;
}
