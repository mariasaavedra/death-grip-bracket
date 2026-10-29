import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Death Grip Bracket",
  description: "Boobash Table Arm Wrestling Championship",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
