import type { Metadata } from "next";
import RejectedClient from "./RejectedClient";

export const metadata: Metadata = {
  title: "Rejected Lots | QC Leader | Paikari",
  description: "Lots rejected by QC leader with original seller data.",
};

export default function QCLeaderRejectedPage() {
  return <RejectedClient />;
}
