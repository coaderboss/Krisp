"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  getOrCreateCurrentSlot, 
  runAutoQueue, 
  toggleStudentSelection, 
  updateApplicationStatus, 
  fetchAllApplications, 
  getGlobalMedia, 
  getClubEvents, 
  checkAttendanceClearance,
  sendInvitesToShortlisted,
  sendMassEmails,
  sendDirectEmail
} from "@/actions/admin";
import { submitReviewRequest } from "@/actions/requests";
import { 
  Video, 
  Send, 
  Settings, 
  Zap, 
  ShieldAlert, 
  CheckCircle2,
  Clock, 
  UserPlus, 
  UserMinus, 
  Search, 
  Lock, 
  MonitorPlay, 
  LayoutTemplate, 
  Calendar as CalendarIcon, 
  FileText, 
  Database, 
  MapPin, 
  EyeOff, 
  ChevronLeft, 
  ChevronRight, 
  Activity, 
  Shield, 
  ScanLine, 
  KeySquare, 
  Loader2,
  Users,
  Sparkles,
  ExternalLink,
  RefreshCw,
  SlidersHorizontal,
  Mail,
  Copy,
  Check,
  ChevronDown,
  X,
  Flame,
  Radio,
  PlusCircle,
  Trash2,
  UserCheck,
  AtSign
} from "lucide-react";
import SettingsTab from "@/components/admin/SettingsTab";
import AttendancePortal from "@/components/admin/AttendancePortal";
import { motion, AnimatePresence } from "framer-motion";

