"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, UserCheck, Shield, Lock, Loader2, LayoutDashboard } from "lucide-react";
import ProfileMenu from "@/components/ProfileMenu";
import { useSession } from "next-auth/react";

export default function Navbar() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Secret Door 1: Keyboard Shortcut 'Ctrl + Shift + A' or 'Alt + A'
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") || (e.altKey && e.key.toLowerCase() === "a")) {
        e.preventDefault();
        router.push("/admin");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  // Dynamic Dashboard Route Engine: Role ke hisaab se link decide karega
  const getDashboardLink = () => {
    if (session?.user?.role === "CLUB_ADMIN") return "/admin";
    if (session?.user?.role === "EXECUTIVE") return "/executive/dashboard";
    return "/dashboard";
  };

  return (
    <header className="sticky top-2 sm:top-3 z-50 px-2 sm:px-6 w-full">
      <div className="max-w-7xl mx-auto clay-card px-2.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2 shadow-lg w-full min-w-0">
        
        {/* Brand Identity with Official Club Logo */}
        <Link href="/" className="flex items-center gap-2 sm:gap-3 group min-w-0 shrink">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl clay-pill p-1 flex items-center justify-center shrink-0 shadow-md overflow-hidden bg-white/80 group-hover:scale-105 transition-transform">
            <Image
              src="/cyberpng.png"
              alt="Cybersecurity Club UIET Logo"
              width={44}
              height={44}
              className="w-full h-full object-contain rounded-xl"
              priority
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-extrabold text-xs sm:text-base md:text-lg tracking-tight text-[#0F2547] group-hover:text-blue-700 transition-colors whitespace-nowrap">
                CYBERSECURITY CLUB
              </span>
              
              <span className="hidden lg:inline-block text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-100/90 text-blue-900 border border-blue-200 shrink-0">
                UIET • CSJMU KANPUR
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate max-w-[140px] xs:max-w-[200px] sm:max-w-xs md:max-w-none">
              Weekly Video Bulletin • Student Presenter Portal
            </p>
          </div>
        </Link>

        {/* Clean, Accessible Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2 shrink-0">
          
          {/* ALWAYS VISIBLE: Program Home */}
          <Link 
            href="/" 
            className="clay-btn px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 hover:bg-blue-50/70 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
            <span className="font-bold md:hidden">Home</span>
            <span className="font-bold hidden md:inline">Program Home</span>
          </Link>

          {/* DYNAMIC AUTHENTICATION RENDER */}
          {status === "loading" ? (
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center animate-pulse shrink-0">
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            </div>
          ) : session?.user ? (
            
            /* --- LOGGED IN STATE --- */
            <>
              {/* Dynamic Dashboard Button (Home se wapas portal jane ke liye) */}
              <Link 
                href={getDashboardLink()} 
                className="clay-btn px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 hover:bg-blue-50/70 shrink-0"
              >
                <LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
                <span className="font-bold md:hidden">Panel</span>
                <span className="font-bold hidden md:inline">My Dashboard</span>
              </Link>

              {/* Secure Profile Menu */}
              <ProfileMenu user={session.user} />
            </>

          ) : (

            /* --- LOGGED OUT STATE --- */
            <>
              <Link 
                href="/login" // 🟢 FIX: Point to login page instead of dashboard when logged out
                className="clay-btn px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 hover:bg-blue-50/70 shrink-0"
              >
                <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
                <span className="font-bold md:hidden">Portal</span>
                <span className="font-bold hidden md:inline">Student Portal</span>
              </Link>

              <Link 
                href="/executive/login" 
                className="clay-btn-primary px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 shadow-md shrink-0"
              >
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white shrink-0" />
                <span className="font-bold md:hidden">Executive</span>
                <span className="font-bold hidden md:inline">Executive Login</span>
              </Link>

              <button
                onClick={() => router.push("/admin")}
                type="button"
                className="w-4 h-4 text-slate-300/40 hover:text-blue-600 transition-colors flex items-center justify-center cursor-pointer shrink-0 ml-0.5"
                title="Admin Portal"
                aria-label="Admin Portal"
              >
                <Lock className="w-2.5 h-2.5" />
              </button>
            </>

          )}
        </nav>
      </div>
    </header>
  );
}