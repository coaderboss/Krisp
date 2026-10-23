"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  ShieldAlert, PlusCircle, Trash2, GripVertical, Type, List, Upload, CheckCircle, XCircle, CheckSquare, Download, Database, Settings, Send, Eye, EyeOff, FolderKanban, ChevronLeft, ChevronRight, Globe, Lock, Hash
} from "lucide-react";
import { getFormFields, saveFormFields } from "@/actions/settings";
import { fetchAllApplications } from "@/actions/admin";
import { submitReviewRequest } from "@/actions/requests";

type FieldType = "TEXT" | "DROPDOWN" | "FILE_UPLOAD" | "CHECKBOX" | "NUMBER";

type FormField = {
  id: string; fieldName: string; fieldLabel: string; fieldType: FieldType;
  options: string[]; isRequired: boolean; isHighlighted?: boolean; wordLimit?: number; placeholder?: string;
};

export default function SettingsTab() {
  const { data: session } = useSession();
  const role = session?.user?.role || "STUDENT";
  const isAdmin = role === "CLUB_ADMIN";

  const [loading, setLoading] = useState<string>("init");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [settingsSubTab, setSettingsSubTab] = useState<"BUILDER" | "PUBLISHED" | "RESPONSES">("BUILDER");
  
  // --- ROBUST MULTI-FORM STATE ENGINE ---
  const [forms, setForms] = useState<any[]>([
    {
      id: "master",
      serial: 1,
      title: "Master Form: Weekly Bulletin",
      description: "Main application form for club presenters.",
      isMaster: true,
      isActive: true,
      execVaultAccess: true,
      formMode: "QUEUE", // Mode: QUEUE, NORMAL, EVENT
      hasDeclaration: true,
      declarationText: "I hereby declare that all information provided is accurate to the best of my knowledge. If shortlisted, I strictly commit to being present on the scheduled date without fail.",
      fields: []
    }
  ]);
  const [editingFormId, setEditingFormId] = useState("master");

  // Dynamic Editor States
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formFields, setFormFields] = useState<FormField[]>([]);
  
  // --- DATA VAULT STATES ---
  const [vaultFormId, setVaultFormId] = useState("master");
  const [studentResponses, setStudentResponses] = useState<any[]>([]);
  const [selectedResponseIndex, setSelectedResponseIndex] = useState<number | null>(null);

  function notify(text: string, type: "success" | "error" = "success") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  }

  // Sync builder when selected form changes
  useEffect(() => {
    const activeForm = forms.find(f => f.id === editingFormId);
    if (activeForm) {
      setFormTitle(activeForm.title);
      setFormDescription(activeForm.description);
      setFormFields(activeForm.fields.length > 0 ? activeForm.fields : [{ id: `f_${Date.now()}`, fieldName: `field_${Date.now()}`, fieldLabel: "Full Name", fieldType: "TEXT", options: [], isRequired: true }]);
    }
  }, [editingFormId, forms]);

  useEffect(() => {
    async function loadData() {
      // Fetch Real Fields for Master Form (Simulating DB multi-form structure integration)
      const fieldsRes = await getFormFields();
      if (fieldsRes.success && fieldsRes.data) {
        const loadedFields = fieldsRes.data.map((f: any) => ({
          id: f.id, fieldName: f.fieldName, fieldLabel: f.fieldLabel,
          fieldType: f.fieldType as FieldType, options: f.options || [],
          isRequired: f.isRequired, isHighlighted: f.isHighlighted || false, wordLimit: f.wordLimit || 0,
        }));
        
        setForms(prev => prev.map(f => f.isMaster ? { ...f, fields: loadedFields } : f));
      }

      // Fetch Real Vault Responses
      const appsRes = await fetchAllApplications();
      if (appsRes.success && appsRes.data) {
        const realData = appsRes.data.map((app: any) => ({
          id: app.id, 
          // 🟢 FIX: Force old orphaned test submissions to merge into the Master Vault visually
          formId: (app.topicInterested || app.topic)?.includes("Master Form") ? "master" : (app.formId || "master"), 
          // 🟢 FIX: Dual-check ensures name and email never fail
          name: app.user?.name || app.name || "Unknown User", 
          email: app.user?.email || app.email || "No Email",
          topic: app.topicInterested || app.topic || "Not Selected", 
          document: "Pending Upload", 
          // 🟢 FIX: Dual-check for Date
          date: app.date || new Date(app.appliedAt || Date.now()).toLocaleDateString(),
          dynamicData: app.dynamicData || "{}"
        }));
        setStudentResponses(realData);
      }
      setLoading("");
    }
    loadData();
  }, []);

  // --- BUILDER HANDLERS ---
  function addField(type: FieldType) {
    setFormFields([...formFields, {
      id: `f_${Date.now()}`, fieldName: `field_${Date.now()}`, fieldLabel: "New Field",
      fieldType: type, options: type === "DROPDOWN" || type === "CHECKBOX" ? ["Option 1"] : [],
      isRequired: false, isHighlighted: false, wordLimit: type === "TEXT" ? 100 : undefined,
      placeholder: (type === "TEXT" || type === "NUMBER") ? "Enter value here..." : "",
    }]);
  }

  function updateField(id: string, key: keyof FormField, value: any) {
    if (key === "isHighlighted" && value === true && formFields.filter(f => f.isHighlighted).length >= 4) {
      return notify("Maximum 4 pinned fields allowed for the Vault!", "error");
    }
    setFormFields(formFields.map((f) => (f.id === id ? { ...f, [key]: value } : f)));
  }
  function removeField(id: string) { setFormFields(formFields.filter((f) => f.id !== id)); }
  function addOption(fieldId: string) { setFormFields(formFields.map((f) => f.id === fieldId ? { ...f, options: [...f.options, `Option ${f.options.length + 1}`] } : f)); }
  function updateOption(fieldId: string, index: number, value: string) { setFormFields(formFields.map((f) => f.id === fieldId ? { ...f, options: f.options.map((o, i) => i === index ? value : o) } : f)); }
  function removeOption(fieldId: string, index: number) { setFormFields(formFields.map((f) => f.id === fieldId ? { ...f, options: f.options.filter((_, i) => i !== index) } : f)); }

  function handleCreateNewForm() {
    const newForm = {
      id: `form_${Date.now()}`,
      serial: forms.length + 1,
      title: "New Event Form",
      description: "Description here...",
      isMaster: false,
      isActive: false,
      execVaultAccess: false,
      formMode: "NORMAL",
      hasDeclaration: false,
      declarationText: "",
      fields: []
    };
    setForms([...forms, newForm]);
    setEditingFormId(newForm.id);
    notify("New empty form template created!");
  }

  // --- SECURE WORKFLOW ACTIONS ---
  async function handleAdminPublish() {
    setLoading("save-form");
    
    // Update local state pipeline
    setForms(prev => prev.map(f => f.id === editingFormId ? { ...f, title: formTitle, description: formDescription, fields: formFields } : f));
    
    // Call DB API if it's master
    if (forms.find(f => f.id === editingFormId)?.isMaster) {
      const res = await saveFormFields(formFields);
      if (res.error) notify(res.error, "error");
    }
    
    notify("Form successfully published to Pipeline!");
    setSettingsSubTab("PUBLISHED");
    setLoading("");
  }

  async function handleExecutiveSubmitReview() {
    setLoading("save-form");
    const res = await submitReviewRequest("UPDATE_FORM", { formId: editingFormId, title: formTitle, fields: formFields });
    if (res.success) {
      notify("Form changes submitted to Admin. +10 Credits will be awarded upon approval.");
    } else notify(res.error || "Failed to submit request", "error");
    setLoading("");
  }

  function togglePortalStatus(formId: string) {
    setForms(prev => prev.map(f => f.id === formId && !f.isMaster ? { ...f, isActive: !f.isActive } : f));
    notify("Status updated! (Will persist globally after DB Schema update)");
  }

  function toggleExecAccess(formId: string) {
    setForms(prev => prev.map(f => f.id === formId ? { ...f, execVaultAccess: !f.execVaultAccess } : f));
    notify("Vault access updated! (Will persist globally after DB Schema update)");
  }

  // --- DATA VAULT EXPORT ---
  function downloadCSV() {
    if (studentResponses.length === 0) return notify("No data to export.", "error");
    const headers = ["Name", "Email", "Date"]; // simplified for brevity
    const rows = studentResponses.map((r) => [r.name, r.email, r.date]);
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Data_Vault_Export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (loading === "init") return <div className="p-8 text-center text-slate-500 font-bold">Synchronizing System Pipeline...</div>;

  // PIPELINE FILTERS
  const allowedVaultForms = forms.filter(f => isAdmin || f.execVaultAccess);
  const activeVaultFormConfig = allowedVaultForms.find(f => f.id === vaultFormId) || allowedVaultForms[0];
  const pinnedFields = activeVaultFormConfig?.fields.filter((f: any) => f.isHighlighted) || [];

  return (
    <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {message && (
        <div className={`p-4 rounded-2xl text-xs font-bold text-center border shadow-md transition-all ${message.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"}`}>
          {message.text}
        </div>
      )}

      {/* MULTITASKING TABS */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl overflow-x-auto no-scrollbar shadow-inner gap-1">
        <button onClick={() => setSettingsSubTab("BUILDER")} className={`flex-1 px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all whitespace-nowrap flex items-center justify-center gap-2 ${settingsSubTab === "BUILDER" ? "bg-white shadow-sm text-blue-700" : "text-slate-500 hover:bg-slate-200/50"}`}>
          <Settings className="w-4 h-4" /> Form Engine
        </button>
        <button onClick={() => setSettingsSubTab("PUBLISHED")} className={`flex-1 px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all whitespace-nowrap flex items-center justify-center gap-2 ${settingsSubTab === "PUBLISHED" ? "bg-white shadow-sm text-emerald-600" : "text-slate-500 hover:bg-slate-200/50"}`}>
          <FolderKanban className="w-4 h-4" /> Live Preview
        </button>
        
        {allowedVaultForms.length > 0 && (
          <button onClick={() => setSettingsSubTab("RESPONSES")} className={`flex-1 px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all whitespace-nowrap flex items-center justify-center gap-2 ${settingsSubTab === "RESPONSES" ? "bg-white shadow-sm text-purple-600" : "text-slate-500 hover:bg-slate-200/50"}`}>
            <Database className="w-4 h-4" /> Data Vault
          </button>
        )}
      </div>

      {/* ================= BUILDER ================= */}
      {settingsSubTab === "BUILDER" && (
        <div className="clay-card p-4 sm:p-8 space-y-6 animate-in fade-in">
           <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-200 pb-4 gap-4">
             <div>
               <h2 className="text-xl font-extrabold text-[#0F2547]">Universal Form Builder</h2>
               <p className="text-xs text-slate-500 mt-1">Design collection structures for core events and modules.</p>
             </div>
             
             <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 w-full lg:w-auto">
               <Settings className="w-4 h-4 text-blue-600 shrink-0 ml-1" />
               <select value={editingFormId} onChange={(e) => setEditingFormId(e.target.value)} className="bg-transparent border-none text-xs font-bold text-slate-700 outline-none w-full">
                 {forms.map(form => (
                   <option key={form.id} value={form.id}>
                     {form.isMaster ? "⭐" : "📄"} {form.title}
                   </option>
                 ))}
               </select>
               <button onClick={handleCreateNewForm} className="clay-btn px-2 py-1 text-[10px] text-blue-700 ml-2 whitespace-nowrap font-bold hover:bg-blue-50">
                 + New Form
               </button>
             </div>
           </div>

           <div className="flex flex-wrap items-center gap-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
              <span className="text-[10px] font-black uppercase text-slate-400 mr-2">Add Fields:</span>
              <button onClick={() => addField("TEXT")} className="clay-btn px-3 py-1.5 text-[11px] font-bold"><Type className="w-3.5 h-3.5 inline mr-1" />Text</button>
              <button onClick={() => addField("NUMBER")} className="clay-btn px-3 py-1.5 text-[11px] font-bold"><Hash className="w-3.5 h-3.5 inline mr-1" />Number</button>
              <button onClick={() => addField("DROPDOWN")} className="clay-btn px-3 py-1.5 text-[11px] font-bold"><List className="w-3.5 h-3.5 inline mr-1" />Drop</button>
              <button onClick={() => addField("CHECKBOX")} className="clay-btn px-3 py-1.5 text-[11px] font-bold"><CheckSquare className="w-3.5 h-3.5 inline mr-1" />Check</button>
              <button onClick={() => addField("FILE_UPLOAD")} className="clay-btn px-3 py-1.5 text-[11px] font-bold"><Upload className="w-3.5 h-3.5 inline mr-1" />File</button>
           </div>

          <div className="space-y-4 clay-inset p-5 rounded-2xl border border-blue-100 bg-blue-50/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1">Form Title</label>
                <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="clay-input w-full px-4 py-2.5 text-sm font-bold text-[#0F2547]" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1">Form Mode</label>
                <select 
                  value={forms.find(f => f.id === editingFormId)?.formMode || "NORMAL"} 
                  onChange={(e) => setForms(prev => prev.map(f => f.id === editingFormId ? { ...f, formMode: e.target.value } : f))}
                  className="clay-input w-full px-4 py-2.5 text-sm font-bold text-blue-700 cursor-pointer"
                >
                  <option value="QUEUE">🔄 Queue Mode (Waitlist/Shortlist Workflow)</option>
                  <option value="NORMAL">✅ Normal Mode (Direct Data Entry)</option>
                  <option value="EVENT">🎉 Event Mode (With Specific Instructions)</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1">Form Description</label>
              <textarea rows={2} value={formDescription} onChange={(e) => setFormDescription(e.target.value)} className="clay-input w-full px-4 py-2.5 text-xs text-slate-600" />
            </div>

            {/* Dynamic Declaration Controller */}
            <div className="pt-3 border-t border-blue-100/50">
              <label className="flex items-center gap-2 cursor-pointer mb-3">
                <input 
                  type="checkbox" 
                  checked={forms.find(f => f.id === editingFormId)?.hasDeclaration || false}
                  onChange={(e) => setForms(prev => prev.map(f => f.id === editingFormId ? { ...f, hasDeclaration: e.target.checked } : f))}
                  className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500" 
                />
                <span className="text-xs font-extrabold text-amber-700 uppercase tracking-wider">Require Official Declaration at Bottom</span>
              </label>
              
              {forms.find(f => f.id === editingFormId)?.hasDeclaration && (
                <div className="animate-in fade-in slide-in-from-top-1">
                  <label className="text-[10px] font-bold text-slate-500 mb-1 block">Custom Declaration Text</label>
                  <textarea 
                    rows={2} 
                    value={forms.find(f => f.id === editingFormId)?.declarationText || ""} 
                    onChange={(e) => setForms(prev => prev.map(f => f.id === editingFormId ? { ...f, declarationText: e.target.value } : f))}
                    placeholder="Enter the exact declaration text students must agree to..."
                    className="clay-input w-full px-4 py-3 text-xs text-slate-700 bg-amber-50/50 border border-amber-100 font-medium leading-relaxed" 
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {formFields.map((field) => (
              <div key={field.id} className="clay-inset p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row gap-4 border border-slate-100">
                <div className="flex items-center gap-3 md:w-1/4">
                  <GripVertical className="w-4 h-4 text-slate-400 cursor-grab" />
                  <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 w-full">
                    {field.fieldType === "TEXT" && <Type className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                    {field.fieldType === "NUMBER" && <Hash className="w-3.5 h-3.5 text-orange-600 shrink-0" />}
                    {field.fieldType === "DROPDOWN" && <List className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                    {field.fieldType === "CHECKBOX" && <CheckSquare className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                    {field.fieldType === "FILE_UPLOAD" && <Upload className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    <span className="text-[10px] font-bold text-slate-600 truncate">{field.fieldType}</span>
                  </div>
                </div>
                <div className="flex-1 space-y-3 min-w-0">
                  <input type="text" value={field.fieldLabel} onChange={(e) => updateField(field.id, "fieldLabel", e.target.value)} className="clay-input w-full px-3 py-2 text-sm font-bold" placeholder="Question Title..." />
                  
                  {(field.fieldType === "TEXT" || field.fieldType === "NUMBER") && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input type="text" value={field.placeholder || ""} onChange={(e) => updateField(field.id, "placeholder", e.target.value)} className="clay-input flex-1 px-3 py-1.5 text-xs" placeholder="Input Placeholder (e.g. Enter your roll no...)" />
                      {field.fieldType === "TEXT" && (
                        <input type="number" value={field.wordLimit || 0} onChange={(e) => updateField(field.id, "wordLimit", Number(e.target.value))} className="clay-input w-full sm:w-1/3 px-3 py-1.5 text-xs" placeholder="Word Limit (0=No Limit)" title="Word Limit" />
                      )}
                    </div>
                  )}
                  {(field.fieldType === "DROPDOWN" || field.fieldType === "CHECKBOX") && (
                    <div className="pl-2 border-l-2 border-purple-200 space-y-2">
                      {field.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input type="text" value={opt} onChange={(e) => updateOption(field.id, optIdx, e.target.value)} className="clay-input w-full px-3 py-1.5 text-xs" />
                          <button onClick={() => removeOption(field.id, optIdx)} disabled={field.options.length === 1} className="text-red-400 hover:text-red-600 disabled:opacity-30"><XCircle className="w-4 h-4" /></button>
                        </div>
                      ))}
                      <button onClick={() => addOption(field.id)} className="text-[10px] font-bold text-blue-600 flex items-center gap-1"><PlusCircle className="w-3 h-3" /> Add Option</button>
                    </div>
                  )}
                </div>
                <div className="flex md:flex-col justify-center gap-4 md:border-l border-slate-200 md:pl-4">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={field.isRequired} onChange={(e) => updateField(field.id, "isRequired", e.target.checked)} className="rounded" /> Required</label>
                  <label className="flex items-center gap-2 text-[11px] font-black text-amber-600 uppercase"><input type="checkbox" checked={field.isHighlighted || false} onChange={(e) => updateField(field.id, "isHighlighted", e.target.checked)} className="rounded accent-amber-500" /> 📌 Pin</label>
                  <button onClick={() => removeField(field.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-xl"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center pt-4 border-t border-slate-200 gap-4">
            {!isAdmin && (
              <p className="text-[10px] font-bold text-amber-600 flex items-center gap-1.5 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                <ShieldAlert className="w-3.5 h-3.5" /> Changes will be sent for Admin Review.
              </p>
            )}
            
            {isAdmin ? (
              <button onClick={handleAdminPublish} disabled={loading === "save-form"} className="clay-btn-primary w-full sm:w-auto px-8 py-3.5 text-sm uppercase font-bold flex items-center justify-center gap-2 shadow-lg ml-auto">
                <CheckCircle className="w-4 h-4" /> {loading === "save-form" ? "Publishing..." : "Publish Format"}
              </button>
            ) : (
              <button onClick={handleExecutiveSubmitReview} disabled={loading === "save-form"} className="clay-btn w-full sm:w-auto px-8 py-3.5 text-sm uppercase font-bold flex items-center justify-center gap-2 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 ml-auto transition-colors">
                <Send className="w-4 h-4" /> {loading === "save-form" ? "Submitting..." : "Submit Edit for Review"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ================= LIVE PREVIEW (MULTI-FORM CARDS) ================= */}
      {settingsSubTab === "PUBLISHED" && (
        <div className="space-y-4 animate-in fade-in">
          <div className="clay-card p-5 mb-6 flex flex-col md:flex-row justify-between md:items-center gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-[#0F2547]">Form Control Center</h2>
              <p className="text-xs text-slate-500">Manage visibility and vault access of all active forms.</p>
            </div>
            {!isAdmin && <p className="text-[10px] text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 font-bold"><Lock className="w-3 h-3 inline mr-1" /> Only Admin can toggle visibility.</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {forms.map((form, idx) => (
              <div key={form.id} className={`clay-card p-5 transition-all ${form.isMaster ? "border-l-4 border-l-amber-400 bg-amber-50/20" : ""}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400">SR NO. {form.serial}</span>
                    <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2 mt-1">
                      {form.isMaster ? "⭐" : "📄"} {form.title}
                    </h3>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100">
                  {/* Toggle 1: Live Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-blue-500" /> Portal Visibility
                    </span>
                    {isAdmin ? (
                      form.isMaster ? (
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded font-bold">ALWAYS ON</span>
                      ) : (
                        <button onClick={() => togglePortalStatus(form.id)} className={`px-3 py-1 rounded-full text-[10px] font-black transition-colors ${form.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          {form.isActive ? "ON" : "OFF"}
                        </button>
                      )
                    ) : (
                      <span className={`text-[10px] font-black px-2 py-1 rounded-full ${form.isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"}`}>{form.isActive ? "LIVE" : "HIDDEN"}</span>
                    )}
                  </div>

                  {/* Toggle 2: Vault Access */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-amber-500" /> Exec Vault Access
                    </span>
                    {isAdmin ? (
                      <button onClick={() => toggleExecAccess(form.id)} className={`px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1 transition-colors ${form.execVaultAccess ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-500"}`}>
                        {form.execVaultAccess ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {form.execVaultAccess ? "GRANTED" : "DENIED"}
                      </button>
                    ) : (
                      <span className={`text-[10px] font-black px-2 py-1 rounded-full ${form.execVaultAccess ? "bg-purple-50 text-purple-600" : "bg-slate-50 text-slate-400"}`}>{form.execVaultAccess ? "ACCESSIBLE" : "RESTRICTED"}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= DATA VAULT ================= */}
      {settingsSubTab === "RESPONSES" && allowedVaultForms.length > 0 && (
        <div className="clay-card p-4 sm:p-6 md:p-8 animate-in fade-in space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-4 gap-3">
            <div className="w-full sm:w-auto">
              <h2 className="text-lg font-extrabold text-[#0F2547] flex items-center gap-2">
                Data Vault 
                <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full">
                  {studentResponses.filter(r => r.formId === vaultFormId).length} Submissions
                </span>
              </h2>
              <div className="mt-2 flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200 w-full sm:w-64">
                <Database className="w-3.5 h-3.5 text-blue-600 ml-1 shrink-0" />
                <select value={vaultFormId} onChange={(e) => setVaultFormId(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 outline-none w-full border-none cursor-pointer">
                  {/* Standard Forms */}
                  {allowedVaultForms.map(form => (
                     <option key={form.id} value={form.id}>{form.title}</option>
                  ))}
                  {/* 🟢 FIX: Dynamically inject forms that have submissions but aren't in the default list */}
                  {Array.from(new Set(studentResponses.filter(r => !allowedVaultForms.find(f => f.id === r.formId)).map(r => r.formId))).map(uniqueId => {
                     const sample = studentResponses.find(r => r.formId === uniqueId);
                     return <option key={uniqueId as string} value={uniqueId as string}>Event: {sample?.topic || "Unknown Form"}</option>
                  })}
                </select>
              </div>
            </div>
            <button onClick={downloadCSV} className="clay-btn-primary w-full sm:w-auto px-4 py-2 text-xs font-bold flex gap-2 justify-center"><Download className="w-4 h-4" /> Export DB</button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead className="bg-slate-100 text-[10px] uppercase font-black text-slate-500">
                <tr>
                  <th className="p-3">Applicant Name</th>
                  {pinnedFields.map((pf: any) => (
                    <th key={pf.id} className="p-3 text-amber-700">📌 {pf.fieldLabel}</th>
                  ))}
                  <th className="p-3">Applied On</th>
                </tr>
              </thead>
              <tbody className="text-xs text-slate-700 font-medium">
                {studentResponses.filter(r => r.formId === vaultFormId).length > 0 ? studentResponses.filter(r => r.formId === vaultFormId).map((res, index) => {
                  let parsedData: any = {};
                  try { parsedData = JSON.parse(res.dynamicData || "{}"); } catch (e) {}

                  return (
                    <tr 
                      key={res.id} 
                      onDoubleClick={() => setSelectedResponseIndex(index)} 
                      className="border-b border-slate-100 hover:bg-blue-50/50 cursor-pointer transition-colors"
                      title="Double click to view full details"
                    >
                      <td className="p-3">
                        <p className="font-extrabold text-[#0F2547]">{res.name}</p>
                        <p className="text-[10px] text-slate-500">{res.email}</p>
                      </td>
                      
                      {/* Dynamic Pinned Fields Columns */}
                      {pinnedFields.map((pf: any) => {
                        const val = parsedData[pf.fieldLabel];
                        return (
                          <td key={pf.id} className="p-3 text-slate-600">
                            {val ? (Array.isArray(val) ? val.join(", ") : String(val)) : <span className="text-slate-300">-</span>}
                          </td>
                        );
                      })}
                      
                      <td className="p-3 text-slate-400">{res.date}</td>
                    </tr>
                  )
                }) : (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400 font-bold">No submissions found for this form.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= STUDENT DATA MODAL (WITH ARROW NAVIGATION) ================= */}
      {selectedResponseIndex !== null && studentResponses.filter(r => r.formId === vaultFormId)[selectedResponseIndex] && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col clay-card shadow-2xl overflow-hidden">
            
            <div className="bg-white/90 backdrop-blur-md p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center z-10 shrink-0">
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-extrabold text-[#0F2547] truncate">{studentResponses.filter(r => r.formId === vaultFormId)[selectedResponseIndex].name}</h3>
                <p className="text-xs text-slate-500 truncate">{studentResponses.filter(r => r.formId === vaultFormId)[selectedResponseIndex].email}</p>
              </div>
              
              <div className="flex items-center gap-2 shrink-0 ml-4">
                {/* Arrow Navigation */}
                <button 
                  onClick={() => setSelectedResponseIndex(selectedResponseIndex - 1)} 
                  disabled={selectedResponseIndex === 0}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setSelectedResponseIndex(selectedResponseIndex + 1)} 
                  disabled={selectedResponseIndex === studentResponses.filter(r => r.formId === vaultFormId).length - 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="w-px h-6 bg-slate-200 mx-1"></div>
                <button onClick={() => setSelectedResponseIndex(null)} className="w-8 h-8 bg-slate-100 hover:bg-red-100 hover:text-red-600 rounded-full font-bold flex items-center justify-center transition-colors">
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 bg-slate-50/30 flex-1">
               {(() => {
                  const currentRes = studentResponses.filter(r => r.formId === vaultFormId)[selectedResponseIndex];
                  let parsedData = {};
                  try { parsedData = typeof currentRes.dynamicData === 'string' ? JSON.parse(currentRes.dynamicData) : {}; } catch (e) {}
                  
                  const entries = Object.entries(parsedData).filter(([k]) => !k.startsWith('$ACTION_'));
                  if (entries.length === 0) return <p className="text-sm text-slate-500 text-center py-10">No additional details submitted.</p>;
                  
                  return entries.map(([key, value], i) => (
                    <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{key}</span>
                      <p className="text-sm font-bold mt-1.5 text-slate-800 leading-relaxed">{Array.isArray(value) ? value.join(", ") : String(value)}</p>
                    </div>
                  ));
                })()}
            </div>
            
            <div className="p-3 border-t border-slate-100 bg-slate-50 text-center shrink-0">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                 Entry {selectedResponseIndex + 1} of {studentResponses.filter(r => r.formId === vaultFormId).length}
               </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}