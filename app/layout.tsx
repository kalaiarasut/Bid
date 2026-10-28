import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CampusBid — Fair Campus Auction Marketplace",
  description: "The trusted marketplace where graduating seniors pass cycles, calculators, books, and essentials to juniors through fair, transparent bidding.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
