"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  ShieldAlert, PlusCircle, Trash2, GripVertical, Type, List, Upload, CheckCircle, XCircle, CheckSquare, 
  Download, Database, Settings, Send, Eye, EyeOff, FolderKanban, ChevronLeft, ChevronDown, ChevronRight, Globe, Lock, 
  Hash, LayoutTemplate, FileText, PenTool, LayoutPanelLeft, MousePointerSquareDashed, Play, Bold, Italic, 
  ListOrdered, Heading, AlertTriangle, ArrowUp, ArrowDown, MonitorPlay, Camera, Link as LinkIcon
} from "lucide-react";
import { getAllFormsAdmin, saveCompleteForm } from "@/actions/settings";
import { fetchAllApplications, allowReattempt, deleteVaultEntry } from "@/actions/admin";

export default function SettingsTab() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "CLUB_ADMIN";

  const [loading, setLoading] = useState<string>("init");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [settingsSubTab, setSettingsSubTab] = useState<"BUILDER" | "PUBLISHED" | "RESPONSES">("BUILDER");
  
  // --- DATABASE & ENGINE STATES ---
  const [forms, setForms] = useState<any[]>([]);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [studentResponses, setStudentResponses] = useState<any[]>([]);
  const [vaultFormId, setVaultFormId] = useState("");
  const [selectedResponseIndex, setSelectedResponseIndex] = useState<number | null>(null);

  // --- SPA EDITOR STATES ---
  const [builderView, setBuilderView] = useState<"INSTRUCTIONS" | "FIELDS" | "DECLARATION" | "PREVIEW">("INSTRUCTIONS");
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);

  function notify(text: string, type: "success" | "error" = "success") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  }

  useEffect(() => {
    async function loadData() {
      const formsRes = await getAllFormsAdmin();
      let masterDbId = "master"; // Fallback
      
      if (formsRes.success && formsRes.data && formsRes.data.length > 0) {
        setForms(formsRes.data);
        setEditingFormId(formsRes.data[0].id);
        setVaultFormId(formsRes.data[0].id);
        const mForm = formsRes.data.find((f:any) => f.isMaster);
        if (mForm) masterDbId = mForm.id;
      } else {
        // First Time Boot Defaults with Block-based Instructions
        const defaultMaster = {
          id: "master", serial: 1, title: "Master Form: Weekly Bulletin", description: "Main application form for club presenters.",
          isMaster: true, isActive: true, execVaultAccess: true, formMode: "QUEUE", hasDeclaration: true,
          instructionText: JSON.stringify([
            { id: '1', type: 'h3', content: 'Official Program Guidelines' },
            { id: '2', type: 'p', content: 'Please read the following instructions carefully before proceeding.' },
            { id: '3', type: 'number', content: '<b>Purpose of Collection:</b> This application is strictly intended for official events.' },
            { id: '4', type: 'number', content: '<b>Data Confidentiality:</b> Your submitted personal data is end-to-end secured.' },
            { id: '5', type: 'number', content: '<b>Queue Selection:</b> Shortlisting is based on merit and queue position.' }
          ]),
          declarationText: "I hereby declare that all information provided is accurate to the best of my knowledge. If shortlisted, I strictly commit to being present on the scheduled date without fail. I understand that any unjustified absence or unprofessional conduct will disrupt club operations and will result in strict disciplinary action.",
          questions: []
        };
        setForms([defaultMaster]);
        setEditingFormId("master");
        setVaultFormId("master");
      }

      const appsRes = await fetchAllApplications();
      if (appsRes.success && appsRes.data) {
        const realData = appsRes.data.map((app: any) => ({
          ...app,
          formId: (app.topicInterested || app.topic)?.includes("Master Form") || app.formId === "master" ? masterDbId : (app.formId || masterDbId), 
          name: app.user?.name || app.name || "Unknown User", 
          email: app.user?.email || app.email || "No Email",
          date: app.date || new Date(app.appliedAt || Date.now()).toLocaleDateString(),
        }));
        setStudentResponses(realData);
      }
      setLoading("");
    }
    loadData();
  }, []);

  const activeForm = forms.find(f => f.id === editingFormId);

  // --- SPA BUILDER HANDLERS ---
  const updateActiveForm = (updates: any) => {
    setForms(forms.map(f => f.id === editingFormId ? { ...f, ...updates } : f));
  };

  const addField = (type: string) => {
    const newField = {
      id: `f_${Date.now()}`, fieldName: `field_${Date.now()}`, fieldLabel: type === 'FILE_UPLOAD' ? "Upload Document" : "New Question",
      fieldType: type, 
      options: type === 'FILE_UPLOAD' ? ['.pdf', '.jpg', '.png'] : ["Option 1"], 
      isRequired: true, isHighlighted: false, 
      maxLength: type === 'FILE_UPLOAD' ? 5 : null, 
      isMultiSelect: false, placeholder: ""
    };
    updateActiveForm({ questions: [...(activeForm?.questions || []), newField] });
    setActiveFieldId(newField.id);
    setBuilderView("FIELDS");
  };

  const moveField = (index: number, direction: "up" | "down") => {
    const newQuestions = [...(activeForm?.questions || [])];
    if (direction === "up" && index > 0) {
      [newQuestions[index - 1], newQuestions[index]] = [newQuestions[index], newQuestions[index - 1]];
    } else if (direction === "down" && index < newQuestions.length - 1) {
      [newQuestions[index + 1], newQuestions[index]] = [newQuestions[index], newQuestions[index + 1]];
    }
    updateActiveForm({ questions: newQuestions });
  };

  const updateField = (id: string, key: string, value: any) => {
    if (key === "isHighlighted" && value === true && (activeForm?.questions || []).filter((f:any) => f.isHighlighted).length >= 4) {
      return notify("Maximum 4 pinned fields allowed!", "error");
    }
    updateActiveForm({
      questions: activeForm?.questions.map((f:any) => f.id === id ? { ...f, [key]: value } : f)
    });
  };

  const removeField = (id: string) => {
    updateActiveForm({ questions: activeForm?.questions.filter((f:any) => f.id !== id) });
    if (activeFieldId === id) setActiveFieldId(null);
  };

  const handleCreateNewForm = () => {
    const defaultBlocks = [
      { id: '1', type: 'h3', content: 'Official Program Guidelines' },
      { id: '2', type: 'p', content: 'Please read the following instructions carefully before proceeding.' },
      { id: '3', type: 'bullet', content: '<b>Data Confidentiality:</b> Your submitted personal data is end-to-end secured.' }
    ];
    
    const newForm = {
      id: `new_${Date.now()}`, title: "Untitled Event", description: "", 
      instructionText: JSON.stringify(defaultBlocks),
      isMaster: false, isActive: false, execVaultAccess: true, formMode: "EVENT",
      hasDeclaration: true, declarationText: "I agree to the terms.", questions: []
    };
    setForms([...forms, newForm]);
    setEditingFormId(newForm.id);
    setBuilderView("INSTRUCTIONS");
  };

  const handlePublishForm = async () => {
    if (!activeForm) return;
    setLoading("publish");
    const res = await saveCompleteForm(activeForm.id, activeForm, activeForm.questions || []);
    if (res.success) {
      notify(res.message);
      setTimeout(() => window.location.reload(), 1500);
    } else notify(res.error || "Failed", "error");
    setLoading("");
  };

  // Helper for block-based editor
  const getInstructionBlocks = () => {
    if (!activeForm?.instructionText) return [];
    try {
      if (activeForm.instructionText.startsWith('[')) {
        return JSON.parse(activeForm.instructionText);
      }
      return [{ id: 'old', type: 'html', content: activeForm.instructionText }];
    } catch {
      return [];
    }
  };

  const updateInstructionBlock = (id: string, newContent: string) => {
    const blocks = getInstructionBlocks();
    const updated = blocks.map((b: any) => b.id === id ? { ...b, content: newContent } : b);
    updateActiveForm({ instructionText: JSON.stringify(updated) });
  };

  const removeInstructionBlock = (id: string) => {
    const blocks = getInstructionBlocks();
    const updated = blocks.filter((b: any) => b.id !== id);
    updateActiveForm({ instructionText: JSON.stringify(updated) });
  };

  const addInstructionBlock = (type: 'h3' | 'p' | 'bullet' | 'number' | 'alert') => {
    const blocks = getInstructionBlocks();
    const newBlock = { id: `block_${Date.now()}`, type, content: '' };
    updateActiveForm({ instructionText: JSON.stringify([...blocks, newBlock]) });
  };

  const activeField = activeForm?.questions?.find((f:any) => f.id === activeFieldId);
  const allowedVaultForms = forms.filter(f => isAdmin || f.execVaultAccess);
  const vaultFormConfig = allowedVaultForms.find(f => f.id === vaultFormId) || allowedVaultForms[0];
  const pinnedFields = vaultFormConfig?.questions?.filter((f: any) => f.isHighlighted) || [];

  if (loading === "init") return <div className="p-10 text-center font-bold text-slate-500">Initializing Engine...</div>;

  return (
    <section className="space-y-6 animate-in fade-in">
      {message && (
        <div className={`p-4 rounded-xl text-xs font-bold text-center border shadow-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"}`}>
          {message.text}
        </div>
      )}

      {/* TOP NAVIGATION MODULE */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl overflow-x-auto no-scrollbar shadow-inner gap-1">
        <button onClick={() => setSettingsSubTab("BUILDER")} className={`flex-1 px-4 py-2.5 text-xs font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all ${settingsSubTab === "BUILDER" ? "bg-white shadow-sm text-blue-700" : "text-slate-500 hover:bg-slate-200/50"}`}>
          <PenTool className="w-4 h-4" /> SPA Form Editor
        </button>
        <button onClick={() => setSettingsSubTab("PUBLISHED")} className={`flex-1 px-4 py-2.5 text-xs font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all ${settingsSubTab === "PUBLISHED" ? "bg-white shadow-sm text-emerald-600" : "text-slate-500 hover:bg-slate-200/50"}`}>
          <FolderKanban className="w-4 h-4" /> Live Control
        </button>
        {allowedVaultForms.length > 0 && (
          <button onClick={() => setSettingsSubTab("RESPONSES")} className={`flex-1 px-4 py-2.5 text-xs font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all ${settingsSubTab === "RESPONSES" ? "bg-white shadow-sm text-purple-600" : "text-slate-500 hover:bg-slate-200/50"}`}>
            <Database className="w-4 h-4" /> Data Vault
          </button>
        )}
      </div>

      {/* ========================================================= */}
      {/* 🛠️ PREMIUM SPA EDITOR (NOTION/WEBFLOW STYLE)            */}
      {/* ========================================================= */}
      {settingsSubTab === "BUILDER" && activeForm && (
        <div className="bg-slate-50 border border-slate-200 rounded-[32px] overflow-hidden flex flex-col h-[850px] shadow-xl">
          
          {/* EDITOR TOPBAR */}
          <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center z-10 shrink-0">
            <div className="flex items-center gap-4">
              <select value={editingFormId || ""} onChange={(e) => setEditingFormId(e.target.value)} className="bg-slate-100 text-[#0F2547] text-sm font-black px-4 py-2 rounded-xl outline-none cursor-pointer border border-slate-200 hover:bg-slate-200">
                {forms.map(form => <option key={form.id} value={form.id}>{form.isMaster ? "⭐" : "📄"} {form.title}</option>)}
              </select>
              <button onClick={handleCreateNewForm} className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-2 rounded-lg transition-colors">+ New</button>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
               <button onClick={() => setBuilderView("INSTRUCTIONS")} className={`px-4 py-1.5 text-[11px] font-extrabold uppercase rounded-lg transition-all ${builderView === "INSTRUCTIONS" ? "bg-white shadow text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>Instructions</button>
               <button onClick={() => setBuilderView("FIELDS")} className={`px-4 py-1.5 text-[11px] font-extrabold uppercase rounded-lg transition-all ${builderView === "FIELDS" ? "bg-white shadow text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>Form Fields</button>
               <button onClick={() => setBuilderView("DECLARATION")} className={`px-4 py-1.5 text-[11px] font-extrabold uppercase rounded-lg transition-all ${builderView === "DECLARATION" ? "bg-white shadow text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>Declaration</button>
               <button onClick={() => setBuilderView("PREVIEW")} className={`px-4 py-1.5 text-[11px] font-extrabold uppercase rounded-lg transition-all flex items-center gap-1 ${builderView === "PREVIEW" ? "bg-emerald-500 shadow text-white" : "bg-slate-200 text-slate-600 hover:bg-slate-300"}`}>
                 <Play className="w-3 h-3"/> Preview
               </button>
            </div>

            {isAdmin && (
              <button onClick={handlePublishForm} disabled={loading === "publish"} className="clay-btn-primary px-6 py-2.5 text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-md">
                <Send className="w-4 h-4"/> {loading === "publish" ? "Saving..." : "Publish Form"}
              </button>
            )}
          </div>

          {/* EDITOR WORKSPACE (3-COLUMN LAYOUT) */}
          <div className="flex flex-1 overflow-hidden">
            
            {/* LEFT TOOLBAR (Only visible in FIELDS view) */}
            {builderView === "FIELDS" && (
              <div className="w-64 bg-white border-r border-slate-200 p-5 overflow-y-auto shrink-0 space-y-6">
                <div>
                  <h4 className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest flex items-center gap-1.5"><LayoutPanelLeft className="w-4 h-4"/> Form Settings</h4>
                  <div className="space-y-3">
                    <input type="text" value={activeForm.title} onChange={e => updateActiveForm({title: e.target.value})} className="w-full text-sm font-bold bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg" placeholder="Form Title" />
                    <select value={activeForm.formMode} onChange={e => updateActiveForm({formMode: e.target.value})} className="w-full text-xs font-bold bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg cursor-pointer">
                      <option value="NORMAL">Normal Mode</option>
                      <option value="QUEUE">Queue Mode (Master)</option>
                      <option value="EVENT">Event Mode</option>
                    </select>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest flex items-center gap-1.5"><PlusCircle className="w-4 h-4"/> Add Elements</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => addField("TEXT")} className="flex flex-col items-center justify-center p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl text-slate-600 hover:text-blue-700 transition-colors gap-1.5">
                      <Type className="w-5 h-5"/> <span className="text-[10px] font-bold">Text</span>
                    </button>
                    <button onClick={() => addField("NUMBER")} className="flex flex-col items-center justify-center p-3 bg-slate-50 hover:bg-orange-50 border border-slate-200 rounded-xl text-slate-600 hover:text-orange-700 transition-colors gap-1.5">
                      <Hash className="w-5 h-5"/> <span className="text-[10px] font-bold">Number</span>
                    </button>
                    <button onClick={() => addField("DROPDOWN")} className="flex flex-col items-center justify-center p-3 bg-slate-50 hover:bg-purple-50 border border-slate-200 rounded-xl text-slate-600 hover:text-purple-700 transition-colors gap-1.5">
                      <List className="w-5 h-5"/> <span className="text-[10px] font-bold">Select</span>
                    </button>
                    <button onClick={() => addField("CHECKBOX")} className="flex flex-col items-center justify-center p-3 bg-slate-50 hover:bg-amber-50 border border-slate-200 rounded-xl text-slate-600 hover:text-amber-700 transition-colors gap-1.5">
                      <CheckSquare className="w-5 h-5"/> <span className="text-[10px] font-bold">Choice</span>
                    </button>
                    <button onClick={() => addField("FILE_UPLOAD")} className="col-span-2 flex flex-row items-center justify-center p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 rounded-xl text-slate-600 hover:text-emerald-700 transition-colors gap-2">
                      <Upload className="w-4 h-4"/> <span className="text-[11px] font-bold">File Upload</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* CENTER CANVAS */}
            <div className={`flex-1 bg-slate-50 overflow-y-auto p-8 relative shadow-inner ${builderView === 'INSTRUCTIONS' ? 'p-0 flex' : ''}`}>
              
              {builderView === "INSTRUCTIONS" && (
                <div className="flex w-full h-full flex-col lg:flex-row">
                  {/* Left: Visual Block Editor */}
                  <div className="w-full lg:w-1/2 p-6 border-r border-slate-200 bg-white flex flex-col h-full overflow-y-auto custom-scrollbar">
                     <div className="flex items-center justify-between mb-6 shrink-0">
                       <div>
                         <h3 className="text-lg font-extrabold text-[#0F2547]">Instruction Builder</h3>
                         <p className="text-[10px] text-slate-500 uppercase tracking-widest">Build your page block by block</p>
                       </div>
                     </div>
                     
                     <div className="space-y-4 flex-1">
                       {getInstructionBlocks().map((block: any) => (
                         <div key={block.id} className="relative group">
                           {block.type === 'h3' && (
                             <div className="flex items-center gap-2">
                               <Heading className="w-4 h-4 text-blue-500 shrink-0"/>
                               <input 
                                 type="text" 
                                 value={block.content} 
                                 onChange={(e) => updateInstructionBlock(block.id, e.target.value)} 
                                 placeholder="Section Heading..."
                                 className="w-full text-lg font-extrabold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                               />
                             </div>
                           )}
                           {block.type === 'p' && (
                             <div className="flex items-start gap-2">
                               <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-3"/>
                               <textarea 
                                 value={block.content} 
                                 onChange={(e) => updateInstructionBlock(block.id, e.target.value)} 
                                 placeholder="Regular paragraph text... (Use <b>text</b> for bold)"
                                 rows={3}
                                 className="w-full text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 custom-scrollbar"
                               />
                             </div>
                           )}
                           {block.type === 'bullet' && (
                             <div className="flex items-center gap-2">
                               <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 ml-2"></span>
                               <input 
                                 type="text" 
                                 value={block.content} 
                                 onChange={(e) => updateInstructionBlock(block.id, e.target.value)} 
                                 placeholder="Bullet point item... (Use <b>text</b> for bold)"
                                 className="w-full text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                               />
                             </div>
                           )}
                           {block.type === 'number' && (
                             <div className="flex items-center gap-2">
                               <span className="text-[10px] font-black text-blue-600 bg-blue-100 w-6 h-6 flex items-center justify-center rounded-md shrink-0">#</span>
                               <input 
                                 type="text" 
                                 value={block.content} 
                                 onChange={(e) => updateInstructionBlock(block.id, e.target.value)} 
                                 placeholder="Numbered list item... (Use <b>text</b> for bold)"
                                 className="w-full text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                               />
                             </div>
                           )}
                           {block.type === 'alert' && (
                             <div className="flex items-start gap-2">
                               <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-3"/>
                               <textarea 
                                 value={block.content} 
                                 onChange={(e) => updateInstructionBlock(block.id, e.target.value)} 
                                 placeholder="Highlight alert box text..."
                                 rows={2}
                                 className="w-full text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-amber-500 custom-scrollbar"
                               />
                             </div>
                           )}
                           {block.type === 'html' && (
                              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                                This form uses the old HTML system. Please delete this block and rebuild using the new tools below.
                              </div>
                           )}
                           
                           <button 
                             onClick={() => removeInstructionBlock(block.id)}
                             className="absolute top-2 -right-10 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                           >
                             <Trash2 className="w-4 h-4"/>
                           </button>
                         </div>
                       ))}
                       
                       <div className="pt-6 mt-4 border-t border-slate-200 border-dashed">
                         <p className="text-[10px] font-black uppercase text-slate-400 mb-3 text-center tracking-widest">Add New Block</p>
                         <div className="flex flex-wrap justify-center gap-2">
                           <button onClick={() => addInstructionBlock('h3')} className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition-colors"><Heading className="w-3 h-3"/> Heading</button>
                           <button onClick={() => addInstructionBlock('p')} className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition-colors"><Type className="w-3 h-3"/> Paragraph</button>
                           <button onClick={() => addInstructionBlock('bullet')} className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition-colors"><List className="w-3 h-3"/> Bullet (Dot)</button>
                           <button onClick={() => addInstructionBlock('number')} className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition-colors"><ListOrdered className="w-3 h-3"/> Number List</button>
                           <button onClick={() => addInstructionBlock('alert')} className="px-3 py-1.5 bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-700 text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition-colors"><AlertTriangle className="w-3 h-3"/> Alert Box</button>
                         </div>
                       </div>
                     </div>
                  </div>
                  
                  {/* Right: Live UI Preview */}
                  <div className="w-full lg:w-1/2 p-6 bg-slate-50 overflow-y-auto custom-scrollbar border-t lg:border-t-0 border-slate-200">
                     <div className="mb-6 flex justify-between items-center">
                       <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Eye className="w-4 h-4"/> Student View</h3>
                       <span className="px-2 py-1 bg-white border border-slate-200 text-[9px] font-black text-slate-400 rounded-md">LIVE SYNC</span>
                     </div>
                     
                     <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
                        {getInstructionBlocks().length === 0 ? (
                           <div className="text-center py-10 text-slate-400 text-sm font-bold">Start adding blocks on the left.</div>
                        ) : (
                           getInstructionBlocks().map((block: any, idx: number) => {
                             if (block.type === 'h3') return <h3 key={idx} className="text-xl sm:text-2xl font-extrabold text-[#0F2547] border-b border-slate-100 pb-3" dangerouslySetInnerHTML={{__html: block.content || "Heading..."}} />;
                             if (block.type === 'p') return <p key={idx} className="text-sm text-slate-600 leading-relaxed font-medium" dangerouslySetInnerHTML={{__html: block.content || "Paragraph text..."}} />;
                             if (block.type === 'bullet') return (
                               <div key={idx} className="flex gap-3 items-start pl-1 mt-1">
                                 <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5"></div>
                                 <p className="text-sm text-slate-700 leading-relaxed font-medium" dangerouslySetInnerHTML={{__html: block.content || "Bullet item..."}} />
                               </div>
                             );
                             if (block.type === 'number') {
                               const numIndex = getInstructionBlocks().slice(0, idx).filter((b: any) => b.type === 'number').length + 1;
                               return (
                                 <div key={idx} className="flex gap-3 items-start mt-1">
                                   <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-700 font-black flex items-center justify-center shrink-0 border border-blue-100 text-xs shadow-sm mt-0.5">{numIndex}</div>
                                   <p className="text-sm text-slate-700 leading-relaxed font-medium mt-0.5" dangerouslySetInnerHTML={{__html: block.content || "Numbered item..."}} />
                                 </div>
                               );
                             }
                             if (block.type === 'alert') return (
                               <div key={idx} className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3 mt-2">
                                 <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0"/>
                                 <p className="text-[11px] sm:text-xs text-amber-800 font-bold leading-relaxed" dangerouslySetInnerHTML={{__html: block.content || "Alert message..."}} />
                               </div>
                             );
                             return null;
                           })
                        )}
                     </div>
                  </div>
                </div>
              )}

              {builderView === "FIELDS" && (
                <div className="max-w-2xl mx-auto space-y-6 pb-20">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-extrabold text-[#0F2547]">{activeForm.title}</h3>
                    <p className="text-sm text-slate-500 mt-2">{activeForm.description || "Add a description in Settings"}</p>
                  </div>
                  {activeForm.questions?.map((field: any) => (
                    <div key={field.id} onClick={() => setActiveFieldId(field.id)} className={`bg-white p-5 rounded-2xl border-2 transition-all cursor-pointer group ${activeFieldId === field.id ? 'border-blue-500 shadow-lg scale-[1.02]' : 'border-transparent shadow-sm hover:border-slate-300'}`}>
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-5 h-5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex-1">
                          <label className="block text-sm font-extrabold text-slate-800 mb-1">{field.fieldLabel || "Untitled Question"} {field.isRequired && <span className="text-red-500">*</span>}</label>
                          {field.fieldType === "TEXT" && <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-400">{field.placeholder || "Short text response"}</div>}
                          {field.fieldType === "NUMBER" && <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-400">{field.placeholder || "Numeric value"}</div>}
                          {field.fieldType === "DROPDOWN" && <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-400 flex justify-between">Select... <ChevronDown className="w-4 h-4"/></div>}
                          {field.fieldType === "CHECKBOX" && (
                            <div className="space-y-2 mt-2">
                              {field.options.map((opt:string, i:number) => (
                                <div key={i} className="flex items-center gap-2 text-sm text-slate-600"><div className={`w-4 h-4 rounded border border-slate-300 ${field.isMultiSelect ? 'rounded-md' : 'rounded-full'}`}></div> {opt}</div>
                              ))}
                            </div>
                          )}
                          {field.fieldType === "FILE_UPLOAD" && (
                            <div className="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center gap-1.5">
                              <span className="text-xs font-bold text-slate-400">Secure Cloud Interface</span>
                              <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase tracking-widest">
                                {(field.options || []).join(', ')} • MAX {field.maxLength || 5}MB
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!activeForm.questions || activeForm.questions.length === 0) && (
                    <div className="text-center py-16 border-2 border-dashed border-slate-300 rounded-3xl text-slate-400">
                      <MousePointerSquareDashed className="w-10 h-10 mx-auto mb-3 opacity-50"/>
                      <p className="font-bold text-sm">Form is empty. Add elements from the sidebar.</p>
                    </div>
                  )}
                </div>
              )}

              {builderView === "DECLARATION" && (
                <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                  <label className="flex items-center gap-3 cursor-pointer bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <input type="checkbox" checked={activeForm.hasDeclaration} onChange={(e) => updateActiveForm({hasDeclaration: e.target.checked})} className="w-5 h-5 text-amber-600 rounded border-slate-300" />
                    <span className="text-sm font-extrabold text-slate-800">Enable Official Declaration Checkpoint</span>
                  </label>
                  {activeForm.hasDeclaration && (
                    <div className="space-y-2 animate-in fade-in">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Declaration Statement</label>
                      <textarea value={activeForm.declarationText || ""} onChange={e => updateActiveForm({declarationText: e.target.value})} rows={5} className="w-full bg-amber-50/50 border border-amber-200 rounded-xl p-4 text-sm font-medium text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="I agree that the information provided..." />
                    </div>
                  )}
                </div>
              )}

              {/* LIVE STUDENT PREVIEW MODE */}
              {builderView === "PREVIEW" && (
                <div className="max-w-3xl mx-auto space-y-8 pb-20 animate-in fade-in zoom-in-95">
                  <div className="bg-slate-800 text-white text-center py-2 px-4 rounded-full text-[10px] font-black tracking-widest shadow-lg mx-auto w-max mb-6">
                     STUDENT PORTAL PREVIEW
                  </div>

                  {/* Mock Instruction Page */}
                  {getInstructionBlocks().length > 0 && (
                    <div className="bg-white p-8 sm:p-10 rounded-[32px] shadow-md border border-slate-200">
                      <div className="text-center mb-8 border-b border-slate-100 pb-8">
                        <div className="w-16 h-16 mx-auto bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4"><FileText className="w-8 h-8" /></div>
                        <h2 className="text-2xl font-extrabold text-[#0F2547]">Official Program Guidelines</h2>
                      </div>
                      
                      <div className="space-y-6">
                        {getInstructionBlocks().length === 0 ? (
                           <div className="text-center py-6 text-slate-400 text-sm">No instructions defined.</div>
                        ) : (
                           getInstructionBlocks().map((block: any, idx: number) => {
                             if (block.type === 'h3') return <h3 key={idx} className="text-xl sm:text-2xl font-extrabold text-[#0F2547] border-b border-slate-100 pb-3" dangerouslySetInnerHTML={{__html: block.content}} />;
                             if (block.type === 'p') return <p key={idx} className="text-sm text-slate-600 leading-relaxed font-medium" dangerouslySetInnerHTML={{__html: block.content}} />;
                             if (block.type === 'bullet') return (
                               <div key={idx} className="flex gap-3 items-start pl-1 mt-1">
                                 <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5"></div>
                                 <p className="text-sm text-slate-700 leading-relaxed font-medium" dangerouslySetInnerHTML={{__html: block.content}} />
                               </div>
                             );
                             if (block.type === 'number') {
                               const numIndex = getInstructionBlocks().slice(0, idx).filter((b: any) => b.type === 'number').length + 1;
                               return (
                                 <div key={idx} className="flex gap-3 items-start mt-1">
                                   <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-700 font-black flex items-center justify-center shrink-0 border border-blue-100 text-xs shadow-sm mt-0.5">{numIndex}</div>
                                   <p className="text-sm text-slate-700 leading-relaxed font-medium mt-0.5" dangerouslySetInnerHTML={{__html: block.content}} />
                                 </div>
                               );
                             }
                             if (block.type === 'alert') return (
                               <div key={idx} className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3 mt-2">
                                 <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0"/>
                                 <p className="text-[11px] sm:text-xs text-amber-800 font-bold leading-relaxed" dangerouslySetInnerHTML={{__html: block.content}} />
                               </div>
                             );
                             return null;
                           })
                        )}
                      </div>

                      <div className="mt-10 pt-6 border-t border-slate-200 flex justify-end">
                        <button className="bg-blue-600 text-white px-8 py-4 rounded-xl text-sm font-extrabold shadow-lg opacity-50 cursor-not-allowed">Acknowledge & Proceed</button>
                      </div>
                    </div>
                  )}

                  {/* Mock Form Page */}
                  <div className="bg-white p-8 sm:p-10 rounded-[32px] shadow-md border border-slate-200 mt-8">
                    <div className="border-b border-slate-200 pb-6 mb-8">
                      <h2 className="text-2xl font-extrabold text-[#0F2547]">{activeForm.title}</h2>
                      <p className="text-sm text-slate-500 mt-2 bg-blue-50 p-3 rounded-lg border border-blue-100 font-medium">{activeForm.description}</p>
                    </div>

                    <div className="space-y-8">
                      {activeForm.questions?.map((field: any, idx: number) => (
                        <div key={idx}>
                          <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2 ml-1">
                            {field.fieldLabel} {field.isRequired && <span className="text-red-500">*</span>}
                          </label>
                          {field.fieldType === "TEXT" && <input type="text" disabled className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-sm font-bold opacity-70" placeholder={field.placeholder || "Type your answer..."} />}
                          {field.fieldType === "NUMBER" && <input type="number" disabled className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-sm font-bold opacity-70" placeholder={field.placeholder || `Max Length: ${field.maxLength || 'Unlimited'}`} />}
                          {field.fieldType === "DROPDOWN" && <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-sm font-bold opacity-70 flex justify-between">Select an option... <ChevronDown className="w-4 h-4"/></div>}
                          {field.fieldType === "CHECKBOX" && (
                            <div className="space-y-3 mt-3 p-5 rounded-xl border border-slate-100 bg-slate-50/50">
                              {field.options?.map((opt: string, i: number) => (
                                <label key={i} className="flex items-center gap-3 opacity-70"><div className={`w-5 h-5 border border-slate-300 bg-white ${field.isMultiSelect ? 'rounded' : 'rounded-full'}`}></div><span className="text-sm font-bold text-slate-700">{opt}</span></label>
                              ))}
                            </div>
                          )}
                          {field.fieldType === "FILE_UPLOAD" && (
                            <div className="p-6 rounded-2xl border-2 border-slate-200 border-dashed bg-slate-50 flex flex-col items-center gap-2 opacity-80">
                              <span className="text-xs font-extrabold text-blue-700 bg-blue-100 px-4 py-2 rounded-lg cursor-not-allowed shadow-sm">Secure File Upload</span>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                Max Size: {field.maxLength || 5}MB • Allowed: {(field.options || []).join(', ') || 'Any'}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}

                      {activeForm.hasDeclaration && (
                        <div className="mt-10 p-6 rounded-2xl bg-amber-50/40 border border-amber-200 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-2 h-full bg-amber-500"></div>
                          <div className="flex items-start gap-4">
                            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
                            <label className="flex items-start gap-3.5 opacity-80">
                              <input type="checkbox" disabled className="mt-1 w-6 h-6 text-amber-600 rounded border-amber-300" />
                              <span className="text-sm font-medium text-slate-700 leading-relaxed"><strong className="text-amber-800 font-extrabold block mb-1">Strict Official Declaration:</strong>{activeForm.declarationText}</span>
                            </label>
                          </div>
                        </div>
                      )}

                      <div className="pt-6 mt-8 border-t border-slate-200">
                        <button disabled className="bg-blue-600 text-white w-full py-5 text-sm font-extrabold uppercase tracking-widest rounded-xl shadow-lg opacity-50 cursor-not-allowed">Submit Secure Application</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT SIDEBAR (Properties Panel - Only in FIELDS view) */}
            {builderView === "FIELDS" && (
              <div className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Properties Panel</h3>
                </div>
                
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                  {activeField ? (() => {
                    const fieldIndex = activeForm.questions.findIndex((f:any) => f.id === activeFieldId);
                    return (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                      {/* FIELD ACTIONS (Move / Type Change) */}
                      <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <select 
                          value={activeField.fieldType} 
                          onChange={(e) => {
                            const newType = e.target.value;
                            let options = activeField.options;
                            let maxLength = activeField.maxLength;
                            if (newType === 'FILE_UPLOAD') { options = ['.pdf', '.jpg', '.png']; maxLength = 5; }
                            updateActiveForm({
                              questions: activeForm.questions.map((f:any) => f.id === activeFieldId ? { ...f, fieldType: newType, options, maxLength } : f)
                            });
                          }} 
                          className="flex-1 bg-white border border-slate-200 text-xs font-extrabold text-slate-700 py-2 px-2 rounded-lg cursor-pointer outline-none shadow-sm"
                        >
                          <option value="TEXT">Text Field</option>
                          <option value="NUMBER">Number Field</option>
                          <option value="DROPDOWN">Dropdown Select</option>
                          <option value="CHECKBOX">Choice Checkbox</option>
                          <option value="FILE_UPLOAD">File Upload Config</option>
                        </select>
                        <div className="flex items-center gap-1">
                          <button onClick={() => moveField(fieldIndex, "up")} disabled={fieldIndex === 0} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:hover:text-slate-600 shadow-sm transition-colors"><ArrowUp className="w-3.5 h-3.5"/></button>
                          <button onClick={() => moveField(fieldIndex, "down")} disabled={fieldIndex === activeForm.questions.length - 1} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:hover:text-slate-600 shadow-sm transition-colors"><ArrowDown className="w-3.5 h-3.5"/></button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Question Label</label>
                        <input type="text" value={activeField.fieldLabel} onChange={e => updateField(activeField.id, "fieldLabel", e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-bold shadow-sm focus:border-blue-500 outline-none" />
                      </div>

                      {(activeField.fieldType === "TEXT" || activeField.fieldType === "NUMBER") && (
                        <>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Placeholder Hint</label>
                            <input type="text" value={activeField.placeholder || ""} onChange={e => updateField(activeField.id, "placeholder", e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs shadow-sm focus:border-blue-500 outline-none" placeholder="e.g. Enter value..." />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">{activeField.fieldType === "NUMBER" ? "Maximum Value Limit (Number)" : "Max Character Length"}</label>
                            <input type="number" value={activeField.maxLength || ""} onChange={e => updateField(activeField.id, "maxLength", e.target.value ? Number(e.target.value) : null)} className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs shadow-sm focus:border-blue-500 outline-none" placeholder="Leave empty for unlimited" />
                          </div>
                        </>
                      )}

                      {(activeField.fieldType === "DROPDOWN" || activeField.fieldType === "CHECKBOX") && (
                        <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                          <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-bold text-slate-700">List Options</label>
                            <button onClick={() => updateField(activeField.id, "options", [...activeField.options, `Option ${activeField.options.length + 1}`])} className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100">+ Add</button>
                          </div>
                          {activeField.options.map((opt:string, idx:number) => (
                            <div key={idx} className="flex items-center gap-2">
                              <input type="text" value={opt} onChange={e => {
                                const newOpts = [...activeField.options]; newOpts[idx] = e.target.value;
                                updateField(activeField.id, "options", newOpts);
                              }} className="flex-1 bg-white border border-slate-200 rounded py-1.5 px-2 text-xs outline-none focus:border-blue-400" />
                              <button onClick={() => {
                                updateField(activeField.id, "options", activeField.options.filter((_:any, i:number) => i !== idx));
                              }} disabled={activeField.options.length === 1} className="text-red-400 hover:text-red-600 disabled:opacity-30"><Trash2 className="w-4 h-4"/></button>
                            </div>
                          ))}
                          
                          {activeField.fieldType === "CHECKBOX" && (
                            <label className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200 cursor-pointer">
                              <input type="checkbox" checked={activeField.isMultiSelect} onChange={e => updateField(activeField.id, "isMultiSelect", e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                              <span className="text-xs font-bold text-slate-700">Allow Multiple Selection</span>
                            </label>
                          )}
                        </div>
                      )}

                      {/* SECURE FILE UPLOAD CONFIG */}
                      {activeField.fieldType === "FILE_UPLOAD" && (
                        <div className="space-y-4 p-4 bg-emerald-50/40 border border-emerald-200 rounded-xl shadow-sm">
                           <div className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-emerald-200">
                             <ShieldAlert className="w-5 h-5 text-emerald-600 shrink-0" />
                             <p className="text-[9px] font-extrabold text-emerald-800 leading-tight">
                               Files bypass DB. Saved directly to Secure Cloud Storage API. Scripts & Bugs are strictly blocked by parser.
                             </p>
                           </div>
                           
                           <div>
                             <label className="block text-xs font-bold text-slate-700 mb-2">Allowed Formats</label>
                             <div className="flex flex-wrap gap-2">
                               {['.pdf', '.jpg', '.png', '.docx'].map(ext => (
                                 <label key={ext} className="flex items-center gap-1.5 cursor-pointer bg-white px-2 py-1.5 border border-slate-200 rounded-md shadow-sm">
                                   <input type="checkbox" checked={activeField.options.includes(ext)} onChange={e => {
                                      const newOpts = e.target.checked ? [...activeField.options, ext] : activeField.options.filter((o:any) => o !== ext);
                                      updateField(activeField.id, "options", newOpts);
                                   }} className="rounded text-blue-600 focus:ring-blue-500 w-3 h-3" />
                                   <span className="text-[10px] font-black uppercase text-slate-600">{ext}</span>
                                 </label>
                               ))}
                             </div>
                           </div>
                           
                           <div className="flex gap-3">
                             <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">Max Size (MB)</label>
                                <input type="number" value={activeField.maxLength || 5} onChange={e => updateField(activeField.id, "maxLength", Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs shadow-sm outline-none font-bold" min="1" max="50" />
                             </div>
                             <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">Upload Limit</label>
                                <input type="number" value={activeField.placeholder || 1} onChange={e => updateField(activeField.id, "placeholder", e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs shadow-sm outline-none font-bold text-slate-500" placeholder="1" min="1" max="5" />
                             </div>
                           </div>
                        </div>
                      )}

                      <div className="space-y-3 pt-4 border-t border-slate-200">
                        <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <input type="checkbox" checked={activeField.isRequired} onChange={e => updateField(activeField.id, "isRequired", e.target.checked)} className="rounded text-blue-600" />
                          <span className="text-xs font-bold text-slate-700">Required Field</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer bg-amber-50 p-3 rounded-lg border border-amber-200">
                          <input type="checkbox" checked={activeField.isHighlighted} onChange={e => updateField(activeField.id, "isHighlighted", e.target.checked)} className="rounded text-amber-600" />
                          <span className="text-xs font-bold text-amber-800">Pin to Vault Data Table (Max 4)</span>
                        </label>
                      </div>

                      <button onClick={() => removeField(activeField.id)} className="w-full flex items-center justify-center gap-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 py-3 rounded-xl transition-colors mt-6 shadow-sm">
                        <Trash2 className="w-4 h-4" /> Delete Field
                      </button>
                    </div>
                    );
                  })() : (
                    <div className="text-center py-10 text-slate-400">
                      <Settings className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs font-bold">Select a field on the canvas to edit its properties.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ================= PUBLISHED MODULE ================= */}
      {settingsSubTab === "PUBLISHED" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
          {forms.map((form) => (
            <div key={form.id} className={`clay-card p-6 ${form.isMaster ? "border-l-4 border-l-amber-400 bg-amber-50/20" : ""}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400">MODE: {form.formMode}</span>
                  <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2 mt-1">
                    {form.isMaster ? "⭐" : "📄"} {form.title}
                  </h3>
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-xs font-bold text-slate-600 flex items-center gap-2"><Globe className="w-4 h-4 text-blue-500" /> Portal Visibility</span>
                  <span className={`text-[10px] font-black px-2 py-1 rounded-full ${form.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>{form.isActive ? "LIVE" : "HIDDEN"}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-xs font-bold text-slate-600 flex items-center gap-2"><Lock className="w-4 h-4 text-amber-500" /> Exec Vault Access</span>
                  <span className={`text-[10px] font-black px-2 py-1 rounded-full ${form.execVaultAccess ? "bg-purple-100 text-purple-700" : "bg-slate-200 text-slate-500"}`}>{form.execVaultAccess ? "GRANTED" : "DENIED"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= DATA VAULT ================= */}
      {settingsSubTab === "RESPONSES" && (
        <div className="clay-card p-4 sm:p-6 md:p-8 animate-in fade-in space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-4 gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-[#0F2547] flex items-center gap-2">Data Vault</h2>
              <select value={vaultFormId} onChange={e => setVaultFormId(e.target.value)} className="mt-2 bg-slate-100 text-xs font-bold text-slate-700 px-3 py-2 rounded-lg outline-none cursor-pointer border border-slate-200">
                {allowedVaultForms.map(form => <option key={form.id} value={form.id}>{form.title}</option>)}
              </select>
            </div>
            <button className="clay-btn-primary px-4 py-2 text-xs font-bold flex gap-2"><Download className="w-4 h-4" /> Export DB</button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead className="bg-slate-100 text-[10px] uppercase font-black text-slate-500">
                <tr>
                  <th className="p-3">Applicant Name</th>
                  {pinnedFields.map((pf: any) => <th key={pf.id} className="p-3 text-amber-700">📌 {pf.fieldLabel}</th>)}
                  <th className="p-3">Applied On</th>
                </tr>
              </thead>
              <tbody className="text-xs text-slate-700 font-medium">
                {studentResponses.filter(r => r.formId === vaultFormId).length > 0 ? studentResponses.filter(r => r.formId === vaultFormId).map((res, index) => {
                  let parsedData: any = {}; try { parsedData = JSON.parse(res.dynamicData || "{}"); } catch (e) {}
                  return (
                    <tr key={res.id} onDoubleClick={() => setSelectedResponseIndex(index)} className="border-b border-slate-100 hover:bg-blue-50/50 cursor-pointer transition-colors">
                      <td className="p-3"><p className="font-extrabold text-[#0F2547]">{res.name}</p><p className="text-[10px] text-slate-500">{res.email}</p></td>
                      {pinnedFields.map((pf: any) => <td key={pf.id} className="p-3 text-slate-600">{parsedData[pf.fieldLabel] ? (Array.isArray(parsedData[pf.fieldLabel]) ? parsedData[pf.fieldLabel].join(", ") : String(parsedData[pf.fieldLabel])) : "-"}</td>)}
                      <td className="p-3 text-slate-400">{res.date}</td>
                    </tr>
                  )
                }) : <tr><td colSpan={10} className="p-8 text-center text-slate-400 font-bold">No submissions found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL FOR STUDENT DATA */}
      {selectedResponseIndex !== null && studentResponses.filter(r => r.formId === vaultFormId)[selectedResponseIndex] && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col clay-card shadow-2xl">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center z-10">
              <div>
                <h3 className="text-lg font-extrabold text-[#0F2547]">{studentResponses.filter(r => r.formId === vaultFormId)[selectedResponseIndex].name}</h3>
                <p className="text-xs text-slate-500">{studentResponses.filter(r => r.formId === vaultFormId)[selectedResponseIndex].email}</p>
              </div>
              <button onClick={() => setSelectedResponseIndex(null)} className="w-8 h-8 bg-slate-100 hover:bg-red-100 hover:text-red-600 rounded-full font-bold flex items-center justify-center">✕</button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 bg-slate-50/30 flex-1">
               {(() => {
                  const currentRes = studentResponses.filter(r => r.formId === vaultFormId)[selectedResponseIndex];
                  let parsedData = {}; try { parsedData = JSON.parse(currentRes.dynamicData || "{}"); } catch (e) {}
                  return Object.entries(parsedData).filter(([k]) => !k.startsWith('$ACTION_')).map(([key, value], i) => (
                    <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{key}</span>
                      <p className="text-sm font-bold mt-1.5 text-slate-800 leading-relaxed">{Array.isArray(value) ? value.join(", ") : String(value)}</p>
                    </div>
                  ));
                })()}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}