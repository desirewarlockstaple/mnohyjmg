import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TideGuard AI — Predicting marine debris with physics-informed AI",
  description:
    "TideGuard AI uses Physics-Informed Neural Networks to forecast floating marine debris and mobilize community cleanups.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
