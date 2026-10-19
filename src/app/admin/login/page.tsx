"use client";
import { useState } from "react";
import { loginAdmin } from "@/actions/auth";
import { ShieldAlert, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function AdminLoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const res = await loginAdmin(formData);
    if (res?.error) {
      setError(res.error);
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-12 px-4">
      <div className="clay-card p-8 relative">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl clay-navy flex items-center justify-center shadow-lg">
            <ShieldAlert className="w-8 h-8 text-amber-400" />
          </div>
        </div>

        <div className="text-center mb-6 space-y-1">
          <span className="clay-badge-amber text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider inline-block">
            Restricted Access
          </span>
          <h2 className="text-2xl font-extrabold text-[#0F2547]">Club Admin Portal</h2>
          <p className="text-xs text-slate-500 font-medium">Authorized Personnel • Cybersecurity Club UIET</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs font-bold text-center border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 ml-1">Admin Email ID</label>
            <input 
              type="email" 
              name="email" 
              required 
              defaultValue="admin@csjmu.ac.in"
              className="clay-input w-full px-4 py-3 text-sm" 
              placeholder="admin@csjmu.ac.in" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 ml-1">Admin Password</label>
            <input 
              type="password" 
              name="password" 
              required 
              defaultValue="admin@cyber2026"
              className="clay-input w-full px-4 py-3 text-sm" 
              placeholder="••••••••••••" 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="clay-btn-primary w-full py-3.5 mt-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            <span>{loading ? "Authenticating..." : "Authenticate & Enter"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-200/80 text-center">
          <Link href="/" className="text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors">
            ← Return to Program Home
          </Link>
        </div>
      </div>
    </div>
  );
}

