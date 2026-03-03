import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { RouteGuard } from "@/components/RouteGuard";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Paikari | Wholesale Auctions",
  description: "Bid, buy, and sell across live wholesale auctions with Paikari.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.className} ${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        <div className="min-h-screen bg-gradient-to-br from-emerald-50/70 via-white to-slate-50 text-slate-900">
          <Navbar />
          <RouteGuard>
            <main className="mx-auto max-w-6xl px-4 py-10 sm:py-12">{children}</main>
            <Footer />
          </RouteGuard>
          <Toaster position="top-right" richColors />
        </div>
      </body>
    </html>
  );
}
