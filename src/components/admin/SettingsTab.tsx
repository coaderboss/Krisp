"use client";

import { useState, useEffect } from "react";
import { 
  Settings, UserCheck, ShieldAlert, PlusCircle, 
  Trash2, GripVertical, Type, List, Upload, CheckCircle, XCircle 
} from "lucide-react";
import { getFormFields, saveFormFields, getPendingExecutives, updateExecutiveApproval } from "@/actions/settings";

type FieldType = "TEXT" | "DROPDOWN" | "FILE_UPLOAD";

type FormField = {
  id: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: FieldType;
  options: string[]; 
  isRequired: boolean;
};

type PendingExecutive = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
};

export default function SettingsTab() {
  const [loading, setLoading] = useState<string>("init");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Real Database Form Fields State
  const [formFields, setFormFields] = useState<FormField[]>([]);
  // Real Database Executive Approvals
  const [pendingExecutives, setPendingExecutives] = useState<PendingExecutive[]>([]);

  function notify(text: string, type: "success" | "error" = "success") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  }

  // --- FETCH REAL DATA ON LOAD ---
  useEffect(() => {
    async function loadData() {
      // 1. Fetch Form Fields
      const fieldsRes = await getFormFields();
      if (fieldsRes.success && fieldsRes.data) {
        const loadedFields = fieldsRes.data.map(f => ({
          id: f.id,
          fieldName: f.fieldName,
          fieldLabel: f.fieldLabel,
          fieldType: f.fieldType as FieldType,
          options: f.options,
          isRequired: f.isRequired
        }));
        
        if (loadedFields.length === 0) {
          setFormFields([{ id: "temp_1", fieldName: `field_${Date.now()}`, fieldLabel: "Full Name", fieldType: "TEXT", options: [], isRequired: true }]);
        } else {
          setFormFields(loadedFields);
        }
      }

      // 2. Fetch Pending Executives
      const execRes = await getPendingExecutives();
      if (execRes.success && execRes.data) {
        setPendingExecutives(execRes.data);
      }
      
      setLoading("");
    }
    loadData();
  }, []);

  // --- FORM BUILDER HANDLERS ---
  function addField(type: FieldType) {
    const newField: FormField = {
      id: `f_${Date.now()}`,
      fieldName: `field_${Date.now()}`,
      fieldLabel: "New Field",
      fieldType: type,
      options: type === "DROPDOWN" ? ["Option 1"] : [],
      isRequired: false
    };
    setFormFields([...formFields, newField]);
  }

  function updateField(id: string, key: keyof FormField, value: any) {
    setFormFields(formFields.map(f => f.id === id ? { ...f, [key]: value } : f));
  }

  function removeField(id: string) {
    setFormFields(formFields.filter(f => f.id !== id));
  }

  function addDropdownOption(fieldId: string) {
    setFormFields(formFields.map(f => {
      if (f.id === fieldId) return { ...f, options: [...f.options, `Option ${f.options.length + 1}`] };
      return f;
    }));
  }

  function updateDropdownOption(fieldId: string, index: number, value: string) {
    setFormFields(formFields.map(f => {
      if (f.id === fieldId) {
        const newOptions = [...f.options];
        newOptions[index] = value;
        return { ...f, options: newOptions };
      }
      return f;
    }));
  }

  function removeDropdownOption(fieldId: string, index: number) {
    setFormFields(formFields.map(f => {
      if (f.id === fieldId) {
        return { ...f, options: f.options.filter((_, i) => i !== index) };
      }
      return f;
    }));
  }

  async function saveFormStructure() {
    setLoading("save-form");
    const res = await saveFormFields(formFields);
    if (res.error) notify(res.error, "error");
    else notify(res.message || "Form successfully published!");
    setLoading("");
  }

  // --- REAL EXECUTIVE HANDLERS ---
  async function handleApproveExecutive(id: string) {
    setLoading(id);
    const res = await updateExecutiveApproval(id, true);
    if (res.success) {
      setPendingExecutives(prev => prev.filter(exec => exec.id !== id));
      notify("Executive Approved successfully!"); 
    } else {
      notify(res.error || "Failed to approve executive", "error");
    }
    setLoading("");
  }

  async function handleRejectExecutive(id: string) {
    if(!confirm("Are you sure you want to reject this request? The user will be converted to a regular student.")) return;
    setLoading(id);
    const res = await updateExecutiveApproval(id, false);
    if (res.success) {
      setPendingExecutives(prev => prev.filter(exec => exec.id !== id));
      notify("Executive request rejected."); 
    } else {
      notify(res.error || "Failed to reject executive", "error");
    }
    setLoading("");
  }

  if (loading === "init") {
    return <div className="p-8 text-center text-slate-500 font-bold">Loading System Data...</div>;
  }

  return (
    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {message && (
        <div className={`p-4 rounded-2xl text-xs sm:text-sm font-bold text-center border shadow-md transition-all ${
          message.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"
        }`}>
          {message.text}
        </div>
      )}

      {/* SECTION 1: REAL EXECUTIVE APPROVALS */}
      <div className="clay-card p-6 sm:p-8 space-y-5">
        <div className="border-b border-slate-200 pb-3">
          <h2 className="text-lg font-extrabold text-[#0F2547] flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" /> Executive Access Requests
          </h2>
          <p className="text-xs text-slate-500 mt-1">Review and approve accounts requesting core team privileges.</p>
        </div>

        {pendingExecutives.length > 0 ? (
          <div className="space-y-3">
            {pendingExecutives.map(exec => (
              <div key={exec.id} className="clay-inset p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl">
                <div>
                  <h4 className="font-bold text-sm text-slate-800">{exec.name}</h4>
                  <p className="text-xs text-slate-500">{exec.email} • Applied: {new Date(exec.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleApproveExecutive(exec.id)} disabled={loading === exec.id} className="clay-btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" /> {loading === exec.id ? "Approving..." : "Approve"}
                  </button>
                  <button onClick={() => handleRejectExecutive(exec.id)} disabled={loading === exec.id} className="px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-500">No pending executive requests in the database.</p>
          </div>
        )}
      </div>

      {/* SECTION 2: DYNAMIC FORM BUILDER */}
      <div className="clay-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-[#0F2547] flex items-center gap-2">
              <List className="w-5 h-5 text-purple-600" /> Dynamic Student Registration Form
            </h2>
            <p className="text-xs text-slate-500 mt-1">Fields defined here will instantly reflect on the public student portal.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={() => addField("TEXT")} className="clay-btn px-3 py-2 text-[11px] font-bold text-slate-600 flex items-center gap-1">
              <Type className="w-3.5 h-3.5" /> + Text
            </button>
            <button onClick={() => addField("DROPDOWN")} className="clay-btn px-3 py-2 text-[11px] font-bold text-slate-600 flex items-center gap-1">
              <List className="w-3.5 h-3.5" /> + Dropdown
            </button>
            <button onClick={() => addField("FILE_UPLOAD")} className="clay-btn px-3 py-2 text-[11px] font-bold text-slate-600 flex items-center gap-1">
              <Upload className="w-3.5 h-3.5" /> + File
            </button>
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
                  {field.fieldType === "FILE_UPLOAD" && <Upload className="w-4 h-4 text-emerald-600" />}
                  <span className="text-[10px] font-bold text-slate-600">{field.fieldType}</span>
                </div>
              </div>

              <div className="flex-1 space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Question / Field Name</label>
                  <input 
                    type="text" 
                    value={field.fieldLabel} 
                    onChange={(e) => updateField(field.id, "fieldLabel", e.target.value)}
                    className="clay-input w-full px-3 py-2 text-sm font-bold text-slate-800"
                    placeholder="e.g., What is your Github link?"
                  />
                </div>

                {field.fieldType === "DROPDOWN" && (
                  <div className="pl-2 border-l-2 border-purple-200 space-y-2">
                    <label className="text-[10px] font-bold text-purple-600 uppercase tracking-wider ml-1">Dropdown Options</label>
                    {field.options.map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <input 
                          type="text" value={opt} 
                          onChange={(e) => updateDropdownOption(field.id, optIdx, e.target.value)}
                          className="clay-input w-full px-3 py-1.5 text-xs"
                        />
                        <button onClick={() => removeDropdownOption(field.id, optIdx)} disabled={field.options.length === 1} className="text-red-400 hover:text-red-600 disabled:opacity-30">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => addDropdownOption(field.id)} className="text-[10px] font-bold text-blue-600 flex items-center gap-1 mt-1 hover:underline">
                      <PlusCircle className="w-3 h-3" /> Add Option
                    </button>
                  </div>
                )}
              </div>

              <div className="flex md:flex-col items-center justify-between md:justify-center gap-4 md:w-32 md:border-l border-slate-200 md:pl-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={field.isRequired}
                    onChange={(e) => updateField(field.id, "isRequired", e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-600">Required</span>
                </label>
                
                <button onClick={() => removeField(field.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

            </div>
          ))}
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-200">
          <button onClick={saveFormStructure} disabled={loading === "save-form"} className="clay-btn-primary px-8 py-3.5 text-sm uppercase tracking-wider flex items-center gap-2 shadow-lg">
            <CheckCircle className="w-4 h-4" />
            <span>{loading === "save-form" ? "Publishing to DB..." : "Publish Live Form to DB"}</span>
          </button>
        </div>
      </div>
    </section>
  );
}