import type { Metadata } from "next";
import ClientComponent from "./AdminUsersClient";

export const metadata: Metadata = {
  title: "User Management | Admin | Paikari",
  description: "Manage all platform users.",
};

export default function Page() {
  return <ClientComponent />;
}
