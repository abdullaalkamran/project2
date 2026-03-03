import type { Metadata } from "next";
import ClientComponent from "./SellerSettingsClient";

export const metadata: Metadata = {
  title: "Account Settings | Seller | Paikari",
  description: "Manage your seller profile and preferences.",
};

export default function Page() {
  return <ClientComponent />;
}
