import type { Metadata } from "next";
import AnalyticsClient from "./AnalyticsClient";

export const metadata: Metadata = {
  title: "Analytics | Seller Dashboard | Paikari",
};

export default function AnalyticsPage() {
  return <AnalyticsClient />;
}
