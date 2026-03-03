import type { Metadata } from "next";
import ClientComponent from "./QCAssignClient";

export const metadata: Metadata = {
  title: "QC Assignment | Hub | Paikari",
  description: "Assign lots for quality control inspection.",
};

export default function Page() {
  return <ClientComponent />;
}
