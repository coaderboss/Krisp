"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { resetPassword } from "@/actions/auth";
import { ShieldCheck, Lock, ArrowRight, CheckCircle2 } from "lucide-react";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);

  // Security: Prevent rendering if no token is present in the URL
  useEffect(() => {
    if (!token) {
      setMessage({ text: "Invalid or missing secure token. Please request a new reset link.", type: "error" });
    }
  }, [token]);

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;

    if (password !== confirmPassword) {
      setMessage({ text: "Passwords do not match. Please verify your input.", type: "error" });
      return;
    }

    if (strength < 2) {
      setMessage({ text: "Please select a stronger password.", type: "error" });
      return;
    }

    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("token", token);
    formData.append("password", password);

    const res = await resetPassword(formData);

    if (res?.error) {
      setMessage({ text: res.error, type: "error" });
      setLoading(false);
    } else {
      setMessage({ text: res?.message || "Password updated.", type: "success" });
      // Redirect to login after a brief delay for UX
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full clay-card p-8 sm:p-10 animate-in fade-in zoom-in duration-500">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg bg-purple-100">
            <ShieldCheck className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="text-center mb-8 space-y-1">
          <span className="text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider bg-purple-100 text-purple-800">
            Security Protocol
          </span>
          <h2 className="text-2xl font-extrabold text-[#0F2547]">Set New Password</h2>
        </div>

        {message && (
          <div className={`mb-6 p-3.5 rounded-xl text-xs font-bold text-center border transition-all flex items-center justify-center gap-2 ${
            message.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"
          }`}>
            {message.type === "success" && <CheckCircle2 className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-1">New Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="password"
                required
                disabled={!token || message?.type === "success"}
                maxLength={32}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="clay-input w-full pl-10 pr-4 py-3 text-sm font-bold text-slate-800 disabled:opacity-50"
                placeholder="Enter new password"
              />
            </div>

            {password.length > 0 && (
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
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-1">Confirm Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="password"
                required
                disabled={!token || message?.type === "success"}
                maxLength={32}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`clay-input w-full pl-10 pr-4 py-3 text-sm font-bold disabled:opacity-50 ${
                  confirmPassword.length > 0 && password !== confirmPassword ? "text-red-600 border-red-300 bg-red-50" : "text-slate-800"
                }`}
                placeholder="Re-type new password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !token || message?.type === "success"}
            className="clay-btn-primary w-full py-4 mt-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
          >
            {loading ? "Updating Security Credentials..." : "Confirm & Update Password"}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}