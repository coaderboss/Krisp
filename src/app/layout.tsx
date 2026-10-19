import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "Cybersecurity Video Bulletin | CSJMU",
  description: "Student Presenter Portal for Cybersecurity Club, UIET CSJM University Kanpur",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jakarta.variable} ${jetbrains.variable} antialiased pb-16 font-sans`}>
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-8">
          {children}
        </main>
      </body>
    </html>
  );
}