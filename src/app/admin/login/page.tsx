"use client";
import { useState } from "react";
import { generateAdminOTP, verifyAdminOTPAndLogin } from "@/actions/auth";
import { ShieldAlert, Lock, ArrowRight, KeyRound } from "lucide-react";
import Link from "next/link";

export default function AdminLoginPage() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false); // UI State toggle

  // Temporary storage for credentials to pass to the next step
  const [credentials, setCredentials] = useState({
    email: "admin@csjmu.ac.in",
    password: "admin@cyber2026",
  });

  async function handleInitialSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const res = await generateAdminOTP(formData);

    if (res?.error) {
      setError(res.error);
    } else if (res?.success) {
      setSuccess(res.message || "OTP sent successfully!");
      setShowOTP(true);
    }
    setLoading(false);
  }

  async function handleOTPSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const formData = new FormData(e.currentTarget);
    // Hidden fields se credentials waapas attach karna
    formData.append("email", credentials.email);
    formData.append("password", credentials.password);

    const res = await verifyAdminOTPAndLogin(formData);
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
          <h2 className="text-2xl font-extrabold text-[#0F2547]">
            Club Admin Portal
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Authorized Personnel • Cybersecurity Club UIET
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs font-bold text-center border border-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold text-center border border-emerald-200">
            {success}
          </div>
        )}

        {!showOTP ? (
          <form onSubmit={handleInitialSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 ml-1">
                Admin Email ID
              </label>
              <input
                type="email"
                name="email"
                required
                value={credentials.email || ""}
                onChange={(e) =>
                  setCredentials({ ...credentials, email: e.target.value })
                }
                className="clay-input w-full px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 ml-1">
                Admin Password
              </label>
              <input
                type="password"
                name="password"
                required
                value={credentials.password || ""}
                onChange={(e) =>
                  setCredentials({ ...credentials, password: e.target.value })
                }
                className="clay-input w-full px-4 py-3 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="clay-btn-primary w-full py-3.5 mt-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>
                {loading ? "Authenticating..." : "Request Access (2FA)"}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleOTPSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 ml-1 text-center">
                Enter 6-Digit Verification Code
              </label>
              <input
                type="text"
                name="otp"
                required
                maxLength={6}
                autoComplete="one-time-code" // This strictly forces browsers to expect an OTP, not an email
                className="clay-input w-full px-4 py-3 text-2xl tracking-[0.5em] text-center font-black text-blue-800"
                placeholder="------"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="clay-btn-primary w-full py-3.5 mt-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>
                {loading ? "Verifying Token..." : "Verify & Enter Portal"}
              </span>
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-slate-200/80 text-center">
          <Link
            href="/"
            className="text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
          >
            ← Return to Program Home
          </Link>
        </div>
      </div>
    </div>
  );
}
