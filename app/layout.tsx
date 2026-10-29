import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "../components/site-header.tsx";
import { Marquee } from "../components/ui/marquee.tsx";
import { RULES } from "../lib/tournament/constants.ts";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Death Grip Bracket",
  description: "Death Grip Arm Wrestling Championship",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>
        <SiteHeader />
        <Marquee items={RULES} className="border-b border-ink py-2 text-sm uppercase tracking-wide" />
        {children}
      </body>
    </html>
  );
}
