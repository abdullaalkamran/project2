import type { Metadata } from "next";
import ArothDetailClient from "./ArothDetailClient";

export const metadata: Metadata = { title: "Aroth Details | Hub Manager | Paikari" };

export default function Page() {
  return <ArothDetailClient />;
}
