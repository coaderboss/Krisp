"use client";

import { SessionProvider } from "next-auth/react";

export default function Providers({ 
  children, 
  session // <-- Naya prop add kiya
}: { 
  children: React.ReactNode;
  session: any;
}) {
  // Session ko provider mein pass kar diya
  return <SessionProvider session={session}>{children}</SessionProvider>;
}