import type { Metadata, Viewport } from "next";
import "@fontsource/hind/latin-400.css";
import "@fontsource/hind/latin-500.css";
import "@fontsource/hind/latin-600.css";
import "@fontsource/hind/devanagari-400.css";
import "@fontsource/hind/devanagari-500.css";
import "@fontsource/hind/devanagari-600.css";
import "@fontsource/big-shoulders-display/latin-700";
import "@fontsource/big-shoulders-display/latin-800";
import "./globals.css";
import { getLang } from "@/lib/lang";

export const metadata: Metadata = {
  title: { default: "QueueLess — live digital queues", template: "%s · QueueLess" },
  description:
    "A live digital queue for clinics, salons and service counters. Customers scan a QR code, join from their phone and see their place update in real time.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#17323a",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const lang = await getLang();
  return (
    <html lang={lang}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
