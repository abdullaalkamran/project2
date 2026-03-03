import type { Metadata } from "next";
import ClientComponent from "./ContactClient";

export const metadata: Metadata = {
  title: "Contact Us | Paikari",
  description: "Get in touch with the Paikari team.",
};

export default function Page() {
  return <ClientComponent />;
}
