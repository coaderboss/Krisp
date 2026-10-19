// src/app/dashboard/page.tsx
import { auth, signOut } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { submitApplication } from "@/actions/application";
import { ShieldCheck, Clock, CheckCircle, LogOut } from "lucide-react";

export const instant = false;

export default async function DashboardPage() {
  await connection();
  const session = await auth();
  
  // Agar login nahi hai toh login page par bhej do
  if (!session?.user) redirect("/login");

  // Fetch current application status
  const application = await prisma.application.findFirst({
    where: { userId: session.user.id }
  });

  return (
    <div className="max-w-4xl mx-auto mt-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0F2547]">Hello, {session.user.name} 👋</h1>
          <p className="text-slate-600 font-medium mt-1">Student Presenter Dashboard</p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="clay-btn px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </form>
      </div>

      {application ? (
        <div className="clay-card p-8 text-center bg-white">
          <div className="flex justify-center mb-4">
            {application.status === "WAITING" ? (
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="w-8 h-8 text-amber-600" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
            )}
          </div>
          <h2 className="text-2xl font-bold text-[#0F2547] mb-2">Application Status: {application.status}</h2>
          <p className="text-slate-600">
            Aapne <strong>{application.topicInterested}</strong> topic ke liye apply kiya hai. 
            {application.status === "WAITING" && " Hum jaldi hi aapko screening ke liye shortlist karenge. Apna email check karte rahein!"}
          </p>
        </div>
      ) : (
        <div className="clay-card p-6 sm:p-8">
          <div className="border-b border-slate-200 pb-4 mb-6 flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-[#0F2547]">Enroll for Weekly Video Bulletin</h2>
          </div>

          <form
            action={async (formData: FormData) => {
              "use server";
              await submitApplication(formData);
            }}
            className="space-y-5"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Course / Branch</label>
                <input type="text" name="course" required className="clay-input w-full px-4 py-3 text-sm" placeholder="e.g. B.Tech CSE" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Semester</label>
                <input type="text" name="semester" required className="clay-input w-full px-4 py-3 text-sm" placeholder="e.g. 4th Semester" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Topic of Interest (Cybersecurity)</label>
              <input type="text" name="topicInterested" required className="clay-input w-full px-4 py-3 text-sm" placeholder="e.g. Phishing Attacks, Network Security, etc." />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Past Speaking Experience (Optional)</label>
              <textarea name="pastExperience" rows={3} className="clay-input w-full px-4 py-3 text-sm" placeholder="Any previous presentations, clubs, or debates..."></textarea>
            </div>

            <button type="submit" className="clay-btn-primary w-full md:w-auto px-8 py-3.5 text-sm uppercase tracking-wider">
              Submit Application
            </button>
          </form>
        </div>
      )}
    </div>
  );
}