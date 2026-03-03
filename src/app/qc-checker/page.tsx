import type { Metadata } from "next";
import { Suspense } from "react";
import OverviewClient from "./OverviewClient";

export const metadata: Metadata = {
  title: "QC Checker Dashboard | Paikari",
  description: "Overview of your QC checking tasks and inspection queue.",
};

export default function QCCheckerOverviewPage() {
  return (
    <Suspense>
      <OverviewClient />
    </Suspense>
  );
}
