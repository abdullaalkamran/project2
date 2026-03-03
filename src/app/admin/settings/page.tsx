import type { Metadata } from "next";
import ClientComponent from "./AdminSettingsClient";

export const metadata: Metadata = {
  title: "Platform Settings | Admin | Paikari",
  description: "Configure platform-wide settings.",
};

export default function Page() {
  return <ClientComponent />;
}
