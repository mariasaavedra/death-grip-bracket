import type { Metadata } from "next";
import "./globals.css";
import { Marquee } from "../components/ui/marquee.tsx";
import { RULES } from "../lib/tournament/constants.ts";
import { Geist, Metal_Mania } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});
const metalMania = Metal_Mania({subsets:['latin'],weight:'400',variable:'--font-metal'});

export const metadata: Metadata = {
  title: "Death Grip Bracket",
  description: "Death Grip Arm Wrestling Championship",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable, metalMania.variable)}>
      <body>
        <Marquee items={RULES} className="border-b border-ink py-1 text-xs uppercase tracking-wide min-[1600px]:py-1.5 min-[1600px]:text-base" />
        {children}
      </body>
    </html>
  );
}