export default function ExecutiveDashboard() {
  const [activeTab, setActiveTab] = useState<"WORKFLOW" | "COMMUNICATION" | "SETTINGS">("WORKFLOW");
  const [commSubTab, setCommSubTab] = useState<"SCREENING" | "MASS" | "DIRECT">("SCREENING");
  
  const [loading, setLoading] = useState<string>("init");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // --- OVERVIEW / COMMAND CENTER STATES ---
  const [metrics, setMetrics] = useState({ 
    activeForms: 0, 
    totalSubmissions: 0, 
    todayEvents: 0,
    totalUsers: 0 
  });
  const [events, setEvents] = useState<any[]>([]);
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  
  // --- ATTENDANCE SECURITY STATES ---
  const [attendanceAccess, setAttendanceAccess] = useState<"LOCKED" | "PENDING" | "GRANTED">("LOCKED");
  const [isAttendancePortalOpen, setIsAttendancePortalOpen] = useState(false);

  // --- DATA STATES ---
  const [slot, setSlot] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [pendingWorkflowCount, setPendingWorkflowCount] = useState(0);

  // --- COMMUNICATION 1: SCREENING TEMPLATE STATES ---
  const defaultScreeningText = `Hello {{name}},

Congratulations! You have been shortlisted for our upcoming Weekly Cybersecurity Video Bulletin.

Approved Topic: {{topic}}
Screening Schedule: Friday, 4:00 PM IST (UIET Media Cell)

Please prepare 3-4 presentation slides covering the core technical concepts of your topic.

Best regards,
Cybersecurity Club • UIET CSJM University`;

  const [screeningTemplate, setScreeningTemplate] = useState(defaultScreeningText);
  const [emailSubject, setEmailSubject] = useState("Update on your Cyber Bulletin Presenter Application");
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [templateSaved, setTemplateSaved] = useState(false);

  // --- COMMUNICATION 2: MASS BROADCAST STATES ---
  const [massRecipients, setMassRecipients] = useState<{ name: string; email: string }[]>([
    { name: "", email: "" }
  ]);
  const [massSubject, setMassSubject] = useState("Official Club Bulletin & Technical Briefing");
  const [massTemplate, setMassTemplate] = useState(`Hello {{name}},

This is an official announcement from the Cybersecurity Club, UIET CSJMU.

Please stay tuned for upcoming technical workshops, presenter auditions, and bulletin broadcasts.

Best regards,
Executive Editorial Board • CyberKrisp`);

  // --- COMMUNICATION 3: DIRECT MAIL STATES ---
  const [directEmail, setDirectEmail] = useState("");
  const [directName, setDirectName] = useState("");
  const [directSubject, setDirectSubject] = useState("Direct Message from Cybersecurity Club Executive");
  const [directBody, setDirectBody] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [groupField, setGroupField] = useState<string | null>(null);

  // --- MEDIA BROADCASTING STATES ---
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [mediaTitle, setMediaTitle] = useState("Featured Cyber Bulletin Episode");
  const [mediaLimit, setMediaLimit] = useState(1);
  const [mediaUrls, setMediaUrls] = useState<any[]>([]);

  const selectedStudents = slot?.selectedTrainees || [];

  function notify(text: string, type: "success" | "error" = "success") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  }

  // Check clearance state for Attendance Gateway
  async function fetchClearance() {
    try {
      const clearanceRes = await checkAttendanceClearance();
      if (clearanceRes.status === "APPROVED") setAttendanceAccess("GRANTED");
      else if (clearanceRes.status === "PENDING") setAttendanceAccess("PENDING");
      else setAttendanceAccess("LOCKED");
    } catch {
      setAttendanceAccess("LOCKED");
    }
  }

  async function loadDashboardData() {
    try {
      await fetchClearance();

      // Removed direct call to admin-restricted getOverviewMetrics.
      // Set default zeroes, or replace with an authorized Executive endpoint if created later.
      setMetrics({
          activeForms: 0,
          totalSubmissions: 0,
          todayEvents: 0,
          totalUsers: 0
      });
      
      const eRes = await getClubEvents();
      if (eRes.success) setEvents(eRes.data || []);

      const slotData = await getOrCreateCurrentSlot();
      setSlot(slotData);
      
      const appsRes = await fetchAllApplications();
      if (appsRes.success && appsRes.data) {
        const realData = appsRes.data
          .filter((app: any) => app.weeklySlotId !== undefined && app.status !== "RECORDED")
          .map((app: any) => ({
            id: app.id,
            name: app.user?.name || app.name || "Unknown User",
            email: app.user?.email || app.email || "No Email",
            topicInterested: app.topicInterested || app.topic || "Not Specified",
            status: app.status || "WAITING",
            appliedAt: app.appliedAt || app.date || new Date().toISOString(),
            weeklySlotId: app.weeklySlotId || null,
            user: app.user || { name: app.name || "Unknown User", email: app.email || "No Email" },
            dynamicData: app.dynamicData || "{}", 
            description: app.description || "",
            highlightedData: app.highlightedData || null
        }));
        setApplications(realData);
        setPendingWorkflowCount(realData.filter((a: any) => a.status === "WAITING").length);
      }

      const savedTemplate = localStorage.getItem("savedScreeningTemplate");
      if (savedTemplate) setScreeningTemplate(savedTemplate);

      const mediaRes = await getGlobalMedia();
      if (mediaRes.success && mediaRes.data) {
        setMediaTitle(mediaRes.data.title || "Featured Cyber Bulletin Episode");
        setMediaLimit(mediaRes.data.limit || 1);
        try { 
          const parsed = typeof mediaRes.data.urls === "string" ? JSON.parse(mediaRes.data.urls) : mediaRes.data.urls;
          setMediaUrls(Array.isArray(parsed) ? parsed : []); 
        } catch(e) {
          setMediaUrls([]);
        }
      }
    } catch (error) {
      notify("Failed to load dashboard data. Retrying...", "error");
    } finally {
      setLoading("");
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Calendar math
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' });

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
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && d.getDate() >= (selectedDay || today.getDate());
      })
      .slice(0, 3);
  }, [events, currentMonth, currentYear, selectedDay]);

  const changeMonth = (offset: number) => {
    let newMonth = currentMonth + offset;
    let newYear = currentYear;
    if (newMonth < 0) { newMonth = 11; newYear--; }
    else if (newMonth > 11) { newMonth = 0; newYear++; }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    setSelectedDay(1);
  };

  const jumpToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDay(today.getDate());
  };

  // Clearance Request handler
  async function handleRequestAttendanceAccess() {
    setLoading("attendance-req");
    try {
      const res = await submitReviewRequest("ATTENDANCE_ACCESS", { note: "Executive requested live attendance terminal clearance." });
      if (res.success) {
        notify("Clearance request dispatched to Supreme Admin.", "success");
        await fetchClearance();
      } else {
        notify(res.error || "Failed to dispatch clearance request", "error");
      }
    } catch {
      notify("Network error requesting clearance.", "error");
    } finally {
      setLoading("");
    }
  }

  // Publish Slot Request
  async function handleRequestPublish() {
    if (!slot?.id) return;
    setLoading("request-publish");
    try {
      const res = await submitReviewRequest("PUBLISH_SLOT", { slotId: slot.id });
      if (res.success) notify(res.message || "Broadcast publish request submitted.", "success"); 
      else notify(res.error || "Failed to request broadcast publish", "error");
    } catch {
      notify("Network error submitting publish request.", "error");
    } finally {
      setLoading("");
    }
  }

  // Template change review request
  async function handleRequestTemplateChange() {
    setLoading("request-template");
    try {
      const res = await submitReviewRequest("UPDATE_MAIL_TEMPLATE", { template: screeningTemplate });
      if (res.success) {
        localStorage.setItem("savedScreeningTemplate", screeningTemplate);
        notify("Template change submitted for Supreme Admin review.", "success");
      } else {
        notify(res.error || "Failed to submit template", "error");
      }
    } catch {
      notify("Network error submitting template.", "error");
    } finally {
      setLoading("");
    }
  }

  function handleSaveLocalDraft() {
    localStorage.setItem("savedScreeningTemplate", screeningTemplate);
    setTemplateSaved(true);
    notify("Template saved as local executive draft.", "success");
    setTimeout(() => setTemplateSaved(false), 3000);
  }

  function insertMergeTag(tag: string, target: "screening" | "mass" = "screening") {
    if (target === "screening") {
      setScreeningTemplate(prev => prev + ` ${tag} `);
    } else {
      setMassTemplate(prev => prev + ` ${tag} `);
    }
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  }

  // 1. Dispatch Screening Invites
  async function handleSendScreeningInvites() {
    if (!slot?.id || selectedStudents.length === 0) {
      return notify("No shortlisted students found in current slot.", "error");
    }
    setLoading("screening-email");
    try {
      const formattedHtml = `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #0F2547; max-width: 600px; margin: 0 auto; line-height: 1.6;">
          <div style="background: #2563EB; padding: 16px 20px; border-radius: 12px; color: #ffffff; font-weight: bold; margin-bottom: 20px;">
            Cybersecurity Club • UIET CSJM University
          </div>
          <div>${screeningTemplate.replace(/\n/g, '<br/>')}</div>
        </div>
      `;
      const res = await sendInvitesToShortlisted(slot.id, formattedHtml);
      if (res.error) {
        // If locked to supreme admin, offer request flow
        notify(res.error, "error");
      } else {
        notify(res.message || "Invites dispatched successfully.", "success");
      }
    } catch (e: any) {
      notify("Failed to transmit invites. Request Supreme Admin authorization.", "error");
    } finally {
      setLoading("");
    }
  }

  // 2. Mass Broadcast Handlers
  const addMassRecipientRow = () => setMassRecipients([...massRecipients, { name: "", email: "" }]);
  const removeMassRecipientRow = (index: number) => setMassRecipients(massRecipients.filter((_, i) => i !== index));
  const updateMassRecipient = (index: number, field: "name" | "email", value: string) => {
    const updated = [...massRecipients];
    updated[index][field] = value;
    setMassRecipients(updated);
  };

  const importAllCandidatesToMass = () => {
    const valid = applications
      .filter((a: any) => a.user?.email && a.user.email !== "No Email")
      .map((a: any) => ({
        name: a.user?.name || a.name || "Student",
        email: a.user?.email || a.email
      }));
    if (valid.length === 0) return notify("No valid candidate emails in pipeline.", "error");
    setMassRecipients(valid);
    notify(`Imported ${valid.length} candidate(s) into broadcast recipients list.`, "success");
  };

  async function handleSendMassEmail(e: React.FormEvent) {
    e.preventDefault();
    const validRecipients = massRecipients.filter(r => r.name && r.email);
    if (validRecipients.length === 0) return notify("Please add at least one recipient.", "error");
    setLoading("mass-email");
    try {
      const res = await sendMassEmails(validRecipients, massSubject, massTemplate.replace(/\n/g, '<br/>'));
      if (res.error) notify(res.error, "error");
      else {
        notify(res.message || "Mass broadcast successful.", "success");
        setMassRecipients([{ name: "", email: "" }]);
      }
    } catch {
      notify("Broadcast restricted. Submit review request to Supreme Admin.", "error");
    } finally {
      setLoading("");
    }
  }

  async function handleRequestMassBroadcast() {
    const validRecipients = massRecipients.filter(r => r.name && r.email);
    if (validRecipients.length === 0) return notify("Please add at least one recipient.", "error");
    setLoading("mass-req");
    try {
      const res = await submitReviewRequest("MASS_BROADCAST_REQUEST", {
        recipients: validRecipients,
        subject: massSubject,
        template: massTemplate
      });
      if (res.success) notify("Broadcast request submitted to Supreme Admin.", "success");
      else notify(res.error || "Failed to submit request", "error");
    } catch {
      notify("Network error submitting broadcast request.", "error");
    } finally {
      setLoading("");
    }
  }

  // 3. Direct Message Handlers
  async function handleSendDirectEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!directEmail || !directSubject || !directBody) {
      return notify("All direct email fields are required.", "error");
    }
    setLoading("direct-email");
    try {
      const formattedHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #0F2547; max-width: 600px; margin: 0 auto; line-height: 1.6;">
          <div style="background: #0F2547; padding: 14px 18px; border-radius: 10px; color: #ffffff; font-weight: bold; margin-bottom: 16px;">
            Cybersecurity Club • Official Executive Communication
          </div>
          <div>${directBody.replace(/\n/g, '<br/>')}</div>
        </div>
      `;
      const res = await sendDirectEmail(directEmail, directSubject, formattedHtml);
      if (res.error) notify(res.error, "error");
      else {
        notify(res.message || "Direct email dispatched.", "success");
        setDirectBody("");
      }
    } catch {
      notify("Direct email failed. Requires Supreme Admin authorization.", "error");
    } finally {
      setLoading("");
    }
  }

  async function handleAutoQueue() {
    if (!slot?.id) return;
    setLoading("auto-queue");
    try {
      const res = await runAutoQueue(slot.id);
      if (res.error) notify(res.error, "error"); 
      else {
        notify(`Auto-Queue successfully assigned ${res.count || 0} candidate(s).`, "success");
        await loadDashboardData();
      }
    } catch {
      notify("Failed to execute auto-queue", "error");
    } finally {
      setLoading("");
    }
  }

  async function handleToggleSelect(appId: string) {
    if (!slot?.id) return;
    setLoading(appId);
    try {
      const res = await toggleStudentSelection(appId, slot.id);
      if (res.error) notify(res.error, "error"); 
      else await loadDashboardData();
    } catch {
      notify("Failed to update candidate slot allocation", "error");
    } finally {
      setLoading("");
    }
  }

  async function handleStatusChange(appId: string, status: string) {
    setLoading(appId);
    try {
      const res = await updateApplicationStatus(appId, status as any);
      if (res.success) {
        notify(`Application status updated to ${status}`, "success");
        await loadDashboardData();
      } else {
        notify("Failed to update status", "error");
      }
    } catch {
      notify("Status update network error", "error");
    } finally {
      setLoading("");
    }
  }

  // Dynamic grouping options
  const availableGroupFields = Array.from(new Set(
    applications.flatMap((app: any) => {
      try { 
        const data = JSON.parse(app.dynamicData || "{}"); 
        return Object.keys(data).filter(k => !k.startsWith("$ACTION") && typeof data[k] !== "object"); 
      } catch { 
        return []; 
      }
    })
  ));

  // Filtered & Sorted applications
  const processedApps = useMemo(() => {
    return applications.filter((app: any) => {
      const matchesStatus = filter === "ALL" ? true : app.status === filter;
      const searchLower = searchTerm.toLowerCase();
      const userName = app.user?.name || app.name || "";
      const userEmail = app.user?.email || app.email || "";
      const userTopic = app.topicInterested || "";
      const matchesSearch = 
        userName.toLowerCase().includes(searchLower) || 
        userEmail.toLowerCase().includes(searchLower) ||
        userTopic.toLowerCase().includes(searchLower) || 
        (app.dynamicData && app.dynamicData.toLowerCase().includes(searchLower));
      return matchesStatus && matchesSearch;
    }).sort((a: any, b: any) => {
      if (a.status === "COMPLETED" && b.status !== "COMPLETED") return 1;
      if (b.status === "COMPLETED" && a.status !== "COMPLETED") return -1;
      return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime();
    });
  }, [applications, filter, searchTerm]);

  // Status counts for interactive filter badges
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: applications.length,
      WAITING: 0,
      SHORTLISTED: 0,
      SCREENING_DONE: 0,
      COMPLETED: 0,
      REJECTED: 0,
    };
    applications.forEach(a => {
      if (counts[a.status] !== undefined) counts[a.status]++;
    });
    return counts;
  }, [applications]);

  // Grouping logic
  let groupedApps: Record<string, any[]> = { "All Enrolled Candidates": processedApps };
  if (groupField) {
    groupedApps = {};
    processedApps.forEach((app: any) => {
      let val = "Unspecified";
      try {
        const data = JSON.parse(app.dynamicData || "{}");
        if (data[groupField]) {
          val = Array.isArray(data[groupField]) ? data[groupField].join(", ") : String(data[groupField]);
        }
      } catch {}
      if (!groupedApps[val]) groupedApps[val] = [];
      groupedApps[val].push(app);
    });
  }

  if (loading === "init") {
    return (
      <div className="min-h-screen bg-[#EAF2FC] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/80 clay-card flex items-center justify-center text-blue-600 mb-4 animate-pulse">
          <Activity className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-[#0F2547] uppercase tracking-wider">Loading Operations Command</h2>
        <p className="text-xs font-semibold text-slate-500 mt-1">Connecting to Club Datastream & Broadcast Grid...</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#EAF2FC] pb-28 text-[#0F2547] selection:bg-blue-500 selection:text-white">
      
      {/* GLOBAL TOAST NOTIFICATION */}
      <AnimatePresence>
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] max-w-lg w-[90%] px-4"
          >
            <div className={`p-4 rounded-2xl text-xs font-black shadow-xl border flex items-center justify-between gap-3 backdrop-blur-md ${
              message.type === "success" 
                ? "bg-emerald-500/95 text-white border-emerald-400 shadow-emerald-500/20" 
                : "bg-red-500/95 text-white border-red-400 shadow-red-500/20"
            }`}>
              <div className="flex items-center gap-2">
                {message.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <ShieldAlert className="w-4 h-4 shrink-0" />}
                <span>{message.text}</span>
              </div>
              <button onClick={() => setMessage(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🟢 FULL-SCREEN RESPONSIVE CONTAINER (No artificial squeeze, fluid across 1080p / 1440p / 4K) */}
      <div className="w-full max-w-[1850px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-4 space-y-6">

        {/* ======================================================== */}
        {/* 1. EXPANSIVE COMMAND HEADER & HIGH-DENSITY METRICS ROW   */}
        {/* ======================================================== */}
        <section className="space-y-4">
          
          {/* Header Title Bar (Natural Page Canvas - Seamlessly integrated) */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-blue-200/50">
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white shadow-sm shadow-blue-500/20">
                  <Shield className="w-3 h-3 text-cyan-200" /> Executive Clearance Active
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-white/70 text-slate-600 border border-white">
                  <Radio className="w-3 h-3 text-emerald-500 animate-pulse" /> Live Telemetry
                </span>
              </div>
              
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#0F2547] tracking-tight">
                Executive Operations Command
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Coordinate student presenter pipelines, manage club broadcast cycles, and handle cryptographic attendance clearance.
              </p>
            </div>

            {/* Quick Action Refresh & Status */}
            <div className="flex items-center gap-2.5 self-start lg:self-center">
              <button 
                onClick={loadDashboardData}
                disabled={loading !== ""}
                title="Refresh datastream"
                className="clay-btn px-4 py-2.5 text-xs font-black flex items-center gap-2 text-slate-700 hover:text-blue-600"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading !== "" ? "animate-spin text-blue-600" : ""}`} />
                <span className="hidden sm:inline">Sync Data</span>
              </button>
              
              <div className="px-3.5 py-2 rounded-2xl bg-white/60 border border-white text-right hidden sm:block">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Session Date</span>
                <span className="text-xs font-extrabold text-[#0F2547]">
                  {today.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            </div>
          </div>

          {/* 5-Column High-Density KPI Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
            
            {/* KPI 1: Active Intakes */}
            <div className="clay-card p-4 sm:p-5 flex items-center gap-3.5 group hover:-translate-y-0.5 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-blue-100/70 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200/50 shadow-inner">
                <FileText className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block truncate">Active Forms</span>
                <h3 className="text-xl sm:text-2xl font-black text-[#0F2547] leading-tight">{metrics.activeForms}</h3>
                <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Live Portal
                </span>
              </div>
            </div>

            {/* KPI 2: Total Processed */}
            <div className="clay-card p-4 sm:p-5 flex items-center gap-3.5 group hover:-translate-y-0.5 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200/50 shadow-inner">
                <Database className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block truncate">Submissions</span>
                <h3 className="text-xl sm:text-2xl font-black text-[#0F2547] leading-tight">{metrics.totalSubmissions}</h3>
                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Vault Records
                </span>
              </div>
            </div>

            {/* KPI 3: Queue Backlog */}
            <div className="clay-card p-4 sm:p-5 flex items-center gap-3.5 group hover:-translate-y-0.5 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-amber-100/70 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200/50 shadow-inner">
                <Clock className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block truncate">Queue Backlog</span>
                <h3 className="text-xl sm:text-2xl font-black text-[#0F2547] leading-tight">{pendingWorkflowCount}</h3>
                <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1 mt-0.5">
                  <Flame className="w-3 h-3 text-amber-500" /> Awaiting Review
                </span>
              </div>
            </div>

            {/* KPI 4: Events Scheduled */}
            <div className="clay-card p-4 sm:p-5 flex items-center gap-3.5 group hover:-translate-y-0.5 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-purple-100/70 text-purple-600 flex items-center justify-center shrink-0 border border-purple-200/50 shadow-inner">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block truncate">Club Events</span>
                <h3 className="text-xl sm:text-2xl font-black text-[#0F2547] leading-tight">{events.length}</h3>
                <span className="text-[10px] font-bold text-purple-600 flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Calendar Grid
                </span>
              </div>
            </div>

            {/* KPI 5: Weekly Slot Allotments */}
            <div className="clay-card p-4 sm:p-5 flex items-center gap-3.5 group hover:-translate-y-0.5 transition-all col-span-2 sm:col-span-1">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100/70 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-200/50 shadow-inner">
                <Video className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block truncate">Broadcast Slot</span>
                <h3 className="text-xl sm:text-2xl font-black text-[#0F2547] leading-tight">{selectedStudents.length} / 2</h3>
                <span className={`text-[10px] font-bold flex items-center gap-1 mt-0.5 ${selectedStudents.length === 2 ? "text-emerald-600" : "text-indigo-600"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${selectedStudents.length === 2 ? "bg-emerald-500" : "bg-indigo-500"}`}></span> 
                  {selectedStudents.length === 2 ? "Capacity Full" : "Slots Available"}
                </span>
              </div>
            </div>

          </div>
        </section>

        {/* ======================================================== */}
        {/* 2. DUAL OPERATIONAL DECK: CALENDAR MATRIX & ATTENDANCE   */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* SMART CALENDAR & AGENDA MATRIX (8 Cols) */}
          <div className="lg:col-span-8 clay-card p-5 sm:p-6 flex flex-col md:flex-row gap-6">
            
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
                    <p className="text-[9px] font-bold text-slate-400">Club Sessions & Workshops</p>
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
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> Internal Briefing
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
                            <span title="Internal Executive Only" className="text-amber-600">
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
                <span className="text-blue-600">Sync with Google Calendar</span>
              </div>

            </div>

          </div>

          {/* SECURE ATTENDANCE GATEWAY TERMINAL (4 Cols) */}
          <div className="lg:col-span-4 clay-card p-6 flex flex-col justify-between relative overflow-hidden group">
            
            {/* Top Security Status Header */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner ${
                  attendanceAccess === "GRANTED"
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : attendanceAccess === "PENDING"
                    ? "bg-amber-100 text-amber-700 border-amber-200 animate-pulse"
                    : "bg-blue-100/70 text-blue-600 border-blue-200"
                }`}>
                  {attendanceAccess === "GRANTED" ? (
                    <ScanLine className="w-6 h-6" />
                  ) : attendanceAccess === "PENDING" ? (
                    <Clock className="w-6 h-6" />
                  ) : (
                    <KeySquare className="w-6 h-6" />
                  )}
                </div>

                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                  attendanceAccess === "GRANTED" 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                    : attendanceAccess === "PENDING"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-red-50 text-red-600 border-red-200"
                }`}>
                  {attendanceAccess === "GRANTED" ? "TERMINAL ACTIVE" : attendanceAccess === "PENDING" ? "REVIEW IN PROGRESS" : "GATEWAY LOCKED"}
                </span>
              </div>

              <h3 className="text-lg font-black text-[#0F2547] leading-snug">
                Attendance Terminal
              </h3>
              <p className="text-xs font-semibold text-slate-500 mt-1.5 leading-relaxed">
                {attendanceAccess === "GRANTED"
                  ? "Clearance verified. Launch scanner to record student attendances, issue time tokens, or verify QR codes."
                  : attendanceAccess === "PENDING"
                  ? "Access request is currently queued for Supreme Admin authorization. Real-time poll active."
                  : "Attendance scanning requires explicit cryptographic clearance from the Supreme Admin."}
              </p>

              {/* Informational Diagnostics */}
              <div className="mt-4 p-3.5 rounded-2xl bg-white/70 border border-white space-y-2 text-[10px] font-bold">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Security Clearance:</span>
                  <span className={attendanceAccess === "GRANTED" ? "text-emerald-600 font-black" : "text-[#0F2547]"}>
                    {attendanceAccess === "GRANTED" ? "Level 1 (Full Access)" : "Level 0 (Restricted)"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Scanner Engine:</span>
                  <span className="text-[#0F2547]">QR + 6-Char Code</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Verification Protocol:</span>
                  <span className="text-blue-600 font-mono">HMAC-SHA256 Token</span>
                </div>
              </div>
            </div>

            {/* Bottom Action Area */}
            <div className="pt-5 mt-4 border-t border-blue-200/60">
              {attendanceAccess === "LOCKED" && (
                <button
                  onClick={handleRequestAttendanceAccess}
                  disabled={loading === "attendance-req"}
                  className="w-full clay-btn-primary py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:shadow-lg transition-all"
                >
                  {loading === "attendance-req" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Dispatching Request...</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4" />
                      <span>Request Terminal Clearance</span>
                    </>
                  )}
                </button>
              )}

              {attendanceAccess === "PENDING" && (
                <div className="space-y-2">
                  <div className="w-full py-3 px-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-inner">
                    <Clock className="w-4 h-4 animate-pulse text-amber-600" />
                    <span>Awaiting Admin Approval</span>
                  </div>
                  <button
                    onClick={fetchClearance}
                    className="w-full py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-blue-600 flex items-center justify-center gap-1 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" /> Check Clearance Now
                  </button>
                </div>
              )}

              {attendanceAccess === "GRANTED" && (
                <button
                  onClick={() => setIsAttendancePortalOpen(true)}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all active:scale-95 cursor-pointer"
                >
                  <ScanLine className="w-4 h-4" />
                  <span>Launch Attendance Gateway</span>
                </button>
              )}
            </div>

          </div>

        </div>

        {/* ======================================================== */}
        {/* 3. STICKY SEGMENTED CONTROL: PIPELINE NAVIGATION         */}
        {/* ======================================================== */}
        <div className="sticky top-4 z-40">
          <div className="clay-card p-2 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            
            <div className="flex items-center gap-2 px-3 py-1">
              <SlidersHorizontal className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-black text-[#0F2547] uppercase tracking-wider">Operational Hub</h2>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth p-1 bg-blue-100/40 rounded-2xl border border-white">
              <button
                onClick={() => setActiveTab("WORKFLOW")}
                className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeTab === "WORKFLOW"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "text-slate-600 hover:text-[#0F2547] hover:bg-white/60"
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Presenter Workflow</span>
                <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                  activeTab === "WORKFLOW" ? "bg-white/20 text-white" : "bg-white text-slate-600"
                }`}>
                  {applications.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("COMMUNICATION")}
                className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeTab === "COMMUNICATION"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "text-slate-600 hover:text-[#0F2547] hover:bg-white/60"
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Communication Studio</span>
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              </button>

              <button
                onClick={() => setActiveTab("SETTINGS")}
                className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeTab === "SETTINGS"
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/30"
                    : "text-slate-600 hover:text-[#0F2547] hover:bg-white/60"
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Form Vault & Settings</span>
              </button>
            </div>

          </div>
        </div>

        {/* ======================================================== */}
        {/* 4. DYNAMIC TAB CONTENT                                   */}
        {/* ======================================================== */}
        <div className="pt-2 min-h-[500px]">

          {/* ------------------------------------------------------ */}
          {/* TAB 1: PRESENTER WORKFLOW                              */}
          {/* ------------------------------------------------------ */}
          {activeTab === "WORKFLOW" && (
            <div className="space-y-6">

              {/* MEDIA BROADCASTING BANNER */}
              <div className="clay-card p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
                    <MonitorPlay className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                        Global Broadcast Channel
                      </span>
                      <span className="text-[9px] font-bold text-slate-400">
                        Limit: {mediaLimit} featured
                      </span>
                    </div>
                    <h3 className="text-base font-black text-[#0F2547] mt-0.5">{mediaTitle}</h3>
                    <p className="text-xs font-semibold text-slate-500">
                      {mediaUrls.length} media item(s) configured for Program Home hero player.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 w-full md:w-auto">
                  <button
                    onClick={() => setIsPreviewOpen(true)}
                    className="clay-btn px-4 py-2.5 text-xs font-black flex items-center justify-center gap-2 text-slate-700 flex-1 md:flex-none"
                  >
                    <LayoutTemplate className="w-4 h-4 text-blue-600" />
                    <span>Preview Hero Player</span>
                  </button>
                  <button
                    onClick={() => notify("Global media configuration is governed under Supreme Admin clearance.", "error")}
                    className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-400 bg-slate-100 border border-slate-200 flex items-center justify-center gap-1.5 cursor-not-allowed flex-1 md:flex-none"
                    title="Governed by Supreme Admin"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Admin Governed</span>
                  </button>
                </div>
              </div>

              {/* WEEKLY BROADCAST CONFIG (2 ALLOTMENT PODS) */}
              <div className="clay-card p-6 sm:p-7 space-y-6">
                
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-blue-200/50">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                        slot?.isPublished
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {slot?.isPublished ? "🟢 Active on Public Program Home" : "🟡 Hidden from Public View"}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {slot?.theme || "Weekly Technical Bulletin"}
                      </span>
                    </div>
                    <h2 className="text-xl font-black text-[#0F2547]">Weekly Broadcast Roster</h2>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      Each episode accommodates exactly 2 student presenters vetted through technical screening.
                    </p>
                  </div>

                  {/* Actions: Request Publish & Auto Queue */}
                  <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                    <button
                      onClick={handleRequestPublish}
                      disabled={loading === "request-publish" || !slot?.id}
                      className="clay-btn px-4 py-2.5 text-xs font-black flex items-center justify-center gap-2 text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200 flex-1 lg:flex-none"
                    >
                      {loading === "request-publish" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4 text-amber-600" />}
                      <span>Request Publish</span>
                    </button>

                    <button
                      onClick={handleAutoQueue}
                      disabled={loading === "auto-queue" || selectedStudents.length >= 2}
                      className={`clay-btn-primary px-5 py-2.5 text-xs font-black flex items-center justify-center gap-2 flex-1 lg:flex-none ${
                        selectedStudents.length >= 2 ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      {loading === "auto-queue" ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Zap className="w-4 h-4 text-amber-300" />}
                      <span>Execute Auto-Queue</span>
                    </button>
                  </div>
                </div>

                {/* 2 Roster Speaker Pods */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {[0, 1].map((index) => {
                    const trainee = selectedStudents[index];
                    return trainee ? (
                      <div 
                        key={trainee.id}
                        className="p-5 rounded-2xl bg-white border border-blue-200 shadow-sm flex flex-col justify-between gap-4 group hover:shadow-md transition-all"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white font-black flex items-center justify-center text-sm shadow-md shadow-blue-500/20">
                                {trainee.user?.name?.slice(0, 2).toUpperCase() || "PR"}
                              </div>
                              <div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-blue-600">
                                  Presenter Allotment #{index + 1}
                                </span>
                                <h4 className="text-base font-black text-[#0F2547] leading-tight">
                                  {trainee.user?.name || "Student Presenter"}
                                </h4>
                                <p className="text-[11px] font-semibold text-slate-500">
                                  {trainee.user?.email || "No email on record"}
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={() => handleToggleSelect(trainee.id)}
                              disabled={loading === trainee.id}
                              className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 flex items-center gap-1.5 transition-colors"
                            >
                              {loading === trainee.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserMinus className="w-3 h-3" />}
                              <span>Revoke</span>
                            </button>
                          </div>

                          <div className="mt-4 p-3 rounded-xl clay-inset text-xs font-bold text-slate-700">
                            <span className="text-[9px] font-black uppercase tracking-wider text-blue-600 block mb-0.5">Presentation Subject</span>
                            <span className="text-[#0F2547]">{trainee.topicInterested}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pt-2 border-t border-slate-100">
                          <span>Status: Confirmed Speaker</span>
                          <span className="text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Recording Stage Ready
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div 
                        key={index}
                        className="p-6 rounded-2xl bg-blue-50/40 border-2 border-dashed border-blue-200 flex flex-col items-center justify-center text-center space-y-2.5 min-h-[170px]"
                      >
                        <div className="w-10 h-10 rounded-2xl bg-white text-blue-400 flex items-center justify-center shadow-inner">
                          <UserPlus className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-xs font-black uppercase tracking-wider text-slate-500 block">
                            Presenter Allotment #{index + 1} (Unassigned)
                          </span>
                          <p className="text-[11px] font-semibold text-slate-400 mt-0.5 max-w-xs">
                            Select a shortlisted candidate from the pipeline below or click Auto-Queue.
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>

              {/* CANDIDATE PIPELINE & ENROLLMENT REGISTRY */}
              <div className="clay-card p-6 sm:p-7 space-y-6">
                
                {/* Pipeline Header & Controls */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-blue-200/50">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        Talent Queue
                      </span>
                      <span className="text-xs font-extrabold text-[#0F2547]">
                        {processedApps.length} Candidates Displayed
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-[#0F2547]">Candidate Intake Pipeline</h3>
                  </div>

                  {/* Search and Group By Tools */}
                  <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 sm:w-64 min-w-[200px]">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search student or topic..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="clay-input w-full pl-9 pr-4 py-2.5 text-xs font-bold"
                      />
                    </div>

                    {availableGroupFields.length > 0 && (
                      <div className="relative min-w-[140px]">
                        <select
                          value={groupField || ""}
                          onChange={(e) => setGroupField(e.target.value || null)}
                          className="clay-input w-full px-3 py-2.5 text-xs font-black appearance-none cursor-pointer pr-8"
                        >
                          <option value="">Group By: None</option>
                          {availableGroupFields.map(f => (
                            <option key={f} value={f}>Group By: {f}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Filter Badges with DYNAMIC COUNTS */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth pb-2 pt-1">
                  {[
                    { id: "ALL", label: "All Candidates" },
                    { id: "WAITING", label: "Waiting Review" },
                    { id: "SHORTLISTED", label: "Shortlisted" },
                    { id: "SCREENING_DONE", label: "Screening Done" },
                    { id: "COMPLETED", label: "Completed" },
                    { id: "REJECTED", label: "Archived/Rejected" }
                  ].map((tab) => {
                    const isActive = filter === tab.id;
                    const count = statusCounts[tab.id] || 0;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setFilter(tab.id)}
                        className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                          isActive
                            ? "bg-[#0F2547] text-white shadow-md shadow-navy-deep/20"
                            : "clay-btn text-slate-600 hover:text-[#0F2547]"
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black ${
                          isActive ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Candidate Rows Container */}
                <div className="space-y-6">
                  {Object.entries(groupedApps).map(([groupName, apps]) => {
                    if (apps.length === 0) return null;
                    return (
                      <div key={groupName} className="space-y-3">
                        {groupField && (
                          <div className="flex items-center gap-2 pt-2">
                            <span className="text-xs font-black uppercase tracking-widest text-[#0F2547] bg-white px-3 py-1 rounded-xl border border-blue-100 shadow-sm">
                              📁 {groupName}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">({apps.length} records)</span>
                          </div>
                        )}

                        <div className="space-y-3">
                          {apps.map((app: any, index: number) => {
                            const isSelectedInSlot = app.weeklySlotId === slot?.id;
                            
                            return (
                              <div
                                key={app.id}
                                className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                                  isSelectedInSlot
                                    ? "bg-blue-50/90 border-blue-300 shadow-md shadow-blue-500/10"
                                    : "bg-white/90 border-blue-100 hover:border-blue-200 hover:shadow-md"
                                } ${app.status === "COMPLETED" ? "opacity-75" : ""}`}
                              >
                                
                                {/* Left Info Deck */}
                                <div className="space-y-2.5 flex-1 min-w-0">
                                  
                                  <div className="flex flex-wrap items-center gap-2.5">
                                    <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 font-black text-[10px] flex items-center justify-center border border-blue-100">
                                      {index + 1}
                                    </span>
                                    
                                    <h4 className="text-sm font-black text-[#0F2547] truncate max-w-sm">
                                      {app.user?.name || app.name}
                                    </h4>

                                    <span className="text-xs font-semibold text-slate-400 truncate max-w-[200px]">
                                      {app.user?.email || app.email}
                                    </span>

                                    {/* Status Badge */}
                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                      app.status === "WAITING"
                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                        : app.status === "SHORTLISTED"
                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                        : app.status === "SCREENING_DONE"
                                        ? "bg-purple-50 text-purple-700 border-purple-200"
                                        : app.status === "COMPLETED"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : "bg-red-50 text-red-700 border-red-200"
                                    }`}>
                                      {app.status}
                                    </span>

                                    {isSelectedInSlot && (
                                      <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-blue-600 text-white">
                                        Allotted in Active Slot
                                      </span>
                                    )}
                                  </div>

                                  {/* Dynamic Attributes & Subject */}
                                  <div className="flex flex-wrap items-center gap-2 pl-0 sm:pl-8">
                                    <div className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/60 text-[11px] font-semibold text-slate-700">
                                      <strong className="text-blue-600 font-extrabold uppercase mr-1">Subject:</strong>
                                      <span>{app.topicInterested}</span>
                                    </div>

                                    {(() => {
                                      let highlights: Record<string, any> = {};
                                      try { if (app.highlightedData) highlights = JSON.parse(app.highlightedData); } catch (e) {}
                                      return Object.entries(highlights).slice(0, 3).map(([k, v]) => (
                                        <div key={k} className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/60 text-[11px] font-semibold text-slate-700">
                                          <strong className="text-slate-500 font-extrabold uppercase mr-1">{k}:</strong>
                                          <span>{String(v)}</span>
                                        </div>
                                      ));
                                    })()}
                                  </div>

                                </div>

                                {/* Right Action Pipeline */}
                                <div className="flex flex-wrap items-center gap-2 self-start lg:self-center shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 w-full lg:w-auto">
                                  
                                  {/* Status Advancer Dropdown */}
                                  <div className="relative">
                                    <select
                                      value={app.status}
                                      onChange={(e) => handleStatusChange(app.id, e.target.value)}
                                      disabled={loading === app.id}
                                      className="clay-input px-3 py-1.5 text-xs font-black pr-7 cursor-pointer"
                                    >
                                      <option value="WAITING">Status: Waiting</option>
                                      <option value="SHORTLISTED">Status: Shortlisted</option>
                                      <option value="SCREENING_DONE">Status: Screening Done</option>
                                      <option value="COMPLETED">Status: Completed</option>
                                      <option value="REJECTED">Status: Rejected</option>
                                    </select>
                                    <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                                  </div>

                                  {/* Assign/Revoke Slot Button */}
                                  {app.status !== "COMPLETED" && (
                                    <button
                                      onClick={() => handleToggleSelect(app.id)}
                                      disabled={loading === app.id}
                                      className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm border ${
                                        isSelectedInSlot
                                          ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                                          : "bg-blue-600 text-white border-blue-500 hover:bg-blue-700"
                                      }`}
                                    >
                                      {loading === app.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : isSelectedInSlot ? (
                                        <UserMinus className="w-3.5 h-3.5" />
                                      ) : (
                                        <UserPlus className="w-3.5 h-3.5" />
                                      )}
                                      <span>{isSelectedInSlot ? "Revoke Slot" : "Assign Slot"}</span>
                                    </button>
                                  )}

                                </div>

                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {processedApps.length === 0 && (
                    <div className="p-12 text-center rounded-2xl bg-white/70 border border-white">
                      <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <h4 className="text-sm font-black text-[#0F2547]">No candidates found</h4>
                      <p className="text-xs font-semibold text-slate-400 mt-1">
                        Try modifying your search query or filter selection.
                      </p>
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* ------------------------------------------------------ */}
          {/* TAB 2: COMMUNICATION STUDIO (SCREENING, MASS & DIRECT) */}
          {/* ------------------------------------------------------ */}
          {activeTab === "COMMUNICATION" && (
            <div className="space-y-6">

              {/* Studio Header Card with Sub-Tab Selector */}
              <div className="clay-card p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      Editorial & Dispatch
                    </span>
                    <h3 className="text-xl font-black text-[#0F2547] mt-0.5">Communication Studio</h3>
                    <p className="text-xs font-semibold text-slate-500">
                      Author screening invitations, dispatch batch announcements, or send direct inquiries through official relay.
                    </p>
                  </div>
                </div>

                {/* Sub-Tab Switcher: Screening vs Mass vs Direct */}
                <div className="flex bg-slate-100 p-1.5 rounded-2xl overflow-x-auto no-scrollbar shadow-inner gap-1 shrink-0">
                  <button
                    onClick={() => setCommSubTab("SCREENING")}
                    className={`px-4 py-2 text-xs font-black rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      commSubTab === "SCREENING" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Screening Invites</span>
                  </button>
                  <button
                    onClick={() => setCommSubTab("MASS")}
                    className={`px-4 py-2 text-xs font-black rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      commSubTab === "MASS" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Mass Broadcast</span>
                  </button>
                  <button
                    onClick={() => setCommSubTab("DIRECT")}
                    className={`px-4 py-2 text-xs font-black rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      commSubTab === "DIRECT" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <AtSign className="w-3.5 h-3.5" />
                    <span>Direct Message</span>
                  </button>
                </div>
              </div>

              {/* ---------------------------------------------------- */}
              {/* SUB-TAB 1: SHORTLIST SCREENING INVITES               */}
              {/* ---------------------------------------------------- */}
              {commSubTab === "SCREENING" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left: Template Editor (7 Cols) */}
                  <div className="lg:col-span-7 clay-card p-6 space-y-5">
                    
                    <div className="flex items-center justify-between pb-3 border-b border-blue-200/50">
                      <h4 className="text-sm font-black text-[#0F2547] uppercase tracking-wider flex items-center gap-2">
                        <Send className="w-4 h-4 text-blue-600" /> Screening Invite Template
                      </h4>
                      <span className="text-[10px] font-bold text-slate-400">Slot Presenters Targeted: {selectedStudents.length}</span>
                    </div>

                    {/* Subject Line */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                        Email Subject
                      </label>
                      <input
                        type="text"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        placeholder="Enter dispatch subject..."
                        className="clay-input w-full px-4 py-2.5 text-xs font-bold"
                      />
                    </div>

                    {/* Variable Tag Inserters */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                        Available Merge Tags (Click to inject):
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {["{{name}}", "{{topic}}", "{{date}}", "{{portal_url}}"].map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => insertMergeTag(tag, "screening")}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-mono font-bold border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-1"
                          >
                            <span>{tag}</span>
                            {copiedTag === tag ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 opacity-50" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Template Textarea */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                        Message Body (Plaintext with Automatic HTML Formatting)
                      </label>
                      <textarea
                        rows={9}
                        value={screeningTemplate}
                        onChange={(e) => setScreeningTemplate(e.target.value)}
                        className="clay-input w-full p-4 text-xs font-mono leading-relaxed"
                        placeholder="Type your screening invite..."
                      />
                    </div>

                    {/* Footer Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-blue-200/50">
                      <button
                        onClick={handleSaveLocalDraft}
                        className="clay-btn px-4 py-2.5 text-xs font-black flex items-center gap-1.5 text-slate-700"
                      >
                        {templateSaved ? <Check className="w-4 h-4 text-emerald-600" /> : <FileText className="w-4 h-4" />}
                        <span>{templateSaved ? "Saved to Browser" : "Save Draft"}</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleRequestTemplateChange}
                          disabled={loading === "request-template"}
                          className="clay-btn px-4 py-2.5 text-xs font-black flex items-center gap-2 text-purple-700 border-purple-200 hover:bg-purple-50"
                        >
                          {loading === "request-template" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                          <span>Submit for Admin Review</span>
                        </button>

                        <button
                          onClick={handleSendScreeningInvites}
                          disabled={loading === "screening-email" || selectedStudents.length === 0}
                          className={`clay-btn-primary px-5 py-2.5 text-xs font-black flex items-center gap-2 ${
                            selectedStudents.length === 0 ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          {loading === "screening-email" ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4" />}
                          <span>Dispatch to {selectedStudents.length} Presenter(s)</span>
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Right: Live Simulated Student Email Preview (5 Cols) */}
                  <div className="lg:col-span-5 clay-card p-6 space-y-4">
                    
                    <div className="flex items-center justify-between pb-3 border-b border-blue-200/50">
                      <h4 className="text-sm font-black text-[#0F2547] uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" /> Live Student Preview
                      </h4>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                        Simulated View
                      </span>
                    </div>

                    {/* Mock Email Frame */}
                    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden text-xs">
                      
                      {/* Mock Email Headers */}
                      <div className="bg-slate-50 p-4 border-b border-slate-100 space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-bold">From:</span>
                          <span className="font-extrabold text-[#0F2547]">Cyber Bulletin Team &lt;editorial@csjmu.ac.in&gt;</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-bold">To:</span>
                          <span className="font-semibold text-slate-700">Deepak Yadav &lt;student@csjmu.ac.in&gt;</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-bold">Subject:</span>
                          <span className="font-black text-[#0F2547] truncate">{emailSubject || "Presentation Update"}</span>
                        </div>
                      </div>

                      {/* Mock Email Content Interpolated */}
                      <div className="p-5 space-y-4 text-slate-700 leading-relaxed font-sans min-h-[220px]">
                        <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100/70 mb-3 flex items-center gap-2 text-blue-900 font-bold text-[11px]">
                          <Shield className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>Official Communication • UIET Cybersecurity Club</span>
                        </div>

                        <div className="whitespace-pre-line text-xs font-medium text-slate-800">
                          {screeningTemplate
                            .replace(/{{name}}/g, "Deepak Yadav")
                            .replace(/{{topic}}/g, "Zero-Trust Architecture in Cloud Infrastructures")
                            .replace(/{{date}}/g, new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }))
                            .replace(/{{portal_url}}/g, "https://cyber-bulletin.csjmu.ac.in/dashboard")}
                        </div>

                        <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400">
                          This is an automated dispatch issued under Executive Editorial Clearance.
                        </div>
                      </div>

                    </div>

                  </div>

                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* SUB-TAB 2: MASS BROADCAST                            */}
              {/* ---------------------------------------------------- */}
              {commSubTab === "MASS" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left: Mass Broadcast Editor (7 Cols) */}
                  <form onSubmit={handleSendMassEmail} className="lg:col-span-7 clay-card p-6 space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-blue-200/50">
                      <div>
                        <h4 className="text-sm font-black text-[#0F2547] uppercase tracking-wider flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-600" /> Mass Broadcast Dispatcher
                        </h4>
                        <p className="text-[10px] font-semibold text-slate-500 mt-0.5">Send custom broadcasts to multiple candidates simultaneously.</p>
                      </div>
                      
                      <button
                        type="button"
                        onClick={importAllCandidatesToMass}
                        className="px-3 py-1.5 rounded-xl text-xs font-black text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-1.5"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Import All ({applications.length})</span>
                      </button>
                    </div>

                    {/* Recipients Rows */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                          Recipients ({massRecipients.length})
                        </label>
                        <button
                          type="button"
                          onClick={addMassRecipientRow}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <PlusCircle className="w-3.5 h-3.5" /> Add Recipient
                        </button>
                      </div>

                      <div className="max-h-48 overflow-y-auto no-scrollbar space-y-2 pr-1">
                        {massRecipients.map((rec, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Student Name"
                              value={rec.name}
                              onChange={(e) => updateMassRecipient(idx, "name", e.target.value)}
                              className="clay-input flex-1 px-3 py-2 text-xs font-bold"
                              required
                            />
                            <input
                              type="email"
                              placeholder="student@csjmu.ac.in"
                              value={rec.email}
                              onChange={(e) => updateMassRecipient(idx, "email", e.target.value)}
                              className="clay-input flex-1 px-3 py-2 text-xs font-bold"
                              required
                            />
                            {massRecipients.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeMassRecipientRow(idx)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Broadcast Subject */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                        Broadcast Subject
                      </label>
                      <input
                        type="text"
                        value={massSubject}
                        onChange={(e) => setMassSubject(e.target.value)}
                        placeholder="Subject..."
                        className="clay-input w-full px-4 py-2.5 text-xs font-bold"
                        required
                      />
                    </div>

                    {/* Variable tags for mass */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                        Merge Variables:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {["{{name}}", "{{portal_url}}"].map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => insertMergeTag(tag, "mass")}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-mono font-bold border border-blue-200 hover:bg-blue-100 transition-colors"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Broadcast Body */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                        Broadcast Message Body
                      </label>
                      <textarea
                        rows={7}
                        value={massTemplate}
                        onChange={(e) => setMassTemplate(e.target.value)}
                        className="clay-input w-full p-4 text-xs font-mono leading-relaxed"
                        placeholder="Enter message body..."
                        required
                      />
                    </div>

                    {/* Footer Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-blue-200/50">
                      <button
                        type="button"
                        onClick={handleRequestMassBroadcast}
                        disabled={loading === "mass-req"}
                        className="clay-btn px-4 py-2.5 text-xs font-black flex items-center gap-2 text-purple-700 border-purple-200 hover:bg-purple-50"
                      >
                        {loading === "mass-req" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                        <span>Submit for Admin Approval</span>
                      </button>

                      <button
                        type="submit"
                        disabled={loading === "mass-email"}
                        className="clay-btn-primary px-6 py-2.5 text-xs font-black flex items-center gap-2"
                      >
                        {loading === "mass-email" ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4" />}
                        <span>Dispatch to {massRecipients.filter(r => r.email).length} Recipient(s)</span>
                      </button>
                    </div>
                  </form>

                  {/* Right: Mass Broadcast Preview (5 Cols) */}
                  <div className="lg:col-span-5 clay-card p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-blue-200/50">
                      <h4 className="text-sm font-black text-[#0F2547] uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" /> Broadcast Simulator
                      </h4>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        Live Preview
                      </span>
                    </div>

                    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden text-xs">
                      <div className="bg-slate-50 p-4 border-b border-slate-100 space-y-1 text-[11px]">
                        <div><strong className="text-slate-400">Target Queue:</strong> {massRecipients.filter(r => r.email).length} email addresses</div>
                        <div><strong className="text-slate-400">Subject:</strong> {massSubject}</div>
                      </div>

                      <div className="p-5 space-y-4 text-slate-700 leading-relaxed font-sans min-h-[220px]">
                        <div className="whitespace-pre-line text-xs font-medium text-slate-800">
                          {massTemplate.replace(/{{name}}/g, massRecipients[0]?.name || "Student Presenter")}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* SUB-TAB 3: DIRECT MESSAGE                            */}
              {/* ---------------------------------------------------- */}
              {commSubTab === "DIRECT" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left: Direct Mail Form (7 Cols) */}
                  <form onSubmit={handleSendDirectEmail} className="lg:col-span-7 clay-card p-6 space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-blue-200/50">
                      <div>
                        <h4 className="text-sm font-black text-[#0F2547] uppercase tracking-wider flex items-center gap-2">
                          <AtSign className="w-4 h-4 text-blue-600" /> Direct Candidate Message
                        </h4>
                        <p className="text-[10px] font-semibold text-slate-500 mt-0.5">Send a personalized inquiry to a specific enrolled candidate.</p>
                      </div>
                    </div>

                    {/* Quick Pick From Candidates Dropdown */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                        Quick-Select From Candidates Pipeline:
                      </label>
                      <select
                        onChange={(e) => {
                          const app = applications.find(a => a.id === e.target.value);
                          if (app) {
                            setDirectEmail(app.user?.email || app.email || "");
                            setDirectName(app.user?.name || app.name || "");
                          }
                        }}
                        defaultValue=""
                        className="clay-input w-full px-3 py-2.5 text-xs font-bold cursor-pointer"
                      >
                        <option value="">-- Choose Candidate to Auto-fill --</option>
                        {applications.map(app => (
                          <option key={app.id} value={app.id}>
                            {app.user?.name || app.name} ({app.user?.email || app.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Direct Recipient Email */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                        Recipient Email Address
                      </label>
                      <input
                        type="email"
                        value={directEmail}
                        onChange={(e) => setDirectEmail(e.target.value)}
                        placeholder="student@csjmu.ac.in"
                        className="clay-input w-full px-4 py-2.5 text-xs font-bold"
                        required
                      />
                    </div>

                    {/* Direct Subject */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                        Email Subject
                      </label>
                      <input
                        type="text"
                        value={directSubject}
                        onChange={(e) => setDirectSubject(e.target.value)}
                        placeholder="Subject..."
                        className="clay-input w-full px-4 py-2.5 text-xs font-bold"
                        required
                      />
                    </div>

                    {/* Direct Message Body */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                        Message Content
                      </label>
                      <textarea
                        rows={8}
                        value={directBody}
                        onChange={(e) => setDirectBody(e.target.value)}
                        className="clay-input w-full p-4 text-xs font-sans leading-relaxed"
                        placeholder="Write your direct message to this student..."
                        required
                      />
                    </div>

                    {/* Action */}
                    <div className="flex justify-end pt-4 border-t border-blue-200/50">
                      <button
                        type="submit"
                        disabled={loading === "direct-email"}
                        className="clay-btn-primary px-6 py-2.5 text-xs font-black flex items-center gap-2"
                      >
                        {loading === "direct-email" ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4" />}
                        <span>Send Direct Communication</span>
                      </button>
                    </div>
                  </form>

                  {/* Right: Direct Preview (5 Cols) */}
                  <div className="lg:col-span-5 clay-card p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-blue-200/50">
                      <h4 className="text-sm font-black text-[#0F2547] uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" /> Direct Mail Preview
                      </h4>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                        Target Preview
                      </span>
                    </div>

                    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden text-xs">
                      <div className="bg-slate-50 p-4 border-b border-slate-100 space-y-1 text-[11px]">
                        <div><strong className="text-slate-400">To:</strong> {directEmail || "recipient@csjmu.ac.in"}</div>
                        <div><strong className="text-slate-400">Subject:</strong> {directSubject || "Direct Communication"}</div>
                      </div>

                      <div className="p-5 space-y-4 text-slate-700 leading-relaxed font-sans min-h-[220px]">
                        <div className="whitespace-pre-line text-xs font-medium text-slate-800">
                          {directBody || "Type in the message content to preview the student view..."}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* ------------------------------------------------------ */}
          {/* TAB 3: FORM SETTINGS & VAULT (FULL NATURAL WIDTH)      */}
          {/* ------------------------------------------------------ */}
          {activeTab === "SETTINGS" && (
            <div className="w-full animate-in fade-in duration-300 pb-12">
              <SettingsTab />
            </div>
          )}

        </div>

      </div>

      {/* ======================================================== */}
      {/* 5. MODAL OVERLAYS: ATTENDANCE SCANNER & MEDIA PREVIEW    */}
      {/* ======================================================== */}

      {/* FULLSCREEN ATTENDANCE SCANNER PORTAL */}
      <AnimatePresence>
        {isAttendancePortalOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="fixed inset-0 z-[200] bg-white overflow-y-auto"
          >
            <div className="min-h-screen w-full mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 flex flex-col">
              <div className="flex items-center justify-between pb-4 mb-4 border-b">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-black uppercase tracking-widest text-[#0F2547]">
                    Live Verification Session
                  </span>
                </div>
                <button
                  onClick={() => setIsAttendancePortalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  Exit Terminal
                </button>
              </div>

              <AttendancePortal onClose={() => setIsAttendancePortalOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MEDIA PREVIEW MODAL */}
      <AnimatePresence>
        {isPreviewOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="clay-card bg-white max-w-2xl w-full p-6 sm:p-7 space-y-5"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <MonitorPlay className="w-5 h-5 text-red-500" />
                  <div>
                    <h3 className="text-base font-black text-[#0F2547]">{mediaTitle}</h3>
                    <p className="text-[10px] font-bold text-slate-400">Hero Player Simulator</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsPreviewOpen(false)} 
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {mediaUrls.length > 0 ? (
                  mediaUrls.slice(0, mediaLimit).map((item, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <span className="text-[9px] font-black uppercase text-blue-600 block">Featured Stream #{idx + 1}</span>
                      <p className="text-xs font-black text-[#0F2547] truncate">{item.title || "Video Stream"}</p>
                      <a 
                        href={item.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="truncate">{item.url}</span>
                      </a>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs font-bold">
                    No active media streams found.
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button 
                  onClick={() => setIsPreviewOpen(false)}
                  className="clay-btn px-5 py-2.5 text-xs font-black text-slate-700"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
