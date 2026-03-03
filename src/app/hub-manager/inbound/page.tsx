import InboundClient from "./InboundClient";

export const metadata = {
  title: "Inbound Lots | Hub | Paikari",
  description: "All lots arriving at this hub.",
};

export default function HubInboundPage() {
  return <InboundClient />;
}
