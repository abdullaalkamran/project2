import type { Metadata } from "next";
import ClientComponent from "./CreateLotClient";

export const metadata: Metadata = {
  title: "Add Product / Create Lot | Seller | Paikari",
  description: "Add a product and create a new agricultural lot in one form.",
};

export default function Page() {
  return <ClientComponent />;
}
