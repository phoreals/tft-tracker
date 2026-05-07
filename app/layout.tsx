import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { StyledComponentsRegistry } from "@/styles/StyledComponentsRegistry";
import { NavigationShell } from "@/components/NavigationShell";

export const metadata: Metadata = {
  title: "The Asylum TFT Tracker",
  description: "Track your Teamfight Tactics squad's performance, ranks, and match history.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <StyledComponentsRegistry>
          <NavigationShell><Suspense>{children}</Suspense></NavigationShell>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
