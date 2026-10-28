import type { Metadata } from "next";
import "./globals.css";
import { UserProvider } from "@/components/UserContext";

export const metadata: Metadata = {
  title: "CampusBid — Fair Campus Auction Marketplace",
  description:
    "The trusted marketplace where graduating seniors pass cycles, calculators, books, and essentials to juniors through fair, transparent bidding.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans">
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
