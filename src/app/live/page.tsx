import { Metadata } from "next";

import { LiveClient } from "./LiveClient";

export const metadata: Metadata = {
  title: "Live Auctions | Paikari",
  description: "Join live agricultural auctions, place bids, and monitor active lots in real time on Paikari.",
};

export default function LivePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      <LiveClient />
    </main>
  );
}
