import type { Metadata } from "next";
import { Alfa_Slab_One, Work_Sans } from "next/font/google";
import "./globals.css";

const alfa = Alfa_Slab_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-alfa",
  display: "swap",
});

const work = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sunday Schools",
  description: "An NFL trivia game. Name the college each player came from.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${alfa.variable} ${work.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
