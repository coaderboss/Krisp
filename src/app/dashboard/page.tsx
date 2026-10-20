"use client";

import { useState, useEffect } from "react";
import { BookOpen, BellRing, CheckCircle, Shield, ArrowRight, Loader2, Info, Clock } from "lucide-react";
import { getStudentDashboardData, submitStudentForm, nudgeAdmin } from "@/actions/student";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function StudentDashboard() {
  const [loading, setLoading] = useState("init");
  const [data, setData] = useState<any>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState<{text: string, type: string} | null>(null);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);

  // --- BUG FIX: AUTO-HIDE NOTIFICATION TIMER ---
  function notify(text: string, type: "success" | "error" = "success") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000); // 5 seconds baad bar gayab ho jayegi
  }

  useEffect(() => {
    async function load() {
      const res = await getStudentDashboardData();
      if (res.success) setData(res);
      setLoading("");
    }
    load();
  }, []);

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormLoading(true);
    const formData = new FormData(e.currentTarget);
    const res = await submitStudentForm(formData);
    if (res.success) {
      window.location.reload();
    } else {
      notify(res.error || "Submission failed.", "error"); // Updated to use auto-hide
      setFormLoading(false);
    }
  }

  async function handleNudge() {
    if (!data?.applicationData?.id) return;
    setLoading("nudge");
    const res = await nudgeAdmin(data.applicationData.id);
    if (res.success) {
      notify(res.message || "", "success"); // Updated to use auto-hide
      setData({ ...data, applicationData: { ...data.applicationData, hasNudged: true } });
    } else {
      notify(res.error || "Something went wrong.", "error"); // Shows error if rate limit hits
    }
    setLoading("");
  }

  if (loading === "init") return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in pb-16">
      
      {/* NOTIFICATION BAR (Ab ye 5 sec baad automatically hide ho jayegi) */}
      {message && (
        <div className={`p-4 rounded-2xl text-sm font-bold text-center border shadow-md transition-all duration-500 ease-in-out ${message.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"}`}>
          {message.text}
        </div>
      )}

      {/* --- PREMIUM CLEAN HEADER --- */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl clay-navy flex items-center justify-center shrink-0">
            <Shield className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F2547] tracking-tight">Student Portal</h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">Weekly Cybersecurity Video Bulletin Program</p>
          </div>
        </div>

        <button 
          onClick={() => signOut({ callbackUrl: "/login" })} 
          className="clay-btn px-4 py-2.5 text-xs font-bold text-red-600 flex items-center gap-2 hover:bg-red-50 transition-colors shadow-sm cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Secure Logout
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- LEFT COLUMN: RULES & REGULATIONS --- */}
        <div className="lg:col-span-1 space-y-6">
          <div className="clay-card p-6 sm:p-8">
            <h3 className="text-lg font-extrabold text-[#0F2547] flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
              <BookOpen className="w-5 h-5 text-blue-600" /> Program Guidelines
            </h3>
            <ul className="space-y-4 text-sm text-slate-600 font-medium">
              <li className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong className="text-slate-800">Single Application Policy:</strong> You may only submit one active application. Duplicate submissions are automatically blocked.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong className="text-slate-800">Waitlist Priority:</strong> Candidates are processed in a FIFO (First-In-First-Out) queue. Admin decisions are final.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong className="text-slate-800">The Nudge Feature:</strong> If your application is pending for more than 3 days, you can "Nudge" the admin to highlight your profile.</span>
              </li>
            </ul>
            <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-100 flex gap-3 text-xs text-blue-800">
              <Info className="w-5 h-5 shrink-0 text-blue-600" />
              <p>Selected candidates will receive an email from the Executive team detailing their screening schedule.</p>
            </div>
          </div>
        </div>

        {/* --- RIGHT COLUMN: DYNAMIC FORM OR STATUS CARD --- */}
        <div className="lg:col-span-2">
          
          {data?.hasApplied ? (
            /* ALREADY APPLIED VIEW & NUDGE BUTTON */
            <div className="clay-card p-8 sm:p-10 text-center space-y-5 border-t-4 border-t-amber-400">
              <div className="w-20 h-20 mx-auto rounded-full bg-amber-50 flex items-center justify-center shadow-inner">
                <Clock className="w-10 h-10 text-amber-500" />
              </div>
              <h2 className="text-2xl font-extrabold text-[#0F2547]">Application Under Review</h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                You have successfully registered for the bulletin program. Your current status is <strong className="text-amber-600 uppercase tracking-wider">{data.applicationData.status}</strong>.
              </p>
              
              <div className="pt-8 mt-4 border-t border-slate-100 flex flex-col items-center justify-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Taking too long?</p>
                <button 
                  onClick={handleNudge}
                  disabled={data.applicationData.hasNudged || loading === "nudge" || data.applicationData.status !== "WAITING"}
                  className={`px-8 py-4 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md transition-all ${
                    data.applicationData.hasNudged 
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                    : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:scale-105 hover:shadow-lg"
                  }`}
                >
                  <BellRing className="w-5 h-5" />
                  {data.applicationData.hasNudged ? "Admin Notified Successfully" : "Push / Nudge Admin"}
                </button>
                {data.applicationData.hasNudged && (
                  <p className="text-[11px] text-emerald-600 font-bold mt-3">Your application has been highlighted in the Admin Pipeline.</p>
                )}
              </div>
            </div>
          ) : (
            /* DYNAMIC PUBLISHED FORM */
            <div className="clay-card p-6 sm:p-10">
              <div className="border-b border-slate-200/80 pb-5 mb-6">
                <h2 className="text-2xl font-extrabold text-[#0F2547]">Application Form</h2>
                <p className="text-sm text-slate-500 mt-1">Fill out the official form generated by the core team to participate.</p>
              </div>
              
              <form onSubmit={handleFormSubmit} className="space-y-6">
                {data?.formFields?.map((field: any) => (
                  <div key={field.id} className="animate-in slide-in-from-bottom-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 ml-1">
                      {field.fieldLabel} {field.isRequired && <span className="text-red-500">*</span>}
                    </label>
                    
                    {field.fieldType === "TEXT" && (
                      <input type="text" name={field.fieldLabel} required={field.isRequired} className="clay-input w-full px-4 py-3.5 text-sm font-medium" placeholder="Type your answer..." />
                    )}
                    
                    {field.fieldType === "DROPDOWN" && (
                      <div className="relative">
                        <select name={field.fieldLabel} required={field.isRequired} className="clay-input w-full px-4 py-3.5 text-sm font-medium bg-white appearance-none">
                          <option value="">Select an option...</option>
                          {field.options.map((opt: string, i: number) => <option key={i} value={opt}>{opt}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                      </div>
                    )}

                    {field.fieldType === "CHECKBOX" && (
                      <div className="space-y-3 mt-3">
                        {field.options.map((opt: string, i: number) => (
                          <label key={i} className="flex items-center gap-3 cursor-pointer group">
                            <div className="relative flex items-center justify-center">
                              <input type="checkbox" name={`${field.fieldLabel}[]`} value={opt} className="peer w-5 h-5 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 transition-colors cursor-pointer" />
                            </div>
                            <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700 transition-colors">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {field.fieldType === "FILE_UPLOAD" && (
                      <div className="clay-inset p-4 rounded-xl border border-slate-200 border-dashed bg-slate-50/50">
                        <input type="file" name={field.fieldLabel} required={field.isRequired} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 transition-colors cursor-pointer" />
                      </div>
                    )}
                  </div>
                ))}

                {/* --- OFFICIAL DECLARATION --- */}
                <div className="mt-8 mb-6 p-5 rounded-2xl bg-blue-50 border border-blue-100">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      required
                      checked={declarationAccepted}
                      onChange={(e) => setDeclarationAccepted(e.target.checked)}
                      className="mt-1 w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 shadow-sm cursor-pointer" 
                    />
                    <span className="text-xs sm:text-sm font-medium text-slate-700 leading-relaxed">
                      <strong className="text-[#0F2547] block mb-1">Official Declaration:</strong> I hereby declare my genuine interest in presenting. If shortlisted, I commit to being present and fully prepared on the scheduled date. I understand that any unjustified absence or unprofessional conduct may cause disruption to the club's schedule and will strictly affect my future participation in Cybersecurity Club activities.
                    </span>
                  </label>
                </div>
                
                <button 
                  type="submit" 
                  disabled={formLoading || !declarationAccepted} 
                  className="clay-btn-primary w-full py-4 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {formLoading ? "Submitting Application..." : "Accept & Submit Application"} <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
          

        </div>
      </div>
    </div>
  );
}