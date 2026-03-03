import type { Metadata } from "next";
import ClientComponent from "./ArrivalsClient";

export const metadata: Metadata = {
  title: "Arrivals | Delivery | Paikari",
  description: "Track lot arrivals at your delivery point.",
};

export default function Page() {
  return <ClientComponent />;
}
