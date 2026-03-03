import type { Metadata } from "next";
import ApprovalsClient from "./ApprovalsClient";

export const metadata: Metadata = {
  title: "QC Approvals | QC Leader | Paikari",
  description: "Review and approve quality control submissions.",
};

export default function Page() {
  return <ApprovalsClient />;
}
