"use client";
import { useState } from "react";
import { registerStudent, loginStudent, sendPasswordResetLink } from "@/actions/auth"; // Backend action hum next step me banayenge
import { Sparkles, ShieldCheck, User, Mail, Lock, ArrowRight, MailCheck, Loader2, KeyRound } from "lucide-react";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPass, setShowForgotPass] = useState(false);
  const [message, setMessage] = useState<{text: string, type: "error" | "success"} | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [isFlipping, setIsFlipping] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  
  const [password, setPassword] = useState("");

  const getStrength = (p: string) => {
    let score = 0;
    if (p.length > 7) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/[0-9!@#$%^&*]/.test(p)) score++;
    return score;
  };
  
  const strength = getStrength(password);
  const strengthColors = ["bg-red-500", "bg-red-500", "bg-amber-500", "bg-emerald-500"];
  const strengthLabels = ["Very Weak", "Weak", "Fair", "Strong"];

  function toggleMode() {
    setIsFlipping(true);
    setMessage(null);
    setPassword("");
    setTimeout(() => {
      setIsLogin(!isLogin);
      setShowForgotPass(false);
      setIsFlipping(false);
    }, 300); 
  }

  function toggleForgotPass() {
    setMessage(null);
    setShowForgotPass(!showForgotPass);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    
    const formData = new FormData(e.currentTarget);

    if (showForgotPass) {
      // 🟢 FORGOT PASSWORD LOGIC (Magic Link)
      const res = await sendPasswordResetLink(formData);
      if (res?.error) {
        setMessage({ text: res.error, type: "error" });
      } else {
        setMessage({ text: "Agar email registered hai, toh reset link bhej diya gaya hai. Apna inbox check karein.", type: "success" });
        setTimeout(() => setShowForgotPass(false), 5000);
      }
    } else if (isLogin) {
      // 🟢 LOGIN LOGIC
      const res = await loginStudent(formData);
      if (res?.error) setMessage({ text: res.error, type: "error" });
    } else {
      // 🟢 REGISTRATION LOGIC
      if (strength < 2) {
        setMessage({ text: "Kripya ek strong password chunein.", type: "error" });
        setLoading(false);
        return;
      }

      setShowVerification(true);
      const res = await registerStudent(formData);
      
      if (res?.error) {
        setShowVerification(false);
        setMessage({ text: res.error, type: "error" });
      } else {
        setTimeout(() => {
          setShowVerification(false);
          setIsLogin(true);
          setMessage({ text: "Verification successful! Ab aap login kar sakte hain.", type: "success" });
        }, 3000); 
      }
    }
    setLoading(false);
  }

  // --- UI: EMAIL VERIFICATION PENDING STATE ---
  if (showVerification) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full clay-card p-10 text-center animate-in zoom-in duration-500">
          <div className="w-20 h-20 mx-auto rounded-full bg-blue-50 flex items-center justify-center mb-6 relative">
            <MailCheck className="w-10 h-10 text-blue-600" />
            <span className="absolute top-0 right-0 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center animate-ping"></span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#0F2547] mb-2">Verifying Email...</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">
            Hum aapke credentials aur college email ko secure system mein register kar rahe hain. Kripya prateeksha karein.
          </p>
          <div className="flex items-center justify-center gap-2 text-blue-600 font-bold text-sm">
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing Request
          </div>
        </div>
      </div>
    );
  }

  // --- UI: MAIN PORTAL (Login / Register / Forgot Pass) ---
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-2 sm:px-4 py-6 sm:py-10 w-full overflow-x-hidden" style={{ perspective: "1000px" }}>
      <div 
        className="max-w-md w-full clay-card p-5 sm:p-8 md:p-10 transition-all duration-300 transform-gpu"
        style={{ 
          transform: isFlipping ? "rotateY(90deg) scale(0.95)" : "rotateY(0deg) scale(1)",
          opacity: isFlipping ? 0.5 : 1
        }}
      >
        <div className="flex justify-center mb-5 sm:mb-6">
          <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg transition-colors duration-300 ${showForgotPass ? "bg-purple-100" : isLogin ? "clay-navy" : "bg-amber-100"}`}>
            {showForgotPass ? <KeyRound className="w-7 h-7 sm:w-8 sm:h-8 text-purple-600" /> : isLogin ? <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 text-blue-400" /> : <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-amber-500" />}
          </div>
        </div>
        
        <div className="text-center mb-6 sm:mb-8 space-y-1">
          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${showForgotPass ? "bg-purple-100 text-purple-800" : isLogin ? "clay-badge-blue" : "clay-badge-amber"}`}>
            {showForgotPass ? "Account Recovery" : "Student Portal"}
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F2547]">
            {showForgotPass ? "Reset Password" : isLogin ? "Secure Login" : "Create Account"}
          </h2>
        </div>

        {message && (
          <div className={`mb-6 p-3.5 rounded-xl text-xs font-bold text-center border transition-all ${message.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* NAYA: FORGOT PASSWORD UI */}
          {showForgotPass ? (
            <div className="animate-in fade-in slide-in-from-right-2">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-1">Registered Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input type="email" name="email" required maxLength={100} className="clay-input w-full pl-10 pr-4 py-3 text-base sm:text-sm font-bold text-slate-800" placeholder="student@csjmu.ac.in" />
              </div>
              <p className="text-[10px] text-slate-500 mt-2 px-1">Ek secure magic link aapke inbox mein bheja jayega jo 15 minute ke liye valid hoga.</p>
            </div>
          ) : (
            <>
              {/* REGISTRATION NAME FIELD */}
              {!isLogin && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-1">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                    {/* 🟢 DOS FIX: Max Length 50 */}
                    <input type="text" name="name" required maxLength={50} className="clay-input w-full pl-10 pr-4 py-3 text-base sm:text-sm font-bold text-slate-800" placeholder="Deepak Kumar" />
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  {/* 🟢 DOS FIX: Max Length 100 */}
                  <input type="email" name="email" required maxLength={100} className="clay-input w-full pl-10 pr-4 py-3 text-base sm:text-sm font-bold text-slate-800" placeholder="student@csjmu.ac.in" />
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1 ml-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
                  {isLogin && (
                    <button type="button" onClick={toggleForgotPass} className="text-[10px] font-extrabold text-blue-600 hover:text-blue-800 uppercase tracking-wider">
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  {/* 🟢 DOS FIX: Max Length 32 for bcrypt protection */}
                  <input 
                    type="password" 
                    name="password" 
                    required 
                    maxLength={32}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="clay-input w-full pl-10 pr-4 py-3 text-base sm:text-sm font-bold text-slate-800" 
                    placeholder="••••••••" 
                  />
                </div>
                
                {/* SMART PASSWORD STRENGTH INDICATOR */}
                {!isLogin && password.length > 0 && (
                  <div className="mt-2.5 px-1 animate-in fade-in">
                    <div className="flex gap-1.5 h-1.5">
                      <div className={`flex-1 rounded-full transition-colors duration-500 ${strength >= 1 ? strengthColors[strength] : 'bg-slate-200'}`}></div>
                      <div className={`flex-1 rounded-full transition-colors duration-500 ${strength >= 2 ? strengthColors[strength] : 'bg-slate-200'}`}></div>
                      <div className={`flex-1 rounded-full transition-colors duration-500 ${strength >= 3 ? strengthColors[strength] : 'bg-slate-200'}`}></div>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className={`text-[10px] font-bold ${strength < 2 ? 'text-red-500' : strength === 2 ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {strengthLabels[strength]}
                      </span>
                      {strength < 2 && <span className="text-[9px] text-slate-400">Use numbers & symbols</span>}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <button type="submit" disabled={loading} className="clay-btn-primary w-full py-4 mt-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md">
            {loading ? "Processing..." : showForgotPass ? "Send Magic Link" : isLogin ? "Enter Portal" : "Complete Registration"}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="mt-8 pt-5 border-t border-slate-200/80 text-center">
          {showForgotPass ? (
            <button type="button" onClick={toggleForgotPass} className="text-xs font-extrabold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider">
              ⬅ Back to Login
            </button>
          ) : (
            <>
              <p className="text-xs text-slate-500 font-medium mb-1.5">
                {isLogin ? "Don't have an account yet?" : "Already registered?"}
              </p>
              <button type="button" onClick={toggleMode} className="text-xs font-extrabold text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-wider">
                {isLogin ? "Create Student Account ➔" : "⬅ Back to Login"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}