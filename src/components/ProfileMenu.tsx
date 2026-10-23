"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import { User, LogOut, Building2, GraduationCap, Hash, ShieldCheck, ChevronDown, Award } from "lucide-react";

export default function ProfileMenu({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Bahar click karne par dropdown close karne ka logic
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 🟢 PROFILE BUTTON (Navbar me dikhega) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 sm:p-1.5 sm:pr-3 bg-white border border-slate-200 rounded-full shadow-sm hover:shadow-md transition-all focus:outline-none"
      >
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-extrabold text-sm shadow-inner">
          {user.name?.charAt(0).toUpperCase()}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-[11px] font-extrabold text-[#0F2547] leading-tight">{user.name}</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{user.role}</p>
        </div>
        <ChevronDown className={`hidden sm:block w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* 🟢 DROPDOWN MENU */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          
          {/* Header Section */}
          <div className="bg-slate-50 p-4 border-b border-slate-100">
            <h3 className="font-extrabold text-[#0F2547] text-sm">{user.name}</h3>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                user.role === 'CLUB_ADMIN' ? 'bg-blue-100 text-blue-700' :
                user.role === 'EXECUTIVE' ? 'bg-purple-100 text-purple-700' :
                'bg-emerald-100 text-emerald-700'
              }`}>
                {user.role}
              </span>
              {user.isProfileComplete && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </span>
              )}
            </div>
          </div>

          {/* Profile Details Section */}
          {user.isProfileComplete && (
            <div className="p-4 space-y-3 border-b border-slate-100 bg-white">
              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">College</p>
                  <p className="text-xs font-bold text-slate-700">{user.college}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <GraduationCap className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Department</p>
                  <p className="text-xs font-bold text-slate-700">{user.department}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Hash className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Roll Number</p>
                  <p className="text-xs font-bold text-slate-700 uppercase">{user.rollNumber}</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions Section */}
          <div className="p-2 bg-slate-50/50">
            {/* Executive Gamification Hint */}
            {user.role === 'EXECUTIVE' && (
              <div className="px-3 py-2 mb-1 flex items-center justify-between bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-600" /> Core Team
                </span>
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">Active</span>
              </div>
            )}
            
            <button 
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" /> Secure Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}