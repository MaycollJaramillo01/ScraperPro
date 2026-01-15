import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
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
  title: "ScraperPro",
  description: "Lead intelligence platform for local business discovery.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={cn(
          "min-h-screen bg-background text-foreground font-sans antialiased",
          geistSans.variable,
          geistMono.variable,
        )}
      >
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(66,71,97,0.35),transparent_45%),radial-gradient(circle_at_20%_30%,_rgba(52,211,153,0.06),transparent_28%),radial-gradient(circle_at_80%_20%,_rgba(52,211,153,0.08),transparent_32%)]">
          {children}
        </div>
      </body>
    </html>
  );
}
