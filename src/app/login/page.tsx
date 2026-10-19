"use client";
import { useState } from "react";
import { registerStudent, loginStudent } from "@/actions/auth";
import { Sparkles, ShieldCheck, User, Mail, Lock, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState<{text: string, type: "error" | "success"} | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    
    const formData = new FormData(e.currentTarget);

    if (isLogin) {
      const res = await loginStudent(formData);
      if (res?.error) setMessage({ text: res.error, type: "error" });
    } else {
      const res = await registerStudent(formData);
      if (res?.error) {
        setMessage({ text: res.error, type: "error" });
      } else {
        setMessage({ text: "Registration successful! Ab aap login kar sakte hain.", type: "success" });
        setIsLogin(true);
      }
    }
    setLoading(false);
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full clay-card p-8 sm:p-10 animate-in fade-in zoom-in duration-500">
        
        <div className="flex justify-center mb-6">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-colors duration-300 ${isLogin ? "clay-navy" : "bg-amber-100"}`}>
            {isLogin ? <ShieldCheck className="w-8 h-8 text-blue-400" /> : <Sparkles className="w-8 h-8 text-amber-500" />}
          </div>
        </div>
        
        <div className="text-center mb-8 space-y-1">
          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${isLogin ? "clay-badge-blue" : "clay-badge-amber"}`}>
            Student Portal
          </span>
          <h2 className="text-2xl font-extrabold text-[#0F2547]">
            {isLogin ? "Secure Login" : "Create Account"}
          </h2>
        </div>

        {message && (
          <div className={`mb-6 p-3.5 rounded-xl text-xs font-bold text-center border transition-all ${message.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="animate-in slide-in-from-top-2">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input type="text" name="name" required className="clay-input w-full pl-10 pr-4 py-3 text-sm font-bold text-slate-800" placeholder="Deepak Kumar" />
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input type="email" name="email" required className="clay-input w-full pl-10 pr-4 py-3 text-sm font-bold text-slate-800" placeholder="student@csjmu.ac.in" />
            </div>
          </div>
          
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input type="password" name="password" required className="clay-input w-full pl-10 pr-4 py-3 text-sm font-bold text-slate-800" placeholder="••••••••" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="clay-btn-primary w-full py-4 mt-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md">
            {loading ? "Processing..." : (isLogin ? "Enter Portal" : "Complete Registration")}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="mt-8 pt-5 border-t border-slate-200/80 text-center">
          <p className="text-xs text-slate-500 font-medium mb-1.5">
            {isLogin ? "Don't have an account yet?" : "Already registered?"}
          </p>
          <button 
            type="button" 
            onClick={() => { setIsLogin(!isLogin); setMessage(null); }} 
            className="text-xs font-extrabold text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-wider"
          >
            {isLogin ? "Create Student Account ➔" : "⬅ Back to Login"}
          </button>
        </div>
      </div>
    </div>
  );
}