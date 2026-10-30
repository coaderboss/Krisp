"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  BookOpen, 
  BellRing, 
  CheckCircle, 
  Shield, 
  ArrowRight, 
  Loader2, 
  Info, 
  Ticket, 
  Calendar as CalendarIcon, 
  Activity,
  ChevronLeft, 
  Globe, 
  ChevronRight, 
  Award, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  CalendarDays, 
  Lightbulb, 
  MailWarning, 
  Clock, 
  Map as MapIcon, 
  MapPin, 
  Play, 
  MousePointerClick, 
  Flag, 
  Zap, 
  Target, 
  History as HistoryIcon, 
  Terminal, 
  Upload, 
  ChevronDown, 
  Lock, 
  Server, 
  Code, 
  Eye, 
  QrCode, 
  ScanLine, 
  KeyRound, 
  Camera,
  LogOut,
  Sparkles,
  Layers,
  Radio,
  Compass,
  Cpu,
  EyeOff
} from "lucide-react";
import { getStudentDashboardData, submitStudentForm, nudgeAdmin, getStudentEvents } from "@/actions/student";
import { getActiveSessionForStudent, markStudentAttendance } from "@/actions/attendance";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Html5Qrcode } from "html5-qrcode";

// 🟢 SECURITY: Robust Zero-Dependency Client-Side XSS Sanitizer
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

// Detailed 6-Phase Cybersecurity Pathway Data
const cyberRoadmap = [
  { 
    step: 1, 
    title: "Networking & Internet Architecture", 
    icon: Globe, 
    status: "completed", 
    duration: "Weeks 1-4",
    level: "Fundamental",
    desc: "Understand how packets flow across the internet, protocol vulnerabilities, and packet inspection.", 
    topics: [
      "OSI & TCP/IP 4-Layer Architecture", 
      "Subnetting, CIDR & NAT Traversal", 
      "Deep Dive: DNS, HTTP/2, TLS 1.3 & SSH", 
      "Wireshark & tcpdump Packet Analysis", 
      "Routing Protocols: BGP, OSPF & ARP Spoofing"
    ],
    tools: ["Wireshark", "Nmap", "tcpdump", "Cisco Packet Tracer"],
    milestone: "Packet Capture CTF: Extract credentials and secret keys from an unencrypted pcap stream.",
    cert: "CompTIA Network+ / Cisco CCNA"
  },
  { 
    step: 2, 
    title: "Linux Mastery & System Internals", 
    icon: Terminal, 
    status: "completed", 
    duration: "Weeks 5-8",
    level: "Intermediate",
    desc: "Master Unix command-line power, process manipulation, permissions, and shell automation.", 
    topics: [
      "Linux Filesystem (FHS) & /proc Virtual Filesystem", 
      "Chmod, Chown, SUID/SGID & Sticky Bits", 
      "Bash Automation & Python Scripting for Hackers", 
      "Process Management, Daemons & Cron Jobs", 
      "Log Auditing (/var/log/auth.log, syslog)"
    ],
    tools: ["Bash", "Tmux", "Strace", "Grep/Awk/Sed", "Vim"],
    milestone: "Privilege Escalation Challenge: Exploit a misconfigured SUID binary to pop a root shell.",
    cert: "RHCSA / LPIC-1"
  },
  { 
    step: 3, 
    title: "Web Vulnerabilities & Pentesting", 
    icon: Shield, 
    status: "current", 
    duration: "Weeks 9-14",
    level: "Advanced (Active)",
    desc: "Audit and exploit OWASP Top 10 vulnerabilities in modern client-server web architectures.", 
    topics: [
      "SQL Injection (Union-based, Blind, Error-based)", 
      "Cross-Site Scripting (Reflected, Stored, DOM XSS)", 
      "Authentication Flaws, JWT Cracking & Session Hijacking", 
      "SSRF, CSRF & Insecure Direct Object References (IDOR)", 
      "Business Logic Flaws & Race Conditions"
    ],
    tools: ["Burp Suite Pro", "OWASP ZAP", "SQLmap", "Postman", "ffuf / Gobuster"],
    milestone: "PortSwigger Web Security Academy: Complete 15 Practitioner-level vulnerability labs.",
    cert: "PortSwigger BSCP / eWPTv2"
  },
  { 
    step: 4, 
    title: "Network Pentesting & Active Directory", 
    icon: Target, 
    status: "locked", 
    duration: "Weeks 15-20",
    level: "Expert",
    desc: "Compromise enterprise networks, pivot through internal subnets, and dominate Active Directory domains.", 
    topics: [
      "Port Scanning & Enumeration with Nmap/Masscan", 
      "Metasploit Framework & Custom Exploit Modification", 
      "Active Directory: Kerberoasting & AS-REP Roasting", 
      "Lateral Movement (Pass-the-Hash, PsExec, WMI)", 
      "Windows Token Impersonation & Mimikatz Dumping"
    ],
    tools: ["BloodHound", "Impacket", "Mimikatz", "Metasploit", "Responder"],
    milestone: "Hack The Box Pro Lab: Compromise an entire Active Directory domain forest from scratch.",
    cert: "OffSec Certified Professional (OSCP) / CRTP"
  },
  { 
    step: 5, 
    title: "Cloud Security & DevSecOps", 
    icon: Server, 
    status: "locked", 
    duration: "Weeks 21-26",
    level: "Specialist",
    desc: "Secure multi-cloud environments, audit IAM misconfigurations, container breakouts, and CI/CD security.", 
    topics: [
      "AWS & Azure IAM Privilege Escalation Chains", 
      "S3 Bucket & Storage Account Exposure Enumeration", 
      "Docker Container Escape & Kubernetes Pod Exploitation", 
      "Infrastructure as Code (Terraform) Scanning", 
      "CI/CD Pipeline Poisoning & Secrets Leakage Prevention"
    ],
    tools: ["ScoutSuite", "Trivy", "Pacu", "Kubectl", "GitGuardian"],
    milestone: "CloudGoat Scenario: Exploit AWS IAM role assumption vulnerability to exfiltrate database records.",
    cert: "AWS Certified Security Specialty / CKS"
  },
  { 
    step: 6, 
    title: "Bug Bounty & Zero-Day Research", 
    icon: Award, 
    status: "locked", 
    duration: "Weeks 27-32",
    level: "Mastery",
    desc: "Hunt for vulnerabilities in live public programs, write triage reports, and earn ethical bounties.", 
    topics: [
      "Reconnaissance Automation at Scale (Amass, Subfinder)", 
      "Content Discovery & JavaScript Endpoint Extraction", 
      "Bypassing WAFs & Rate Limits with Custom Payloads", 
      "Impact Demonstration & Professional CVSS Reporting", 
      "Responsible Disclosure & Platform Triage Etiquette"
    ],
    tools: ["HackerOne", "Bugcrowd", "Nuclei", "httpx", "Sublist3r"],
    milestone: "Submit 3 verified vulnerability reports on live HackerOne / Bugcrowd public programs.",
    cert: "OffSec Web Expert (OSWE) / Hall of Fame"
  }
];

