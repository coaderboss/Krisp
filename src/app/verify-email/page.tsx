import prisma from "@/lib/prisma"; // CRASH FIXED: Centralized connection pool used
import { XCircle, CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";

// 1. The Core Server Component that handles the Database Logic
async function VerificationLogic({ searchParams }: { searchParams: Promise<{ token: string }> }) {
  await connection();
  
  const params = await searchParams;
  const token = params.token;
  
  let success = false;
  let message = "Token missing!";

  if (token) {
    const existingToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!existingToken) {
      message = "Invalid or expired verification link!";
    } else if (new Date(existingToken.expires) < new Date()) {
      message = "This verification link has expired. Please register again to receive a new link.";
    } else {
      // Mark email as verified
      await prisma.user.update({
        where: { email: existingToken.email },
        data: { emailVerified: new Date() },
      });

      // Delete token from database after successful verification
      await prisma.verificationToken.delete({
        where: { id: existingToken.id },
      });

      success = true;
      message = "Your email has been successfully verified!";
    }
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-8 clay-card text-center">
      <div className="flex justify-center mb-6">
        {success ? (
          <CheckCircle className="w-16 h-16 text-emerald-500" />
        ) : (
          <XCircle className="w-16 h-16 text-red-500" />
        )}
      </div>
      <h1 className="text-2xl font-extrabold text-[#0F2547] mb-3">
        {success ? "Email Verified!" : "Verification Failed"}
      </h1>
      <p className="text-slate-600 mb-8 font-medium">{message}</p>
      
      <Link href="/login" className="clay-btn-primary px-8 py-3 text-sm font-bold uppercase tracking-wider">
        Proceed to Login
      </Link>
    </div>
  );
}

// 2. The Default Page Component wrapped in a Suspense Boundary
export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token: string }>;
}) {
  return (
    <Suspense 
      fallback={
        <div className="max-w-md mx-auto mt-20 p-8 clay-card text-center flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <h2 className="text-xl font-bold text-[#0F2547]">Verifying Email...</h2>
          <p className="text-sm text-slate-500 mt-2">Please wait while we check your secure token.</p>
        </div>
      }
    >
      <VerificationLogic searchParams={searchParams} />
    </Suspense>
  );
}