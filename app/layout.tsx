import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "../components/site-header.tsx";
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
        {children}
      </body>
    </html>
  );
}
