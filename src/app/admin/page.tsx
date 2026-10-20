import { auth, signOut } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getOrCreateCurrentSlot } from "@/actions/admin";
import AdminDashboardClient from "./AdminDashboardClient";
import { ShieldCheck, LogOut } from "lucide-react";
import Link from "next/link";

export const instant = false;

export default async function AdminPage() {
  await connection();
  const session = await auth();

  // Authentication & Authorization: Only CLUB_ADMIN allowed!
  if (!session?.user) {
    redirect("/admin/login");
  }

  if (session.user.role !== "CLUB_ADMIN") {
    return (
      <div className="max-w-md mx-auto mt-14 clay-card p-8 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 font-extrabold text-2xl">
          🔒
        </div>
        <h2 className="text-2xl font-extrabold text-[#0F2547]">Admin Login Required</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Aapka browser abhi standard account (<strong>{session.user.email}</strong>) se logged in hai. 
          Club Admin Console access karne ke liye kripya logout karein aur Admin account se securely login karein.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-4">
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin/login" });
            }}
            className="w-full sm:w-auto"
          >
            <button
              type="submit"
              className="clay-btn-primary w-full sm:w-auto px-5 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout &amp; Login as Admin</span>
            </button>
          </form>

          <Link href="/" className="clay-btn w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-blue-600 text-center">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  // --- FIX: Form Fields (Live Data) fetch karke Client ko bhej rahe hain ---
  const [slot, applications, currentFormFields] = await Promise.all([
    getOrCreateCurrentSlot(),
    prisma.application.findMany({
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { appliedAt: "asc" },
    }),
    prisma.formField.findMany({
      orderBy: { orderIndex: "asc" }
    })
  ]);

  return (
    <div className="space-y-6">
      {/* Admin Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 w-full">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl clay-navy flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#0F2547]">Club Admin Console</h1>
              <span className="clay-badge-amber text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">SUPER ADMIN</span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate max-w-[240px] sm:max-w-md">Logged in as: {session.user.email}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end shrink-0">
          <Link href="/" className="clay-btn flex-1 md:flex-none px-3.5 sm:px-4 py-2 text-xs font-bold text-slate-600 hover:text-blue-600 text-center">
            View Live Program Home
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
            className="flex-1 md:flex-none"
          >
            <button
              type="submit"
              className="clay-btn w-full px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </form>
        </div>
      </div>

      <AdminDashboardClient 
        initialSlot={slot} 
        initialApplications={applications} 
        initialFormFields={currentFormFields} 
      />
    </div>
  );
}