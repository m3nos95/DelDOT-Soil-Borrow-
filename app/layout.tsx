import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AI Grant Matching Agent | DelDOT Phase 1 Pilot",
  description:
    "Delaware Department of Transportation pilot that matches unfunded Unifier projects to USDOT Notices of Funding Opportunity.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={publicSans.className}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
