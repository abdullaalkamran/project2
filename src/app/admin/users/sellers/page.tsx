import type { Metadata } from "next";
import ClientComponent from "./AdminSellersClient";

export const metadata: Metadata = {
  title: "Seller Accounts | Admin | Paikari",
  description: "View and manage all seller accounts.",
};

export default function Page() {
  return <ClientComponent />;
}
