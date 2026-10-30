"use client";

import { useState, useEffect } from "react";
import { 
  runAutoQueue, 
  toggleStudentSelection, 
  updateApplicationStatus, 
  toggleSlotPublish, 
  updateSlotTheme, 
  getGlobalMedia, 
  updateGlobalMedia,
  getOrCreateCurrentSlot,
  fetchAllApplications
} from "@/actions/admin";
import { AppStatus } from "@prisma/client";
import { 
  Zap, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  Clock, 
  UserPlus, 
  UserMinus, 
  Award, 
  Video as VideoIcon, 
  RotateCcw, 
  Edit3, 
  Search, 
  Layers, 
  ChevronDown, 
  MonitorPlay, 
  PlaySquare, 
  LayoutTemplate, 
  Plus, 
  Trash2, 
  XCircle, 
  Save, 
  Settings, 
  Link as LinkIcon,
  Sparkles,
  Radio,
  Filter
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function WorkflowTab({ 
  initialSlot, 
  initialApplications, 
  onNavigateToComm,
  onRefreshApplications,
  onRefreshSlot
}: any) {
  const [slot, setSlot] = useState(initialSlot);
  const [themeText, setThemeText] = useState(initialSlot?.theme || "");
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Sync prop changes
  useEffect(() => {
    if (initialSlot) {
      setSlot(initialSlot);
      setThemeText(initialSlot.theme || "");
    }
  }, [initialSlot]);

  // --- ADVANCED PIPELINE STATES ---
  const [searchTerm, setSearchTerm] = useState("");
  const [groupField, setGroupField] = useState<string | null>(null);

  // --- DYNAMIC MEDIA ENGINE (SPA STATES) ---
  const [isMediaManagerOpen, setIsMediaManagerOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [mediaTitle, setMediaTitle] = useState("Featured Cyber Bulletin Episode");
  const [mediaLimit, setMediaLimit] = useState(1);
  const [mediaUrls, setMediaUrls] = useState<any[]>([]);
  const [tempNewUrl, setTempNewUrl] = useState("");

  const selectedStudents = slot?.selectedTrainees || [];

  function notify(text: string, type: "success" | "error" = "success") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4500);
  }

  // Load Global Media on mount
  useEffect(() => {
    async function fetchMedia() {
      try {
        const res = await getGlobalMedia();
        if (res.success && res.data) {
          setMediaTitle(res.data.title);
          setMediaLimit(res.data.limit);
          try { setMediaUrls(JSON.parse(res.data.urls)); } catch(e){}
        }
      } catch {}
    }
    fetchMedia();
  }, []);

  async function refreshLocalData() {
    try {
      const [freshSlot, freshAppsRes] = await Promise.all([
        getOrCreateCurrentSlot(),
        fetchAllApplications()
      ]);
      if (freshSlot) {
        setSlot(freshSlot);
        if (onRefreshSlot) onRefreshSlot(freshSlot);
      }
      if (freshAppsRes.success && freshAppsRes.data) {
        const filtered = freshAppsRes.data.filter((a: any) => a.weeklySlotId !== undefined && a.status !== "RECORDED");
        if (onRefreshApplications) onRefreshApplications(filtered);
      }
    } catch {}
  }

  async function handlePublishMedia() {
    setLoading("publish-media");
    try {
      const res = await updateGlobalMedia(mediaTitle, mediaLimit, JSON.stringify(mediaUrls));
      if (res.success) {
        notify(res.message || "Homepage Media Engine updated & published!", "success");
        setIsMediaManagerOpen(false);
      } else {
        notify(res.error || "Failed to update media settings", "error");
      }
    } catch {
      notify("Network error while updating media", "error");
    } finally {
      setLoading("");
    }
  }

  function addMediaUrl() {
    if (!tempNewUrl.trim()) return;
    let type = "link";
    if (tempNewUrl.includes("youtube.com") || tempNewUrl.includes("youtu.be")) type = "youtube";
    else if (tempNewUrl.includes("instagram.com")) type = "instagram";
    setMediaUrls([...mediaUrls, { type, url: tempNewUrl.trim() }]);
    setTempNewUrl("");
  }

  async function handleAutoQueue() {
    setLoading("auto-queue");
    try {
      const res: any = await runAutoQueue(slot.id);
      if (res.error) {
        notify(res.error, "error");
      } else {
        notify(`Auto-Queue Successful: ${res.count || 0} candidate(s) shortlisted.`, "success");
        await refreshLocalData();
      }
    } catch {
      notify("Failed to execute auto-queue", "error");
    } finally {
      setLoading("");
    }
  }

  async function handleTogglePublish() {
    setLoading("publish");
    try {
      const newStatus = !slot.isPublished;
      const res: any = await toggleSlotPublish(slot.id, newStatus);
      if (res.success) { 
        setSlot({ ...slot, isPublished: newStatus }); 
        notify(newStatus ? "Weekly Slot published to Program Home!" : "Weekly Slot revoked from Program Home.", "success"); 
      }
    } catch {
      notify("Failed to toggle publish status", "error");
    } finally {
      setLoading("");
    }
  }

  async function handleSaveTheme() {
    setLoading("theme");
    try {
      const res: any = await updateSlotTheme(slot.id, themeText);
      if (res.success) { 
        setSlot({ ...slot, theme: themeText }); 
        notify("Weekly broadcast theme updated successfully.", "success"); 
      }
    } catch {
      notify("Failed to update theme", "error");
    } finally {
      setLoading("");
    }
  }

  async function handleToggleSelect(appId: string) {
    setLoading(appId);
    try {
      const res: any = await toggleStudentSelection(appId, slot.id);
      if (res.error) {
        notify(res.error, "error");
      } else {
        notify(res.message || "Candidate slot allocation updated.", "success");
        await refreshLocalData();
      }
    } catch {
      notify("Failed to update candidate slot allocation", "error");
    } finally {
      setLoading("");
    }
  }

  async function handleStatusChange(appId: string, status: AppStatus) {
    setLoading(appId);
    try {
      const res: any = await updateApplicationStatus(appId, status);
      if (res.success) { 
        notify(`Application status updated to ${status}.`, "success"); 
        await refreshLocalData();
      } else {
        notify("Failed to update status", "error");
      }
    } catch {
      notify("Network error updating status", "error");
    } finally {
      setLoading("");
    }
  }

  const applicationsList = initialApplications || [];

  const availableGroupFields = Array.from(new Set(
    applicationsList.flatMap((app: any) => {
      try {
        const data = JSON.parse(app.dynamicData || "{}");
        return Object.keys(data).filter(k => !k.startsWith("$ACTION") && typeof data[k] !== "object");
      } catch { return []; }
    })
  ));

  const processedApps = applicationsList.filter((app: any) => {
    const matchesStatus = filter === "ALL" ? true : app.status === filter;
    const searchLower = searchTerm.toLowerCase();
    const userName = app.user?.name || app.name || "";
    const userEmail = app.user?.email || app.email || "";
    const matchesSearch = userName.toLowerCase().includes(searchLower) || userEmail.toLowerCase().includes(searchLower) || (app.dynamicData && app.dynamicData.toLowerCase().includes(searchLower));
    return matchesStatus && matchesSearch;
  }).sort((a: any, b: any) => {
    if (a.status === "COMPLETED" && b.status !== "COMPLETED") return 1;
    if (b.status === "COMPLETED" && a.status !== "COMPLETED") return -1;
    return new Date(b.appliedAt || 0).getTime() - new Date(a.appliedAt || 0).getTime();
  });

  let groupedApps: Record<string, any[]> = { "All Candidates": processedApps };
  if (groupField) {
    groupedApps = {};
    processedApps.forEach((app: any) => {
      let val = "Unspecified";
      try {
        const data = JSON.parse(app.dynamicData || "{}");
        if (data[groupField]) val = Array.isArray(data[groupField]) ? data[groupField].join(", ") : String(data[groupField]);
      } catch {}
      if (!groupedApps[val]) groupedApps[val] = [];
      groupedApps[val].push(app);
    });
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 relative">
      
      {/* Toast Alert */}
      {message && (
        <div className={`p-4 rounded-2xl text-xs sm:text-sm font-bold text-center border shadow-md transition-all ${
          message.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"
        }`}>
          {message.text}
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. DYNAMIC MEDIA BROADCASTING ENGINE                     */}
      {/* ======================================================== */}
      <section className="clay-card p-5 sm:p-7 space-y-5 border border-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/30 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
        
        <div className="flex flex-col md:flex-row justify-between md:items-center border-b border-blue-200/50 pb-4 gap-4 relative z-10">
          <div>
            <span className="clay-badge-blue px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-1.5 inline-block">
              Homepage Module
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#0F2547] flex items-center gap-2">
              <PlaySquare className="w-6 h-6 text-red-500"/> Media Broadcasting Hub
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Control live episode reels, video links and public display limits on the landing portal.</p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button 
              onClick={() => setIsPreviewOpen(true)} 
              className="clay-btn px-4 py-2.5 text-xs font-black text-slate-700 flex items-center gap-2 hover:text-blue-600 shadow-sm"
            >
              <LayoutTemplate className="w-4 h-4 text-blue-500"/> Preview Live Layout
            </button>
            <button 
              onClick={() => setIsMediaManagerOpen(true)} 
              className="clay-btn-primary px-5 py-2.5 text-xs font-black flex items-center gap-2 shadow-lg uppercase tracking-wider"
            >
              <Settings className="w-4 h-4"/> Configure Links
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <div className="bg-white/80 px-4 py-2 rounded-2xl border border-white text-xs font-bold text-slate-700 shadow-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Active Links: <strong className="text-blue-600 font-extrabold">{mediaUrls.length}</strong>
          </div>
          <div className="bg-white/80 px-4 py-2 rounded-2xl border border-white text-xs font-bold text-slate-700 shadow-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-500" /> Max Display: <strong className="text-amber-600 font-extrabold">{mediaLimit} Video(s)</strong>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. WEEKLY BROADCAST BATCH & PRESENTER SLOTS             */}
      {/* ======================================================== */}
      <section className="clay-card p-5 sm:p-7 space-y-6 border border-white shadow-md">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-blue-200/50 pb-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="clay-badge-blue px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase">Active Batch Pipeline</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                slot.isPublished ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-amber-100 text-amber-800 border-amber-300"
              }`}>
                {slot.isPublished ? "🟢 Live on Program Home" : "🟡 Hidden from Platform"}
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-[#0F2547]">Weekly Broadcast Configuration</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <button 
              onClick={handleTogglePublish} 
              disabled={loading === "publish"} 
              className={`clay-btn flex-1 sm:flex-none px-4 py-2.5 text-xs font-extrabold flex items-center justify-center gap-1.5 ${
                slot.isPublished ? "hover:bg-amber-50 text-amber-800" : "hover:bg-emerald-50 text-emerald-800"
              }`}
            >
              {slot.isPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{slot.isPublished ? "Revoke Visibility" : "Publish to Home"}</span>
            </button>

            <button 
              onClick={handleAutoQueue} 
              disabled={loading === "auto-queue"} 
              className="clay-btn-primary flex-1 sm:flex-none px-4 py-2.5 text-xs font-black flex items-center justify-center gap-1.5 shadow-md"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>{loading === "auto-queue" ? "Queuing..." : "Auto-Queue (2 Slots)"}</span>
            </button>

            <button 
              onClick={onNavigateToComm} 
              disabled={selectedStudents.length === 0} 
              className="clay-btn w-full sm:w-auto px-4 py-2.5 text-xs font-extrabold flex items-center justify-center gap-1.5 hover:bg-blue-50 text-blue-700 disabled:opacity-50"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Dispatch Screening Invites</span>
            </button>
          </div>
        </div>

        {/* Theme designation editor */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 pt-1">
          <div className="w-full min-w-0 flex-1">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Weekly Theme Designation</label>
            <input 
              type="text" 
              value={themeText} 
              onChange={(e) => setThemeText(e.target.value)} 
              className="clay-input w-full px-4 py-2.5 text-xs sm:text-sm font-extrabold" 
              placeholder="e.g. Advanced Persistent Threats & Zero-Day Vectors" 
            />
          </div>
          <button 
            onClick={handleSaveTheme} 
            disabled={loading === "theme"} 
            className="clay-btn px-5 py-2.5 text-xs font-black shrink-0 hover:text-blue-600"
          >
            {loading === "theme" ? "Saving..." : "Save Theme"}
          </button>
        </div>

        {/* Assigned Presenters Grid */}
        <div className="space-y-3 pt-2">
          <p className="text-xs font-black text-[#0F2547] uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-600" />
            <span>Assigned Presenters ({selectedStudents.length} / 2 Maximum)</span>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[0, 1].map((index) => {
              const trainee = selectedStudents[index];
              return trainee ? (
                <div key={trainee.id} className="clay-card p-4 sm:p-5 bg-white/95 space-y-3 border border-white shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <span className="clay-badge-blue px-2 py-0.5 rounded-full text-[9px] font-black uppercase">Presenter Slot #{index + 1}</span>
                      <h4 className="font-black text-[#0F2547] text-sm truncate mt-1">
                        {trainee.user?.name || trainee.name || "Unknown Trainee"}
                      </h4>
                      <p className="text-xs text-slate-500 truncate font-medium">{trainee.user?.email || trainee.email}</p>
                    </div>
                    <button 
                      onClick={() => handleToggleSelect(trainee.id)} 
                      disabled={loading === trainee.id}
                      className="clay-btn px-3 py-1.5 text-xs font-black text-red-600 hover:bg-red-50 flex items-center gap-1 border-red-100 shrink-0" 
                      title="Revoke Allocation"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      <span>Revoke</span>
                    </button>
                  </div>
                  <div className="clay-inset p-3 rounded-2xl text-xs font-medium text-slate-700">
                    <span className="font-extrabold text-blue-700 uppercase tracking-wider text-[10px] block mb-0.5">Topic:</span>
                    <span className="font-bold">{trainee.topicInterested}</span>
                  </div>
                </div>
              ) : (
                <div key={index} className="clay-soft-blue p-5 sm:p-6 rounded-3xl border-2 border-dashed border-blue-200/80 text-center flex flex-col items-center justify-center space-y-1.5 min-h-[140px]">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Slot #{index + 1} (Unassigned)</span>
                  <p className="text-[11px] text-slate-500 font-medium max-w-xs">Click Auto-Queue above or assign a shortlisted applicant from the queue below.</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. PIPELINE QUEUE & REGISTRY ENROLLMENTS                */}
      {/* ======================================================== */}
      <section className="clay-card p-5 sm:p-7 space-y-6 border border-white shadow-md">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-200/50 pb-4">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-2">
              Candidate Registry <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-black text-[10px]">{processedApps.length} Records</span>
            </span>
            <h3 className="text-lg sm:text-xl font-black text-[#0F2547] mt-0.5">Enrollment Pipeline Queue</h3>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
            {/* Search Bar */}
            <div className="relative w-full sm:w-56 md:w-64 min-w-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search candidates, topics..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="clay-input w-full pl-9 pr-4 py-2 text-xs font-bold"
              />
            </div>

            {/* Dynamic Grouping */}
            <div className="relative group w-full sm:w-auto shrink-0">
              <button className={`clay-btn w-full sm:w-auto px-4 py-2 text-xs font-bold flex items-center justify-between sm:justify-center gap-2 ${groupField ? "bg-purple-100 text-purple-800 border-purple-200" : ""}`}>
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600" />
                  <span>{groupField ? `Group: ${groupField}` : "Group Data"}</span>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 shadow-xl rounded-2xl p-2 hidden group-hover:block z-50 clay-card">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 px-2">Group By Field:</p>
                <button onClick={() => setGroupField(null)} className="w-full text-left px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl">Clear Grouping</button>
                {availableGroupFields.map(field => (
                  <button key={field as string} onClick={() => setGroupField(field as string)} className="w-full text-left px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl truncate">
                    {field as string}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* STATUS FILTER BADGES */}
        <div className="overflow-x-auto no-scrollbar scroll-smooth flex items-center gap-1.5 pb-2 flex-nowrap sm:flex-wrap w-full">
          {["ALL", "WAITING", "SHORTLISTED", "SCREENING_DONE", "COMPLETED", "REJECTED"].map((st) => (
            <button 
              key={st} 
              onClick={() => setFilter(st)} 
              className={`shrink-0 px-3 py-1.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all ${
                filter === st 
                  ? "clay-btn-primary shadow-sm" 
                  : "clay-btn text-slate-600 hover:text-blue-600"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* RENDER CANDIDATES LIST */}
        {Object.entries(groupedApps).map(([groupName, apps]) => (
          apps.length > 0 && (
            <div key={groupName} className="space-y-3 mb-6">
              {groupField && (
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 bg-white px-3.5 py-1.5 rounded-2xl inline-block border border-slate-200 shadow-sm">
                  📁 {groupName} <span className="text-slate-400 ml-1">({apps.length})</span>
                </h4>
              )}
              
              <div className="space-y-3">
                {apps.map((app: any, index: number) => {
                  const isSelectedInSlot = app.weeklySlotId === slot?.id;
                  return (
                    <div 
                      key={app.id} 
                      className={`clay-pill p-4 sm:p-5 transition-all duration-300 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                        isSelectedInSlot ? "ring-2 ring-blue-500 bg-blue-50/40" : ""
                      } ${app.status === "COMPLETED" ? "opacity-70 bg-slate-50" : "hover:-translate-y-0.5"}`}
                    >
                      <div className="space-y-1.5 max-w-2xl min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-black text-slate-400 w-5">{index + 1}.</span>
                          <h4 className="font-black text-[#0F2547] text-sm break-words">
                            {app.user?.name || app.name || "Unknown Candidate"}
                          </h4>
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            app.status === "WAITING" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                            app.status === "SHORTLISTED" ? "bg-blue-100 text-blue-800 border border-blue-200" :
                            app.status === "SCREENING_DONE" ? "bg-purple-100 text-purple-800 border border-purple-200" :
                            app.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-red-100 text-red-800 border border-red-200"
                          }`}>
                            {app.status}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 mt-1 sm:ml-7">
                          {(() => {
                            let highlights: Record<string, any> = {};
                            try { if (app.highlightedData) highlights = JSON.parse(app.highlightedData); } catch (e) {}
                            const entries = Object.entries(highlights);
                            if (entries.length > 0) {
                              return entries.map(([k, v]) => (
                                <p key={k} className="text-[11px] text-slate-700 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-sm font-medium">
                                  <strong className="text-blue-700 font-extrabold uppercase tracking-wider text-[10px]">{k}:</strong> {String(v)}
                                </p>
                              ));
                            }
                            return (
                              <p className="text-[11px] text-slate-700 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-sm font-medium">
                                <strong className="text-blue-700 font-extrabold uppercase tracking-wider text-[10px]">Topic:</strong> {app.topicInterested}
                              </p>
                            );
                          })()}
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium sm:ml-7 truncate">
                          {app.user?.email || app.email} • Enrolled on {new Date(app.appliedAt || Date.now()).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-blue-100 shrink-0">
                        {app.status !== "COMPLETED" && (
                          <>
                            <button 
                              onClick={() => handleToggleSelect(app.id)} 
                              disabled={loading === app.id} 
                              className={`px-3.5 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all ${
                                isSelectedInSlot 
                                  ? "bg-red-100 text-red-700 hover:bg-red-200 border border-red-200" 
                                  : "clay-btn hover:bg-blue-50 text-blue-700"
                              }`}
                            >
                              {isSelectedInSlot ? <UserMinus className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                              <span>{isSelectedInSlot ? "Revoke Slot" : "Assign to Slot"}</span>
                            </button>
                            {app.status !== "SCREENING_DONE" && (
                              <button 
                                onClick={() => handleStatusChange(app.id, "SCREENING_DONE")} 
                                className="clay-btn px-3 py-2 text-xs font-extrabold text-purple-700 hover:bg-purple-50 flex items-center gap-1" 
                                title="Pass Screening Call"
                              >
                                <CheckCircle className="w-3.5 h-3.5 text-purple-600" />
                                <span>Screened</span>
                              </button>
                            )}
                            <button 
                              onClick={() => handleStatusChange(app.id, "COMPLETED")} 
                              className="clay-btn px-3 py-2 text-xs font-extrabold text-emerald-700 hover:bg-emerald-50 flex items-center gap-1" 
                              title="Mark Production Completed"
                            >
                              <VideoIcon className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Complete</span>
                            </button>
                          </>
                        )}
                        {app.status === "COMPLETED" && (
                          <div className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black rounded-2xl flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4 text-emerald-600" /> Published Bulletin
                          </div>
                        )}
                        {app.status !== "WAITING" && app.status !== "COMPLETED" && (
                          <button 
                            onClick={() => handleStatusChange(app.id, "WAITING")} 
                            className="clay-btn p-2 text-slate-500 hover:bg-slate-100" 
                            title="Reset candidate back to waiting queue"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ))}

        {processedApps.length === 0 && (
          <div className="clay-soft-blue p-10 text-center rounded-3xl space-y-2 mt-4">
            <Clock className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-sm font-black text-slate-700">No Candidate Records Found</h4>
            <p className="text-xs text-slate-500 font-medium">No registrations match your active search keyword or category filter.</p>
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* MODAL 1: FULL MEDIA MANAGER                             */}
      {/* ======================================================== */}
      {isMediaManagerOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-3xl clay-card shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-white">
            <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-black text-[#0F2547] flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600"/> Media Broadcasting Configuration
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Manage YouTube/Instagram links and display limits on the live portal.</p>
              </div>
              <button 
                onClick={() => setIsMediaManagerOpen(false)} 
                className="w-9 h-9 rounded-2xl bg-white border border-slate-200 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors font-bold shadow-sm"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-5 bg-white flex-1 no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">Section Title on Home</label>
                  <input 
                    type="text" 
                    value={mediaTitle} 
                    onChange={e => setMediaTitle(e.target.value)} 
                    className="clay-input w-full px-4 py-2.5 text-xs font-bold" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">Max Display Limit</label>
                  <select 
                    value={mediaLimit} 
                    onChange={e => setMediaLimit(Number(e.target.value))} 
                    className="clay-input w-full px-4 py-2.5 text-xs font-bold bg-white cursor-pointer"
                  >
                    <option value={1}>Show 1 Video (Single Feature)</option>
                    <option value={2}>Show 2 Videos (Grid Layout)</option>
                    <option value={3}>Show 3 Videos (Grid Layout)</option>
                    <option value={4}>Show 4 Videos (Grid Layout)</option>
                  </select>
                </div>
              </div>

              <div className="clay-inset p-4 rounded-2xl bg-blue-50/40 border border-blue-100">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Add Media Link</label>
                <div className="flex gap-2">
                  <input 
                    type="url" 
                    value={tempNewUrl} 
                    onChange={e => setTempNewUrl(e.target.value)} 
                    placeholder="Paste Instagram Reel or YouTube embed link..." 
                    className="clay-input w-full px-4 py-2.5 text-xs font-medium" 
                  />
                  <button 
                    onClick={addMediaUrl} 
                    className="clay-btn-primary px-5 py-2.5 text-xs font-black shrink-0 flex items-center gap-1 shadow-md"
                  >
                    <Plus className="w-4 h-4"/> Add Link
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Active Broadcast Links ({mediaUrls.length})</p>
                {mediaUrls.length > 0 ? (
                  mediaUrls.map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200 group hover:border-blue-300 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center shrink-0">
                          {m.type === "youtube" ? <MonitorPlay className="w-4 h-4 text-red-500"/> : m.type === "instagram" ? <VideoIcon className="w-4 h-4 text-pink-500"/> : <LinkIcon className="w-4 h-4 text-blue-500"/>}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-700 truncate">{m.url}</p>
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase">{m.type}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setMediaUrls(mediaUrls.filter((_, i) => i !== idx))} 
                        className="text-slate-400 hover:text-red-500 p-2 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-400 text-xs font-bold border-2 border-dashed border-slate-200 rounded-2xl">
                    No active media links added yet.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 p-4 sm:p-5 border-t border-slate-200 flex justify-end gap-2.5 shrink-0">
              <button 
                onClick={() => setIsMediaManagerOpen(false)} 
                className="clay-btn px-5 py-2.5 text-xs font-extrabold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button 
                onClick={handlePublishMedia} 
                disabled={loading === "publish-media"} 
                className="clay-btn-primary px-6 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg"
              >
                <Save className="w-4 h-4"/> {loading === "publish-media" ? "Publishing..." : "Publish to Program Home"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: LIVE HOMEPAGE PREVIEW                          */}
      {/* ======================================================== */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in">
          <div className="bg-slate-100 rounded-3xl w-full max-w-5xl h-full max-h-[90vh] flex flex-col overflow-hidden border-4 border-slate-800 shadow-2xl relative">
            <div className="bg-white border-b border-slate-200 p-4 flex justify-between items-center z-40 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span className="ml-2 text-xs font-black text-slate-400 tracking-wider">PROGRAM HOME PREVIEW</span>
              </div>
              <button 
                onClick={() => setIsPreviewOpen(false)} 
                className="px-4 py-1.5 bg-slate-800 text-white text-xs font-extrabold rounded-xl hover:bg-slate-700"
              >
                Close Preview
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-slate-50 no-scrollbar">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="text-center space-y-2">
                  <span className="text-xs font-black text-red-600 uppercase tracking-widest bg-red-50 px-3 py-1 rounded-full border border-red-200">
                    <MonitorPlay className="w-3.5 h-3.5 inline mr-1"/> Club Broadcast Episode
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-[#0F2547] tracking-tight">{mediaTitle}</h2>
                </div>

                {mediaUrls.length > 0 ? (
                  <div className={`grid gap-5 ${mediaLimit === 1 ? 'grid-cols-1 max-w-2xl mx-auto' : mediaLimit === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'}`}>
                    {mediaUrls.slice(0, mediaLimit).map((m, idx) => (
                      <div key={idx} className="aspect-video bg-slate-900 rounded-3xl border-4 border-white shadow-xl relative overflow-hidden flex items-center justify-center group">
                        <PlaySquare className="w-12 h-12 text-white/80 group-hover:scale-110 transition-transform relative z-10" />
                        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur px-2.5 py-1 rounded-lg text-[9px] text-white font-black">{m.type.toUpperCase()}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 text-center bg-white border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-bold">
                    No active media URLs configured.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
