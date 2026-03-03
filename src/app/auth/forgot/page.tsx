import type { Metadata } from "next";
import ClientComponent from "./ForgotPasswordClient";

export const metadata: Metadata = {
  title: "Forgot Password | Paikari",
  description: "Reset your Paikari account password.",
};

export default function Page() {
  return <ClientComponent />;
}
