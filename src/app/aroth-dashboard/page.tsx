import type { Metadata } from "next";
import ArothOverviewClient from "./ArothOverviewClient";

export const metadata: Metadata = {
  title: "Aroth Dashboard | Paikari",
  description: "Local market agent overview.",
};

export default function Page() {
  return <ArothOverviewClient />;
}
