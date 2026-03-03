import type { Metadata } from "next";
import HistoryClient from "./HistoryClient";

export const metadata: Metadata = {
  title: "Product History | QC Leader | Paikari",
  description: "Timeline view of product status changes for QC team leader.",
};

export default function QCLeaderHistoryPage() {
  return <HistoryClient />;
}
