"use client";

import { useState, useEffect } from "react";
import { 
  BookOpen, BellRing, CheckCircle, Shield, ArrowRight, Loader2, Info, Ticket, Calendar as CalendarIcon, Activity,
  ChevronLeft, Globe, ChevronRight, Award, FileText, CheckCircle2, AlertTriangle, CalendarDays, Lightbulb, MailWarning, Clock, Map as MapIcon, Play, MousePointerClick, Flag, Zap, Target, History as HistoryIcon, Terminal, Upload, ChevronDown, Lock, Server, Code, Eye, QrCode, ScanLine, KeyRound, Camera
} from "lucide-react";
import { getStudentDashboardData, submitStudentForm, nudgeAdmin, getStudentEvents } from "@/actions/student";
import { getActiveSessionForStudent, markStudentAttendance } from "@/actions/attendance";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Html5Qrcode } from "html5-qrcode"; // 🟢 ADDED QR SCANNER LIBRARY
// 🟢 SECURITY FIX: Robust Zero-Dependency Client-Side XSS Sanitizer
const DOMPurify = {
  sanitize: (html: string) => {
    if (!html) return "";
    if (typeof window === 'undefined') return html; // SSR fallback
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const elements = doc.querySelectorAll('*');
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      if (['SCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'META', 'STYLE', 'LINK', 'BASE'].includes(el.tagName)) {
        el.remove(); continue;
      }
      const attrs = el.attributes;
      for (let j = attrs.length - 1; j >= 0; j--) {
        if (attrs[j].name.toLowerCase().startsWith('on') || attrs[j].value.toLowerCase().includes('javascript:')) {
          el.removeAttribute(attrs[j].name);
        }
      }
    }
    return doc.body.innerHTML;
  }
}; 

