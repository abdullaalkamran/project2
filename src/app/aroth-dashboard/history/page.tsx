import type { Metadata } from "next";
import ArothHistoryClient from "./ArothHistoryClient";

export const metadata: Metadata = { title: "Settled History | Aroth | Paikari" };

export default function Page() {
  return <ArothHistoryClient />;
}
