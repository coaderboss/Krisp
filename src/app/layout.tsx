import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";
import { auth } from "@/auth";
import { connection } from "next/server";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "Cybersecurity Video Bulletin | CSJMU",
  description: "Student Presenter Portal for Cybersecurity Club, UIET CSJM University Kanpur",
};

// --- FIX: Next.js ko allow karo ki auth fetch hone tak wait kare ---
export const instant = false;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  await connection();
  const session = await auth(); 

  return (
    <html lang="en" className="overflow-x-hidden w-full">
      <body className={`${inter.variable} ${jakarta.variable} ${jetbrains.variable} antialiased pb-16 font-sans min-w-[320px] w-full overflow-x-hidden`}>
        <Providers session={session}>
          <Navbar />
          <main className="w-full max-w-7xl mx-auto px-3 sm:px-6 mt-4 sm:mt-8 overflow-x-clip">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}