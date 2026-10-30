import { auth, signOut } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getOrCreateCurrentSlot, fetchAllApplications } from "@/actions/admin";
import AdminDashboardClient from "./AdminDashboardClient";
import { ShieldCheck, LogOut, Radio, ExternalLink } from "lucide-react";
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
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 font-extrabold text-2xl shadow-inner">
          🔒
        </div>
        <h2 className="text-2xl font-black text-[#0F2547]">Admin Clearance Required</h2>
        <p className="text-xs text-slate-600 leading-relaxed font-medium">
          Your browser is currently signed in with an unauthorized account (<strong>{session.user.email}</strong>). 
          Please log in using an authorized Club Administrator credential to access the console.
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
              <span>Sign In as Admin</span>
            </button>
          </form>

          <Link href="/" className="clay-btn w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-blue-600 text-center">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  // --- Form Fields & Unified Applications fetch karke Client ko bhej rahe hain ---
  const [slot, appsRes, currentFormFields] = await Promise.all([
    getOrCreateCurrentSlot(),
    fetchAllApplications(),
    prisma.formQuestion.findMany({
      where: { form: { isMaster: true } },
      orderBy: { orderIndex: "asc" }
    })
  ]);

  const applications = (appsRes.success && appsRes.data) 
    ? appsRes.data.filter((a: any) => a.weeklySlotId !== undefined && a.status !== "RECORDED") 
    : [];

  return (
    <div className="space-y-6 w-full max-w-[1850px] mx-auto">
      {/* Admin Top Header Banner with Soft Clay Design */}
      <div className="clay-card p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/80 shadow-md">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl clay-navy flex items-center justify-center shrink-0 shadow-lg">
            <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="clay-badge-amber text-[9px] sm:text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                SUPREME ADMIN
              </span>
              <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Terminal Connected
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-[#0F2547] tracking-tight">
              Club Administration Console
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 font-semibold truncate max-w-[240px] sm:max-w-md mt-0.5">
              Root Authority: <span className="text-blue-700 font-bold">{session.user.email}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-start md:justify-end shrink-0">
          <Link 
            href="/" 
            className="clay-btn flex-1 md:flex-none px-4 py-2.5 text-xs font-black text-slate-700 hover:text-blue-600 text-center flex items-center justify-center gap-1.5 shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
            <span>Public Home</span>
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
              className="clay-btn w-full px-4 py-2.5 text-xs font-black text-red-600 hover:bg-red-50 flex items-center justify-center gap-1.5 shadow-sm border-red-100"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </form>
        </div>
      </div>

      <AdminDashboardClient 
        initialSlot={slot as any} 
        initialApplications={applications as any} 
        initialFormFields={currentFormFields as any} 
      />
    </div>
  );
}
