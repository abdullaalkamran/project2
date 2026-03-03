import type { Metadata } from "next";
import ClientComponent from "./AdminStaffClient";

export const metadata: Metadata = {
  title: "Staff Accounts | Admin | Paikari",
  description: "Manage internal staff and role assignments.",
};

export default function Page() {
  return <ClientComponent />;
}