export default function StudentDashboard() {
  const [loading, setLoading] = useState("init");
  const [data, setData] = useState<any>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState<{text: string, type: string} | null>(null);
  
  // SPA View Routing States
  const [currentView, setCurrentView] = useState<"DASHBOARD" | "INSTRUCTIONS" | "FORM" | "STATUS" | "ACTIVITY_LOG" | "ROADMAP_DETAIL" | "ATTENDANCE">("DASHBOARD");
  const [selectedForm, setSelectedForm] = useState<any | null>(null);
  const [selectedRoadmapStep, setSelectedRoadmapStep] = useState<any | null>(null);
  const [roadmapDetailTab, setRoadmapDetailTab] = useState<"CURRICULUM" | "TOOLS" | "MILESTONE" | "CERT">("CURRICULUM");
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, string>>({});

  // Attendance States
  const [attendanceCode, setAttendanceCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [attendances, setAttendances] = useState<any[]>([]);

  // Calendar Dynamic Navigation States (Executive 1:1 Design)
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  
  // Real Data States
  const [events, setEvents] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);

  // Calendar Math
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' });

  // Filter events on the specifically clicked day
  const eventsOnSelectedDate = useMemo(() => {
    if (!selectedDay) return [];
    return events.filter(ev => {
      const d = new Date(ev.eventDate);
      return d.getDate() === selectedDay && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  }, [events, selectedDay, currentMonth, currentYear]);

  // Upcoming events in this month (to ensure agenda is NEVER an empty dead void)
  const upcomingEventsThisMonth = useMemo(() => {
    return events
      .filter(ev => {
        const d = new Date(ev.eventDate);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && (!selectedDay || d.getDate() >= selectedDay);
      })
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
      .slice(0, 5);
  }, [events, currentMonth, currentYear, selectedDay]);

  const changeMonth = (offset: number) => {
    let newMonth = currentMonth + offset;
    let newYear = currentYear;
    if (newMonth < 0) { newMonth = 11; newYear--; }
    else if (newMonth > 11) { newMonth = 0; newYear++; }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    setSelectedDay(null);
  };

  const jumpToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDay(today.getDate());
  };

  // 🟢 CAMERA SCANNER EFFECT
  useEffect(() => {
    let html5QrCode: Html5Qrcode;
    let isMounted = true;

    if (isScanning && activeSession?.mode === "QR") {
      html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (isMounted) {
            html5QrCode.stop().then(() => {
              setIsScanning(false);
              handleMarkAttendance(decodedText);
            }).catch(console.error);
          }
        },
        () => { /* Background scanning */ }
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

  function notify(text: string, type: "success" | "error" = "success") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  }

  async function loadData() {
    try {
      const res = await getStudentDashboardData();
      if (res.success) {
        setData({
          activeForms: res.activeForms || [],
          mainApp: res.mainApp || null,
          otherResponses: res.otherResponses || []
        });
      }

      const evRes = await getStudentEvents();
      if (evRes.success && evRes.data) setEvents(evRes.data);

      const sessRes = await getActiveSessionForStudent();
      if (sessRes.success && sessRes.data) {
        setActiveSession(sessRes.data);
      } else {
        setActiveSession(null);
      }
    } catch {}
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
      notify(res.message || "Admin notified of pending review.", "success");
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

  const handleMarkAttendance = async (qrData?: string) => {
    if (!activeSession) return notify("No active session running.", "error");
    
    let payload = "";
    if (activeSession.mode === "CODE") {
      if (!attendanceCode.trim()) return notify("Please enter a valid code", "error");
      payload = attendanceCode.trim();
    } else {
      payload = qrData || "simulated_qr_payload";
    }

    setLoading("attendance");
    const res = await markStudentAttendance(activeSession.id, payload);
    
    if (res.success) {
      setAttendances([{ eventName: activeSession.title, date: new Date().toISOString() }, ...attendances]);
      notify("Attendance Verified & Marked Successfully!", "success");
      setAttendanceCode("");
      setIsScanning(false);
      setCurrentView("ACTIVITY_LOG");
    } else {
      notify(res.error || "Verification failed.", "error");
    }
    setLoading("");
  };

  if (loading === "init") {
    return (
      <div className="flex flex-col justify-center h-screen items-center bg-[#EAF2FC]">
        <div className="w-16 h-16 rounded-3xl clay-card flex items-center justify-center text-blue-600 mb-4 animate-pulse shadow-xl">
          <Activity className="w-8 h-8" />
        </div>
        <p className="text-[#0F2547] font-black uppercase tracking-widest text-xs">Loading Student Portal</p>
        <p className="text-slate-400 font-semibold text-[10px] mt-1">Connecting to Club Datastream &amp; Schedule Matrix...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1850px] mx-auto space-y-6 sm:space-y-8 animate-in fade-in pb-24 overflow-x-hidden relative min-h-[90vh]">
      
      {/* FLOATING TOAST NOTIFICATION */}
      <AnimatePresence>
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[150] max-w-lg w-[90%] px-4"
          >
            <div className={`p-4 rounded-2xl text-xs font-black shadow-xl border flex items-center justify-between gap-3 backdrop-blur-md ${
              message.type === "success" 
                ? "bg-emerald-500/95 text-white border-emerald-400 shadow-emerald-500/20" 
                : "bg-red-500/95 text-white border-red-400 shadow-red-500/20"
            }`}>
              <div className="flex items-center gap-2">
                {message.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span>{message.text}</span>
              </div>
              <button onClick={() => setMessage(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* 1. SOFT CLAYMORPHIC GLOBAL HEADER BANNER                  */}
      {/* ========================================================= */}
      <div className="clay-card p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/80 shadow-md">
        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl clay-soft-blue flex items-center justify-center shrink-0 border border-white shadow-inner">
            <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="clay-badge-blue text-[9px] sm:text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                STUDENT HUB
              </span>
              <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Terminal Connected
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-[#0F2547] tracking-tight">
              Cybersecurity Student Portal
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 font-semibold truncate max-w-[260px] sm:max-w-md mt-0.5">
              {currentView === "DASHBOARD" ? "Discover live sessions, active applications & structured skill roadmap" : 
               currentView === "STATUS" ? `Tracking Application: ${selectedForm?.title}` : 
               currentView === "ACTIVITY_LOG" ? "Verified Student Activity & Attendance History" : 
               currentView === "ROADMAP_DETAIL" ? `Curriculum Deep Dive: ${selectedRoadmapStep?.title}` :
               `Application Desk: ${selectedForm?.title || "Attendance"}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-start md:justify-end shrink-0">
          {currentView === "DASHBOARD" ? (
            <button 
              onClick={() => signOut({ callbackUrl: "/login" })} 
              className="clay-btn w-full sm:w-auto px-4 py-2.5 text-xs font-black text-red-600 hover:bg-red-50 flex items-center justify-center gap-2 shadow-sm border-red-100"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Secure Logout</span>
            </button>
          ) : (
            <button 
              onClick={backToDashboard} 
              className="clay-btn-primary w-full sm:w-auto px-5 py-2.5 text-xs font-black flex items-center justify-center gap-2 shadow-md uppercase tracking-wider"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Return to Dashboard</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* VIEW 1: MAIN STUDENT DASHBOARD (LONG-SCROLL MISSION DECK) */}
      {/* ========================================================= */}
      {currentView === "DASHBOARD" && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          
          {/* ======================================================== */}
          {/* DUAL OPERATIONAL DECK: CALENDAR MATRIX & ATTENDANCE      */}
          {/* (1:1 Visual Alignment with Executive Dashboard UI)      */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* SMART SCHEDULE MATRIX & AGENDA (8 Cols) */}
            <div className="lg:col-span-8 clay-card p-5 sm:p-6 flex flex-col md:flex-row gap-6 border border-white shadow-md">
              
              {/* Left Sub-Deck: Interactive Mini-Calendar (54%) */}
              <div className="w-full md:w-[54%] flex flex-col border-b md:border-b-0 md:border-r border-blue-200/60 pb-5 md:pb-0 md:pr-6">
                
                {/* Month Navigation & Controls */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                      <CalendarIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[#0F2547] uppercase tracking-wider">Schedule Matrix</h3>
                      <p className="text-[9px] font-bold text-slate-400">Club Sessions &amp; Workshops</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 clay-inset px-2 py-1 rounded-xl">
                    <button 
                      onClick={() => changeMonth(-1)} 
                      aria-label="Previous Month"
                      className="p-1 hover:text-blue-600 text-slate-500 transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#0F2547] min-w-[76px] text-center">
                      {monthName.slice(0, 3)} {currentYear}
                    </span>
                    <button 
                      onClick={() => changeMonth(1)} 
                      aria-label="Next Month"
                      className="p-1 hover:text-blue-600 text-slate-500 transition-colors"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={jumpToToday} 
                      className="ml-1 text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-white text-blue-600 border border-blue-100 hover:bg-blue-50"
                    >
                      Today
                    </button>
                  </div>
                </div>

                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
                    <div key={i} className="text-[9px] font-black uppercase tracking-wider text-slate-400 py-1">{d}</div>
                  ))}
                </div>

                {/* Day Grid */}
                <div className="grid grid-cols-7 gap-1.5 flex-1 items-start">
                  {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square opacity-0 pointer-events-none" />
                  ))}

                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const isCurrentDay = dayNum === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                    const isSelected = selectedDay === dayNum;
                    
                    const dayEvents = events.filter(ev => {
                      const d = new Date(ev.eventDate);
                      return d.getDate() === dayNum && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                    });
                    
                    const hasPublic = dayEvents.some(ev => ev.description !== 'INTERNAL');
                    const hasInternal = dayEvents.some(ev => ev.description === 'INTERNAL');

                    return (
                      <button
                        key={dayNum}
                        onClick={() => setSelectedDay(dayNum)}
                        className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-bold transition-all ${
                          isSelected
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105 z-10 font-black"
                            : isCurrentDay
                            ? "bg-white text-blue-600 border border-blue-300 font-black shadow-sm"
                            : dayEvents.length > 0
                            ? "bg-white/80 text-[#0F2547] hover:bg-white hover:shadow-sm"
                            : "bg-transparent text-slate-500 hover:bg-white/60"
                        }`}
                      >
                        <span>{dayNum}</span>
                        
                        {/* Event Indicator Dots */}
                        <div className="absolute bottom-1 flex items-center gap-0.5">
                          {hasPublic && (
                            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-cyan-200" : "bg-emerald-500"}`} />
                          )}
                          {hasInternal && (
                            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-amber-200" : "bg-amber-500"}`} />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Calendar Legend */}
                <div className="flex items-center gap-4 pt-3 mt-3 border-t border-slate-200/50 text-[10px] font-bold text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Public Meetup
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> Club Briefing
                  </span>
                </div>

              </div>

              {/* Right Sub-Deck: Smart Agenda (NEVER EMPTY) (46%) */}
              <div className="w-full md:w-[46%] flex flex-col justify-between">
                <div>
                  {/* Header for Focus Day */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-blue-200/50">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 block">Agenda Focus</span>
                      <h4 className="text-sm font-extrabold text-[#0F2547]">
                        {selectedDay ? `${selectedDay} ${monthName} ${currentYear}` : "Select a Date"}
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-50 text-blue-600 border border-blue-100">
                      {eventsOnSelectedDate.length} {eventsOnSelectedDate.length === 1 ? "Session" : "Sessions"}
                    </span>
                  </div>

                  {/* Event Cards or Smart Fallback (No empty void) */}
                  <div className="space-y-2.5 max-h-[260px] overflow-y-auto no-scrollbar pr-1">
                    {eventsOnSelectedDate.length > 0 ? (
                      eventsOnSelectedDate.map((ev) => (
                        <div 
                          key={ev.id}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            ev.description === "INTERNAL" 
                              ? "bg-amber-50/70 border-amber-200 shadow-sm" 
                              : "bg-white border-blue-100 shadow-[2px_4px_12px_rgba(15,37,71,0.04)]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider ${
                              ev.description === "INTERNAL" 
                                ? "bg-amber-100 text-amber-800" 
                                : "bg-emerald-100 text-emerald-800"
                            }`}>
                              {ev.eventType || "CLUB SESSION"}
                            </span>
                            
                            {ev.description === "INTERNAL" && (
                              <span title="Internal Club Briefing" className="text-amber-600">
                                <EyeOff className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>

                          <h5 className="text-xs font-black text-[#0F2547] leading-snug">{ev.title}</h5>
                          
                          <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500 mt-2">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {new Date(ev.eventDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {ev.attendanceSession && (
                              <span className="flex items-center gap-1 text-emerald-600 font-bold">
                                <ScanLine className="w-3 h-3" /> Gate Attached
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      /* SMART UPCOMING ROSTER - PREVENTS EMPTY DEAD SPACE */
                      <div className="space-y-3">
                        <div className="p-3.5 rounded-2xl bg-white/70 border border-white text-center">
                          <MapPin className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                          <p className="text-[11px] font-black text-slate-600">No sessions scheduled on this day</p>
                          <p className="text-[9px] font-semibold text-slate-400 mt-0.5">Showing upcoming events for {monthName}:</p>
                        </div>

                        {upcomingEventsThisMonth.length > 0 ? (
                          upcomingEventsThisMonth.map(ev => {
                            const evDate = new Date(ev.eventDate);
                            return (
                              <div 
                                key={ev.id}
                                onClick={() => setSelectedDay(evDate.getDate())}
                                className="p-3 rounded-xl bg-white/80 border border-blue-100/70 hover:bg-white hover:shadow-sm cursor-pointer transition-all flex items-center justify-between gap-3 group"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex flex-col items-center justify-center font-black leading-none border border-blue-100">
                                    <span className="text-[11px]">{evDate.getDate()}</span>
                                    <span className="text-[7px] uppercase">{evDate.toLocaleDateString("en-US", { month: "short" })}</span>
                                  </div>
                                  <div className="min-w-0">
                                    <h6 className="text-[11px] font-black text-[#0F2547] truncate group-hover:text-blue-600 transition-colors">{ev.title}</h6>
                                    <span className="text-[9px] font-bold text-slate-400">{ev.eventType}</span>
                                  </div>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-[10px] font-bold text-center text-slate-400 py-3">No further events scheduled this month.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Quick-Tip */}
                <div className="pt-3 mt-2 border-t border-blue-200/40 text-[9px] font-bold text-slate-400 flex items-center justify-between">
                  <span>Total Month Load: {events.length} Event(s)</span>
                  <span className="text-blue-600 font-extrabold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Roster Active
                  </span>
                </div>
              </div>

            </div>

            {/* EVENT ATTENDANCE TERMINAL GATEWAY (4 Cols) */}
            <div className="lg:col-span-4 clay-card p-6 flex flex-col justify-between relative overflow-hidden group border border-white shadow-md">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner ${
                    activeSession 
                      ? "bg-purple-100 text-purple-700 border-purple-200 animate-pulse" 
                      : "bg-blue-100 text-blue-600 border-blue-200"
                  }`}>
                    <ScanLine className="w-6 h-6" />
                  </div>

                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                    activeSession 
                      ? "bg-purple-50 text-purple-700 border-purple-200" 
                      : "bg-blue-50 text-blue-600 border-blue-200"
                  }`}>
                    {activeSession ? "SESSION STREAMING" : "TERMINAL IDLE"}
                  </span>
                </div>

                <h3 className="text-lg font-black text-[#0F2547] leading-snug">
                  Event Attendance Terminal
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-1.5 leading-relaxed">
                  {activeSession
                    ? `Live check-in is active for "${activeSession.title}". Scan QR or enter session PIN to record presence.`
                    : "No live attendance broadcast currently active. Terminal will activate automatically when coordinators initiate check-in."}
                </p>

                {/* Diagnostics Box */}
                <div className="mt-4 p-3.5 rounded-2xl bg-white/70 border border-white space-y-2 text-[10px] font-bold">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Scanner Engine:</span>
                    <span className="text-[#0F2547]">Dual-Key QR + 6-Char PIN</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Security Clearance:</span>
                    <span className="text-emerald-600 font-black">Student Verified</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Live Broadcast:</span>
                    <span className={activeSession ? "text-purple-700 font-black" : "text-slate-500"}>
                      {activeSession ? activeSession.mode : "Awaiting Host"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Launch Button */}
              <div className="pt-5 mt-4 border-t border-blue-200/60">
                <button
                  onClick={() => setCurrentView("ATTENDANCE")}
                  className="w-full clay-btn-primary py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:shadow-lg transition-all"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Open Scanner Terminal</span>
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </button>
              </div>
            </div>

          </div>

          {/* ======================================================== */}
          {/* SECTION 2: ACTIVE APPLICATIONS & EVENT INTAKES          */}
          {/* ======================================================== */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-blue-200/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Ticket className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-[#0F2547]">Active Applications &amp; Registrations</h2>
                  <p className="text-[10px] font-bold text-slate-400">Apply for upcoming cyber bulletins, club presenter slots, and workshops.</p>
                </div>
              </div>
              <span className="clay-badge-blue text-[10px] font-black px-3 py-1 rounded-full uppercase">
                {data?.activeForms?.length || 0} Open Forms
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {data?.activeForms?.map((form: any) => {
                if (!form?.id) return null;
                const submitted = hasSubmittedForm(form.id, form.isMaster);
                
                return (
                  <motion.div 
                    whileHover={{ y: -3 }} 
                    key={form.id} 
                    className={`clay-card p-6 flex flex-col justify-between h-full relative overflow-hidden transition-all border ${
                      submitted ? "border-emerald-200 bg-emerald-50/20" : "border-white bg-white/90"
                    }`}
                  >
                    <div className="relative z-10 flex flex-col h-full">
                      <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
                        <span className={`text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider border ${
                          form.formMode === "QUEUE" ? "bg-amber-100 text-amber-900 border-amber-200" : 
                          form.formMode === "NORMAL" ? "bg-purple-100 text-purple-900 border-purple-200" : 
                          "bg-blue-100 text-blue-900 border-blue-200"
                        }`}>
                          {form.formMode === "QUEUE" ? "⭐ CORE SELECTION" : form.formMode === "NORMAL" ? "📄 STANDARD FORM" : "📅 EVENT FORM"}
                        </span>
                        
                        {submitted && (
                          <span className="flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200 uppercase tracking-wider">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Secured in Vault
                          </span>
                        )}
                      </div>
                      
                      <div className="flex-1 space-y-2 mb-6">
                        <h3 className={`text-lg sm:text-xl font-black leading-snug ${submitted ? "text-emerald-950" : "text-[#0F2547]"}`}>
                          {form.title}
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-3">
                          {form.description}
                        </p>
                      </div>
                    
                      <div className="mt-auto pt-3 border-t border-slate-100">
                        {submitted ? (
                          <button 
                            onClick={() => handleStatusClick(form)}
                            className="w-full clay-btn py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-emerald-50 text-emerald-800 transition-all border-emerald-200"
                          >
                            <MapIcon className="w-4 h-4 text-emerald-600" />
                            <span>Track Live Status</span>
                            <ArrowRight className="w-3.5 h-3.5 ml-auto text-emerald-600" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleApplyClick(form)}
                            className="w-full clay-btn-primary py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all"
                          >
                            <span>Apply Now</span>
                            <ArrowRight className="w-4 h-4 ml-auto" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              
              {(!data?.activeForms || data.activeForms.length === 0) && (
                <div className="col-span-full clay-inset p-10 text-center text-slate-500 flex flex-col items-center rounded-3xl">
                  <Ticket className="w-10 h-10 text-slate-300 mb-3" />
                  <p className="font-black text-base text-[#0F2547]">No Active Registration Forms</p>
                  <p className="text-xs font-medium text-slate-400 mt-0.5">Please check back later for upcoming club presenter slots &amp; workshop intakes.</p>
                </div>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 3: RECENT STUDENT ACTIVITY & TELEMETRY STREAM   */}
          {/* ======================================================== */}
          <div className="clay-card p-5 sm:p-6 space-y-4 border border-white shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-blue-200/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#0F2547] uppercase tracking-wider">Your Recent Activity Stream</h3>
                  <p className="text-[10px] font-bold text-slate-400">Real-time confirmation of your attendances and application submissions.</p>
                </div>
              </div>
              <button 
                onClick={() => setCurrentView("ACTIVITY_LOG")} 
                className="clay-btn px-3 py-1.5 text-[10px] font-black uppercase text-blue-700 hover:text-blue-800"
              >
                View Full Timeline
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Card 1: Attendance Logs */}
              {attendances.length > 0 ? (
                attendances.slice(0, 1).map((att, idx) => (
                  <div key={idx} className="clay-inset p-3.5 rounded-2xl flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                      <ScanLine className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[8px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded">Attendance Logged</span>
                      <h5 className="text-xs font-black text-[#0F2547] truncate mt-0.5">{att.eventName}</h5>
                      <p className="text-[9px] font-semibold text-slate-400">Verified via cryptographic protocol</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="clay-inset p-3.5 rounded-2xl flex items-center gap-3 text-slate-400">
                  <ScanLine className="w-5 h-5 opacity-40 shrink-0" />
                  <span className="text-xs font-semibold">No recent attendance sessions logged</span>
                </div>
              )}

              {/* Card 2: Core Team Application Status */}
              {data?.mainApp ? (
                <div className="clay-inset p-3.5 rounded-2xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[8px] font-black uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded">Core Presenter Queue</span>
                    <h5 className="text-xs font-black text-[#0F2547] truncate mt-0.5">{data.mainApp.topicInterested}</h5>
                    <p className="text-[9px] font-semibold text-slate-500">Status: <strong className="text-blue-700">{data.mainApp.status}</strong></p>
                  </div>
                </div>
              ) : (
                <div className="clay-inset p-3.5 rounded-2xl flex items-center gap-3 text-slate-400">
                  <Award className="w-5 h-5 opacity-40 shrink-0" />
                  <span className="text-xs font-semibold">Not enrolled in Weekly Presenter Queue</span>
                </div>
              )}

              {/* Card 3: Other Responses */}
              {data?.otherResponses && data.otherResponses.length > 0 ? (
                <div className="clay-inset p-3.5 rounded-2xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[8px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded">Form Submission</span>
                    <h5 className="text-xs font-black text-[#0F2547] truncate mt-0.5">{data.otherResponses[0].form?.title || "Active Intake"}</h5>
                    <p className="text-[9px] font-semibold text-emerald-600">Encrypted in Vault</p>
                  </div>
                </div>
              ) : (
                <div className="clay-inset p-3.5 rounded-2xl flex items-center gap-3 text-slate-400">
                  <FileText className="w-5 h-5 opacity-40 shrink-0" />
                  <span className="text-xs font-semibold">No recent event submissions</span>
                </div>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 4: EXPEDITION CYBERSECURITY ROADMAP             */}
          {/* (Deep Visual Pathway with Framer Motion Interactions)    */}
          {/* ======================================================== */}
          <div className="clay-card p-6 sm:p-8 space-y-6 border border-white shadow-md relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-blue-200/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-[#0F2547]">Cybersecurity Engineering Pathway</h2>
                    <span className="clay-badge-amber text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                      6 Core Phases
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Click on any phase card to inspect learning modules, tools, and hands-on CTF milestones.</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[10px] font-extrabold text-slate-500 self-start sm:self-center">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Completed</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Active Focus</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> Locked</span>
              </div>
            </div>

            {/* Responsive Interactive Roadmap Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
              {cyberRoadmap.map((step, idx) => {
                const Icon = step.icon;
                const isCompleted = step.status === "completed";
                const isCurrent = step.status === "current";
                const isLocked = step.status === "locked";

                return (
                  <motion.div
                    key={idx}
                    whileHover={{ y: -4, scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => {
                      setSelectedRoadmapStep(step);
                      setRoadmapDetailTab("CURRICULUM");
                      setCurrentView("ROADMAP_DETAIL");
                    }}
                    className={`clay-card p-5 cursor-pointer relative overflow-hidden transition-all border ${
                      isCurrent 
                        ? "border-blue-400 bg-gradient-to-br from-blue-50/50 to-white shadow-lg ring-2 ring-blue-500/20" 
                        : isCompleted
                        ? "border-emerald-200 bg-gradient-to-br from-emerald-50/20 to-white"
                        : "border-slate-200/80 bg-white/70 hover:border-blue-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                        isCurrent 
                          ? "bg-blue-600 text-white shadow-blue-500/30" 
                          : isCompleted
                          ? "bg-emerald-500 text-white shadow-emerald-500/30"
                          : "bg-slate-100 text-slate-500 border border-slate-200"
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="text-right">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          isCurrent 
                            ? "bg-blue-100 text-blue-800 border border-blue-200 animate-pulse" 
                            : isCompleted
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}>
                          {isCurrent ? "IN PROGRESS" : isCompleted ? "COMPLETED" : "LOCKED"}
                        </span>
                        <span className="block text-[9px] font-bold text-slate-400 mt-1">{step.duration}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest block">Phase 0{step.step}</span>
                      <h4 className="text-sm font-black text-[#0F2547] leading-tight line-clamp-1">{step.title}</h4>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-2">{step.desc}</p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-extrabold">
                      <span className="text-slate-400">{step.topics.length} Modules • {step.level}</span>
                      <span className="text-blue-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        Explore <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 2: DEEP ROADMAP CURRICULUM ANALYSIS (SPA VIEW)       */}
      {/* ========================================================= */}
      {currentView === "ROADMAP_DETAIL" && selectedRoadmapStep && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ type: "spring", stiffness: 200, damping: 20 }} 
          className="clay-card p-6 sm:p-10 space-y-8 border border-white shadow-xl"
        >
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-6 border-b border-blue-200/50">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg text-white ${
                selectedRoadmapStep.status === 'completed' 
                  ? 'bg-emerald-500 shadow-emerald-500/30' 
                  : selectedRoadmapStep.status === 'current' 
                  ? 'bg-blue-600 shadow-blue-500/40 ring-4 ring-blue-100' 
                  : 'bg-slate-700'
              }`}>
                <selectedRoadmapStep.icon className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="clay-badge-blue text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase">
                    Phase 0{selectedRoadmapStep.step} Track
                  </span>
                  <span className="text-[10px] font-extrabold text-slate-500 bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
                    {selectedRoadmapStep.duration}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-[#0F2547] mt-1">{selectedRoadmapStep.title}</h2>
              </div>
            </div>

            <button 
              onClick={() => setCurrentView("DASHBOARD")} 
              className="clay-btn px-4 py-2.5 text-xs font-black text-slate-700 flex items-center gap-1.5 self-start md:self-center hover:text-blue-600 shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
          </div>

          {/* Sub-Navigation Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: "CURRICULUM", label: "Core Curriculum", icon: BookOpen },
              { id: "TOOLS", label: "Arsenal & Tools", icon: Cpu },
              { id: "MILESTONE", label: "Hands-on Milestone", icon: Target },
              { id: "CERT", label: "Industry Credentials", icon: Award }
            ].map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setRoadmapDetailTab(tab.id as any)}
                  className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 ${
                    roadmapDetailTab === tab.id
                      ? "clay-btn-primary shadow-md"
                      : "clay-btn text-slate-600 hover:text-blue-600"
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab 1: Core Curriculum */}
          {roadmapDetailTab === "CURRICULUM" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-5 space-y-4">
                <div className="clay-inset p-5 rounded-3xl space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-blue-700 flex items-center gap-2">
                    <Info className="w-4 h-4" /> Phase Mission
                  </h4>
                  <p className="text-xs text-slate-600 font-semibold leading-relaxed">{selectedRoadmapStep.desc}</p>
                </div>

                <div className="clay-card p-5 rounded-3xl space-y-2 border border-white">
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-700 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Core Mastery
                  </h4>
                  <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                    Completing this track certifies your capability to analyze and audit critical network vectors, system privilege escalation paths, and web authentication models.
                  </p>
                </div>
              </div>

              <div className="lg:col-span-7 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Modules to Master:</h4>
                {selectedRoadmapStep.topics?.map((topic: string, idx: number) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className="clay-card p-4 rounded-2xl border border-white flex items-center gap-3.5 hover:border-blue-200 transition-all"
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 font-black text-xs flex items-center justify-center shrink-0 border border-blue-100">
                      0{idx + 1}
                    </div>
                    <span className="text-xs font-black text-[#0F2547]">{topic}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 2: Arsenal & Tools */}
          {roadmapDetailTab === "TOOLS" && (
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Essential Exploitation &amp; Defense Arsenal:</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {selectedRoadmapStep.tools?.map((tool: string, idx: number) => (
                  <div key={idx} className="clay-card p-5 rounded-3xl text-center space-y-2 border border-white hover:-translate-y-1 transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
                      <Terminal className="w-6 h-6" />
                    </div>
                    <h5 className="text-xs font-black text-[#0F2547]">{tool}</h5>
                    <span className="text-[9px] font-extrabold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-full inline-block">Production Tool</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Hands-on Milestone */}
          {roadmapDetailTab === "MILESTONE" && (
            <div className="clay-inset p-8 rounded-3xl space-y-4 text-center max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-inner">
                <Target className="w-8 h-8" />
              </div>
              <span className="clay-badge-amber text-[10px] font-black px-3 py-1 rounded-full uppercase">Practical Lab Milestone</span>
              <h3 className="text-xl font-black text-[#0F2547]">{selectedRoadmapStep.milestone}</h3>
              <p className="text-xs text-slate-500 font-semibold max-w-md mx-auto">
                Execute this hands-on lab in the club cyber sandbox or Hack The Box academy to earn verified skill credentials.
              </p>
            </div>
          )}

          {/* Tab 4: Industry Credentials */}
          {roadmapDetailTab === "CERT" && (
            <div className="clay-card p-8 rounded-3xl border border-white text-center space-y-4 max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto shadow-inner">
                <Award className="w-8 h-8" />
              </div>
              <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-100 px-3 py-1 rounded-full border border-purple-200">
                Industry Certification Alignment
              </span>
              <h3 className="text-xl font-black text-[#0F2547]">{selectedRoadmapStep.cert}</h3>
              <p className="text-xs text-slate-500 font-semibold max-w-md mx-auto">
                The concepts covered in this phase directly map to the official syllabus and practical exam domains of this credential.
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* ========================================================= */}
      {/* VIEW 3: APPLICATION STATUS & GAMIFIED QUEUE TRACKER       */}
      {/* ========================================================= */}
      {currentView === "STATUS" && selectedForm && (
        <div className="max-w-5xl mx-auto animate-in slide-in-from-right-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8">
            
            {/* LEFT: INSTRUCTIONS & JOURNEY TIPS */}
            <div className="md:col-span-5 space-y-5 order-2 md:order-1">
              <div className="clay-card p-6 space-y-4 h-full border border-white">
                <h3 className="font-black text-[#0F2547] text-sm uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Lightbulb className="w-4 h-4 text-amber-500" /> Student Journey Guidelines
                </h3>
                
                {selectedForm.isMaster && (!data?.mainApp || data.mainApp.status === "WAITING") && (
                  <div className="space-y-3.5 text-xs">
                    <p className="text-slate-600 leading-relaxed font-semibold">
                      Your application is queued in the <strong>candidate shortlisting pipeline</strong>. Candidates are processed on a strict FIFO merit basis.
                    </p>
                    <div className="clay-inset p-3.5 rounded-2xl">
                      <p className="text-blue-800 font-bold leading-relaxed text-[11px]">
                        Weekly slots are released every cycle. Please be patient while admins review your topic portfolio.
                      </p>
                    </div>
                    <div className="clay-inset p-3.5 rounded-2xl space-y-1">
                      <h4 className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
                        <BellRing className="w-3.5 h-3.5 text-amber-500"/> Nudge Dispatch Control
                      </h4>
                      <p className="text-[10px] text-slate-500 font-medium">
                        You can send an admin notification once every 3 days to bring attention to your pending review.
                      </p>
                    </div>
                  </div>
                )}

                {selectedForm.isMaster && (data?.mainApp?.status === "SHORTLISTED" || data?.mainApp?.status === "SCREENING_DONE") && (
                  <div className="space-y-3 text-xs">
                    <p className="text-slate-600 font-semibold leading-relaxed">
                      Congratulations! You have cleared the initial queue. Next steps:
                    </p>
                    <ul className="text-[11px] text-slate-600 space-y-2 font-medium">
                      <li className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0"/> Prepare clean, structured slides on your chosen topic.</li>
                      <li className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0"/> Practice your presentation delivery and timing.</li>
                      <li className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0"/> Arrive at the media studio on your allocated schedule.</li>
                    </ul>
                  </div>
                )}

                {!selectedForm.isMaster && (
                  <div className="space-y-3 text-xs">
                    <p className="text-slate-600 font-semibold leading-relaxed">
                      Your response has been verified and securely vaulted in the database.
                    </p>
                    <div className="clay-inset p-3.5 rounded-2xl">
                      <p className="text-blue-800 font-bold leading-relaxed text-[11px]">
                        Event updates and links will be communicated via your registered institutional email address.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: ANIMATED STATUS MAP */}
            <div className="md:col-span-7 space-y-6 order-1 md:order-2">
              <div className="clay-card p-6 sm:p-8 text-center border border-white relative overflow-hidden">
                <div className="relative z-10 space-y-6">
                  <div>
                    <span className="clay-badge-blue text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                      {selectedForm.isMaster ? "Live Queue Status" : "Submission Encrypted"}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-[#0F2547] mt-3">{selectedForm.title}</h2>
                  </div>

                  {selectedForm.isMaster ? (
                    <>
                      {/* Gamified Progress Bar */}
                      <div className="relative max-w-md mx-auto pt-4 pb-6">
                        <div className="absolute top-1/2 left-0 w-full h-1.5 bg-slate-100 -translate-y-1/2 rounded-full z-0">
                          <div className={`h-full rounded-full transition-all duration-1000 ease-in-out ${
                            data?.mainApp?.status === "WAITING" ? 'bg-amber-400 w-1/2' : 'bg-emerald-500 w-full'
                          }`}></div>
                        </div>
                        
                        <div className="flex justify-between relative z-10">
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg"><CheckCircle className="w-5 h-5"/></div>
                            <span className="text-[10px] font-black text-slate-700 uppercase">Submitted</span>
                          </div>
                          
                          <div className="flex flex-col items-center gap-1.5">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
                              data?.mainApp?.status === "WAITING" ? 'bg-amber-400 text-white scale-105 animate-pulse' : 'bg-emerald-500 text-white'
                            }`}>
                              {data?.mainApp?.status === "WAITING" ? <Clock className="w-6 h-6"/> : <CheckCircle className="w-6 h-6"/>}
                            </div>
                            <span className={`text-[10px] font-black uppercase ${data?.mainApp?.status === "WAITING" ? 'text-amber-600' : 'text-slate-700'}`}>Review</span>
                          </div>

                          <div className="flex flex-col items-center gap-1.5">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                              data?.mainApp?.status === "WAITING" ? 'bg-slate-100 text-slate-300' : 'bg-emerald-500 text-white shadow-lg'
                            }`}>
                              <Award className="w-5 h-5"/>
                            </div>
                            <span className={`text-[10px] font-black uppercase ${data?.mainApp?.status === "WAITING" ? 'text-slate-400' : 'text-emerald-600'}`}>Shortlisted</span>
                          </div>
                        </div>
                      </div>

                      {data?.mainApp?.status === "WAITING" ? (
                        <div className="clay-inset p-4 rounded-2xl text-xs font-bold text-amber-800">
                          Your submission is waiting in the active review pool.
                        </div>
                      ) : (
                        <div className="clay-inset p-4 rounded-2xl text-xs font-bold text-emerald-800">
                          Congratulations! Your topic has been selected for this week's broadcast slot.
                        </div>
                      )}

                      {/* Nudge Button */}
                      {data?.mainApp?.status === "WAITING" && (
                        <div className="pt-4 border-t border-slate-100">
                          <button 
                            onClick={handleNudge}
                            disabled={data.mainApp.hasNudged || loading === "nudge"}
                            className={`w-full py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                              data.mainApp.hasNudged 
                                ? "bg-amber-100 text-amber-700 border-2 border-amber-300 opacity-80 cursor-not-allowed shadow-inner" 
                                : "clay-btn-primary shadow-lg hover:shadow-xl active:scale-95"
                            }`}
                          >
                            <BellRing className={`w-4 h-4 ${!data.mainApp.hasNudged && "animate-bounce"}`} />
                            <span>
                              {data.mainApp.hasNudged 
                                ? "Admin Notified (Awaiting Review)" 
                                : "Nudge Admins (Priority Alert)"}
                            </span>
                          </button>
                          {data.mainApp.hasNudged && (
                             <p className="text-[9px] font-bold text-slate-400 mt-2 text-center">
                               We have acknowledged your nudge. You will be placed in an upcoming queue soon.
                             </p>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="clay-inset p-8 rounded-3xl space-y-3">
                      <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                      <h4 className="text-base font-black text-[#0F2547]">Response Encrypted in Data Vault</h4>
                      <p className="text-xs text-slate-500 font-semibold max-w-sm mx-auto">
                        Your event registration has been registered. No further action is required from your side.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 4: OFFICIAL PROGRAM INSTRUCTIONS MODAL/PAGE          */}
      {/* ========================================================= */}
      {currentView === "INSTRUCTIONS" && selectedForm && (
        <div className="max-w-4xl mx-auto animate-in slide-in-from-right-4 duration-300">
          {(() => {
            const { theme, blocks } = getInstructionData();
            const currentTheme = theme || "classic";
            
            return (
              <div className={`p-8 sm:p-10 transition-all duration-500 space-y-6 relative overflow-hidden
                 ${currentTheme === 'classic' ? 'bg-white rounded-[32px] border border-slate-200 shadow-xl' : ''}
                 ${currentTheme === 'cyber' ? 'bg-[#0a0f1a] rounded-none border border-emerald-900/50 shadow-[0_0_30px_rgba(16,185,129,0.05)] font-mono text-emerald-50' : ''}
                 ${currentTheme === 'clay' ? 'bg-[#eef2f6] rounded-[40px] shadow-[12px_12px_24px_#d1d9e2,-12px_-12px_24px_#ffffff] border-[3px] border-white/60' : ''}
               `}>
                <div className="relative z-10 space-y-6">
                  <div className={`text-center mb-8 pb-8 ${currentTheme === 'cyber' ? 'border-b border-emerald-900/50' : currentTheme === 'clay' ? 'border-b-2 border-white' : 'border-b border-slate-100'}`}>
                    <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 ${currentTheme === 'cyber' ? 'bg-emerald-900/30 text-emerald-500 border border-emerald-500/30' : currentTheme === 'clay' ? 'bg-[#eef2f6] shadow-[4px_4px_8px_#d1d9e2,-4px_-4px_8px_#ffffff] text-blue-600' : 'bg-blue-50 text-blue-600 shadow-inner border border-blue-100'}`}>
                      <FileText className="w-8 h-8" />
                    </div>
                    <h2 className={`text-2xl sm:text-3xl font-extrabold ${currentTheme === 'cyber' ? 'text-emerald-400' : currentTheme === 'clay' ? 'text-blue-900' : 'text-[#0F2547]'}`}>Official Program Guidelines</h2>
                    <p className={`text-xs font-semibold mt-2 ${currentTheme === 'cyber' ? 'text-emerald-600' : 'text-slate-500'}`}>Please read these instructions before proceeding to the application form.</p>
                  </div>

                  {blocks.length === 0 ? (
                    <div className={`text-center py-8 text-xs font-bold ${currentTheme === 'cyber' ? 'text-emerald-800' : 'text-slate-400'}`}>No instructions specified for this form.</div>
                  ) : (
                    <div className="space-y-6">
                      {blocks.map((block: any, idx: number) => {
                        if (block.type === 'h3') return <h3 key={idx} className={`text-xl sm:text-2xl font-extrabold pb-3 ${currentTheme === 'cyber' ? 'text-emerald-400 border-b border-emerald-900/50 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : currentTheme === 'clay' ? 'text-blue-900 border-b-2 border-white' : 'text-[#0F2547] border-b border-slate-100'}`} dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(block.content)}} />;
                        if (block.type === 'p') return <p key={idx} className={`text-sm leading-relaxed ${currentTheme === 'cyber' ? 'text-emerald-200/80 font-medium' : currentTheme === 'clay' ? 'text-slate-500 font-bold' : 'text-slate-600 font-medium'}`} dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(block.content)}} />;
                        if (block.type === 'bullet') return (
                          <div key={idx} className="flex gap-3 items-start pl-1 mt-1">
                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${currentTheme === 'cyber' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : currentTheme === 'clay' ? 'bg-blue-400 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.2)]' : 'bg-blue-500'}`}></div>
                            <p className={`text-sm leading-relaxed ${currentTheme === 'cyber' ? 'text-emerald-200/80 font-medium' : currentTheme === 'clay' ? 'text-slate-500 font-bold' : 'text-slate-700 font-medium'}`} dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(block.content)}} />
                          </div>
                        );
                        if (block.type === 'number') {
                          const numIndex = blocks.slice(0, idx).filter((b: any) => b.type === 'number').length + 1;
                          return (
                            <div key={idx} className="flex gap-3 items-start mt-1">
                              <div className={`w-7 h-7 flex items-center justify-center shrink-0 font-black text-xs
                                ${currentTheme === 'classic' ? 'rounded-lg bg-blue-50 text-blue-700 border border-blue-100 shadow-sm' : ''}
                                ${currentTheme === 'cyber' ? 'rounded bg-emerald-950/50 text-emerald-400 border border-emerald-800' : ''}
                                ${currentTheme === 'clay' ? 'rounded-xl bg-[#eef2f6] text-blue-600 shadow-[4px_4px_8px_#d1d9e2,-4px_-4px_8px_#ffffff] border border-white/50' : ''}
                              `}>{numIndex}</div>
                              <p className={`text-sm leading-relaxed mt-1 ${currentTheme === 'cyber' ? 'text-emerald-200/80 font-medium' : currentTheme === 'clay' ? 'text-slate-500 font-bold' : 'text-slate-700 font-medium'}`} dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(block.content)}} />
                            </div>
                          );
                        }
                        if (block.type === 'alert') return (
                          <div key={idx} className={`p-5 flex gap-3 mt-4 
                            ${currentTheme === 'classic' ? 'bg-amber-50 rounded-xl border border-amber-100' : ''}
                            ${currentTheme === 'cyber' ? 'bg-red-950/20 rounded-none border-l-2 border-red-500/50' : ''}
                            ${currentTheme === 'clay' ? 'bg-[#eef2f6] shadow-[inset_6px_6px_12px_#d1d9e2,inset_-6px_-6px_12px_#ffffff] rounded-2xl border border-white/40' : ''}
                          `}>
                            <AlertTriangle className={`w-5 h-5 shrink-0 ${currentTheme === 'cyber' ? 'text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]' : currentTheme === 'clay' ? 'text-amber-600' : 'text-amber-500'}`}/>
                            <p className={`text-[11px] sm:text-xs font-bold leading-relaxed ${currentTheme === 'cyber' ? 'text-red-300/80' : currentTheme === 'clay' ? 'text-amber-900' : 'text-amber-800'}`} dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(block.content)}} />
                          </div>
                        );
                        return null;
                      })}
                    </div>
                  )}

                  <div className={`pt-8 mt-8 flex justify-end ${currentTheme === 'cyber' ? 'border-t border-emerald-900/50' : currentTheme === 'clay' ? 'border-t-2 border-white' : 'border-t border-slate-200'}`}>
                    <button 
                      onClick={() => setCurrentView("FORM")}
                      className={`px-8 py-3.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 ${
                        currentTheme === 'cyber' ? 'bg-emerald-500 text-slate-900 shadow-[0_0_15px_#10b981] hover:bg-emerald-400' : 
                        currentTheme === 'clay' ? 'bg-[#eef2f6] text-blue-700 shadow-[6px_6px_12px_#d1d9e2,-6px_-6px_12px_#ffffff] border border-white hover:text-blue-800' : 
                        'clay-btn-primary shadow-lg'
                      }`}
                    >
                      <span>Acknowledge &amp; Proceed to Form</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 5: ACTUAL APPLICATION FORM VIEW                      */}
      {/* ========================================================= */}
      {currentView === "FORM" && selectedForm && (
        <div className="max-w-3xl mx-auto clay-card p-6 sm:p-10 space-y-6 border border-white shadow-xl animate-in slide-in-from-right-4 duration-300">
          <div className="border-b border-blue-200/50 pb-5">
            <h2 className="text-2xl font-black text-[#0F2547]">{selectedForm.title}</h2>
            <p className="text-xs text-slate-500 font-semibold mt-1 leading-relaxed">{selectedForm.description}</p>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-6">
            {selectedForm.questions?.map((field: any) => {
              if (!field?.id) return null;
              return (
                <div key={field.id} className="space-y-2">
                  <label className="block text-xs font-black text-[#0F2547] uppercase tracking-wider">
                    {field.fieldLabel} {field.isRequired && <span className="text-red-500">*</span>}
                  </label>
                  
                  {field.fieldType === "TEXT" && (
                    <input 
                      type="text" 
                      name={field.fieldLabel} 
                      required={field.isRequired} 
                      maxLength={field.maxLength || undefined} 
                      className="clay-input w-full px-4 py-3 text-xs font-bold" 
                      placeholder={field.placeholder || "Type your response..."} 
                    />
                  )}

                  {field.fieldType === "NUMBER" && (
                    <input 
                      type="number" 
                      name={field.fieldLabel} 
                      required={field.isRequired} 
                      onInput={(e: React.FormEvent<HTMLInputElement>) => {
                        const target = e.currentTarget;
                        if (field.maxLength && target.value.length > field.maxLength) {
                          target.value = target.value.slice(0, field.maxLength);
                        }
                      }} 
                      className="clay-input w-full px-4 py-3 text-xs font-bold" 
                      placeholder={field.placeholder || "Enter number..."} 
                    />
                  )}

                  {field.fieldType === "DROPDOWN" && (
                    <div className="relative">
                      <select 
                        name={field.fieldLabel} 
                        required={field.isRequired} 
                        className="clay-input w-full px-4 py-3 text-xs font-bold bg-white appearance-none cursor-pointer"
                      >
                        <option value="">Select option...</option>
                        {field.options?.map((opt: string, i: number) => <option key={i} value={opt}>{opt}</option>)}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>
                  )}

                  {field.fieldType === "CHECKBOX" && (
                    <div className="space-y-2 clay-inset p-4 rounded-2xl">
                      {field.options?.map((opt: string, i: number) => (
                        <label key={i} className="flex items-center gap-2.5 cursor-pointer">
                          <input 
                            type={field.isMultiSelect ? "checkbox" : "radio"} 
                            name={field.isMultiSelect ? `${field.fieldLabel}[]` : field.fieldLabel} 
                            value={opt} 
                            className="w-4 h-4 text-blue-600 rounded cursor-pointer" 
                          />
                          <span className="text-xs font-bold text-slate-700">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {field.fieldType === "FILE_UPLOAD" && (
                    <div className="clay-inset p-5 rounded-2xl border-2 border-dashed border-blue-200 text-center relative overflow-hidden">
                      <input 
                        type="file" 
                        name={field.fieldLabel} 
                        required={field.isRequired} 
                        accept={field.options?.join(',')} 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setSelectedFiles(prev => ({ ...prev, [field.fieldLabel]: e.target.files![0].name }));
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                      />
                      {selectedFiles[field.fieldLabel] ? (
                        <div className="space-y-1">
                          <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto" />
                          <p className="text-xs font-black text-emerald-700 truncate">{selectedFiles[field.fieldLabel]}</p>
                          <span className="text-[9px] font-bold text-emerald-600 uppercase">Ready for transmission</span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Upload className="w-7 h-7 text-blue-500 mx-auto" />
                          <p className="text-xs font-black text-blue-700">Click or Drag file to attach</p>
                          <p className="text-[9px] font-bold text-slate-400">Max size: {field.maxLength || 5}MB</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Strict Declaration Checkbox */}
            {selectedForm.hasDeclaration && (
              <div className="clay-card p-4 rounded-2xl bg-amber-50/50 border border-amber-200 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input 
                    type="checkbox" 
                    required
                    checked={declarationAccepted}
                    onChange={(e) => setDeclarationAccepted(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded cursor-pointer mt-0.5" 
                  />
                  <span className="text-xs font-semibold text-slate-700 leading-relaxed">
                    <strong className="text-amber-900 font-black block mb-0.5">Strict Official Declaration:</strong> 
                    {selectedForm.declarationText || "I confirm that all provided details and media submissions are authentic."}
                  </span>
                </label>
              </div>
            )}

            <div className="pt-4 border-t border-blue-200/50">
              <button 
                type="submit" 
                disabled={formLoading || (selectedForm.hasDeclaration && !declarationAccepted)} 
                className="clay-btn-primary w-full py-4 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {formLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Application Form"} 
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 6: ATTENDANCE SCANNER & PIN VERIFICATION TERMINAL     */}
      {/* ========================================================= */}
      {currentView === "ATTENDANCE" && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="max-w-2xl mx-auto clay-card p-6 sm:p-10 space-y-6 border border-white shadow-xl"
        >
          <div className="flex items-center justify-between pb-5 border-b border-blue-200/50">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg">
                <ScanLine className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">Secure Check-in</span>
                <h2 className="text-xl font-black text-[#0F2547] mt-0.5">Mark Event Attendance</h2>
              </div>
            </div>

            <button 
              onClick={() => setCurrentView("DASHBOARD")} 
              className="clay-btn px-4 py-2 text-xs font-black text-slate-700 hover:text-blue-600 shadow-sm"
            >
              Cancel
            </button>
          </div>

          {!activeSession ? (
            <div className="clay-inset p-10 text-center rounded-3xl space-y-2">
              <ScanLine className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-base font-black text-[#0F2547]">No Live Attendance Session Active</h4>
              <p className="text-xs text-slate-500 font-semibold max-w-sm mx-auto">
                Coordination team has not opened an active attendance terminal right now. Please wait for the announcement.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <span className="clay-badge-blue text-[9px] font-black px-3 py-1 rounded-full uppercase">BROADCASTING LIVE</span>
                <h3 className="text-lg font-black text-[#0F2547] mt-1">{activeSession.title}</h3>
              </div>

              {activeSession.mode === "QR" ? (
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="w-full max-w-[280px] aspect-square rounded-3xl bg-slate-900 border-4 border-slate-800 flex items-center justify-center overflow-hidden shadow-inner">
                    {isScanning ? (
                      <div id="qr-reader" className="w-full h-full [&>video]:object-cover [&>video]:w-full [&>video]:h-full" />
                    ) : (
                      <div className="text-center space-y-2 p-6">
                        <QrCode className="w-12 h-12 text-slate-400 mx-auto" />
                        <p className="text-xs font-bold text-slate-400">Camera Inactive</p>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => setIsScanning(!isScanning)} 
                    className="clay-btn-primary w-full py-3.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{isScanning ? "Stop Camera Scanner" : "Activate Camera Scanner"}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4 max-w-sm mx-auto text-center">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center mx-auto shadow-inner">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-black text-[#0F2547]">Enter 6-Char Session Code</h4>
                  <input 
                    type="text" 
                    value={attendanceCode}
                    onChange={(e) => setAttendanceCode(e.target.value.toUpperCase())}
                    placeholder="e.g. CYBER6" 
                    className="clay-input w-full px-4 py-3 text-center text-lg font-black tracking-widest uppercase text-purple-900"
                  />
                  <button 
                    onClick={() => handleMarkAttendance()}
                    disabled={loading === "attendance" || !attendanceCode.trim()} 
                    className="clay-btn-primary w-full py-3.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    {loading === "attendance" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Mark Present"}
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* ========================================================= */}
      {/* VIEW 7: FULL ACTIVITY TIMELINE LOG (SPA VIEW)             */}
      {/* ========================================================= */}
      {currentView === "ACTIVITY_LOG" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto clay-card p-6 sm:p-10 space-y-6 border border-white shadow-xl">
          <div className="flex items-center justify-between pb-5 border-b border-blue-200/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                <HistoryIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-[#0F2547]">Verified Student Activity History</h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Complete record of your club presence and applications.</p>
              </div>
            </div>

            <button 
              onClick={() => setCurrentView("DASHBOARD")} 
              className="clay-btn px-4 py-2 text-xs font-black text-slate-700 hover:text-blue-600 shadow-sm"
            >
              Back
            </button>
          </div>

          <div className="space-y-3">
            {attendances.map((att, idx) => (
              <div key={idx} className="clay-card p-4 rounded-2xl border border-white flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <ScanLine className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-purple-700 uppercase bg-purple-50 px-2 py-0.5 rounded">Attendance Log</span>
                    <h5 className="text-xs font-black text-[#0F2547] mt-0.5">{att.eventName}</h5>
                    <p className="text-[10px] text-slate-400 font-semibold">{new Date(att.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Verified
                </span>
              </div>
            ))}

            {data?.mainApp && (
              <div className="clay-card p-4 rounded-2xl border border-white flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-amber-800 uppercase bg-amber-50 px-2 py-0.5 rounded">Core Presenter Submission</span>
                    <h5 className="text-xs font-black text-[#0F2547] mt-0.5">{data.mainApp.topicInterested}</h5>
                    <p className="text-[10px] text-slate-400 font-semibold">{new Date(data.mainApp.appliedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                  {data.mainApp.status}
                </span>
              </div>
            )}

            {data?.otherResponses?.map((res: any, idx: number) => (
              <div key={idx} className="clay-card p-4 rounded-2xl border border-white flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-blue-700 uppercase bg-blue-50 px-2 py-0.5 rounded">Event Intake</span>
                    <h5 className="text-xs font-black text-[#0F2547] mt-0.5">{res.form?.title || "Intake Form"}</h5>
                    <p className="text-[10px] text-slate-400 font-semibold">{new Date(res.submittedAt || Date.now()).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Recorded in Vault
                </span>
              </div>
            ))}

            {!data?.mainApp && (!data?.otherResponses || data?.otherResponses.length === 0) && attendances.length === 0 && (
              <div className="clay-inset p-8 text-center text-xs font-bold text-slate-400 rounded-2xl">
                No verified records found yet.
              </div>
            )}
          </div>
        </motion.div>
      )}

    </div>
  );
}