export default function StudentDashboard() {
  const [loading, setLoading] = useState("init");
  const [data, setData] = useState<any>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState<{text: string, type: string} | null>(null);
  
  // SPA View Routing States
  const [currentView, setCurrentView] = useState<"DASHBOARD" | "INSTRUCTIONS" | "FORM" | "STATUS" | "ACTIVITY_LOG" | "ROADMAP_DETAIL" | "ATTENDANCE">("DASHBOARD");
  const [selectedForm, setSelectedForm] = useState<any | null>(null);
  const [selectedRoadmapStep, setSelectedRoadmapStep] = useState<any | null>(null);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  
  // 🟢 LOGIC FIX: Track selected files for dynamic UI feedback
  const [selectedFiles, setSelectedFiles] = useState<Record<string, string>>({});

  // Attendance States (Frontend System)
  const [attendanceCode, setAttendanceCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [attendances, setAttendances] = useState<any[]>([]); // Local state for optimistically recorded attendances

  // Calendar Hover/Click State
  const [selectedDate, setSelectedDate] = useState<number | null>(null);

  // Calendar Logic
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const monthName = today.toLocaleString('default', { month: 'long' });
  
  // 🟢 Real Data States
  const [events, setEvents] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);

  // 🟢 CAMERA SCANNER EFFECT
  useEffect(() => {
    let html5QrCode: Html5Qrcode;
    let isMounted = true;

    if (isScanning && activeSession?.mode === "QR") {
      html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCode.start(
        { facingMode: "environment" }, // Use back camera
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (isMounted) {
            html5QrCode.stop().then(() => {
              setIsScanning(false);
              handleMarkAttendance(decodedText);
            }).catch(console.error);
          }
        },
        (errorMessage) => { /* Background scanning, ignore errors */ }
      ).catch((err) => {
         console.error("Camera Error:", err);
         if (isMounted) {
           notify("Camera access denied or unavailable.", "error");
           setIsScanning(false);
         }
      });
    }

    return () => {
      isMounted = false;
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, [isScanning, activeSession]);
  const cyberRoadmap = [
    { step: 1, title: "Networking Basics", icon: Globe, status: "completed", desc: "Understand how data travels across the internet.", topics: ["OSI & TCP/IP Models", "IP Addressing & Subnetting", "DNS, HTTP/HTTPS, FTP", "Wireshark Packet Analysis"] },
    { step: 2, title: "Linux Fundamentals", icon: Terminal, status: "completed", desc: "Master the command line and OS internals.", topics: ["File System Hierarchy", "Permissions & Ownership", "Bash Scripting Basics", "Process Management & Cron"] },
    { step: 3, title: "Web Vulnerabilities", icon: Shield, status: "current", desc: "Discover flaws in modern web applications.", topics: ["OWASP Top 10", "SQL Injection (SQLi)", "Cross-Site Scripting (XSS)", "CSRF & SSRF"] },
    { step: 4, title: "Penetration Testing", icon: Target, status: "locked", desc: "Ethical hacking and systemic exploitation.", topics: ["Reconnaissance & Nmap", "Metasploit Framework", "Privilege Escalation", "Active Directory Basics"] },
    { step: 5, title: "Bug Bounty", icon: Award, status: "locked", desc: "Hunt for bugs in the wild and earn rewards.", topics: ["Recon Automation", "Writing Proof of Concepts", "Bypassing WAFs", "Report Writing & Triage"] },
  ];

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

    // Fetch Calendar Events
    const evRes = await getStudentEvents();
    if (evRes.success) setEvents(evRes.data || []);

    // Fetch Live Attendance Session
    const sessRes = await getActiveSessionForStudent();
    if (sessRes.success && sessRes.data) {
      setActiveSession(sessRes.data);
    } else {
      setActiveSession(null);
    }
    
    setLoading("");
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedForm?.id || (selectedForm.hasDeclaration && !declarationAccepted)) return;
    
    setFormLoading(true);
    
    const formData = new FormData(e.currentTarget);
    formData.append('$formId', selectedForm.id);
    formData.append('$isMaster', String(selectedForm.isMaster));

    const res = await submitStudentForm(formData);
    if (res.success) {
      notify("Application Submitted Successfully!", "success");
      await loadData(); 
      setCurrentView("STATUS"); 
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
    
    // 🟢 LOGIC FIX: Strict check for explicitly disabled instructions
    let skipInstructions = false;
    if (form.instructionText) {
      try {
        const parsed = JSON.parse(form.instructionText);
        if (parsed.isEnabled === false) {
          skipInstructions = true;
        } else {
          const blocks = Array.isArray(parsed) ? parsed : parsed.blocks;
          if (!blocks || blocks.length === 0) skipInstructions = true;
        }
      } catch {
        if (!form.instructionText.trim()) skipInstructions = true;
      }
    } else {
      skipInstructions = true;
    }

    setCurrentView(skipInstructions ? "FORM" : "INSTRUCTIONS");
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

  // 🟢 NEW: Parse Theme Data from the instruction JSON
  const getInstructionData = () => {
    if (!selectedForm?.instructionText) return { theme: "classic", blocks: [] };
    try {
      const parsed = JSON.parse(selectedForm.instructionText);
      if (Array.isArray(parsed)) return { theme: "classic", blocks: parsed };
      return parsed;
    } catch {
      return { theme: "classic", blocks: [{ id: 'old', type: 'p', content: selectedForm.instructionText }] };
    }
  };

  // 🟢 Real Secure Attendance Handler
  const handleMarkAttendance = async (qrData?: string) => {
    if (!activeSession) return notify("No active session running.", "error");
    
    let payload = "";
    if (activeSession.mode === "CODE") {
      if (!attendanceCode.trim()) return notify("Please enter a valid code", "error");
      payload = attendanceCode.trim();
    } else {
      payload = qrData || "simulated_qr_payload"; // Replace with actual QR data from a scanner library later
    }

    setLoading("attendance");
    const res = await markStudentAttendance(activeSession.id, payload);
    
    if (res.success) {
      // Optimistically add to local logs
      setAttendances([{ eventName: activeSession.title, date: new Date().toISOString() }, ...attendances]);
      notify("Attendance Marked Successfully!", "success");
      setAttendanceCode("");
      setIsScanning(false);
      setCurrentView("ACTIVITY_LOG");
    } else {
      notify(res.error || "Verification failed.", "error");
    }
    setLoading("");
  };

  if (loading === "init") return <div className="flex flex-col justify-center h-screen items-center bg-slate-50"><Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" /><p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Loading Workspace</p></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in pb-20 overflow-x-hidden relative min-h-[85vh]">
      
      {/* NOTIFICATION BAR */}
      {message && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[150] px-6 py-3 rounded-full text-xs sm:text-sm font-black text-center shadow-2xl transition-all duration-500 ease-in-out ${message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {message.text}
        </div>
      )}

      {/* --- GLOBAL HEADER --- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4 pt-4 z-50">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl clay-card flex items-center justify-center shrink-0 border-2 border-blue-100 bg-gradient-to-br from-white to-blue-50">
            <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 drop-shadow-sm" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-extrabold text-[#0F2547] tracking-tight">Student Event Hub</h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5 truncate">
              {currentView === "DASHBOARD" ? "Discover, Apply, and Track your Journey" : 
               currentView === "STATUS" ? `Application Status: ${selectedForm?.title}` : 
               currentView === "ACTIVITY_LOG" ? "Detailed Activity History" : `Application Portal: ${selectedForm?.title || "Attendance"}`}
            </p>
          </div>
        </div>

        {currentView === "DASHBOARD" ? (
          <button 
            onClick={() => signOut({ callbackUrl: "/login" })} 
            className="clay-btn w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-red-600 flex items-center justify-center gap-2 hover:bg-red-50 transition-colors shrink-0 shadow-sm"
          >
            <LogOut className="w-4 h-4" /> Secure Logout
          </button>
        ) : (
          <button 
            onClick={backToDashboard} 
            className="clay-btn w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-slate-600 flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shrink-0 shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        )}
      </div>

      {/* ========================================================= */}
      {/* VIEW 1: MAIN DASHBOARD (LONG SCROLL)                      */}
      {/* ========================================================= */}
      {currentView === "DASHBOARD" && (
        <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-500">
          
          {/* SECTION 1: CALENDAR & ACTIVITY SUMMARY (Top Row) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
            {/* INTERACTIVE CALENDAR */}
            <div className="lg:col-span-8 clay-card p-6 sm:p-8 space-y-6 relative overflow-hidden bg-gradient-to-br from-white to-slate-50">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/30 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/4"></div>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4 relative z-10">
                <h3 className="text-lg sm:text-xl font-extrabold text-[#0F2547] flex items-center gap-2">
                  <CalendarDays className="w-6 h-6 text-amber-500" /> Club Schedule
                </h3>
                <span className="text-xs text-blue-800 font-extrabold bg-blue-100 px-4 py-1.5 rounded-lg border border-blue-200 uppercase tracking-widest">{monthName} {today.getFullYear()}</span>
              </div>
              
              <div className="flex flex-col md:flex-row gap-8 relative z-10">
                {/* Calendar Grid */}
                <div className="flex-1">
                  <div className="grid grid-cols-7 gap-2 sm:gap-3 text-center">
                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, i) => (
                      <div key={i} className="text-[9px] font-black text-slate-400 py-1 uppercase tracking-wider">{day}</div>
                    ))}
                    {Array.from({ length: firstDay }).map((_, i) => (
                      <div key={`empty-${i}`} className="p-2"></div>
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const dayNum = i + 1;
                      const isToday = dayNum === today.getDate();
                      const isSelected = selectedDate === dayNum;
                      
                      const dayEvents = events.filter(ev => {
                        const d = new Date(ev.eventDate);
                        return d.getDate() === dayNum && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
                      });
                      const hasEvent = dayEvents.length > 0;

                      return (
                        <div key={dayNum} className="flex justify-center">
                          <button 
                            onClick={() => setSelectedDate(dayNum)}
                            className={`w-8 h-8 sm:w-10 sm:h-10 flex flex-col items-center justify-center rounded-xl text-xs font-bold transition-all relative
                              ${isToday ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-200 ring-offset-2 scale-110 z-10' : 
                                isSelected ? 'bg-slate-800 text-white shadow-md scale-105 z-10' : 
                                'text-slate-600 hover:bg-slate-100 hover:scale-105'}
                              ${hasEvent && !isToday && !isSelected ? 'border-2 border-amber-300 bg-amber-50 text-amber-800' : ''}
                            `}
                          >
                            {dayNum}
                            {hasEvent && <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${isToday || isSelected ? 'bg-white' : 'bg-amber-500'}`}></span>}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Event Details Panel */}
                <div className="w-full md:w-64 shrink-0 flex flex-col">
                   <h4 className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest border-b border-slate-200 pb-2">Event Details</h4>
                   {selectedDate ? (
                     (() => {
                       const selectedDateEvents = events.filter(ev => {
                         const d = new Date(ev.eventDate);
                         return d.getDate() === selectedDate && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
                       });

                       return selectedDateEvents.length > 0 ? (
                         <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-3">
                           {selectedDateEvents.map((ev, idx) => (
                             <div key={idx} className="animate-in fade-in slide-in-from-right-4 bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                               <span className="text-[9px] font-black px-2 py-1 rounded bg-amber-200 text-amber-800 uppercase tracking-widest">{ev.eventType}</span>
                               <h5 className="font-extrabold text-[#0F2547] text-sm leading-tight mt-2">{ev.title}</h5>
                               <p className="text-[10px] text-slate-400 font-bold mt-2 pt-2 border-t border-amber-200/50 flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(ev.eventDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                             </div>
                           ))}
                         </div>
                       ) : (
                         <div className="flex-1 flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-slate-200 rounded-2xl animate-in fade-in">
                           <CalendarIcon className="w-8 h-8 text-slate-300 mb-2"/>
                           <p className="text-xs font-bold text-slate-500">No events scheduled for {monthName} {selectedDate}.</p>
                         </div>
                       )
                     })()
                   ) : (
                     <div className="flex-1 flex flex-col items-center justify-center text-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <MousePointerClick className="w-8 h-8 text-blue-300 mb-2 animate-bounce"/>
                       <p className="text-xs font-bold text-slate-500">Click a highlighted date to view details.</p>
                     </div>
                   )}
                </div>
              </div>
            </div>

            {/* QUICK ACTIVITY LOG (Widget) */}
            <div className="lg:col-span-4 clay-card p-6 sm:p-8 space-y-5 flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
                <h3 className="text-lg font-extrabold text-[#0F2547] flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-500" /> Recent Activity
                </h3>
                <button onClick={() => setCurrentView("ACTIVITY_LOG")} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">View All</button>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {attendances.map((att, idx) => (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", stiffness: 200, damping: 15, delay: idx * 0.1 }} key={`q-att-${idx}`} className="p-4 rounded-xl border border-purple-100 bg-purple-50 flex items-start gap-3 hover:bg-purple-100 transition-colors cursor-default">
                    <ScanLine className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-[#0F2547] leading-tight">{att.eventName}</h4>
                      <p className="text-[9px] text-purple-600 font-bold uppercase mt-1">Attendance Marked</p>
                    </div>
                  </motion.div>
                ))}
                {data?.mainApp && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", stiffness: 200, damping: 15 }} className="clay-inset p-4 rounded-xl border-l-4 border-l-amber-400 bg-white">
                     <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-0.5 rounded border border-amber-100">Core Team</span>
                     </div>
                     <h4 className="text-xs font-extrabold text-[#0F2547] truncate">{data.mainApp.topicInterested}</h4>
                     <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase flex items-center gap-1">Status: <span className={`px-1.5 py-0.5 rounded ${data.mainApp.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-blue-600'}`}>{data.mainApp.status}</span></p>
                  </motion.div>
                )}
                {data?.otherResponses?.slice(0,3).map((res: any, idx: number) => (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", stiffness: 200, damping: 15, delay: (idx + 1) * 0.1 }} key={res.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-start gap-3 hover:bg-slate-100 transition-colors">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-[#0F2547] leading-tight">{res.form?.title || "Unknown Event"}</h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Recorded Successfully</p>
                    </div>
                  </motion.div>
                ))}
                {!data?.mainApp && (!data?.otherResponses || data?.otherResponses.length === 0) && attendances.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 py-6">
                    <HistoryIcon className="w-8 h-8 mb-2 opacity-50"/>
                    <p className="text-xs font-bold">No activity yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: LIVE FORMS (Horizontal / Grid layout depending on count) */}
          <div className="space-y-6 pt-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F2547] flex items-center gap-2">
                <Ticket className="w-6 h-6 text-blue-600" /> Active Applications
              </h2>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{data?.activeForms?.length || 0} Available</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data?.activeForms?.map((form: any) => {
                if (!form?.id) return null;
                const submitted = hasSubmittedForm(form.id, form.isMaster);
                
                return (
                  <motion.div 
                    whileHover={{ y: -5 }} 
                    key={form.id} 
                    className={`clay-card p-6 sm:p-8 flex flex-col justify-between h-full relative overflow-hidden transition-shadow duration-300 hover:shadow-2xl ${submitted ? "border-2 border-emerald-200 bg-emerald-50/10" : "bg-white"}`}
                  >
                    {form.isMaster && !submitted && <div className="absolute -top-10 -right-10 w-48 h-48 bg-amber-100/40 rounded-full blur-[40px] pointer-events-none"></div>}
                    {submitted && <div className="absolute -top-10 -right-10 w-48 h-48 bg-emerald-100/40 rounded-full blur-[40px] pointer-events-none"></div>}

                    <div className="relative z-10 flex flex-col h-full">
                      <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                        <span className={`text-[9px] font-black px-3 py-1.5 rounded-md uppercase tracking-widest shadow-sm border ${form.formMode === "QUEUE" ? "bg-amber-100 text-amber-800 border-amber-200" : form.formMode === "NORMAL" ? "bg-purple-100 text-purple-800 border-purple-200" : "bg-blue-100 text-blue-800 border-blue-200"}`}>
                          {/* 🟢 LOGIC FIX: Dynamic form badges based on actual database mode */}
                          {form.formMode === "QUEUE" ? "⭐ CORE SELECTION" : form.formMode === "NORMAL" ? "📄 STANDARD FORM" : "📅 EVENT FORM"}
                        </span>
                        {submitted && <span className="flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-md border border-emerald-200 uppercase tracking-widest"><CheckCircle2 className="w-3.5 h-3.5" /> Secured</span>}
                      </div>
                      
                      <div className="flex-1 space-y-3 mb-8">
                        <h3 className={`text-xl sm:text-2xl font-black leading-tight ${submitted ? "text-emerald-950" : "text-[#0F2547]"}`}>{form.title}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed font-medium line-clamp-3">{form.description}</p>
                      </div>
                    
                      <div className="mt-auto">
                        {submitted ? (
                          <button 
                            onClick={() => handleStatusClick(form)}
                            className="w-full py-4 rounded-xl text-sm font-extrabold uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm transition-all bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:shadow-md border border-emerald-200"
                          >
                            <MapIcon className="w-5 h-5" /> Track Live Status
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleApplyClick(form)}
                            className="w-full py-4 rounded-xl text-sm font-extrabold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-transform bg-blue-600 text-white hover:bg-blue-700"
                          >
                            Apply Now <ArrowRight className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              
              {(!data?.activeForms || data.activeForms.length === 0) && (
                <div className="col-span-full clay-inset p-12 text-center text-slate-500 flex flex-col items-center rounded-3xl">
                  <Ticket className="w-12 h-12 text-slate-300 mb-4" />
                  <p className="font-extrabold text-lg text-slate-600">No Active Forms</p>
                  <p className="text-xs font-medium mt-1">Check back later for new events and applications.</p>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2.5: ATTENDANCE MODULE */}
          <div className="space-y-6 pt-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F2547] flex items-center gap-2">
                <ScanLine className="w-6 h-6 text-purple-600" /> Event Attendance
              </h2>
            </div>
            <motion.div 
              whileHover={{ y: -5 }}
              onClick={() => setCurrentView("ATTENDANCE")}
              className="clay-card p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 cursor-pointer group hover:shadow-2xl transition-all border-2 border-purple-100 bg-gradient-to-r from-purple-50/40 to-white overflow-hidden relative"
            >
              <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-purple-200/40 rounded-full blur-[40px] pointer-events-none group-hover:bg-purple-300/50 transition-colors"></div>
              <div className="flex items-center gap-5 relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                  <QrCode className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-[#0F2547] mb-1">Mark Your Attendance</h3>
                  <p className="text-sm text-slate-500 font-medium">Scan QR or enter secret code to log your presence instantly.</p>
                </div>
              </div>
              <div className="relative z-10 w-full sm:w-auto">
                <button className="w-full sm:w-auto clay-btn-primary bg-purple-600 hover:bg-purple-700 text-white px-8 py-3.5 rounded-xl text-sm font-extrabold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-transform group-hover:scale-105 border-purple-500">
                  Open Scanner <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>

          {/* SECTION 3: CYBERSECURITY ROADMAP (Visual Pathway) */}
          <div className="clay-card p-6 sm:p-10 space-y-8 bg-slate-900 border-none relative overflow-hidden">
             <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
             
             <div className="text-center relative z-10">
               <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 rounded-full inline-block mb-3">Learning Path</span>
               <h2 className="text-2xl sm:text-3xl font-black text-black">Cybersecurity Roadmap</h2>
               <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto">Follow this structured path to master cybersecurity concepts. Click any phase for deep analysis.</p>
             </div>

             <div className="relative z-10 max-w-4xl mx-auto py-8">
                {/* Connecting Line */}
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -translate-y-1/2 rounded-full hidden md:block">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full transition-all duration-1000" style={{ width: '50%' }}></div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center gap-8 md:gap-0 relative">
                  {cyberRoadmap.map((step, idx) => {
                    const Icon = step.icon;
                    return (
                      <motion.div 
                        key={idx} 
                        whileHover={{ y: -5, scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { setSelectedRoadmapStep(step); setCurrentView("ROADMAP_DETAIL"); }}
                        className="flex flex-col items-center relative group w-full md:w-auto cursor-pointer"
                      >
                        {/* Vertical line for mobile */}
                        {idx !== cyberRoadmap.length - 1 && <div className="absolute top-14 w-1 h-12 bg-slate-800 md:hidden"></div>}
                        
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center relative z-10 transition-colors duration-300 shadow-xl
                          ${step.status === 'completed' ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 
                            step.status === 'current' ? 'bg-blue-500 text-white shadow-blue-500/40 ring-4 ring-blue-500/20' : 
                            'bg-slate-800 text-slate-500 border border-slate-700 hover:border-blue-500/50 hover:text-blue-400'}
                        `}>
                          <Icon className="w-6 h-6" />
                          {step.status === 'completed' && <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5"><CheckCircle2 className="w-3 h-3 text-emerald-500"/></div>}
                          {step.status === 'locked' && <div className="absolute -bottom-1 -right-1 bg-slate-700 rounded-full p-0.5"><Lock className="w-3 h-3 text-slate-400"/></div>}
                        </div>
                        
                        <div className="mt-4 text-center md:absolute md:top-16 md:w-32 bg-slate-800/80 md:bg-transparent p-3 md:p-0 rounded-xl border border-slate-700 md:border-none backdrop-blur-sm z-20 group-hover:bg-slate-800 transition-colors">
                          <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-1">Phase {step.step}</span>
                          <p className={`text-xs font-extrabold leading-tight ${step.status === 'locked' ? 'text-slate-400 group-hover:text-blue-300' : 'text-slate-200'}`}>{step.title}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
             </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 5: FULL ACTIVITY LOG (SPA WITH FRAMER ANIMATIONS)    */}
      {/* ========================================================= */}
      {currentView === "ACTIVITY_LOG" && (
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-4xl mx-auto clay-card p-6 sm:p-10">
           <div className="text-center space-y-3 border-b border-slate-200 pb-8 mb-12">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 12 }} className="w-16 h-16 mx-auto bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center clay-inset shadow-inner">
              <HistoryIcon className="w-8 h-8" />
            </motion.div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F2547]">Detailed Activity History</h2>
            <p className="text-sm text-slate-500 font-medium">A complete animated timeline of your interactions.</p>
          </div>

          <div className="relative border-l-2 border-slate-200 ml-4 sm:ml-8 space-y-10 pb-8">
             {attendances.map((att, idx) => (
               <motion.div 
                 key={`full-att-${idx}`}
                 initial={{ opacity: 0, x: -100, y: 50 }} 
                 animate={{ opacity: 1, x: 0, y: 0 }} 
                 transition={{ type: "spring", stiffness: 120, damping: 14, delay: idx * 0.15 }}
                 className="relative pl-6 sm:pl-10"
               >
                 <div className="absolute -left-[11px] top-1 w-5 h-5 bg-purple-500 rounded-full ring-4 ring-purple-100 shadow-sm animate-pulse"></div>
                 <div className="bg-white border-2 border-purple-100 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow relative overflow-hidden group">
                   <div className="absolute inset-0 bg-gradient-to-r from-purple-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                   <div className="relative z-10">
                     <div className="flex flex-wrap gap-2 items-center justify-between mb-3">
                       <span className="text-[10px] font-black text-purple-700 bg-purple-100 px-3 py-1.5 rounded-lg uppercase tracking-widest border border-purple-200 flex items-center gap-1.5"><ScanLine className="w-3 h-3"/> Attendance Logged</span>
                       <span className="text-xs font-extrabold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">{new Date(att.date).toLocaleDateString()}</span>
                     </div>
                     <h3 className="text-lg font-extrabold text-[#0F2547] mb-2">{att.eventName}</h3>
                     <p className="text-xs text-slate-500 mt-2 font-medium flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500"/> Verified and stored</p>
                   </div>
                 </div>
               </motion.div>
             ))}

             {data?.mainApp && (
               <motion.div 
                 initial={{ opacity: 0, x: -100, y: 50 }} 
                 animate={{ opacity: 1, x: 0, y: 0 }} 
                 transition={{ type: "spring", stiffness: 120, damping: 14 }}
                 className="relative pl-6 sm:pl-10"
               >
                 <div className="absolute -left-[11px] top-1 w-5 h-5 bg-amber-500 rounded-full ring-4 ring-amber-100 shadow-sm animate-pulse"></div>
                 <div className="bg-white border-2 border-amber-100 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow relative overflow-hidden group">
                   <div className="absolute inset-0 bg-gradient-to-r from-amber-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                   <div className="relative z-10">
                     <div className="flex flex-wrap gap-2 items-center justify-between mb-3">
                       <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-3 py-1.5 rounded-lg uppercase tracking-widest border border-amber-200 flex items-center gap-1.5"><Award className="w-3 h-3"/> Core Application</span>
                       <span className="text-xs font-extrabold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">{new Date(data.mainApp.appliedAt).toLocaleDateString()}</span>
                     </div>
                     <h3 className="text-lg font-extrabold text-[#0F2547] mb-2">{data.mainApp.topicInterested}</h3>
                     <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                       <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status:</span>
                       <span className={`text-xs font-black uppercase px-3 py-1 rounded-md ${data.mainApp.status === 'WAITING' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-700'}`}>{data.mainApp.status}</span>
                     </div>
                   </div>
                 </div>
               </motion.div>
             )}

             {data?.otherResponses?.map((res: any, idx: number) => (
               <motion.div 
                 key={idx}
                 initial={{ opacity: 0, x: idx % 2 === 0 ? 100 : -100, y: 50 }} 
                 animate={{ opacity: 1, x: 0, y: 0 }} 
                 transition={{ type: "spring", stiffness: 120, damping: 14, delay: (idx + 1) * 0.15 }}
                 className="relative pl-6 sm:pl-10"
               >
                 <div className="absolute -left-[9px] top-2 w-4 h-4 bg-blue-500 rounded-full ring-4 ring-blue-100 shadow-sm"></div>
                 <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-md hover:shadow-lg transition-all hover:-translate-y-1 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                   <div className="relative z-10">
                     <div className="flex flex-wrap gap-2 items-center justify-between mb-2">
                       <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md uppercase tracking-widest border border-blue-100">Event Submission</span>
                       <span className="text-[10px] font-bold text-slate-400">{new Date(res.submittedAt || Date.now()).toLocaleDateString()}</span>
                     </div>
                     <h3 className="text-base font-extrabold text-[#0F2547]">{res.form?.title || "Unknown Form"}</h3>
                     <p className="text-xs text-slate-500 mt-2 font-medium flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500"/> Secured in Data Vault</p>
                   </div>
                 </div>
               </motion.div>
             ))}

             {!data?.mainApp && (!data?.otherResponses || data?.otherResponses.length === 0) && attendances.length === 0 && (
                <div className="pl-8 text-slate-400 text-sm font-bold py-10">No history available yet.</div>
             )}
          </div>
        </motion.div>
      )}

      {/* ========================================================= */}
      {/* VIEW 6: ROADMAP DEPTH ANALYSIS (SPA)                      */}
      {/* ========================================================= */}
      {currentView === "ROADMAP_DETAIL" && selectedRoadmapStep && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="max-w-5xl mx-auto clay-card p-6 sm:p-12 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/40 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
          
          <div className="relative z-10 mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-8">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg text-white
                 ${selectedRoadmapStep.status === 'completed' ? 'bg-emerald-500' : selectedRoadmapStep.status === 'current' ? 'bg-blue-600 ring-4 ring-blue-100' : 'bg-slate-700'}`}>
                <selectedRoadmapStep.icon className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-100 px-3 py-1 rounded-full">Phase {selectedRoadmapStep.step} Analysis</span>
                <h2 className="text-3xl sm:text-4xl font-black text-[#0F2547] mt-2">{selectedRoadmapStep.title}</h2>
              </div>
            </div>
            <button onClick={() => setCurrentView("DASHBOARD")} className="clay-btn px-5 py-2.5 text-xs font-bold text-slate-600 flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shrink-0 shadow-sm border border-slate-200">
              <ChevronLeft className="w-4 h-4" /> Back to Map
            </button>
          </div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <h3 className="text-sm font-extrabold text-blue-900 uppercase tracking-widest mb-2 flex items-center gap-2"><Info className="w-4 h-4"/> Overview</h3>
                <p className="text-sm text-blue-800/80 leading-relaxed font-medium">{selectedRoadmapStep.desc}</p>
              </div>
              
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> Core Competencies</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">Mastering this phase unlocks the ability to understand systemic flaws in architecture and paves the way for advanced exploitation frameworks.</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Code className="w-4 h-4"/> Topics to Master</h3>
              <div className="space-y-3">
                {selectedRoadmapStep.topics?.map((topic: string, idx: number) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 50 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    transition={{ type: "spring", stiffness: 100, damping: 12, delay: idx * 0.15 }}
                    key={idx} 
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-blue-300 hover:shadow-md transition-colors cursor-default group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-xs font-black text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shrink-0">0{idx + 1}</div>
                    <span className="text-sm font-bold text-[#0F2547]">{topic}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
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
                  <Lightbulb className="w-5 h-5 text-amber-500" /> Journey Tips
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
                      <p className="text-[11px] text-slate-600">You can use the Nudge button once every 3 days to directly notify admins about your pending application.</p>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 space-y-2">
                      <h4 className="text-xs font-extrabold text-amber-800 flex items-center gap-1.5"><MailWarning className="w-4 h-4"/> Email Checking Tip</h4>
                      <p className="text-[10px] sm:text-[11px] text-amber-700 font-bold leading-relaxed">
                        Shortlisting confirmation will be sent to your registered email. Keep checking your <strong>Inbox</strong> and <strong>Spam folder</strong>. If our mail is in spam, click <strong>"Report not spam"</strong>.
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

            {/* RIGHT SIDE: ANIMATED STATUS MAP */}
            <div className="md:col-span-7 space-y-6 order-1 md:order-2">
              <div className={`clay-card p-6 sm:p-10 text-center border-t-4 relative overflow-hidden ${
                (!selectedForm.isMaster || data?.mainApp?.status === "WAITING") ? "border-t-amber-400" : "border-t-emerald-400"
              }`}>
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
                  (!selectedForm.isMaster || data?.mainApp?.status === "WAITING") ? "bg-amber-100/60" : "bg-emerald-100/60"
                }`}></div>
                
                <div className="relative z-10 space-y-8">
                  <div className="text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 border border-slate-200 px-3 py-1 rounded-full">Live Tracker</span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F2547] mt-4 mb-2">{selectedForm.title}</h2>
                  </div>

                  {/* Gamified Progress Bar */}
                  <div className="relative max-w-md mx-auto pt-4 pb-8">
                     <div className="absolute top-1/2 left-0 w-full h-1.5 bg-slate-100 -translate-y-1/2 rounded-full z-0">
                       <div className={`h-full rounded-full transition-all duration-1000 ease-in-out ${(!selectedForm.isMaster || data?.mainApp?.status === "WAITING") ? 'bg-amber-400 w-1/2' : 'bg-emerald-500 w-full'}`}></div>
                     </div>
                     
                     <div className="flex justify-between relative z-10">
                       <div className="flex flex-col items-center gap-2">
                         <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg ring-4 ring-white"><CheckCircle className="w-5 h-5"/></div>
                         <span className="text-[10px] font-black text-slate-700 uppercase">Submitted</span>
                       </div>
                       
                       <div className="flex flex-col items-center gap-2">
                         <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ring-4 ring-white transition-all duration-500 ${(!selectedForm.isMaster || data?.mainApp?.status === "WAITING") ? 'bg-amber-400 text-white scale-110 animate-pulse' : 'bg-emerald-500 text-white'}`}>
                            {(!selectedForm.isMaster || data?.mainApp?.status === "WAITING") ? <Clock className="w-6 h-6"/> : <CheckCircle className="w-6 h-6"/>}
                         </div>
                         <span className={`text-[10px] font-black uppercase ${(!selectedForm.isMaster || data?.mainApp?.status === "WAITING") ? 'text-amber-600' : 'text-slate-700'}`}>Review</span>
                       </div>

                       <div className="flex flex-col items-center gap-2">
                         <div className={`w-10 h-10 rounded-full flex items-center justify-center ring-4 ring-white transition-all duration-500 ${(!selectedForm.isMaster || data?.mainApp?.status === "WAITING") ? 'bg-slate-100 text-slate-300' : 'bg-emerald-500 text-white shadow-lg scale-110'}`}>
                           <Award className="w-5 h-5"/>
                         </div>
                         <span className={`text-[10px] font-black uppercase ${(!selectedForm.isMaster || data?.mainApp?.status === "WAITING") ? 'text-slate-400' : 'text-emerald-600'}`}>Approved</span>
                       </div>
                     </div>
                  </div>

                  {/* Context Message */}
                  {(!selectedForm.isMaster || data?.mainApp?.status === "WAITING") ? (
                    <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                      <p className="text-sm font-bold text-amber-800">Your application is in the queue.</p>
                      <p className="text-xs text-amber-700/80 mt-1 font-medium">Admins are currently reviewing candidates. You will be notified once a slot is assigned.</p>
                    </div>
                  ) : (
                    <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                      <p className="text-sm font-bold text-emerald-800">Congratulations! You're shortlisted.</p>
                      <p className="text-xs text-emerald-700/80 mt-1 font-medium">Check your email for the exact schedule and presentation details.</p>
                    </div>
                  )}

                  {/* Nudge Control (Master Only & Only if Waiting) */}
                  {selectedForm.isMaster && data?.mainApp?.status === "WAITING" && (
                    <div className="mt-8 pt-6 border-t border-slate-100">
                      <button 
                        onClick={handleNudge}
                        disabled={data.mainApp.hasNudged || loading === "nudge"}
                        className={`w-full sm:w-3/4 mx-auto py-4 rounded-xl text-sm font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all ${
                          data.mainApp.hasNudged 
                          ? "bg-slate-50 text-amber-600 cursor-not-allowed border border-amber-100" 
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
        <div className="max-w-4xl mx-auto animate-in slide-in-from-right-8 duration-500 relative">
          {(() => {
            const { theme, blocks } = getInstructionData();
            
            return (
              <div className={`p-8 sm:p-12 transition-all duration-500 relative overflow-hidden
                 ${theme === 'classic' ? 'bg-white rounded-[32px] border border-slate-200 shadow-lg' : ''}
                 ${theme === 'cyber' ? 'bg-[#0a0f1a] rounded-[24px] border-2 border-emerald-900/50 shadow-[0_0_40px_rgba(16,185,129,0.1)] font-mono text-emerald-50' : ''}
                 ${theme === 'clay' ? 'bg-[#eef2f6] rounded-[40px] shadow-[12px_12px_24px_#d1d9e2,-12px_-12px_24px_#ffffff] border-[4px] border-white/60' : ''}
               `}>
                  
                  {/* Decorative Elements */}
                  {theme === 'cyber' && <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>}
                  {theme === 'clay' && <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-white/40 rounded-full blur-2xl pointer-events-none"></div>}
                  
                  <div className="relative z-10 space-y-8">
                    <div className={`text-center mb-10 pb-8 ${theme === 'cyber' ? 'border-b border-emerald-900/50' : theme === 'clay' ? 'border-b-2 border-white' : 'border-b border-slate-100'}`}>
                      <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-5 ${theme === 'cyber' ? 'bg-emerald-900/30 text-emerald-500 border border-emerald-500/30 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]' : theme === 'clay' ? 'bg-[#eef2f6] shadow-[6px_6px_12px_#d1d9e2,-6px_-6px_12px_#ffffff] text-blue-600 border border-white/50' : 'bg-blue-50 text-blue-600 shadow-inner'}`}><FileText className="w-8 h-8" /></div>
                      <h2 className={`text-2xl sm:text-3xl font-extrabold ${theme === 'cyber' ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : theme === 'clay' ? 'text-blue-900 tracking-tight' : 'text-[#0F2547]'}`}>Official Program Guidelines</h2>
                      <p className={`text-sm mt-3 ${theme === 'cyber' ? 'text-emerald-600 font-bold' : theme === 'clay' ? 'text-slate-500 font-bold' : 'text-slate-500 font-medium'}`}>Please read the following instructions carefully before proceeding.</p>
                    </div>
                    
                    {blocks.length === 0 ? (
                       <div className={`text-center py-10 text-sm font-bold ${theme === 'cyber' ? 'text-emerald-800' : 'text-slate-400'}`}>No instructions provided for this form.</div>
                    ) : (
                       <div className="space-y-6">
                         {blocks.map((block: any, idx: number) => {
                           if (block.type === 'h3') return <h3 key={idx} className={`text-xl sm:text-2xl font-extrabold pb-4 ${theme === 'cyber' ? 'text-emerald-400 border-b border-emerald-900/50 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]' : theme === 'clay' ? 'text-blue-950 border-b-2 border-white' : 'text-[#0F2547] border-b border-slate-100'}`} dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(block.content)}} />;
                           if (block.type === 'p') return <p key={idx} className={`text-sm leading-relaxed ${theme === 'cyber' ? 'text-emerald-200/80 font-medium' : theme === 'clay' ? 'text-slate-500 font-bold' : 'text-slate-600 font-medium'}`} dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(block.content)}} />;
                           if (block.type === 'bullet') return (
                             <div key={idx} className="flex gap-3 items-start pl-1 mt-1">
                               <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${theme === 'cyber' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : theme === 'clay' ? 'bg-blue-400 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.2)]' : 'bg-blue-500'}`}></div>
                               <p className={`text-sm leading-relaxed ${theme === 'cyber' ? 'text-emerald-200/80 font-medium' : theme === 'clay' ? 'text-slate-500 font-bold' : 'text-slate-700 font-medium'}`} dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(block.content)}} />
                             </div>
                           );
                           if (block.type === 'number') {
                             const numIndex = blocks.slice(0, idx).filter((b: any) => b.type === 'number').length + 1;
                             return (
                               <div key={idx} className="flex gap-4 items-start mt-1">
                                 <div className={`w-8 h-8 flex items-center justify-center shrink-0 font-black text-sm mt-0.5
                                   ${theme === 'classic' ? 'rounded-lg bg-blue-50 text-blue-700 border border-blue-100 shadow-sm' : ''}
                                   ${theme === 'cyber' ? 'rounded bg-emerald-950/50 text-emerald-400 border border-emerald-800' : ''}
                                   ${theme === 'clay' ? 'rounded-xl bg-[#eef2f6] text-blue-600 shadow-[4px_4px_8px_#d1d9e2,-4px_-4px_8px_#ffffff] border border-white/50' : ''}
                                 `}>{numIndex}</div>
                                 <p className={`text-sm sm:text-base leading-relaxed mt-1 ${theme === 'cyber' ? 'text-emerald-200/80 font-medium' : theme === 'clay' ? 'text-slate-500 font-bold' : 'text-slate-700 font-medium'}`} dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(block.content)}} />
                               </div>
                             );
                           }
                           if (block.type === 'alert') return (
                             <div key={idx} className={`p-5 sm:p-6 flex gap-4 mt-6 
                               ${theme === 'classic' ? 'bg-amber-50 rounded-2xl border border-amber-100' : ''}
                               ${theme === 'cyber' ? 'bg-red-950/20 rounded-none border-l-4 border-red-500/50' : ''}
                               ${theme === 'clay' ? 'bg-[#eef2f6] shadow-[inset_6px_6px_12px_#d1d9e2,inset_-6px_-6px_12px_#ffffff] rounded-3xl border border-white/40' : ''}
                             `}>
                               <AlertTriangle className={`w-6 h-6 shrink-0 ${theme === 'cyber' ? 'text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]' : theme === 'clay' ? 'text-amber-500' : 'text-amber-500'}`}/>
                               <p className={`text-sm sm:text-base font-bold leading-relaxed ${theme === 'cyber' ? 'text-red-300/80' : theme === 'clay' ? 'text-amber-700' : 'text-amber-800'}`} dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(block.content)}} />
                             </div>
                           );
                           return null;
                         })}
                       </div>
                    )}
                    
                    <div className={`mt-12 pt-8 flex justify-end ${theme === 'cyber' ? 'border-t border-emerald-900/50' : theme === 'clay' ? 'border-t-2 border-white' : 'border-t border-slate-200'}`}>
                      <button 
                        onClick={() => setCurrentView("FORM")}
                        className={`px-8 sm:px-10 py-4 sm:py-5 text-sm sm:text-base font-extrabold uppercase tracking-widest flex items-center justify-center gap-3 transition-transform hover:scale-[1.02] active:scale-95
                          ${theme === 'cyber' ? 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 
                            theme === 'clay' ? 'bg-[#eef2f6] text-blue-700 rounded-[20px] shadow-[6px_6px_12px_#d1d9e2,-6px_-6px_12px_#ffffff] border-2 border-white hover:shadow-[inset_4px_4px_8px_#d1d9e2,inset_-4px_-4px_8px_#ffffff]' : 
                            'bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-xl'}`}
                      >
                        Acknowledge & Proceed <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
              </div>
            );
          })()}
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
                  
                  {/* 🟢 LOGIC FIX: Typescript safe number limitation */}
                  {field.fieldType === "NUMBER" && (
                    <input type="number" name={field.fieldLabel} required={field.isRequired} 
                      onInput={(e: React.FormEvent<HTMLInputElement>) => {
                        const target = e.currentTarget;
                        if (field.maxLength && target.value.length > field.maxLength) {
                          target.value = target.value.slice(0, field.maxLength);
                        }
                      }} 
                      className="clay-input w-full px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-shadow" placeholder={field.placeholder || (field.maxLength ? `Max length: ${field.maxLength}` : "Enter a valid number...")} />
                  )}
                  
                  {field.fieldType === "DROPDOWN" && (
                    <div className="relative">
                      <select name={field.fieldLabel} required={field.isRequired} className="clay-input w-full px-5 py-4 text-sm font-bold bg-white appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500 transition-shadow">
                        <option value="">Select an option...</option>
                        {field.options?.map((opt: string, i: number) => <option key={i} value={opt}>{opt}</option>)}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-blue-600">
                        <ChevronDown className="h-5 w-5" />
                      </div>
                    </div>
                  )}

                  {field.fieldType === "CHECKBOX" && (
                    <div className="space-y-3 mt-3 clay-inset p-5 rounded-xl">
                      {field.options?.map((opt: string, i: number) => (
                        <label key={i} className="flex items-center gap-3 cursor-pointer group">
                          <input type={field.isMultiSelect ? "checkbox" : "radio"} name={field.isMultiSelect ? `${field.fieldLabel}[]` : field.fieldLabel} value={opt} className={`w-5 h-5 text-blue-600 bg-white border-slate-300 shadow-sm focus:ring-blue-500 cursor-pointer shrink-0 ${field.isMultiSelect ? 'rounded' : 'rounded-full'}`} />
                          <span className="text-sm font-bold text-slate-700 group-hover:text-blue-700 transition-colors">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {field.fieldType === "FILE_UPLOAD" && (
                    <div className={`clay-inset p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center group relative overflow-hidden ${selectedFiles[field.fieldLabel] ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200 hover:bg-blue-50 hover:border-blue-200'}`}>
                      <input type="file" name={field.fieldLabel} required={field.isRequired} accept={field.options?.join(',')} 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setSelectedFiles(prev => ({ ...prev, [field.fieldLabel]: e.target.files![0].name }));
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                      />
                      {selectedFiles[field.fieldLabel] ? (
                        <>
                          <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2 scale-110 transition-transform" />
                          <p className="text-sm font-extrabold text-emerald-700 text-center px-4 truncate w-full">{selectedFiles[field.fieldLabel]}</p>
                          <p className="text-[10px] font-bold text-emerald-600/80 mt-1 uppercase tracking-widest">Ready to submit</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-blue-400 group-hover:text-blue-600 mb-2 transition-colors" />
                          <p className="text-sm font-extrabold text-blue-700">Click or drag file to upload</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Allowed: {(field.options || []).join(', ') || 'Any'} • MAX {field.maxLength || 5}MB</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* --- STRICT OFFICIAL DECLARATION (Mandatory to check) --- */}
            {selectedForm.hasDeclaration && (
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
                      {selectedForm.declarationText || "I agree to the terms and conditions."}
                    </span>
                  </label>
                </div>
              </div>
            )}
            
            <div className="pt-6 mt-8 border-t border-slate-200">
              <button 
                type="submit" 
                disabled={formLoading || (selectedForm.hasDeclaration && !declarationAccepted)} 
                className="clay-btn-primary w-full py-5 text-sm sm:text-base font-extrabold uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-transform hover:scale-[1.01]"
              >
                {formLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Submit Secure Application"} 
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 7: ATTENDANCE SCANNER & CODE MODULE (SPA)            */}
      {/* ========================================================= */}
      {currentView === "ATTENDANCE" && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="max-w-3xl mx-auto clay-card p-6 sm:p-10 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-100/40 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
          
          <div className="relative z-10 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg ring-4 ring-purple-100">
                <ScanLine className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-purple-600 tracking-widest bg-purple-100 border border-purple-200 px-3 py-1 rounded-full">Secure Check-in</span>
                <h2 className="text-2xl sm:text-3xl font-black text-[#0F2547] mt-2">Mark Attendance</h2>
              </div>
            </div>
            <button onClick={() => setCurrentView("DASHBOARD")} className="clay-btn px-5 py-2.5 text-xs font-bold text-slate-600 flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shrink-0 shadow-sm border border-slate-200">
              <ChevronLeft className="w-4 h-4" /> Go Back
            </button>
          </div>

          <div className="relative z-10 space-y-8">
            {!activeSession ? (
              <div className="bg-white border-2 border-slate-100 rounded-3xl p-10 text-center shadow-sm flex flex-col items-center">
                <ScanLine className="w-12 h-12 text-slate-300 mb-4"/>
                <h3 className="text-lg font-extrabold text-slate-700">No Active Session</h3>
                <p className="text-xs text-slate-500 mt-2 font-medium">There is no live attendance session running currently. Please wait for the coordinator to launch it.</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                   <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-purple-200 inline-block mb-2">LIVE SESSION</span>
                   <h3 className="text-xl font-extrabold text-[#0F2547]">{activeSession.title}</h3>
                </div>
                
                {/* Mode is forced by admin. Only show the relevant UI */}
                <div className="bg-white border-2 border-slate-100 rounded-3xl p-8 shadow-sm">
                  <AnimatePresence mode="wait">
                    {activeSession.mode === "QR" ? (
                      <motion.div key="qr" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col items-center justify-center space-y-6">
                        <div className="relative w-full max-w-[280px] aspect-square bg-slate-900 border-4 border-slate-800 rounded-3xl flex items-center justify-center overflow-hidden shadow-inner">
                          {isScanning ? (
                            <div id="qr-reader" className="w-full h-full [&>video]:object-cover [&>video]:w-full [&>video]:h-full" />
                          ) : (
                            <div className="text-center space-y-2 bg-slate-50 w-full h-full flex flex-col justify-center items-center">
                              <QrCode className="w-12 h-12 text-slate-300 mx-auto" />
                              <p className="text-xs font-bold text-slate-400">Camera Off</p>
                            </div>
                          )}
                        </div>
                        <button onClick={() => setIsScanning(!isScanning)} className="clay-btn-primary bg-purple-600 hover:bg-purple-700 w-full py-4 text-sm font-extrabold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg">
                          {isScanning ? "Stop Scanner" : "Activate Camera Scanner"}
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div key="code" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6 max-w-sm mx-auto">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-100 shadow-inner">
                            <KeyRound className="w-8 h-8" />
                          </div>
                          <h3 className="text-lg font-black text-[#0F2547]">Enter Secret Code</h3>
                          <p className="text-xs text-slate-500 font-medium mt-1">Ask the coordinator for the session code.</p>
                        </div>
                        <div>
                          <input 
                            type="text" 
                            value={attendanceCode}
                            onChange={(e) => setAttendanceCode(e.target.value.toUpperCase())}
                            placeholder="e.g. CYBER2026" 
                            className="clay-input w-full px-6 py-4 text-center text-xl font-black tracking-[0.2em] text-purple-900 focus:ring-2 focus:ring-purple-500 transition-shadow uppercase"
                          />
                        </div>
                        <button 
                          onClick={() => handleMarkAttendance()}
                          disabled={loading === "attendance" || !attendanceCode.trim()} 
                          className="clay-btn-primary bg-purple-600 hover:bg-purple-700 w-full py-4 text-sm font-extrabold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                        >
                          {loading === "attendance" ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Mark Present"}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}

    </div>
  );
}