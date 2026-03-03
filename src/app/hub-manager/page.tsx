import type { Metadata } from "next";
import ClientComponent from "./HubDashboardClient";

export const metadata: Metadata = {
  title: "Hub Manager Dashboard | Paikari",
  description: "Overview of all hub operations and activity.",
};

export default function Page() {
  return <ClientComponent />;
}
