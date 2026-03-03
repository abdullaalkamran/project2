import type { Metadata } from "next";
import WaitingQCClient from "./WaitingQCClient";

export const metadata: Metadata = {
  title: "Waiting for QC Check | Hub | Paikari",
  description: "Lots assigned to QC and waiting for inspection.",
};

export default function WaitingQCPage() {
  return <WaitingQCClient />;
}
