"use client";

import { useState, useEffect } from "react";
import { 
  BookOpen, BellRing, CheckCircle, Shield, ArrowRight, Loader2, Info, Ticket, Calendar as CalendarIcon, Activity,
  ChevronLeft, ChevronRight, Award, FileText, CheckCircle2, AlertTriangle, CalendarDays, Lightbulb, MailWarning, Clock
} from "lucide-react";
import { getStudentDashboardData, submitStudentForm, nudgeAdmin } from "@/actions/student";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function StudentDashboard() {
  const [loading, setLoading] = useState("init");
  const [data, setData] = useState<any>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState<{text: string, type: string} | null>(null);
  
  // SPA View Routing States
  const [currentView, setCurrentView] = useState<"DASHBOARD" | "INSTRUCTIONS" | "FORM" | "STATUS">("DASHBOARD");
  const [selectedForm, setSelectedForm] = useState<any | null>(null);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);

  // Calendar Logic (Mock Data)
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const monthName = today.toLocaleString('default', { month: 'long' });
  const mockEvents: Record<number, string> = {
    5: "Intro to Kali Linux Workshop",
    12: "Weekly Bulletin Live Shoot",
    18: "Hackathon Registration Ends",
    25: "Core Team Meetup"
  };

  function notify(text: string, type: "success" | "error" = "success") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  }

  async function loadData() {
    const res = await getStudentDashboardData();
    if (res.success) {
      setData({
        activeForms: res.activeForms || [],
        mainApp: res.mainApp || null,
        otherResponses: res.otherResponses || []
      });
    }
    setLoading("");
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedForm?.id || !declarationAccepted) return;
    
    setFormLoading(true);
    
    const formData = new FormData(e.currentTarget);
    formData.append('$formId', selectedForm.id);
    formData.append('$isMaster', String(selectedForm.isMaster));

    const res = await submitStudentForm(formData);
    if (res.success) {
      notify("Application Submitted Successfully!", "success");
      await loadData(); // Refresh data quietly
      setCurrentView("STATUS"); // Redirect to Status view directly
      setFormLoading(false);
    } else {
      notify(res.error || "Submission failed.", "error");
      setFormLoading(false);
    }
  }

  async function handleNudge() {
    if (!data?.mainApp?.id) return;
    setLoading("nudge");
    const res = await nudgeAdmin(data.mainApp.id);
    if (res.success) {
      notify(res.message || "", "success");
      setData({ ...data, mainApp: { ...data.mainApp, hasNudged: true } });
    } else {
      notify(res.error || "Something went wrong.", "error");
    }
    setLoading("");
  }

  const hasSubmittedForm = (formId: string, isMaster: boolean) => {
    if (isMaster) return !!data?.mainApp;
    return !!data?.otherResponses?.some((r: any) => r?.formId === formId);
  };

  const handleApplyClick = (form: any) => {
    setSelectedForm(form);
    setDeclarationAccepted(false);
    setCurrentView("INSTRUCTIONS");
  };

  const handleStatusClick = (form: any) => {
    setSelectedForm(form);
    setCurrentView("STATUS");
  };

  const backToDashboard = () => {
    setCurrentView("DASHBOARD");
    setSelectedForm(null);
    setDeclarationAccepted(false);
  };

  if (loading === "init") return <div className="flex justify-center h-screen items-center"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in pb-20 overflow-x-hidden relative min-h-[85vh]">
      
      {/* NOTIFICATION BAR */}
      {message && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[150] px-6 py-3 rounded-full text-xs sm:text-sm font-black text-center shadow-2xl transition-all duration-500 ease-in-out ${message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {message.text}
        </div>
      )}

      {/* --- GLOBAL HEADER --- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl clay-card flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-extrabold text-[#0F2547] tracking-tight">Student Event Hub</h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5 truncate">
              {currentView === "DASHBOARD" ? "Discover and manage your club applications" : 
               currentView === "STATUS" ? `Status: ${selectedForm?.title}` : `Application Portal: ${selectedForm?.title}`}
            </p>
          </div>
        </div>

        {currentView === "DASHBOARD" ? (
          <button 
            onClick={() => signOut({ callbackUrl: "/login" })} 
            className="clay-btn w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-red-600 flex items-center justify-center gap-2 hover:bg-red-50 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" /> Secure Logout
          </button>
        ) : (
          <button 
            onClick={backToDashboard} 
            className="clay-btn w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-slate-600 flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        )}
      </div>

      {/* ========================================================= */}
      {/* VIEW 1: MAIN DASHBOARD                                    */}
      {/* ========================================================= */}
      {currentView === "DASHBOARD" && (
        <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 animate-in slide-in-from-left-8 duration-300">
          
          {/* LEFT COLUMN (Forms) -> Order 3 on mobile, Order 1 on Desktop */}
          <div className="flex-[7] space-y-6 order-3 lg:order-1">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-extrabold text-[#0F2547] flex items-center gap-2">
                <Ticket className="w-5 h-5 text-blue-600" /> Live Events & Forms
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {data?.activeForms?.map((form: any) => {
                if (!form?.id) return null;
                const submitted = hasSubmittedForm(form.id, form.isMaster);
                
                return (
                  <div key={form.id} className={`clay-card p-5 sm:p-6 flex flex-col justify-between h-full relative overflow-hidden transition-all ${submitted ? "border-amber-200 shadow-sm" : ""}`}>
                    
                    {form.isMaster && !submitted && <div className="absolute -top-10 -right-10 w-24 h-24 bg-amber-100/50 rounded-full blur-2xl"></div>}
                    {submitted && <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-100/50 rounded-full blur-2xl"></div>}

                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-4">
                        <span className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm ${form.isMaster ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-blue-100 text-blue-800 border border-blue-200"}`}>
                          {form.isMaster ? "⭐ Core Program" : "📅 Club Event"}
                        </span>
                        {submitted && <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100"><CheckCircle className="w-3 h-3" /> Submitted</span>}
                      </div>
                      
                      <h3 className={`text-lg font-extrabold line-clamp-1 ${submitted ? "text-emerald-900" : "text-slate-800"}`}>{form.title}</h3>
                      <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed min-h-[36px]">{form.description}</p>
                    </div>
                    
                    <div className="relative z-10 mt-5">
                      {submitted ? (
                        <button 
                          onClick={() => handleStatusClick(form)}
                          className="w-full py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all bg-amber-50 text-amber-700 hover:bg-amber-100 hover:shadow-md border border-amber-200"
                        >
                          <Activity className="w-4 h-4" /> View Status
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleApplyClick(form)}
                          className="clay-btn-primary w-full py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:scale-[1.02] transition-transform"
                        >
                          Apply Now <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {(!data?.activeForms || data.activeForms.length === 0) && (
                <div className="col-span-full clay-inset p-10 text-center text-slate-500 flex flex-col items-center rounded-2xl">
                  <CalendarIcon className="w-10 h-10 text-slate-300 mb-3" />
                  <p className="font-bold text-sm">No active events or forms available right now.</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN (Activity + Calendar) -> Order 1 & 2 on mobile, Order 2 on Desktop */}
          <div className="flex-[5] flex flex-col gap-6 sm:gap-8 order-1 lg:order-2">
            
            {/* WIDGET 2: INTERACTIVE CALENDAR (First on Mobile) */}
            <div className="clay-card p-5 sm:p-6 space-y-4 order-1">
              <h3 className="text-base sm:text-lg font-extrabold text-[#0F2547] flex items-center justify-between border-b border-slate-200 pb-3">
                <span className="flex items-center gap-2"><CalendarDays className="w-5 h-5 text-amber-500" /> Club Calendar</span>
                <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded-md">{monthName}</span>
              </h3>
              
              <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="text-[10px] font-black text-slate-400 py-1">{day}</div>
                ))}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="p-2"></div>
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const isToday = dayNum === today.getDate();
                  const hasEvent = mockEvents[dayNum];

                  return (
                    <div key={dayNum} className="relative group flex justify-center">
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-default
                        ${isToday ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}
                        ${hasEvent && !isToday ? 'clay-inset border border-amber-200 text-amber-700' : ''}
                      `}>
                        {dayNum}
                      </div>
                      
                      {/* Event Tooltip */}
                      {hasEvent && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-max max-w-[150px] bg-slate-800 text-white text-[10px] p-2 rounded-lg z-50 text-center shadow-xl">
                          {hasEvent}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* WIDGET 1: ACTIVITY LOG (Slider on Mobile) */}
            <div className="clay-card p-5 sm:p-6 space-y-5 order-2">
              <h3 className="text-base sm:text-lg font-extrabold text-[#0F2547] flex items-center gap-2 border-b border-slate-200 pb-3">
                <Activity className="w-5 h-5 text-blue-600" /> My Activity Log
              </h3>
              
              <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible no-scrollbar gap-4 pb-2 lg:pb-0">
                {/* Master Application Log */}
                {data?.mainApp && (
                  <div className="clay-inset p-4 rounded-xl min-w-[260px] lg:min-w-0 flex flex-col justify-center border border-blue-50 relative shrink-0">
                     <div className="flex justify-between items-center mb-2">
                        <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">Core Team</span>
                        {data.mainApp.status === "COMPLETED" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                     </div>
                     <h4 className="text-sm font-extrabold text-[#0F2547] truncate" title={data.mainApp.topicInterested}>
                        {data.mainApp.topicInterested}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">Status: <span className="text-blue-600">{data.mainApp.status}</span></p>
                  </div>
                )}

                {/* Other Event Apps Log */}
                {data?.otherResponses?.map((res: any) => {
                  if (!res?.id || !res?.form) return null;
                  return (
                    <div key={res.id} className="clay-card p-4 min-w-[220px] lg:min-w-0 flex flex-col justify-center bg-slate-50/50 cursor-default shrink-0">
                      <span className="text-[9px] text-slate-500 font-bold uppercase mb-1 flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500" /> Recorded</span>
                      <p className="text-xs font-bold text-[#0F2547] truncate">{res.form.title}</p>
                    </div>
                  )
                })}

                {!data?.mainApp && (!data?.otherResponses || data?.otherResponses.length === 0) && (
                  <div className="clay-inset p-4 text-center rounded-xl flex flex-col items-center justify-center min-w-full lg:min-w-0">
                    <Info className="w-6 h-6 text-slate-300 mb-1" />
                    <p className="text-[10px] font-bold text-slate-500">No recent activity.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 2: STATUS & GAMIFIED TRACKING PAGE                   */}
      {/* ========================================================= */}
      {currentView === "STATUS" && selectedForm && (
        <div className="max-w-5xl mx-auto animate-in slide-in-from-right-8 duration-300">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8">
            
            {/* LEFT SIDE: INSTRUCTIONS & TIPS */}
            <div className="md:col-span-5 space-y-6 order-2 md:order-1">
              <div className="clay-card p-6 space-y-5 h-full border border-blue-50">
                <h3 className="font-extrabold text-[#0F2547] flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Lightbulb className="w-5 h-5 text-amber-500" /> Instructions & Tips
                </h3>
                
                {selectedForm.isMaster && (!data?.mainApp || data.mainApp.status === "WAITING") && (
                  <div className="space-y-4">
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                      Hey there! 👋 Your application is currently in the <strong>shortlisting process</strong>. We process candidates on a strict FIFO (first-in, first-out) basis. 
                    </p>
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                      <p className="text-xs text-blue-800 font-medium leading-relaxed">
                        Since there are many students in the queue, please <strong>keep patience</strong>. Everyone will get their turn, and you are on our priority list!
                      </p>
                    </div>
                    <div className="space-y-2 pt-2">
                      <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5"><BellRing className="w-3.5 h-3.5 text-amber-500"/> Nudge Feature</h4>
                      <p className="text-xs text-slate-600">You can use the Nudge button once every 3 days to directly notify admins about your pending application.</p>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 space-y-2">
                      <h4 className="text-xs font-extrabold text-amber-800 flex items-center gap-1.5"><MailWarning className="w-4 h-4"/> Email Checking Tip</h4>
                      <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                        Shortlisting confirmation will be sent to your registered email. Keep checking your <strong>Inbox</strong> and <strong>Spam folder</strong>. If our mail is in spam, click <strong>"Report not spam"</strong> so future updates land directly in your inbox.
                      </p>
                    </div>
                  </div>
                )}

                {selectedForm.isMaster && (data?.mainApp?.status === "SHORTLISTED" || data?.mainApp?.status === "SCREENING_DONE") && (
                  <div className="space-y-4">
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                      Awesome! You have cleared the queue. Now it's time to shine in your presentation.
                    </p>
                    <ul className="text-xs text-slate-600 space-y-3 mt-2">
                      <li className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5"/> <strong>Prepare your topic:</strong> Do deep research and make clean, point-to-point slides.</li>
                      <li className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5"/> <strong>Be confident:</strong> Practice your speaking delivery in front of a mirror to avoid hesitation.</li>
                      <li className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5"/> <strong>Be on time:</strong> Reach the studio exactly on the given scheduled time.</li>
                    </ul>
                  </div>
                )}

                {!selectedForm.isMaster && (
                  <div className="space-y-4">
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                      Your details for this event have been safely recorded in our Data Vault. 
                    </p>
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                      <p className="text-xs text-blue-800 font-medium">
                        Any further instructions or event links will be communicated directly via your registered email. Please keep an eye on your inbox!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT SIDE: STATUS CARD & NUDGE */}
            <div className="md:col-span-7 space-y-6 order-1 md:order-2">
              
              <div className={`clay-card p-6 sm:p-10 text-center border-t-4 relative overflow-hidden ${
                (!selectedForm.isMaster || data?.mainApp?.status === "WAITING") ? "border-t-amber-400" : "border-t-emerald-400"
              }`}>
                {/* Background Glow */}
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full blur-3xl pointer-events-none ${
                  (!selectedForm.isMaster || data?.mainApp?.status === "WAITING") ? "bg-amber-100/50" : "bg-emerald-100/50"
                }`}></div>
                
                <div className="relative z-10 space-y-5">
                  {(!selectedForm.isMaster || data?.mainApp?.status === "WAITING") ? (
                    <>
                      <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-amber-50 flex items-center justify-center shadow-inner border border-amber-100">
                        <Clock className="w-8 h-8 sm:w-10 sm:h-10 text-amber-500" />
                      </div>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F2547]">Application in Queue</h2>
                        <p className="text-sm text-slate-500 mt-2">Status: <span className="font-extrabold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">WAITING</span></p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-emerald-50 flex items-center justify-center shadow-inner border border-emerald-100">
                        <Award className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-500" />
                      </div>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F2547]">Congratulations! 🎉</h2>
                        <p className="text-sm text-slate-500 mt-2">Status: <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">SHORTLISTED</span></p>
                      </div>
                    </>
                  )}

                  {/* Nudge Control (Master Only & Only if Waiting) */}
                  {selectedForm.isMaster && data?.mainApp?.status === "WAITING" && (
                    <div className="mt-8 pt-6 border-t border-slate-100">
                      <button 
                        onClick={handleNudge}
                        disabled={data.mainApp.hasNudged || loading === "nudge"}
                        className={`w-full sm:w-3/4 mx-auto py-4 rounded-xl text-sm font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all ${
                          data.mainApp.hasNudged 
                          ? "clay-inset text-amber-600 cursor-not-allowed border-amber-100" 
                          : "bg-gradient-to-r from-amber-400 to-amber-500 text-white hover:scale-105 hover:shadow-lg"
                        }`}
                      >
                        <BellRing className={`w-5 h-5 ${!data.mainApp.hasNudged && "animate-bounce"}`} />
                        {data.mainApp.hasNudged ? "Admin Notified Successfully" : "Nudge Admin Now"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 3: INSTRUCTIONS PAGE (SPA Transition)                  */}
      {/* ========================================================= */}
      {currentView === "INSTRUCTIONS" && selectedForm && (
        <div className="max-w-4xl mx-auto clay-card p-6 sm:p-10 animate-in slide-in-from-right-8 duration-300">
          
          <div className="text-center space-y-3 border-b border-slate-200 pb-8 mb-8">
            <div className="w-16 h-16 mx-auto bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center clay-inset shadow-inner">
              <FileText className="w-8 h-8" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F2547]">Official Program Guidelines</h2>
            <p className="text-sm text-slate-500 font-medium">Please read the following instructions carefully before proceeding to the application form.</p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center shrink-0 border border-blue-200 shadow-sm">1</div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">Purpose of Collection</h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-1">This application is strictly intended for official Cybersecurity Club events and presenter selection. Ensure the topic aligns with our core objectives.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center shrink-0 border border-blue-200 shadow-sm">2</div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">Data Confidentiality</h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-1">Your submitted personal data is end-to-end secured. It will remain strictly confidential and accessible only to the core administrative team for official processing.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center shrink-0 border border-blue-200 shadow-sm">3</div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">Merit & Queue Based Selection</h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-1">Shortlisting is an intensive process based on merit and queue position. It may take some time, but rest assured, every applicant is reviewed and will eventually receive an opportunity.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center shrink-0 border border-blue-200 shadow-sm">4</div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">Single Submission Policy</h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-1">An applicant is permitted only one active submission per event. Fill the form carefully, as duplicate entries will lead to automatic disqualification.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center shrink-0 border border-blue-200 shadow-sm">5</div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">Accuracy & Immutability</h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-1">Ensure all details provided are accurate and final. Submissions are immutable and cannot be modified once recorded in the club's Data Vault.</p>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-200 flex justify-end">
            <button 
              onClick={() => setCurrentView("FORM")}
              className="clay-btn-primary px-8 py-4 text-sm font-extrabold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg hover:scale-105 transition-transform"
            >
              Acknowledge & Proceed <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 4: ACTUAL FORM PAGE (SPA Transition)                 */}
      {/* ========================================================= */}
      {currentView === "FORM" && selectedForm && (
        <div className="max-w-4xl mx-auto clay-card p-6 sm:p-10 animate-in slide-in-from-right-8 duration-300">
          
          <div className="border-b border-slate-200 pb-6 mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F2547]">{selectedForm.title}</h2>
            <p className="text-sm text-slate-500 mt-2 bg-blue-50 p-3 rounded-lg border border-blue-100 font-medium">
              {selectedForm.description}
            </p>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-8">
            {selectedForm.questions?.map((field: any) => {
              if (!field?.id) return null;
              return (
                <div key={field.id} className="animate-in slide-in-from-bottom-2">
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2 ml-1">
                    {field.fieldLabel} {field.isRequired && <span className="text-red-500">*</span>}
                  </label>
                  
                  {field.fieldType === "TEXT" && (
                    <input type="text" name={field.fieldLabel} required={field.isRequired} maxLength={field.maxLength || undefined} className="clay-input w-full px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-shadow" placeholder={field.placeholder || "Type your answer..."} />
                  )}
                  
                  {field.fieldType === "NUMBER" && (
                    <input type="number" name={field.fieldLabel} required={field.isRequired} max={field.maxLength ? '9'.repeat(field.maxLength) : undefined} className="clay-input w-full px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-shadow" placeholder={field.placeholder || "Enter a valid number..."} />
                  )}
                  
                  {field.fieldType === "DROPDOWN" && (
                    <div className="relative">
                      <select name={field.fieldLabel} required={field.isRequired} className="clay-input w-full px-5 py-4 text-sm font-bold bg-white appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500 transition-shadow">
                        <option value="">Select an option...</option>
                        {field.options?.map((opt: string, i: number) => <option key={i} value={opt}>{opt}</option>)}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-blue-600">
                        <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                      </div>
                    </div>
                  )}

                  {field.fieldType === "CHECKBOX" && (
                    <div className="space-y-3 mt-3 clay-inset p-5 rounded-xl">
                      {field.options?.map((opt: string, i: number) => (
                        <label key={i} className="flex items-center gap-3 cursor-pointer group">
                          <input type="checkbox" name={`${field.fieldLabel}[]`} value={opt} className="w-5 h-5 text-blue-600 bg-white border-slate-300 rounded shadow-sm focus:ring-blue-500 cursor-pointer shrink-0" />
                          <span className="text-sm font-bold text-slate-700 group-hover:text-blue-700 transition-colors">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {field.fieldType === "FILE_UPLOAD" && (
                    <div className="clay-inset p-6 rounded-2xl border-2 border-slate-200 border-dashed bg-slate-50 hover:bg-blue-50 hover:border-blue-200 transition-all cursor-pointer flex justify-center">
                      <input type="file" name={field.fieldLabel} required={field.isRequired} className="block w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 hover:file:scale-105 file:transition-all cursor-pointer file:cursor-pointer file:shadow-sm" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* --- STRICT OFFICIAL DECLARATION (Mandatory to check) --- */}
            <div className="mt-10 p-6 rounded-2xl clay-card bg-amber-50/40 border border-amber-200 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-amber-500"></div>
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
                <label className="flex items-start gap-3.5 cursor-pointer">
                  <input 
                    type="checkbox" 
                    required
                    checked={declarationAccepted}
                    onChange={(e) => setDeclarationAccepted(e.target.checked)}
                    className="mt-1 w-6 h-6 text-amber-600 rounded border-amber-300 focus:ring-amber-500 shadow-sm cursor-pointer shrink-0" 
                  />
                  <span className="text-sm font-medium text-slate-700 leading-relaxed">
                    <strong className="text-amber-800 font-extrabold block mb-1">Strict Official Declaration:</strong> 
                    I hereby declare that all information provided is accurate to the best of my knowledge. If shortlisted, I strictly commit to being present on the scheduled date without fail. I understand that any unjustified absence or unprofessional conduct will disrupt club operations and will result in strict disciplinary action regarding my future participation.
                  </span>
                </label>
              </div>
            </div>
            
            <div className="pt-6 mt-8 border-t border-slate-200">
              <button 
                type="submit" 
                disabled={formLoading || !declarationAccepted} 
                className="clay-btn-primary w-full py-5 text-sm sm:text-base font-extrabold uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-transform hover:scale-[1.01]"
              >
                {formLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Submit Secure Application"} 
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}