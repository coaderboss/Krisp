"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, UserCheck, Video, Lock } from "lucide-react";

export default function Navbar() {
  const router = useRouter();

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

  return (
    <header className="sticky top-3 z-50 px-3 sm:px-6">
      <div className="max-w-7xl mx-auto clay-card px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        {/* Brand Identity with Official Club Logo (Normal Home Link) */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-12 h-12 rounded-2xl clay-pill p-1 flex items-center justify-center shrink-0 shadow-md overflow-hidden bg-white/80 group-hover:scale-105 transition-transform">
            <Image
              src="/cyberpng.png"
              alt="Cybersecurity Club UIET Logo"
              width={46}
              height={46}
              className="w-full h-full object-contain rounded-xl"
              priority
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-[#0F2547] group-hover:text-blue-700 transition-colors">
                CYBERSECURITY CLUB
              </span>
              
              {/* Normal Badge (No secret click) */}
              <span className="hidden md:inline-block text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-100/90 text-blue-900 border border-blue-200">
                UIET • CSJMU KANPUR
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
              Weekly Video Bulletin • Student Presenter Portal
            </p>
          </div>
        </Link>

        {/* Clean, Accessible Navigation Tabs */}
        <nav className="flex items-center gap-2 sm:gap-2.5">
          <Link 
            href="/" 
            className="clay-btn px-3.5 py-2 text-xs sm:text-sm flex items-center gap-1.5 hover:bg-blue-50/70"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="font-bold">Program Home</span>
          </Link>

          <Link 
            href="/dashboard" 
            className="clay-btn px-3.5 py-2 text-xs sm:text-sm flex items-center gap-1.5 hover:bg-blue-50/70"
          >
            <UserCheck className="w-4 h-4 text-blue-600" />
            <span className="font-bold">Student Portal</span>
          </Link>

          <Link 
            href="/login" 
            className="clay-btn-primary px-4 py-2 text-xs sm:text-sm flex items-center gap-1.5 shadow-md"
          >
            <Video className="w-4 h-4 text-white" />
            <span className="font-bold">Enroll Now</span>
          </Link>

          {/* Secret Door 2: The discreet small lock button */}
          <button
            onClick={() => router.push("/admin")}
            type="button"
            className="w-4 h-4 text-slate-300/40 hover:text-blue-600 transition-colors flex items-center justify-center cursor-pointer ml-0.5"
            title="Admin Portal"
            aria-label="Admin Portal"
          >
            <Lock className="w-2.5 h-2.5" />
          </button>
        </nav>
      </div>
    </header>
  );
}