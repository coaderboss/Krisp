"use client";

import { useState, useEffect } from "react";
import { getOrCreateCurrentSlot, runAutoQueue, toggleStudentSelection, updateApplicationStatus, sendMassEmails, sendDirectEmail, sendInvitesToShortlisted, fetchAllApplications } from "@/actions/admin";
import { getFormFields } from "@/actions/settings";
import { submitReviewRequest } from "@/actions/requests";
import { Video, Send, Settings, Zap, EyeOff, ShieldAlert, CheckCircle, GripVertical, Type, List, Upload, Clock, PlusCircle, Trash2, XCircle, UserPlus, UserMinus, RotateCcw, CheckSquare } from "lucide-react";

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
  const [massRecipients, setMassRecipients] = useState([{ name: "", email: "" }]);
  const [massSubject, setMassSubject] = useState("");
  const [massTemplate, setMassTemplate] = useState("<h2>Hello {{name}},</h2>\n<p>Message...</p>");
  const [directEmail, setDirectEmail] = useState("");
  const [directSubject, setDirectSubject] = useState("");
  const [directBody, setDirectBody] = useState("");

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
        
        const appsRes = await fetchAllApplications();
        if (appsRes.success && appsRes.data) setApplications(appsRes.data);

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

  // --- FORM BUILDER HANDLERS ---
  function addField(type: "TEXT" | "DROPDOWN" | "FILE_UPLOAD" | "CHECKBOX") {
    setFormFields([...formFields, { 
      id: `f_${Date.now()}`, fieldName: `field_${Date.now()}`, fieldLabel: "New Field", 
      fieldType: type, options: (type === "DROPDOWN" || type === "CHECKBOX") ? ["Option 1"] : [], 
      isRequired: false, wordLimit: type === "TEXT" ? 100 : undefined 
    }]);
  }

  // NOTE: You also need to add these two functions below removeField to handle options
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
    setFormFields(formFields.map(f => f.id === fieldId ? { ...f, options: f.options.filter((_, i) => i !== index) } : f));
  }

  function updateField(id: string, key: string, value: any) {
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
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <div className="w-full mb-4 px-2 flex items-center justify-between">
          <div>
            <span className="clay-badge-amber text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">Core Team</span>
            <h1 className="text-xl font-extrabold text-[#0F2547] mt-1">Executive Console</h1>
          </div>
        </div>

        <button onClick={() => setActiveTab("WORKFLOW")} className={`px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-t-xl transition-all ${activeTab === "WORKFLOW" ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"}`}>
          <div className="flex items-center gap-2"><Video className="w-4 h-4" /> Presenter Workflow</div>
        </button>
        <button onClick={() => setActiveTab("COMMUNICATION")} className={`px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-t-xl transition-all ${activeTab === "COMMUNICATION" ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"}`}>
          <div className="flex items-center gap-2"><Send className="w-4 h-4" /> Communication</div>
        </button>
        <button onClick={() => setActiveTab("SETTINGS")} className={`px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-t-xl transition-all ${activeTab === "SETTINGS" ? "bg-slate-800 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"}`}>
          <div className="flex items-center gap-2"><Settings className="w-4 h-4" /> Form Settings</div>
        </button>
      </div>

      {/* ================= TAB 1: WORKFLOW ================= */}
      {activeTab === "WORKFLOW" && (
        <div className="space-y-8">
          <section className="clay-card p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
              <div className="space-y-1">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${slot.isPublished ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-amber-100 text-amber-800 border border-amber-300"}`}>
                  {slot.isPublished ? "🟢 Live on Program Home" : "🟡 Hidden from Platform"}
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F2547]">Weekly Broadcast Config</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <button onClick={handleRequestPublish} disabled={loading === "request-publish"} className="clay-btn px-4 py-2.5 text-xs flex items-center gap-1.5 hover:bg-amber-50 text-amber-700">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{loading === "request-publish" ? "Submitting..." : "Request Roster Publish"}</span>
                </button>
                <button onClick={handleAutoQueue} disabled={loading === "auto-queue"} className="clay-btn-primary px-4 py-2.5 text-xs flex items-center gap-1.5 shadow-sm">
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>Execute Auto-Queue</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {[0, 1].map((index) => {
                const trainee = selectedStudents[index];
                return trainee ? (
                  <div key={trainee.id} className="clay-card p-5 bg-white/90 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-black text-blue-600 uppercase">Allocation #{index + 1}</span>
                        <h4 className="font-extrabold text-[#0F2547] text-sm">{trainee.user.name}</h4>
                      </div>
                      <button onClick={() => handleToggleSelect(trainee.id)} className="clay-btn px-2.5 py-1 text-[11px] text-red-600 flex items-center gap-1 hover:bg-red-50">
                        <UserMinus className="w-3 h-3" /><span>Revoke</span>
                      </button>
                    </div>
                    <div className="clay-inset p-2.5 rounded-xl text-xs font-medium text-slate-700">
                      <span className="font-bold text-blue-700">Subject:</span> {trainee.topicInterested}
                    </div>
                  </div>
                ) : (
                  <div key={index} className="clay-soft-blue p-6 rounded-2xl border-2 border-dashed border-blue-200 text-center flex flex-col items-center justify-center space-y-1.5">
                    <span className="text-xs font-black text-slate-400">Allocation #{index + 1} (Unassigned)</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* MISSING PIPELINE RESTORED HERE */}
          <section className="clay-card p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Candidate Pipeline</span>
                <h3 className="text-xl font-extrabold text-[#0F2547]">Enrollment Registry</h3>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {["ALL", "WAITING", "SHORTLISTED", "SCREENING_DONE", "COMPLETED", "REJECTED"].map((st) => (
                  <button key={st} onClick={() => setFilter(st)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === st ? "clay-btn-primary shadow-sm" : "clay-btn text-slate-600 hover:text-blue-600"}`}>{st}</button>
                ))}
              </div>
            </div>

            {filteredApps.length > 0 ? (
              <div className="space-y-3.5">
                {filteredApps.map((app: any) => {
                  const isSelectedInSlot = app.weeklySlotId === slot.id;
                  return (
                    <div key={app.id} onClick={() => setSelectedStudent(app)} className={`clay-pill p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${isSelectedInSlot ? "ring-2 ring-blue-500/50 bg-blue-50/20" : ""}`}>
                      <div className="space-y-1.5 max-w-xl">
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-[#0F2547] text-sm">{app.user?.name || "Unknown"}</h4>
                          <span className="text-[11px] text-slate-400">•</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-800`}>{app.status}</span>
                        </div>
                        <p className="text-xs text-slate-700"><strong className="text-blue-700 font-bold">Subject:</strong> {app.topicInterested}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => handleToggleSelect(app.id)} disabled={loading === app.id} className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${isSelectedInSlot ? "bg-red-100 text-red-700 hover:bg-red-200" : "clay-btn hover:bg-blue-50 text-blue-700"}`}>
                          {isSelectedInSlot ? <UserMinus className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                          <span>{isSelectedInSlot ? "Revoke Slot" : "Assign to Slot"}</span>
                        </button>
                        {app.status !== "SCREENING_DONE" && (
                          <button onClick={() => handleStatusChange(app.id, "SCREENING_DONE")} className="clay-btn px-2.5 py-1.5 text-[11px] text-purple-700 hover:bg-purple-50" title="Approve Screening">
                            <CheckCircle className="w-3 h-3 text-purple-600" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="clay-soft-blue p-8 text-center rounded-2xl space-y-1.5">
                <Clock className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-slate-600">No records found matching the filter.</p>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ================= TAB 2: COMMUNICATION ================= */}
      {activeTab === "COMMUNICATION" && (
        <section className="clay-card p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 mb-6 gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-[#0F2547]">Communication Module</h2>
              <p className="text-xs text-slate-500 mt-1">Dispatch emails to candidates. Template changes require admin approval.</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
              <button onClick={() => setCommSubTab("SCREENING")} className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${commSubTab === "SCREENING" ? "bg-white shadow text-blue-700" : "text-slate-500"}`}>Approved Mail Editor</button>
              <button onClick={() => setCommSubTab("MASS")} className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${commSubTab === "MASS" ? "bg-white shadow text-blue-700" : "text-slate-500"}`}>Mass Broadcast</button>
            </div>
          </div>
          
          {commSubTab === "SCREENING" && (
            <div className="space-y-5">
              <div className="clay-inset p-4 rounded-xl text-xs text-slate-600 bg-amber-50/50 border border-amber-100 flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                <p><strong>Maker-Checker Policy:</strong> If you modify the default template below, it will not go live until the Supreme Admin approves the change request.</p>
              </div>
              
              <textarea rows={10} value={screeningTemplate} onChange={(e) => setScreeningTemplate(e.target.value)} className="clay-input w-full px-4 py-3 text-sm font-sans leading-relaxed whitespace-pre-wrap" />

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button onClick={handleRequestTemplateChange} disabled={loading === "request-template"} className="clay-btn px-6 py-3.5 text-sm font-bold text-amber-700 hover:text-amber-800 border border-amber-200">
                  Submit Template for Review
                </button>
                <button className="clay-btn-primary px-8 py-3.5 text-sm uppercase tracking-wider flex items-center gap-2">
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
                <input type="text" value={massSubject} onChange={(e) => setMassSubject(e.target.value)} className="clay-input w-full px-4 py-3 text-sm" placeholder="Subject line..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">HTML Payload</label>
                <textarea rows={6} value={massTemplate} onChange={(e) => setMassTemplate(e.target.value)} className="clay-input w-full px-4 py-3 text-sm font-mono" />
              </div>
              <div className="flex justify-end pt-2">
                <button className="clay-btn-primary px-8 py-3.5 text-sm uppercase tracking-wider flex items-center gap-2">
                  <Send className="w-4 h-4" /> Execute Mass Broadcast
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ================= TAB 3: SETTINGS (FULL FORM BUILDER RESTORED) ================= */}
      {activeTab === "SETTINGS" && (
        <section className="clay-card p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 mb-6 gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-[#0F2547]">Student Registration Form</h2>
              <p className="text-xs text-slate-500 mt-1">Design the application form. Changes must be approved by Supreme Admin.</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => addField("TEXT")} className="clay-btn px-3 py-2 text-[11px] font-bold text-slate-600 flex items-center gap-1">
                <Type className="w-3.5 h-3.5" /> + Text
              </button>
              <button onClick={() => addField("DROPDOWN")} className="clay-btn px-3 py-2 text-[11px] font-bold text-slate-600 flex items-center gap-1">
                <List className="w-3.5 h-3.5" /> + Dropdown
              </button>
              <button onClick={() => addField("CHECKBOX")} className="clay-btn px-3 py-2 text-[11px] font-bold text-slate-600 flex items-center gap-1">
                <CheckSquare className="w-3.5 h-3.5" /> + Checkbox
              </button>
              <button onClick={() => addField("FILE_UPLOAD")} className="clay-btn px-3 py-2 text-[11px] font-bold text-slate-600 flex items-center gap-1">
                <Upload className="w-3.5 h-3.5" /> + File
              </button>
            </div>
          </div>

          <div className="space-y-6 animate-in fade-in">
            <div className="space-y-4 clay-inset p-5 rounded-2xl border border-blue-100 bg-blue-50/30">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1">Form Title</label>
                <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="clay-input w-full px-4 py-2.5 text-sm font-bold text-[#0F2547]" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1">Form Description</label>
                <textarea rows={2} value={formDescription} onChange={(e) => setFormDescription(e.target.value)} className="clay-input w-full px-4 py-2.5 text-xs text-slate-600" />
              </div>
            </div>

            <div className="space-y-4">
              {formFields.map((field, index) => (
                <div key={field.id} className="clay-inset p-5 rounded-2xl flex flex-col md:flex-row gap-4 border border-slate-100">
                  <div className="flex items-center gap-3 md:w-1/4">
                    <GripVertical className="w-4 h-4 text-slate-400 cursor-grab" />
                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 w-full">
                      {field.fieldType === "TEXT" && <Type className="w-4 h-4 text-blue-600" />}
                      {field.fieldType === "DROPDOWN" && <List className="w-4 h-4 text-purple-600" />}
                      {field.fieldType === "CHECKBOX" && <CheckSquare className="w-4 h-4 text-amber-600" />}
                      {field.fieldType === "FILE_UPLOAD" && <Upload className="w-4 h-4 text-emerald-600" />}
                      <span className="text-[10px] font-bold text-slate-600">{field.fieldType}</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Question / Field Name</label>
                      <input 
                        type="text" value={field.fieldLabel} 
                        onChange={(e) => updateField(field.id, "fieldLabel", e.target.value)}
                        className="clay-input w-full px-3 py-2 text-sm font-bold text-slate-800"
                      />
                    </div>

                    {field.fieldType === "TEXT" && (
                      <div>
                        <label className="text-[10px] font-bold text-blue-600 uppercase tracking-wider ml-1">Word Limit (0 = No limit)</label>
                        <input type="number" value={field.wordLimit || 0} onChange={(e) => updateField(field.id, "wordLimit", Number(e.target.value))} className="clay-input w-full md:w-1/3 px-3 py-1.5 text-xs" />
                      </div>
                    )}

                    {(field.fieldType === "DROPDOWN" || field.fieldType === "CHECKBOX") && (
                      <div className="pl-2 border-l-2 border-purple-200 space-y-2">
                        <label className="text-[10px] font-bold text-purple-600 uppercase tracking-wider ml-1">Options</label>
                        {field.options.map((opt: string, optIdx: number) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <input type="text" value={opt} onChange={(e) => updateOption(field.id, optIdx, e.target.value)} className="clay-input w-full px-3 py-1.5 text-xs" />
                            <button onClick={() => removeOption(field.id, optIdx)} disabled={field.options.length === 1} className="text-red-400 hover:text-red-600 disabled:opacity-30"><XCircle className="w-4 h-4" /></button>
                          </div>
                        ))}
                        <button onClick={() => addOption(field.id)} className="text-[10px] font-bold text-blue-600 flex items-center gap-1 mt-1"><PlusCircle className="w-3 h-3" /> Add Option</button>
                      </div>
                    )}
                  </div>

                  <div className="flex md:flex-col items-center justify-between md:justify-center gap-4 md:w-32 md:border-l border-slate-200 md:pl-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={field.isRequired} onChange={(e) => updateField(field.id, "isRequired", e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                      <span className="text-xs font-bold text-slate-600">Required</span>
                    </label>
                    <button onClick={() => removeField(field.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-6 mt-4 border-t border-slate-200">
              <button onClick={handleRequestFormChange} disabled={loading === "request-form"} className="clay-btn px-8 py-3.5 text-sm uppercase tracking-wider font-bold text-amber-700 bg-amber-50 border border-amber-200 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                <span>{loading === "request-form" ? "Submitting..." : "Submit Form Changes for Review"}</span>
              </button>
            </div>
          </div>
        </section>
      )}
      {/* --- STUDENT DETAILS POPUP MODAL --- */}
      {selectedStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto clay-card">
            <div className="sticky top-0 bg-white/90 backdrop-blur-md p-5 border-b border-slate-100 flex items-center justify-between z-10">
              <div>
                <h3 className="text-xl font-extrabold text-[#0F2547]">{selectedStudent.user?.name || "Unknown"}</h3>
                <p className="text-xs text-slate-500">{selectedStudent.user?.email || "No email"}</p>
              </div>
              <button 
                onClick={() => setSelectedStudent(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors font-bold"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="clay-inset p-4 rounded-xl">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Selected Topic</span>
                  <p className="text-sm font-bold text-blue-700 mt-1">{selectedStudent.topicInterested}</p>
                </div>
                <div className="clay-inset p-4 rounded-xl">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Status</span>
                  <p className="text-sm font-bold text-slate-700 mt-1">{selectedStudent.status}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 border-b pb-2">Full Application Details</h4>
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500">Why do you want to join? (Description)</span>
                    <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">
                      {selectedStudent.description || "No description provided by the student."}
                    </p>
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500">Attached Documents</span>
                    <p className="text-xs text-emerald-600 font-bold mt-1.5 flex items-center gap-1.5">
                      📄 {selectedStudent.documentUrl || "No document uploaded"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}