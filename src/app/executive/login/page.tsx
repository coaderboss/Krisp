"use client";

import { useState, useEffect } from "react";
import { registerExecutive, checkVerificationStatus, generateExecutiveOTP, verifyExecutiveOTPAndLogin } from "@/actions/executive";
import { ShieldAlert, User, Mail, Lock, Hash, Loader2, CheckCircle, ArrowRight, ShieldCheck, KeyRound } from "lucide-react";
import Link from "next/link";

export default function ExecutivePortal() {
  const [isFlipped, setIsFlipped] = useState(false);

  // --- LOGIN STATES ---
  const [loginStep, setLoginStep] = useState<"CREDENTIALS" | "OTP">("CREDENTIALS");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginSuccess, setLoginSuccess] = useState("");
  const [loginCreds, setLoginCreds] = useState({ name: "", email: "", password: "" });

  // --- REGISTRATION STATES ---
  const [regStep, setRegStep] = useState<"FORM" | "VERIFYING" | "PENDING_ADMIN">("FORM");
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");

  // Registration Polling Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (regStep === "VERIFYING" && registeredEmail) {
      interval = setInterval(async () => {
        const res = await checkVerificationStatus(registeredEmail);
        if (res.verified) {
          setRegStep("PENDING_ADMIN");
          clearInterval(interval);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [regStep, registeredEmail]);

  // --- HANDLERS ---
  async function handleLoginSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoginLoading(true); setLoginError(""); setLoginSuccess("");

    const formData = new FormData();
    formData.append("name", loginCreds.name);
    formData.append("email", loginCreds.email);
    formData.append("password", loginCreds.password);

    const res = await generateExecutiveOTP(formData);
    if (res?.error) {
      setLoginError(res.error);
    } else {
      setLoginSuccess(res?.message || "OTP Sent!");
      setLoginStep("OTP");
    }
    setLoginLoading(false);
  }

  async function handleOTPSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoginLoading(true); setLoginError("");

    const formData = new FormData(e.currentTarget);
    formData.append("email", loginCreds.email);
    formData.append("password", loginCreds.password);

    const res = await verifyExecutiveOTPAndLogin(formData);
    if (res?.error) {
      setLoginError(res.error);
      setLoginLoading(false);
    }
  }

  async function handleRegSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setRegLoading(true); setRegError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    
    const res = await registerExecutive(formData);
    if (res.error) {
      setRegError(res.error);
      setRegLoading(false);
    } else {
      setRegisteredEmail(email);
      setRegStep("VERIFYING");
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 bg-transparent perspective-[2000px]">
      
      {/* THE 3D FLIP CONTAINER */}
      <div className={`relative w-full max-w-md transition-transform duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
        
        {/* ================= FRONT SIDE (LOGIN) ================= */}
        <div className={`absolute inset-0 w-full h-full clay-card p-8 [backface-visibility:hidden] flex flex-col justify-center ${isFlipped ? 'pointer-events-none' : ''}`}>
          <div className="text-center mb-6 space-y-1">
            <div className="w-16 h-16 rounded-2xl clay-navy flex items-center justify-center shadow-lg mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-blue-400" />
            </div>
            <span className="clay-badge-blue text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider inline-block">
              Core Team Access
            </span>
            <h2 className="text-2xl font-extrabold text-[#0F2547]">Executive Login</h2>
          </div>

          {loginError && <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs font-bold text-center border border-red-200">{loginError}</div>}
          {loginSuccess && <div className="mb-4 p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold text-center border border-emerald-200">{loginSuccess}</div>}

          {loginStep === "CREDENTIALS" ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 ml-1">Exact Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                  <input type="text" required value={loginCreds.name} onChange={e => setLoginCreds({...loginCreds, name: e.target.value})} className="clay-input w-full pl-10 pr-4 py-3 text-sm" placeholder="Your Name" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 ml-1">Registered Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                  <input type="email" required value={loginCreds.email} onChange={e => setLoginCreds({...loginCreds, email: e.target.value})} className="clay-input w-full pl-10 pr-4 py-3 text-sm" placeholder="student@csjmu.ac.in" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 ml-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                  <input type="password" required value={loginCreds.password} onChange={e => setLoginCreds({...loginCreds, password: e.target.value})} className="clay-input w-full pl-10 pr-4 py-3 text-sm" placeholder="••••••••" />
                </div>
              </div>
              <button type="submit" disabled={loginLoading} className="clay-btn-primary w-full py-3.5 mt-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                {loginLoading ? "Authenticating..." : "Request OTP"} <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleOTPSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 ml-1 text-center">Enter 6-Digit OTP</label>
                <input type="text" name="otp" required maxLength={6} autoComplete="one-time-code" className="clay-input w-full px-4 py-3 text-2xl tracking-[0.5em] text-center font-black text-blue-800" placeholder="------" autoFocus />
              </div>
              <button type="submit" disabled={loginLoading} className="clay-btn-primary w-full py-3.5 mt-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                <KeyRound className="w-4 h-4" /> {loginLoading ? "Verifying..." : "Verify & Login"}
              </button>
            </form>
          )}

          <div className="mt-8 pt-4 border-t border-slate-200/80 text-center">
            <p className="text-xs text-slate-500 font-medium">Don&apos;t have executive access?</p>
            <button type="button" onClick={() => setIsFlipped(true)} className="text-xs font-extrabold text-blue-600 hover:text-blue-800 transition-colors mt-1">
              Apply for Core Team ➔
            </button>
          </div>
        </div>

        {/* ================= BACK SIDE (REGISTRATION) ================= */}
        {/* We use relative here to give the flip container its actual height */}
        <div className={`relative w-full clay-card p-8 [backface-visibility:hidden] [transform:rotateY(180deg)] ${!isFlipped ? 'pointer-events-none' : ''}`}>
          
          {regStep === "FORM" && (
            <div>
              <div className="text-center mb-6 space-y-1">
                <div className="w-16 h-16 rounded-2xl clay-navy flex items-center justify-center shadow-lg mx-auto mb-4">
                  <ShieldAlert className="w-8 h-8 text-amber-400" />
                </div>
                <h2 className="text-2xl font-extrabold text-[#0F2547]">Apply for Executive</h2>
              </div>

              {regError && <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs font-bold text-center border border-red-200">{regError}</div>}

              <form onSubmit={handleRegSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 ml-1">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                    <input type="text" name="name" required className="clay-input w-full pl-10 pr-4 py-3 text-sm" placeholder="John Doe" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 ml-1">University Roll Number</label>
                  <div className="relative">
                    <Hash className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                    <input type="text" name="rollNumber" required className="clay-input w-full pl-10 pr-4 py-3 text-sm" placeholder="e.g. 2100456..." />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                    <input type="email" name="email" required className="clay-input w-full pl-10 pr-4 py-3 text-sm" placeholder="student@csjmu.ac.in" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 ml-1">Create Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                    <input type="password" name="password" required minLength={6} className="clay-input w-full pl-10 pr-4 py-3 text-sm" placeholder="••••••••" />
                  </div>
                </div>

                <button type="submit" disabled={regLoading} className="clay-btn-primary w-full py-3.5 mt-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                  {regLoading ? "Processing..." : "Create Identity"} <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {regStep === "VERIFYING" && (
            <div className="py-12 text-center flex flex-col items-center">
              <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                <Mail className="w-8 h-8 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <h2 className="text-xl font-extrabold text-[#0F2547] mb-2">Awaiting Verification</h2>
              <p className="text-sm text-slate-500 font-medium px-4">
                We sent a verification link to <strong>{registeredEmail}</strong>. 
                Please open your email and click the link to continue.
              </p>
            </div>
          )}

          {regStep === "PENDING_ADMIN" && (
            <div className="py-12 text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-5 shadow-inner">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-extrabold text-[#0F2547] mb-2">Verification Complete!</h2>
              <div className="clay-inset p-4 rounded-xl bg-amber-50/50 border border-amber-100 mb-6">
                <p className="text-sm text-slate-600 font-medium">
                  Your request has been forwarded to the Supreme Admin. You will receive an email once approved.
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-200/80 text-center">
            <p className="text-xs text-slate-500 font-medium">Already have executive access?</p>
            <button type="button" onClick={() => setIsFlipped(false)} className="text-xs font-extrabold text-blue-600 hover:text-blue-800 transition-colors mt-1">
              ⬅ Return to Login
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}