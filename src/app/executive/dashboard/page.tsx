"use client";

import { useState, useEffect } from "react";
import { getOrCreateCurrentSlot, runAutoQueue, toggleStudentSelection, updateApplicationStatus, fetchAllApplications, getGlobalMedia, updateGlobalMedia } from "@/actions/admin";
import { submitReviewRequest } from "@/actions/requests";
import { Video, Video as VideoIcon, RotateCcw, Send, Settings, Zap, ShieldAlert, CheckCircle,
   Clock, UserPlus, UserMinus, Search, Layers, ChevronDown,Lock, Link as LinkIcon, MonitorPlay, Camera, Plus, Trash2, XCircle, PlaySquare, LayoutTemplate, Save } from "lucide-react";
import SettingsTab from "@/components/admin/SettingsTab"; // 🟢 IMPORTED CLEAN COMPONENT

export default function ExecutiveDashboard() {
  const [activeTab, setActiveTab] = useState<"WORKFLOW" | "COMMUNICATION" | "SETTINGS">("WORKFLOW");
  const [commSubTab, setCommSubTab] = useState<"SCREENING" | "MASS">("SCREENING");
  
  const [loading, setLoading] = useState<string>("init");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // --- DATA & BADGE STATES ---
  const [slot, setSlot] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [filter, setFilter] = useState("ALL");
  
  // Notification Badges
  const [pendingWorkflowCount, setPendingWorkflowCount] = useState(0);

  const [screeningTemplate, setScreeningTemplate] = useState("Hello {{name}},\n\nYour presentation is scheduled.");
  const [massSubject, setMassSubject] = useState("");
  const [massTemplate, setMassTemplate] = useState("<h2>Hello {{name}},</h2>\n<p>Message...</p>");

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
    setTimeout(() => setMessage(null), 5000);
  }

  useEffect(() => {
    async function loadData() {
      try {
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
              topicInterested: app.topicInterested || app.topic || "Not Selected",
              status: app.status || "WAITING",
              appliedAt: app.appliedAt || app.date || new Date().toISOString(),
              weeklySlotId: app.weeklySlotId || null,
              user: app.user || { name: app.name || "Unknown User", email: app.email || "No Email" },
              dynamicData: app.dynamicData || "{}", 
              description: app.description || ""
          }));
          setApplications(realData);
          
          const waitingApps = realData.filter((a: any) => a.status === "WAITING").length;
          setPendingWorkflowCount(waitingApps);
        }

        const savedTemplate = localStorage.getItem("savedScreeningTemplate");
        if (savedTemplate) setScreeningTemplate(savedTemplate);

        const mediaRes = await getGlobalMedia();
        if (mediaRes.success && mediaRes.data) {
          setMediaTitle(mediaRes.data.title);
          setMediaLimit(mediaRes.data.limit);
          try { setMediaUrls(JSON.parse(mediaRes.data.urls)); } catch(e){}
        }
      } catch (error) {
        notify("Failed to load dashboard data", "error");
      }
      setLoading("");
    }
    loadData();
  }, []);

  async function handlePublishMedia() {
    setLoading("publish-media");
    const res = await updateGlobalMedia(mediaTitle, mediaLimit, JSON.stringify(mediaUrls));
    if (res.success) {
      notify(res.message);
      setIsMediaManagerOpen(false);
    } else notify(res.error || "Failed", "error");
    setLoading("");
  }

  function addMediaUrl() {
    if (!tempNewUrl) return;
    let type = "link";
    if (tempNewUrl.includes("youtube.com") || tempNewUrl.includes("youtu.be")) type = "youtube";
    else if (tempNewUrl.includes("instagram.com")) type = "instagram";
    setMediaUrls([...mediaUrls, { type, url: tempNewUrl }]);
    setTempNewUrl("");
  }

  const availableGroupFields = Array.from(new Set(
    applications.flatMap((app: any) => {
      try {
        const data = JSON.parse(app.dynamicData || "{}");
        return Object.keys(data).filter(k => !k.startsWith("$ACTION"));
      } catch { return []; }
    })
  ));

  const processedApps = applications.filter((app: any) => {
    const matchesStatus = filter === "ALL" ? true : app.status === filter;
    const searchLower = searchTerm.toLowerCase();
    const userName = app.user?.name || app.name || "";
    const userEmail = app.user?.email || app.email || "";
    
    const matchesSearch = userName.toLowerCase().includes(searchLower) || 
                          userEmail.toLowerCase().includes(searchLower) ||
                          (app.dynamicData && app.dynamicData.toLowerCase().includes(searchLower));
    return matchesStatus && matchesSearch;
  }).sort((a: any, b: any) => {
    if (a.status === "COMPLETED" && b.status !== "COMPLETED") return 1;
    if (b.status === "COMPLETED" && a.status !== "COMPLETED") return -1;
    return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime();
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

  async function handleRequestPublish() {
    setLoading("request-publish");
    const res = await submitReviewRequest("PUBLISH_SLOT", { slotId: slot.id });
    if (res.success) notify(res.message || "");
    else notify(res.error || "", "error");
    setLoading("");
  }

  async function handleRequestTemplateChange() {
    setLoading("request-template");
    const res = await submitReviewRequest("UPDATE_MAIL_TEMPLATE", { template: screeningTemplate });
    if (res.success) notify(res.message || "");
    else notify(res.error || "", "error");
    setLoading("");
  }

  async function handleAutoQueue() {
    setLoading("auto-queue");
    const res = await runAutoQueue(slot.id);
    if (res.error) notify(res.error, "error");
    else window.location.reload();
  }

  async function handleToggleSelect(appId: string) {
    setLoading(appId);
    const res = await toggleStudentSelection(appId, slot.id);
    if (res.error) notify(res.error, "error");
    else window.location.reload();
  }

  async function handleStatusChange(appId: string, status: string) {
    setLoading(appId);
    const res = await updateApplicationStatus(appId, status as any);
    if (res.success) window.location.reload();
    else notify("Failed to update status", "error");
  }

  if (loading === "init") return <div className="p-8 text-center text-slate-500 font-bold">Loading Executive Console...</div>;

  return (
    <div className="space-y-6 pb-16 animate-in fade-in">
      
      {message && (
        <div className={`p-4 rounded-2xl text-xs sm:text-sm font-bold text-center border shadow-md transition-all ${
          message.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"
        }`}>
          {message.text}
        </div>
      )}

      {/* Header & Tabs with Badges */}
      <div className="space-y-4 border-b border-slate-200 pb-2">
        <div className="px-1 sm:px-2 flex items-center justify-between">
          <div>
            <span className="clay-badge-amber text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">Core Team</span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F2547] mt-1">Executive Console</h1>
          </div>
        </div>

        <div className="overflow-x-auto no-scrollbar scroll-smooth flex items-center gap-2 flex-nowrap pb-1 w-full">
          <button onClick={() => setActiveTab("WORKFLOW")} className={`relative shrink-0 px-3.5 sm:px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all ${activeTab === "WORKFLOW" ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"}`}>
            <div className="flex items-center gap-2"><Video className="w-4 h-4" /> Presenter Workflow</div>
            {pendingWorkflowCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white shadow-sm ring-2 ring-white">
                {pendingWorkflowCount}
              </span>
            )}
          </button>
          
          <button onClick={() => setActiveTab("COMMUNICATION")} className={`shrink-0 px-3.5 sm:px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all ${activeTab === "COMMUNICATION" ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"}`}>
            <div className="flex items-center gap-2"><Send className="w-4 h-4" /> Communication</div>
          </button>

          <button onClick={() => setActiveTab("SETTINGS")} className={`shrink-0 px-3.5 sm:px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all ${activeTab === "SETTINGS" ? "bg-slate-800 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"}`}>
            <div className="flex items-center gap-2"><Settings className="w-4 h-4" /> Form Settings</div>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: WORKFLOW ================= */}
      {activeTab === "WORKFLOW" && (
        <div className="space-y-6 sm:space-y-8">
          
          {/* 🎬 DYNAMIC MEDIA ENGINE (SPA HUB) */}
          <section className="clay-card p-4 sm:p-6 md:p-8 space-y-6 bg-gradient-to-br from-white to-slate-50 border-2 border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/30 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
            <div className="flex flex-col md:flex-row justify-between md:items-center border-b border-slate-200/80 pb-5 gap-4 relative z-10">
               <div>
                  <span className="clay-badge-blue px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 inline-block">Global Module</span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F2547] flex items-center gap-2">
                    <MonitorPlay className="w-6 h-6 text-red-500"/> Media Broadcasting Hub
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Manage multiple URLs, control home page display limits, and preview live design.</p>
               </div>
               <div className="flex flex-wrap gap-3">
               <button onClick={() => setIsPreviewOpen(true)} className="clay-btn px-4 py-2.5 text-xs font-bold text-slate-700 flex items-center gap-2 bg-white hover:bg-slate-50 border-2 border-slate-200">
                 <LayoutTemplate className="w-4 h-4 text-blue-500"/> Preview Design
               </button>
               {/* 🟢 FIX: Executive can only view, not manage Media. Ask Admin for changes. */}
               <button onClick={() => alert("Media Engine management is restricted to the Supreme Admin. Please submit a review request for media changes.")} className="clay-btn px-5 py-2.5 text-xs font-extrabold flex items-center gap-2 shadow-sm uppercase tracking-wider bg-slate-200 text-slate-500 cursor-not-allowed">
                 <Lock className="w-4 h-4"/> Admin Only
               </button>
            </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 relative z-10">
               <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 shadow-sm flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Active Links: <span className="text-blue-600">{mediaUrls.length}</span>
               </div>
               <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 shadow-sm flex items-center gap-2">
                 <Layers className="w-4 h-4 text-amber-500" /> Display Limit: <span className="text-amber-600">{mediaLimit} Max</span>
               </div>
            </div>
          </section>

          <section className="clay-card p-4 sm:p-6 md:p-8 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
              <div className="space-y-1 min-w-0">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${slot.isPublished ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-amber-100 text-amber-800 border border-amber-300"}`}>
                  {slot.isPublished ? "🟢 Live on Program Home" : "🟡 Hidden from Platform"}
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F2547]">Weekly Broadcast Config</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                <button onClick={handleRequestPublish} disabled={loading === "request-publish"} className="clay-btn flex-1 sm:flex-none justify-center px-4 py-2.5 text-xs flex items-center gap-1.5 hover:bg-amber-50 text-amber-700">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{loading === "request-publish" ? "Submitting..." : "Request Roster Publish"}</span>
                </button>
                <button onClick={handleAutoQueue} disabled={loading === "auto-queue"} className="clay-btn-primary flex-1 sm:flex-none justify-center px-4 py-2.5 text-xs flex items-center gap-1.5 shadow-sm">
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>Execute Auto-Queue</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {[0, 1].map((index) => {
                const trainee = selectedStudents[index];
                return trainee ? (
                  <div key={trainee.id} className="clay-card p-4 sm:p-5 bg-white/90 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-black text-blue-600 uppercase">Allocation #{index + 1}</span>
                        <h4 className="font-extrabold text-[#0F2547] text-sm truncate">{trainee.user.name}</h4>
                      </div>
                      <button onClick={() => handleToggleSelect(trainee.id)} className="shrink-0 clay-btn px-2.5 py-1 text-[11px] text-red-600 flex items-center gap-1 hover:bg-red-50">
                        <UserMinus className="w-3 h-3" /><span>Revoke</span>
                      </button>
                    </div>
                    <div className="clay-inset p-2.5 rounded-xl text-xs font-medium text-slate-700 break-words">
                      <span className="font-bold text-blue-700">Subject:</span> {trainee.topicInterested}
                    </div>
                  </div>
                ) : (
                  <div key={index} className="clay-soft-blue p-5 sm:p-6 rounded-2xl border-2 border-dashed border-blue-200 text-center flex flex-col items-center justify-center space-y-1.5">
                    <span className="text-xs font-black text-slate-400">Allocation #{index + 1} (Unassigned)</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 🚀 ADVANCED PIPELINE QUEUE PANEL */}
          <section className="clay-card p-4 sm:p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-2">
                  Candidate Pipeline <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">{processedApps.length} Total</span>
                </span>
                <h3 className="text-lg sm:text-xl font-extrabold text-[#0F2547]">Enrollment Registry</h3>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                <div className="relative w-full sm:w-48 md:w-64 min-w-0">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Search name, domain, year..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="clay-input w-full pl-9 pr-4 py-2 text-base sm:text-xs font-bold"
                  />
                </div>

                <div className="relative group w-full sm:w-auto shrink-0">
                  <button className={`clay-btn w-full sm:w-auto px-4 py-2 text-xs font-bold flex items-center justify-between sm:justify-center gap-2 ${groupField ? "bg-purple-100 text-purple-800 border-purple-200" : ""}`}>
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      <span>{groupField ? `Grouped by: ${groupField}` : "Isolate Grouping"}</span>
                    </div>
                    <ChevronDown className="w-3 h-3 ml-auto sm:ml-0" />
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 shadow-xl rounded-xl p-2 hidden group-hover:block z-50">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2 px-2">Group candidates by:</p>
                    <button onClick={() => setGroupField(null)} className="w-full text-left px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg">Disable Grouping</button>
                    {availableGroupFields.map(field => (
                      <button key={field as string} onClick={() => setGroupField(field as string)} className="w-full text-left px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg truncate">
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
                <button key={st} onClick={() => setFilter(st)} className={`shrink-0 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all ${filter === st ? "clay-btn-primary shadow-sm" : "clay-btn text-slate-600 hover:text-blue-600"}`}>{st}</button>
              ))}
            </div>

            {/* RENDER GROUPED & ANIMATED CANDIDATES */}
            {Object.entries(groupedApps).map(([groupName, apps]) => (
              apps.length > 0 && (
                <div key={groupName} className="space-y-3.5 mb-6">
                  {groupField && (
                    <h4 className="text-sm font-extrabold text-slate-800 bg-slate-100 inline-block px-3 py-1 rounded-lg border border-slate-200">
                      📁 {groupName} <span className="text-slate-400 ml-2">({apps.length})</span>
                    </h4>
                  )}
                  
                  <div className="space-y-3.5">
                    {apps.map((app: any, index: number) => {
                      const isSelectedInSlot = app.weeklySlotId === slot?.id;
                      return (
                        <div 
                          key={app.id} 
                          className={`clay-pill p-4 sm:p-5 transition-all duration-500 ease-in-out transform flex flex-col lg:flex-row lg:items-center justify-between gap-4 
                          ${isSelectedInSlot ? "ring-2 ring-blue-500/50 bg-blue-50/20" : ""} 
                          ${app.status === "COMPLETED" ? "opacity-60 scale-[0.98] bg-slate-50 grayscale-[20%]" : "hover:scale-[1.01]"}`}
                        >
                          <div className="space-y-2 max-w-2xl min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-black text-slate-300 w-5">{index + 1}.</span>
                              <h4 className="font-extrabold text-[#0F2547] text-sm break-words">{app.user?.name || app.name}</h4>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                app.status === "WAITING" ? "bg-amber-100 text-amber-800" :
                                app.status === "SHORTLISTED" ? "bg-blue-100 text-blue-800" :
                                app.status === "SCREENING_DONE" ? "bg-purple-100 text-purple-800" :
                                app.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                              }`}>{app.status}</span>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-1 sm:ml-7">
                              {(() => {
                                let highlights = {};
                                try { if (app.highlightedData) highlights = JSON.parse(app.highlightedData); } catch (e) {}
                                const entries = Object.entries(highlights);
                                if (entries.length > 0) {
                                  return entries.map(([k, v]) => (
                                    <p key={k} className="text-[11px] text-slate-700 bg-white/60 px-2 py-1 rounded-md border border-slate-200 shadow-sm">
                                      <strong className="text-blue-700 font-extrabold uppercase tracking-wider">{k}:</strong> {String(v)}
                                    </p>
                                  ));
                                }
                                return (
                                  <p className="text-[11px] text-slate-700 bg-white/60 px-2 py-1 rounded-md border border-slate-200 shadow-sm">
                                    <strong className="text-blue-700 font-extrabold uppercase tracking-wider">Subject:</strong> {app.topicInterested}
                                  </p>
                                );
                              })()}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1.5 sm:ml-7 break-all sm:break-normal">Email: {app.user?.email || app.email} • Registered: {new Date(app.appliedAt).toLocaleDateString()}</p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-200/60 shrink-0">
                            {app.status !== "COMPLETED" && (
                              <>
                                <button onClick={() => handleToggleSelect(app.id)} disabled={loading === app.id} className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                                  isSelectedInSlot ? "bg-red-100 text-red-700 hover:bg-red-200" : "clay-btn hover:bg-blue-50 text-blue-700"
                                }`}>
                                  {isSelectedInSlot ? <UserMinus className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                                  <span>{isSelectedInSlot ? "Revoke Slot" : "Assign to Slot"}</span>
                                </button>
                                {app.status !== "SCREENING_DONE" && (
                                  <button onClick={() => handleStatusChange(app.id, "SCREENING_DONE")} className="clay-btn px-2.5 py-1.5 text-[11px] text-purple-700 hover:bg-purple-50" title="Approve Screening">
                                    <CheckCircle className="w-3 h-3 text-purple-600" />
                                  </button>
                                )}
                                <button onClick={() => handleStatusChange(app.id, "COMPLETED")} className="clay-btn px-2.5 py-1.5 text-[11px] text-emerald-700 hover:bg-emerald-50" title="Mark as Published">
                                  <VideoIcon className="w-3 h-3 text-emerald-600" />
                                </button>
                              </>
                            )}
                            {app.status === "COMPLETED" && (
                              <div className="px-3 py-1.5 bg-slate-100 text-slate-500 text-xs font-bold rounded-xl flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Finished
                              </div>
                            )}
                            {app.status !== "WAITING" && app.status !== "COMPLETED" && (
                              <button onClick={() => handleStatusChange(app.id, "WAITING")} className="clay-btn px-2 py-1.5 text-[11px] text-slate-500 hover:bg-slate-100" title="Reset to Queue">
                                <RotateCcw className="w-3 h-3" />
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
              <div className="clay-soft-blue p-8 text-center rounded-2xl space-y-1.5 mt-4">
                <Clock className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-slate-600">No records found matching your search or filter.</p>
              </div>
            )}
          </section>

          {/* ===================================== */}
          {/* SPA MODAL 1: FULL MEDIA CONTROL       */}
          {/* ===================================== */}
          {isMediaManagerOpen && (
            <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
              <div className="bg-white rounded-[32px] w-full max-w-3xl clay-card shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
                <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center z-10 shrink-0">
                  <div>
                    <h3 className="text-lg font-extrabold text-[#0F2547] flex items-center gap-2">
                      <Settings className="w-5 h-5 text-blue-600"/> Media Engine Configuration
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Add links and specify how many will render on the portal.</p>
                  </div>
                  <button onClick={() => setIsMediaManagerOpen(false)} className="w-8 h-8 rounded-full bg-white border border-slate-200 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors"><XCircle className="w-5 h-5"/></button>
                </div>
                
                <div className="p-6 overflow-y-auto space-y-6 bg-white flex-1 custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Section Title on Home Page</label>
                      <input type="text" value={mediaTitle} onChange={e => setMediaTitle(e.target.value)} className="clay-input w-full px-4 py-3 text-sm font-bold" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Max Videos to Display</label>
                      <select value={mediaLimit} onChange={e => setMediaLimit(Number(e.target.value))} className="clay-input w-full px-4 py-3 text-sm font-bold bg-white cursor-pointer">
                        <option value={1}>Show 1 Video (Single Feature)</option>
                        <option value={2}>Show 2 Videos (Grid format)</option>
                        <option value={3}>Show 3 Videos (Grid format)</option>
                        <option value={4}>Show 4 Videos (Grid format)</option>
                      </select>
                    </div>
                  </div>

                  <div className="clay-inset p-5 rounded-2xl bg-blue-50/50 border border-blue-100">
                    <label className="block text-xs font-bold text-slate-700 mb-2">Add New Media URL</label>
                    <div className="flex gap-2">
                      <input type="url" value={tempNewUrl} onChange={e => setTempNewUrl(e.target.value)} placeholder="Paste Instagram Reel or YouTube link..." className="clay-input w-full px-4 py-3 text-sm font-medium" />
                      <button onClick={addMediaUrl} className="clay-btn-primary px-5 py-3 text-xs font-bold shrink-0 flex items-center gap-1"><Plus className="w-4 h-4"/> Add Link</button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Database ({mediaUrls.length})</p>
                    {mediaUrls.length > 0 ? mediaUrls.map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 group hover:border-blue-300 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-white shadow-sm border border-slate-100 flex items-center justify-center shrink-0">
                             {m.type === "youtube" ? <MonitorPlay className="w-4 h-4 text-red-500"/> : m.type === "instagram" ? <Camera className="w-4 h-4 text-pink-500"/> : <LinkIcon className="w-4 h-4 text-blue-500"/>}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-700 truncate">{m.url}</p>
                            <p className="text-[10px] text-slate-400 uppercase">{m.type}</p>
                          </div>
                        </div>
                        <button onClick={() => setMediaUrls(mediaUrls.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-500 p-2"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    )) : <div className="text-center py-6 text-slate-400 text-xs font-bold border-2 border-dashed border-slate-200 rounded-xl">No media links added yet.</div>}
                  </div>
                </div>

                <div className="bg-slate-50 p-5 border-t border-slate-200 flex justify-end gap-3 shrink-0">
                  <button onClick={() => setIsMediaManagerOpen(false)} className="clay-btn px-6 py-3 text-xs font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
                  <button onClick={handlePublishMedia} disabled={loading === "publish-media"} className="clay-btn-primary px-8 py-3 text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 shadow-lg">
                    <Save className="w-4 h-4"/> {loading === "publish-media" ? "Publishing..." : "Save & Publish Global Settings"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===================================== */}
          {/* SPA MODAL 2: LIVE HOMEPAGE PREVIEW    */}
          {/* ===================================== */}
          {isPreviewOpen && (
            <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in zoom-in-95">
              <div className="bg-slate-100 rounded-[40px] w-full max-w-5xl h-full max-h-[90vh] flex flex-col overflow-hidden border-[8px] border-slate-800 shadow-2xl relative">
                 <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-50 pointer-events-none">
                    <div className="w-32 h-5 bg-slate-800 rounded-b-xl"></div>
                 </div>
                 
                 <div className="bg-white border-b border-slate-200 p-4 pt-8 flex justify-between items-center z-40 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-500"></span><span className="w-3 h-3 rounded-full bg-amber-500"></span><span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                      <span className="ml-2 text-xs font-black text-slate-400 tracking-wider">PORTAL PREVIEW</span>
                    </div>
                    <button onClick={() => setIsPreviewOpen(false)} className="px-4 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-700">Close Preview</button>
                 </div>

                 <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-slate-50 custom-scrollbar">
                    {/* Mocking the actual Homepage Section Design */}
                    <div className="max-w-4xl mx-auto space-y-8">
                       <div className="text-center space-y-3">
                         <span className="text-xs font-black text-red-600 uppercase tracking-widest bg-red-50 px-3 py-1.5 rounded-full border border-red-100"><MonitorPlay className="w-4 h-4 inline mr-1"/> Club Broadcast</span>
                         <h2 className="text-3xl font-black text-[#0F2547] tracking-tight">{mediaTitle}</h2>
                       </div>

                       {mediaUrls.length > 0 ? (
                         <div className={`grid gap-6 ${mediaLimit === 1 ? 'grid-cols-1 max-w-2xl mx-auto' : mediaLimit === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'}`}>
                           {mediaUrls.slice(0, mediaLimit).map((m, idx) => (
                             <div key={idx} className="aspect-video bg-slate-900 rounded-[24px] border-4 border-white shadow-xl relative overflow-hidden flex items-center justify-center group">
                               <div className="absolute inset-0 bg-[radial-gradient(#1e3a8a_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
                               <PlaySquare className="w-12 h-12 text-white/80 group-hover:scale-110 transition-transform relative z-10" />
                               <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur px-2 py-1 rounded text-[9px] text-white font-bold">{m.type.toUpperCase()}</div>
                             </div>
                           ))}
                         </div>
                       ) : (
                         <div className="p-10 text-center bg-white border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-bold">No media configured to display.</div>
                       )}
                    </div>
                 </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: COMMUNICATION ================= */}
      {activeTab === "COMMUNICATION" && (
        <section className="clay-card p-4 sm:p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 mb-6 gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-[#0F2547]">Communication Module</h2>
              <p className="text-xs text-slate-500 mt-1">Dispatch emails to candidates. Template changes require admin approval.</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar">
              <button onClick={() => setCommSubTab("SCREENING")} className={`flex-1 sm:flex-none whitespace-nowrap px-3 sm:px-4 py-2 text-xs font-bold rounded-lg transition-all ${commSubTab === "SCREENING" ? "bg-white shadow text-blue-700" : "text-slate-500"}`}>Approved Mail Editor</button>
              <button onClick={() => setCommSubTab("MASS")} className={`flex-1 sm:flex-none whitespace-nowrap px-3 sm:px-4 py-2 text-xs font-bold rounded-lg transition-all ${commSubTab === "MASS" ? "bg-white shadow text-blue-700" : "text-slate-500"}`}>Mass Broadcast</button>
            </div>
          </div>
          
          {commSubTab === "SCREENING" && (
            <div className="space-y-5">
              <div className="clay-inset p-4 rounded-xl text-xs text-slate-600 bg-amber-50/50 border border-amber-100 flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                <p><strong>Maker-Checker Policy:</strong> If you modify the default template below, it will not go live until the Supreme Admin approves the change request.</p>
              </div>
              <textarea rows={10} value={screeningTemplate} onChange={(e) => setScreeningTemplate(e.target.value)} className="clay-input w-full px-4 py-3 text-base sm:text-sm font-sans leading-relaxed whitespace-pre-wrap" />
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
                <button onClick={handleRequestTemplateChange} disabled={loading === "request-template"} className="clay-btn w-full sm:w-auto justify-center px-6 py-3.5 text-sm font-bold text-amber-700 hover:text-amber-800 border border-amber-200">
                  Submit Template for Review
                </button>
                <button className="clay-btn-primary w-full sm:w-auto justify-center px-8 py-3.5 text-sm uppercase tracking-wider flex items-center gap-2">
                  <Send className="w-4 h-4" /> Dispatch Instantly
                </button>
              </div>
            </div>
          )}

          {commSubTab === "MASS" && (
            <div className="space-y-6">
              <div className="clay-inset p-4 rounded-xl text-xs text-slate-600 bg-blue-50/50 border border-blue-100">
                You can directly send mass emails. No approval required for one-time broadcasts.
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Broadcast Subject</label>
                <input type="text" value={massSubject} onChange={(e) => setMassSubject(e.target.value)} className="clay-input w-full px-4 py-3 text-base sm:text-sm" placeholder="Subject line..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">HTML Payload</label>
                <textarea rows={6} value={massTemplate} onChange={(e) => setMassTemplate(e.target.value)} className="clay-input w-full px-4 py-3 text-base sm:text-sm font-mono" />
              </div>
              <div className="flex justify-end pt-2">
                <button className="clay-btn-primary w-full sm:w-auto justify-center px-8 py-3.5 text-sm uppercase tracking-wider flex items-center gap-2">
                  <Send className="w-4 h-4" /> Execute Mass Broadcast
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ================= TAB 3: SETTINGS ================= */}
      {/* 🟢 Duplicate code removed. Directly mounting the powerful SettingsTab */}
      {activeTab === "SETTINGS" && (
        <SettingsTab />
      )}
    </div>
  );
}