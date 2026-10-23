"use client";

import { useState } from "react";
import { completeOnboarding } from "@/actions/profile";
import { signOut } from "next-auth/react";
import { ShieldCheck, Building2, GraduationCap, Hash, ArrowRight, Loader2, LogOut } from "lucide-react";

export default function OnboardingPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const res = await completeOnboarding(formData);

    if (res?.error === "GHOST_SESSION") {
      setMessage({ text: "Session expired or invalid. Logging you out...", type: "error" });
      setTimeout(() => signOut({ callbackUrl: "/login" }), 1500);
      return;
    }

    if (res?.error) {
      setMessage({ text: res.error, type: "error" });
      setLoading(false);
    } else {
      setMessage({ text: "Profile verified! Syncing your secure session...", type: "success" });
      setTimeout(() => signOut({ callbackUrl: "/login" }), 2500);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-50/50">
      
      {/* Mobile Optimized Wrapper */}
      <div className="w-full max-w-md flex justify-end mb-4">
        {/* GHOST COOKIE ESCAPE HATCH - Now responsive */}
        <button 
          onClick={() => signOut({ callbackUrl: "/login" })} 
          className="flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2 text-[11px] sm:text-xs font-bold text-red-600 bg-white border border-red-100 rounded-xl hover:bg-red-50 transition-colors shadow-sm"
        >
          <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Start Fresh
        </button>
      </div>

      <div className="max-w-md w-full clay-card p-6 sm:p-10 animate-in fade-in zoom-in duration-500">
        <div className="flex justify-center mb-5 sm:mb-6">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg bg-emerald-100">
            <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600" />
          </div>
        </div>

        <div className="text-center mb-6 sm:mb-8 space-y-1">
          <span className="text-[9px] sm:text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider bg-emerald-100 text-emerald-800">
            Mandatory Step
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F2547] mt-2">Complete Your Profile</h2>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-2 px-2">
            Secure your account by providing your institutional details. This is a one-time requirement.
          </p>
        </div>

        {message && (
          <div className={`mb-5 p-3 rounded-xl text-[11px] sm:text-xs font-bold text-center border flex items-center justify-center gap-2 ${
            message.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"
          }`}>
            {message.type === "success" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">College Name</label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input type="text" name="college" required maxLength={100} className="clay-input w-full pl-10 pr-3 py-3 text-xs sm:text-sm font-bold text-slate-800" placeholder="e.g. UIET CSJMU" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Department</label>
            <div className="relative">
              <GraduationCap className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input type="text" name="department" required maxLength={100} className="clay-input w-full pl-10 pr-3 py-3 text-xs sm:text-sm font-bold text-slate-800" placeholder="e.g. Computer Science" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Roll Number / ID</label>
            <div className="relative">
              <Hash className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input type="text" name="rollNumber" required maxLength={50} className="clay-input w-full pl-10 pr-3 py-3 text-xs sm:text-sm font-bold text-slate-800 uppercase" placeholder="Enter your ID" />
            </div>
          </div>

          <button type="submit" disabled={loading || message?.type === "success"} className="clay-btn-primary w-full py-3.5 sm:py-4 mt-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md disabled:opacity-50">
            {loading ? "Verifying..." : "Secure My Profile"}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}