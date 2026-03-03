import type { Metadata } from "next";
import ClientComponent from "./AdminDashboardClient";

export const metadata: Metadata = {
  title: "Admin Dashboard | Paikari",
  description: "Platform overview and administrative controls.",
};

export default function Page() {
  return <ClientComponent />;
}
