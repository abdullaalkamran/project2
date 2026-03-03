import type { Metadata } from "next";
import ClientComponent from "./AdminBuyersClient";

export const metadata: Metadata = {
  title: "Buyer Accounts | Admin | Paikari",
  description: "View and manage all buyer accounts.",
};

export default function Page() {
  return <ClientComponent />;
}
