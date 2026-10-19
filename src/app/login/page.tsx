"use client";
import { useState } from "react";
import { registerStudent, loginStudent } from "@/actions/auth";
import { Sparkles, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("Processing...");
    
    const formData = new FormData(e.currentTarget);

    if (isLogin) {
      const res = await loginStudent(formData);
      if (res?.error) setMessage(res.error);
    } else {
      const res = await registerStudent(formData);
      if (res?.error) {
        setMessage(res.error);
      } else {
        setMessage("Registration successful! Ab aap login kar sakte hain.");
        setIsLogin(true);
      }
    }
    setLoading(false);
  }

  return (
    <div className="max-w-md mx-auto mt-10">
      <div className="clay-card p-8">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl clay-soft-blue flex items-center justify-center">
            {isLogin ? <ShieldCheck className="w-8 h-8 text-blue-600" /> : <Sparkles className="w-8 h-8 text-amber-500" />}
          </div>
        </div>
        
        <h2 className="text-2xl font-extrabold text-[#0F2547] text-center mb-6">
          {isLogin ? "Student Login" : "Register Account"}
        </h2>

        {message && (
          <div className="mb-5 p-3 rounded-xl bg-blue-100 text-blue-800 text-sm font-semibold text-center border border-blue-200">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Full Name</label>
              <input type="text" name="name" required className="clay-input w-full px-4 py-3 text-sm" placeholder="e.g. Deepak Kumar" />
            </div>
          )}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Email Address</label>
            <input type="email" name="email" required className="clay-input w-full px-4 py-3 text-sm" placeholder="student@csjmu.ac.in" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Password</label>
            <input type="password" name="password" required className="clay-input w-full px-4 py-3 text-sm" placeholder="••••••••" />
          </div>

          <button type="submit" disabled={loading} className="clay-btn-primary w-full py-3.5 mt-2 text-sm uppercase tracking-wider">
            {loading ? "Please wait..." : (isLogin ? "Secure Login" : "Create Account")}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-200 text-center">
          <button 
            type="button" 
            onClick={() => { setIsLogin(!isLogin); setMessage(""); }} 
            className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors"
          >
            {isLogin ? "New student? Create an account here" : "Already registered? Login here"}
          </button>
        </div>
      </div>
    </div>
  );
}