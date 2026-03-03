import type { Metadata } from "next";
import ClientComponent from "./BuyerSettingsClient";

export const metadata: Metadata = {
  title: "Account Settings | Buyer | Paikari",
  description: "Manage your buyer profile and preferences.",
};

export default function Page() {
  return <ClientComponent />;
}
