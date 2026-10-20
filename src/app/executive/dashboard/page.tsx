"use client";

import { useState, useEffect } from "react";
import { getOrCreateCurrentSlot, runAutoQueue, toggleStudentSelection, updateApplicationStatus, fetchAllApplications } from "@/actions/admin";
import { getFormFields } from "@/actions/settings";
import { submitReviewRequest } from "@/actions/requests";
import { Video, Video as VideoIcon, RotateCcw, Send, Settings, Zap, ShieldAlert, CheckCircle, GripVertical, Type, List, Upload, Clock,
   PlusCircle, Trash2, XCircle, UserPlus, UserMinus, CheckSquare, Search, Layers, ChevronDown } from "lucide-react";

export default function ExecutiveDashboard() {
  const [activeTab, setActiveTab] = useState<"WORKFLOW" | "COMMUNICATION" | "SETTINGS">("WORKFLOW");
  const [commSubTab, setCommSubTab] = useState<"SCREENING" | "MASS" | "DIRECT">("SCREENING");
  
  const [loading, setLoading] = useState<string>("init");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // --- DATA STATES ---
  const [slot, setSlot] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [formFields, setFormFields] = useState<any[]>([]);
  const [screeningTemplate, setScreeningTemplate] = useState("Hello {{name}},\n\nYour presentation is scheduled.");
  
  // Communication Extra States
  const [massSubject, setMassSubject] = useState("");
  const [massTemplate, setMassTemplate] = useState("<h2>Hello {{name}},</h2>\n<p>Message...</p>");

  // --- ADVANCED PIPELINE STATES ---
  const [searchTerm, setSearchTerm] = useState("");
  const [groupField, setGroupField] = useState<string | null>(null);

  const selectedStudents = slot?.selectedTrainees || [];
  const filteredApps = applications.filter((app: any) => filter === "ALL" ? true : app.status === filter);
  const [formTitle, setFormTitle] = useState("Weekly Bulletin Registration");
  const [formDescription, setFormDescription] = useState("Please fill out this application form to participate in the upcoming cybersecurity screening.");
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  function notify(text: string, type: "success" | "error" = "success") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  }

  // --- FETCH DATA ON LOAD ---
  useEffect(() => {
    async function loadData() {
      try {
        const slotData = await getOrCreateCurrentSlot();
        setSlot(slotData);
        
        // 3. Load Real Student Responses from Database
        const appsRes = await fetchAllApplications();
        if (appsRes.success && appsRes.data) {
          const realData = appsRes.data.map((app: any) => ({
            id: app.id,
            name: app.user?.name || "Unknown User",
            email: app.user?.email || "No Email",
            topicInterested: app.topicInterested || "Not Selected",
            status: app.status,
            appliedAt: app.appliedAt,
            weeklySlotId: app.weeklySlotId,
            user: app.user,
            // BUGS FIXED: Ye dono pass karna zaruri the UI me render ke liye
            dynamicData: app.dynamicData, 
            description: app.description
          }));
          setApplications(realData);
        }

        const fieldsRes = await getFormFields();
        if (fieldsRes.success && fieldsRes.data) {
          setFormFields(fieldsRes.data.length > 0 ? fieldsRes.data : [{ id: "temp_1", fieldName: `field_${Date.now()}`, fieldLabel: "Full Name", fieldType: "TEXT", options: [], isRequired: true }]);
        }

        const savedTemplate = localStorage.getItem("savedScreeningTemplate");
        if (savedTemplate) setScreeningTemplate(savedTemplate);

      } catch (error) {
        notify("Failed to load dashboard data", "error");
      }
      setLoading("");
    }
    loadData();
  }, []);

  // Extract all unique fields from submitted forms for Grouping
  const availableGroupFields = Array.from(new Set(
    applications.flatMap((app: any) => { // 🟢 Changed to applications
      try {
        const data = JSON.parse(app.dynamicData || "{}");
        return Object.keys(data).filter(k => !k.startsWith("$ACTION"));
      } catch { return []; }
    })
  ));

  // Advanced Filtering, Searching & Sorting Logic
  const processedApps = applications.filter((app: any) => { // 🟢 Changed to applications
    const matchesStatus = filter === "ALL" ? true : app.status === filter;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (app.user?.name || app.name || "").toLowerCase().includes(searchLower) || 
                          (app.user?.email || app.email || "").toLowerCase().includes(searchLower) ||
                          (app.dynamicData && app.dynamicData.toLowerCase().includes(searchLower));
    return matchesStatus && matchesSearch;
  }).sort((a: any, b: any) => {
    // COMPLETED aur REJECTED hamesha list me naturally neeche jayenge (Smoothly)
    if (a.status === "COMPLETED" && b.status !== "COMPLETED") return 1;
    if (b.status === "COMPLETED" && a.status !== "COMPLETED") return -1;
    return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime();
  });

  // Apply Isolate Grouping
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

  // --- MAKER-CHECKER REQUEST HANDLERS ---
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

  async function handleRequestFormChange() {
    setLoading("request-form");
    const res = await submitReviewRequest("UPDATE_FORM", { fields: formFields });
    if (res.success) notify(res.message || "");
    else notify(res.error || "", "error");
    setLoading("");
  }

  // --- STANDARD WORKFLOW HANDLERS ---
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

  function addField(type: "TEXT" | "DROPDOWN" | "FILE_UPLOAD" | "CHECKBOX") {
    setFormFields([...formFields, { 
      id: `f_${Date.now()}`, fieldName: `field_${Date.now()}`, fieldLabel: "New Field", 
      fieldType: type, options: (type === "DROPDOWN" || type === "CHECKBOX") ? ["Option 1"] : [], 
      isRequired: false, 
      isHighlighted: false, // NAYA FIELD ADD KIYA
      wordLimit: type === "TEXT" ? 100 : undefined 
    }]);
  }

  function addOption(fieldId: string) {
    setFormFields(formFields.map(f => f.id === fieldId ? { ...f, options: [...f.options, `Option ${f.options.length + 1}`] } : f));
  }
  function updateOption(fieldId: string, index: number, value: string) {
    setFormFields(formFields.map(f => {
      if (f.id === fieldId) {
        const newOptions = [...f.options];
        newOptions[index] = value;
        return { ...f, options: newOptions };
      }
      return f;
    }));
  }
  function removeOption(fieldId: string, index: number) {
  setFormFields(formFields.map(f => f.id === fieldId ? { ...f, options: f.options.filter((_: any, i: number) => i !== index) } : f));
}
  function updateField(id: string, key: string, value: any) {
    // --- NAYA CHECK: Max 4 limits for Pin ---
    if (key === "isHighlighted" && value === true) {
      const currentPinned = formFields.filter(f => f.isHighlighted).length;
      if (currentPinned >= 4) {
        notify("Aap maximum 4 fields hi dashboard card par pin kar sakte hain!", "error");
        return;
      }
    }
    setFormFields(formFields.map(f => f.id === id ? { ...f, [key]: value } : f));
  }
  function removeField(id: string) {
    setFormFields(formFields.filter(f => f.id !== id));
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

      {/* Header & Tabs */}
      <div className="space-y-4 border-b border-slate-200 pb-2">
        <div className="px-1 sm:px-2 flex items-center justify-between">
          <div>
            <span className="clay-badge-amber text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">Core Team</span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F2547] mt-1">Executive Console</h1>
          </div>
        </div>

        <div className="overflow-x-auto no-scrollbar scroll-smooth flex items-center gap-2 flex-nowrap pb-1 w-full">
          <button onClick={() => setActiveTab("WORKFLOW")} className={`shrink-0 px-3.5 sm:px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all ${activeTab === "WORKFLOW" ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"}`}>
            <div className="flex items-center gap-2"><Video className="w-4 h-4" /> Presenter Workflow</div>
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
            {/* UNIVERSAL SEARCH BAR */}
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

            {/* ISOLATE GROUPING ENGINE */}
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
                          <h4 className="font-extrabold text-[#0F2547] text-sm break-words">{app.user.name}</h4>
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
                        <p className="text-[11px] text-slate-400 mt-1.5 sm:ml-7 break-all sm:break-normal">Email: {app.user.email} • Registered: {new Date(app.appliedAt).toLocaleDateString()}</p>
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
      {activeTab === "SETTINGS" && (
        <section className="clay-card p-4 sm:p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 mb-6 gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-[#0F2547]">Student Registration Form</h2>
              <p className="text-xs text-slate-500 mt-1">Design the application form. Changes must be approved by Supreme Admin.</p>
            </div>
            <div className="overflow-x-auto no-scrollbar scroll-smooth flex items-center gap-2 flex-nowrap sm:flex-wrap pb-1">
              <button onClick={() => addField("TEXT")} className="shrink-0 clay-btn px-3 py-2 text-[11px] font-bold text-slate-600 flex items-center gap-1"><Type className="w-3.5 h-3.5" /> + Text</button>
              <button onClick={() => addField("DROPDOWN")} className="shrink-0 clay-btn px-3 py-2 text-[11px] font-bold text-slate-600 flex items-center gap-1"><List className="w-3.5 h-3.5" /> + Dropdown</button>
              <button onClick={() => addField("CHECKBOX")} className="shrink-0 clay-btn px-3 py-2 text-[11px] font-bold text-slate-600 flex items-center gap-1"><CheckSquare className="w-3.5 h-3.5" /> + Checkbox</button>
              <button onClick={() => addField("FILE_UPLOAD")} className="shrink-0 clay-btn px-3 py-2 text-[11px] font-bold text-slate-600 flex items-center gap-1"><Upload className="w-3.5 h-3.5" /> + File</button>
            </div>
          </div>

          <div className="space-y-6 animate-in fade-in">
            <div className="space-y-4 clay-inset p-4 sm:p-5 rounded-2xl border border-blue-100 bg-blue-50/30">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1">Form Title</label>
                <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="clay-input w-full px-4 py-2.5 text-base sm:text-sm font-bold text-[#0F2547]" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1">Form Description</label>
                <textarea rows={2} value={formDescription} onChange={(e) => setFormDescription(e.target.value)} className="clay-input w-full px-4 py-2.5 text-base sm:text-xs text-slate-600" />
              </div>
            </div>

            <div className="space-y-4">
              {formFields.map((field, index) => (
                <div key={field.id} className="clay-inset p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row gap-4 border border-slate-100">
                  <div className="flex items-center gap-3 md:w-1/4">
                    <GripVertical className="w-4 h-4 text-slate-400 cursor-grab shrink-0" />
                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 w-full min-w-0">
                      {field.fieldType === "TEXT" && <Type className="w-4 h-4 text-blue-600 shrink-0" />}
                      {field.fieldType === "DROPDOWN" && <List className="w-4 h-4 text-purple-600 shrink-0" />}
                      {field.fieldType === "CHECKBOX" && <CheckSquare className="w-4 h-4 text-amber-600 shrink-0" />}
                      {field.fieldType === "FILE_UPLOAD" && <Upload className="w-4 h-4 text-emerald-600 shrink-0" />}
                      <span className="text-[10px] font-bold text-slate-600 truncate">{field.fieldType}</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3 min-w-0">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Question / Field Name</label>
                      <input type="text" value={field.fieldLabel} onChange={(e) => updateField(field.id, "fieldLabel", e.target.value)} className="clay-input w-full px-3 py-2 text-base sm:text-sm font-bold text-slate-800" />
                    </div>
                    {field.fieldType === "TEXT" && (
                      <div>
                        <label className="text-[10px] font-bold text-blue-600 uppercase tracking-wider ml-1">Word Limit (0 = No limit)</label>
                        <input type="number" value={field.wordLimit || 0} onChange={(e) => updateField(field.id, "wordLimit", Number(e.target.value))} className="clay-input w-full md:w-1/3 px-3 py-1.5 text-base sm:text-xs" />
                      </div>
                    )}
                    {(field.fieldType === "DROPDOWN" || field.fieldType === "CHECKBOX") && (
                      <div className="pl-2 border-l-2 border-purple-200 space-y-2">
                        <label className="text-[10px] font-bold text-purple-600 uppercase tracking-wider ml-1">Options</label>
                        {field.options.map((opt: string, optIdx: number) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <input type="text" value={opt} onChange={(e) => updateOption(field.id, optIdx, e.target.value)} className="clay-input w-full px-3 py-1.5 text-base sm:text-xs" />
                            <button onClick={() => removeOption(field.id, optIdx)} disabled={field.options.length === 1} className="text-red-400 hover:text-red-600 disabled:opacity-30 p-1"><XCircle className="w-4 h-4" /></button>
                          </div>
                        ))}
                        <button onClick={() => addOption(field.id)} className="text-[10px] font-bold text-blue-600 flex items-center gap-1 mt-1"><PlusCircle className="w-3 h-3" /> Add Option</button>
                      </div>
                    )}
                  </div>
                  <div className="flex md:flex-col items-center justify-between md:justify-center gap-4 pt-3 md:pt-0 border-t md:border-t-0 md:border-l border-slate-200 md:pl-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={field.isRequired} onChange={(e) => updateField(field.id, "isRequired", e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                      <span className="text-xs font-bold text-slate-600">Required</span>
                    </label>

                    {/* NAYA: PIN TO CARD TOGGLE */}
                    <label className="flex items-center gap-2 cursor-pointer tooltip-trigger" title="Show this field directly on Dashboard">
                      <input
                        type="checkbox"
                        checked={field.isHighlighted || false}
                        onChange={(e) => updateField(field.id, "isHighlighted", e.target.checked)}
                        className="w-4 h-4 text-amber-500 rounded accent-amber-500"
                      />
                      <span className="text-[11px] font-black text-amber-600 uppercase tracking-wider">📌 Pin</span>
                    </label>

                    <button onClick={() => removeField(field.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 className="w-5 h-5" /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-6 mt-4 border-t border-slate-200">
              <button onClick={handleRequestFormChange} disabled={loading === "request-form"} className="clay-btn w-full sm:w-auto justify-center px-8 py-3.5 text-sm uppercase tracking-wider font-bold text-amber-700 bg-amber-50 border border-amber-200 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                <span>{loading === "request-form" ? "Submitting..." : "Submit Form Changes for Review"}</span>
              </button>
            </div>
          </div>
        </section>
      )}
      
      {/* --- STUDENT DETAILS POPUP MODAL --- */}
        {selectedStudent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto clay-card">
              <div className="sticky top-0 bg-white/90 backdrop-blur-md p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between z-10">
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-[#0F2547]">
                    {selectedStudent.name || selectedStudent.user?.name || "Unknown"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedStudent.email || selectedStudent.user?.email || "No email"}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="clay-inset p-3 sm:p-4 rounded-xl">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Selected Topic</span>
                    <p className="text-sm font-bold text-blue-700 mt-1">{selectedStudent.topic || selectedStudent.topicInterested}</p>
                  </div>
                  <div className="clay-inset p-3 sm:p-4 rounded-xl">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Applied On</span>
                    <p className="text-sm font-bold text-slate-700 mt-1">
                      {selectedStudent.date || new Date(selectedStudent.appliedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* --- REAL DYNAMIC FORM FIELDS MAPPING --- */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 border-b pb-2">
                    Full Application Details
                  </h4>
                  <div className="space-y-3 sm:space-y-4">
                    {(() => {
                      let parsedData = {};
                      try {
                        const rawData = selectedStudent.description || selectedStudent.dynamicData;
                        parsedData = typeof rawData === 'string' ? JSON.parse(rawData) : {};
                      } catch (e) {
                        parsedData = { "Raw Input": selectedStudent.description || "No data provided." };
                      }

                      const entries = Object.entries(parsedData).filter(([key, value]) => !key.startsWith('$ACTION_'));

                      if (entries.length === 0) {
                        return <p className="text-sm text-slate-500 italic">No additional details submitted.</p>;
                      }

                      return entries.map(([key, value], index) => (
                        <div key={index} className="bg-slate-50 p-3 sm:p-4 rounded-lg border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">{key}</span>
                          <p className="text-xs text-slate-800 mt-1.5 leading-relaxed font-medium break-words">
                            {Array.isArray(value) ? value.join(", ") : String(value)}
                          </p>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

    </div>
  );
}