"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  UserCheck,
  ShieldAlert,
  PlusCircle,
  Trash2,
  GripVertical,
  Type,
  List,
  Upload,
  CheckCircle,
  XCircle,
  CheckSquare,
  Download,
  FileText,
  Database,
} from "lucide-react";
import {
  getFormFields,
  saveFormFields,
  getPendingExecutives,
  updateExecutiveApproval,
} from "@/actions/settings";
import { fetchAllApplications } from "@/actions/admin";

type FieldType = "TEXT" | "DROPDOWN" | "FILE_UPLOAD" | "CHECKBOX";

type FormField = {
  id: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: FieldType;
  options: string[];
  isRequired: boolean;
  isHighlighted?: boolean;
  wordLimit?: number;
};

type PendingExecutive = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
};

export default function SettingsTab() {
  const [loading, setLoading] = useState<string>("init");
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const [settingsSubTab, setSettingsSubTab] = useState<"BUILDER" | "PUBLISHED" | "RESPONSES">("BUILDER");
  const [publishedFields, setPublishedFields] = useState<FormField[]>([]);

  const [formTitle, setFormTitle] = useState("Weekly Bulletin Registration");
  const [formDescription, setFormDescription] = useState(
    "Please fill out this application form to participate in the upcoming cybersecurity screening.",
  );

  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [pendingExecutives, setPendingExecutives] = useState<
    PendingExecutive[]
  >([]);

  const [studentResponses, setStudentResponses] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  function notify(text: string, type: "success" | "error" = "success") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  }

  // --- FETCH 100% REAL DATA ON LOAD ---
  useEffect(() => {
    async function loadData() {
      // 1. Load Form Fields (For both Published and Builder)
      const fieldsRes = await getFormFields();
      if (fieldsRes.success && fieldsRes.data) {
        const loadedFields = fieldsRes.data.map((f: any) => ({
          id: f.id,
          fieldName: f.fieldName,
          fieldLabel: f.fieldLabel,
          fieldType: f.fieldType as FieldType,
          options: f.options || [],
          isRequired: f.isRequired,
          isHighlighted: f.isHighlighted || false,
          wordLimit: f.wordLimit || 0,
        }));

        if (loadedFields.length > 0) {
          // Database me data hai, dono ko update karo
          setPublishedFields(loadedFields);
          setFormFields(loadedFields); 
        } else {
          // Agar DB khaali hai toh Builder me ek default field do
          setFormFields([
            {
              id: "temp_1",
              fieldName: `field_${Date.now()}`,
              fieldLabel: "Full Name",
              fieldType: "TEXT",
              options: [],
              isRequired: true,
            },
          ]);
        }
      }

      // 2. Load Real Executives
      const execRes = await getPendingExecutives();
      if (execRes.success && execRes.data) setPendingExecutives(execRes.data);

      // 3. Load Real Student Responses from Database
      const appsRes = await fetchAllApplications();
      if (appsRes.success && appsRes.data) {
        const realData = appsRes.data.map((app: any) => ({
          id: app.id,
          name: app.user?.name || "Unknown User",
          email: app.user?.email || "No Email",
          topic: app.topicInterested || "Not Selected",
          document: "Pending Upload", 
          date: new Date(app.appliedAt).toLocaleDateString(),
          // BUGS FIXED: Naye fields UI state mein pass kar diye!
          dynamicData: app.dynamicData, 
          description: app.description
        }));
        setStudentResponses(realData);
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
      options: type === "DROPDOWN" || type === "CHECKBOX" ? ["Option 1"] : [],
      isRequired: false,
      isHighlighted: false,
      wordLimit: type === "TEXT" ? 100 : undefined,
    };
    setFormFields([...formFields, newField]);
  }

  function updateField(id: string, key: keyof FormField, value: any) {
    if (key === "isHighlighted" && value === true) {
      const currentPinned = formFields.filter(f => f.isHighlighted).length;
      if (currentPinned >= 4) {
        notify("Aap maximum 4 fields hi dashboard card par pin kar sakte hain!", "error");
        return;
      }
    }
    setFormFields(
      formFields.map((f) => (f.id === id ? { ...f, [key]: value } : f)),
    );
  }

  function removeField(id: string) {
    setFormFields(formFields.filter((f) => f.id !== id));
  }

  function addOption(fieldId: string) {
    setFormFields(
      formFields.map((f) =>
        f.id === fieldId
          ? { ...f, options: [...f.options, `Option ${f.options.length + 1}`] }
          : f,
      ),
    );
  }

  function updateOption(fieldId: string, index: number, value: string) {
    setFormFields(
      formFields.map((f) => {
        if (f.id === fieldId) {
          const newOptions = [...f.options];
          newOptions[index] = value;
          return { ...f, options: newOptions };
        }
        return f;
      }),
    );
  }

  function removeOption(fieldId: string, index: number) {
    setFormFields(
      formFields.map((f) =>
        f.id === fieldId
          ? { ...f, options: f.options.filter((_, i) => i !== index) }
          : f,
      ),
    );
  }

  async function saveFormStructure() {
    setLoading("save-form");
    const res = await saveFormFields(formFields);
    if (res.error) {
      notify(res.error, "error");
    } else {
      notify(res.message || "Form successfully published to DB!");
      setPublishedFields([...formFields]); // Update published view instantly
      setSettingsSubTab("PUBLISHED"); // Redirect to Published Tab
    }
    setLoading("");
  }

  // --- EXECUTIVE APPROVAL HANDLERS ---
  async function handleApproveExecutive(id: string) {
    setLoading(id);
    const res = await updateExecutiveApproval(id, true);
    if (res.success) {
      setPendingExecutives((prev) => prev.filter((exec) => exec.id !== id));
      notify("Executive Approved successfully!");
    } else notify(res.error || "Failed", "error");
    setLoading("");
  }

  async function handleRejectExecutive(id: string) {
    if (!confirm("Reject this request?")) return;
    setLoading(id);
    const res = await updateExecutiveApproval(id, false);
    if (res.success) {
      setPendingExecutives((prev) => prev.filter((exec) => exec.id !== id));
      notify("Executive request rejected.");
    } else notify(res.error || "Failed", "error");
    setLoading("");
  }

  // --- REAL CSV EXPORT LOGIC ---
  function downloadCSV() {
    if (studentResponses.length === 0) {
      notify("No data to export.", "error");
      return;
    }

    const headers = ["Name", "Email", "Topic", "Document", "Date"];
    const rows = studentResponses.map((r) => [
      r.name,
      r.email,
      r.topic,
      r.document,
      r.date,
    ]);

    let csvContent =
      "data:text/csv;charset=utf-8," +
      headers.join(",") +
      "\n" +
      rows.map((e) => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${formTitle.replace(/\s+/g, "_")}_Responses.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify("CSV Downloaded successfully!");
  }

  if (loading === "init")
    return (
      <div className="p-8 text-center text-slate-500 font-bold">
        Loading Real Database Records...
      </div>
    );

  return (
    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {message && (
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm font-bold text-center border shadow-md transition-all ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* SECTION: EXECUTIVE APPROVALS */}
      <div className="clay-card p-4 sm:p-6 md:p-8 space-y-5">
        <div className="border-b border-slate-200 pb-3">
          <h2 className="text-base sm:text-lg font-extrabold text-[#0F2547] flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600 shrink-0" /> Executive Access Requests
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Review and approve accounts requesting core team privileges.
          </p>
        </div>

        {pendingExecutives.length > 0 ? (
          <div className="space-y-3">
            {pendingExecutives.map((exec) => (
              <div
                key={exec.id}
                className="clay-inset p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl"
              >
                <div>
                  <h4 className="font-bold text-sm text-slate-800">
                    {exec.name}
                  </h4>
                  <p className="text-xs text-slate-500 break-all sm:break-normal">{exec.email}</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => handleApproveExecutive(exec.id)}
                    disabled={loading === exec.id}
                    className="clay-btn-primary flex-1 sm:flex-none px-4 py-2 text-xs font-bold text-center"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRejectExecutive(exec.id)}
                    disabled={loading === exec.id}
                    className="flex-1 sm:flex-none px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg text-center"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-500">
              No pending executive requests.
            </p>
          </div>
        )}
      </div>

      {/* SECTION: FORM MANAGEMENT & DATA */}
      <div className="clay-card p-4 sm:p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#0F2547] flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-600 shrink-0" /> Portal Data &amp; Forms
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Manage the live application form and export real student submissions.
            </p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar shrink-0">
            <button
              onClick={() => setSettingsSubTab("BUILDER")}
              className={`flex-1 md:flex-none px-3.5 sm:px-4 py-2 text-xs font-bold rounded-lg transition-all text-center whitespace-nowrap shrink-0 ${settingsSubTab === "BUILDER" ? "bg-white shadow text-blue-700" : "text-slate-500"}`}
            >
              Draft / Edit Form
            </button>
            <button
              onClick={() => setSettingsSubTab("PUBLISHED")}
              className={`flex-1 md:flex-none px-3.5 sm:px-4 py-2 text-xs font-bold rounded-lg transition-all text-center whitespace-nowrap shrink-0 ${settingsSubTab === "PUBLISHED" ? "bg-white shadow text-blue-700" : "text-slate-500"}`}
            >
              Live Published Form
            </button>
            <button
              onClick={() => setSettingsSubTab("RESPONSES")}
              className={`flex-1 md:flex-none px-3.5 sm:px-4 py-2 text-xs font-bold rounded-lg transition-all text-center whitespace-nowrap shrink-0 ${settingsSubTab === "RESPONSES" ? "bg-white shadow text-blue-700" : "text-slate-500"}`}
            >
              View Responses
            </button>
          </div>
        </div>

        {/* --- FORM BUILDER TAB --- */}
        {settingsSubTab === "BUILDER" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="space-y-4 clay-inset p-5 rounded-2xl border border-blue-100 bg-blue-50/30">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1">
                  Form Title
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="clay-input w-full px-4 py-2.5 text-sm font-bold text-[#0F2547]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1">
                  Form Description
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="clay-input w-full px-4 py-2.5 text-xs text-slate-600"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => addField("TEXT")}
                className="clay-btn px-3 py-2 text-[11px] font-bold flex items-center gap-1"
              >
                <Type className="w-3.5 h-3.5" /> + Text
              </button>
              <button
                onClick={() => addField("DROPDOWN")}
                className="clay-btn px-3 py-2 text-[11px] font-bold flex items-center gap-1"
              >
                <List className="w-3.5 h-3.5" /> + Dropdown
              </button>
              <button
                onClick={() => addField("CHECKBOX")}
                className="clay-btn px-3 py-2 text-[11px] font-bold flex items-center gap-1"
              >
                <CheckSquare className="w-3.5 h-3.5" /> + Checkbox
              </button>
              <button
                onClick={() => addField("FILE_UPLOAD")}
                className="clay-btn px-3 py-2 text-[11px] font-bold flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" /> + File
              </button>
            </div>

            <div className="space-y-4">
              {formFields.map((field, index) => (
                <div
                  key={field.id}
                  className="clay-inset p-5 rounded-2xl flex flex-col md:flex-row gap-4 border border-slate-100"
                >
                  <div className="flex items-center gap-3 md:w-1/4">
                    <GripVertical className="w-4 h-4 text-slate-400 cursor-grab" />
                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 w-full">
                      {field.fieldType === "TEXT" && (
                        <Type className="w-4 h-4 text-blue-600" />
                      )}
                      {field.fieldType === "DROPDOWN" && (
                        <List className="w-4 h-4 text-purple-600" />
                      )}
                      {field.fieldType === "CHECKBOX" && (
                        <CheckSquare className="w-4 h-4 text-amber-600" />
                      )}
                      {field.fieldType === "FILE_UPLOAD" && (
                        <Upload className="w-4 h-4 text-emerald-600" />
                      )}
                      <span className="text-[10px] font-bold text-slate-600">
                        {field.fieldType}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                        Question
                      </label>
                      <input
                        type="text"
                        value={field.fieldLabel}
                        onChange={(e) =>
                          updateField(field.id, "fieldLabel", e.target.value)
                        }
                        className="clay-input w-full px-3 py-2 text-sm font-bold text-slate-800"
                      />
                    </div>

                    {field.fieldType === "TEXT" && (
                      <div>
                        <label className="text-[10px] font-bold text-blue-600 uppercase tracking-wider ml-1">
                          Word Limit (0 = No limit)
                        </label>
                        <input
                          type="number"
                          value={field.wordLimit || 0}
                          onChange={(e) =>
                            updateField(
                              field.id,
                              "wordLimit",
                              Number(e.target.value),
                            )
                          }
                          className="clay-input w-full md:w-1/3 px-3 py-1.5 text-xs"
                        />
                      </div>
                    )}

                    {(field.fieldType === "DROPDOWN" ||
                      field.fieldType === "CHECKBOX") && (
                      <div className="pl-2 border-l-2 border-purple-200 space-y-2">
                        <label className="text-[10px] font-bold text-purple-600 uppercase tracking-wider ml-1">
                          Options
                        </label>
                        {field.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) =>
                                updateOption(field.id, optIdx, e.target.value)
                              }
                              className="clay-input w-full px-3 py-1.5 text-xs"
                            />
                            <button
                              onClick={() => removeOption(field.id, optIdx)}
                              disabled={field.options.length === 1}
                              className="text-red-400 hover:text-red-600 disabled:opacity-30"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => addOption(field.id)}
                          className="text-[10px] font-bold text-blue-600 flex items-center gap-1 mt-1"
                        >
                          <PlusCircle className="w-3 h-3" /> Add Option
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex md:flex-col items-center justify-between md:justify-center gap-4 md:w-36 md:border-l border-slate-200 md:pl-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.isRequired}
                        onChange={(e) => updateField(field.id, "isRequired", e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-xs font-bold text-slate-600">Required</span>
                    </label>

                    {/* NAYA: PIN TO CARD TOGGLE */}
                    <label className="flex items-center gap-2 cursor-pointer tooltip-trigger" title="Show this field directly on Candidate Dashboard Card">
                      <input
                        type="checkbox"
                        checked={field.isHighlighted || false}
                        onChange={(e) => updateField(field.id, "isHighlighted", e.target.checked)}
                        className="w-4 h-4 text-amber-500 rounded accent-amber-500"
                      />
                      <span className="text-[11px] font-black text-amber-600 uppercase tracking-wider">📌 Pin</span>
                    </label>

                    <button
                      onClick={() => removeField(field.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200">
              <button
                onClick={saveFormStructure}
                disabled={loading === "save-form"}
                className="clay-btn-primary px-8 py-3.5 text-sm uppercase font-bold flex items-center gap-2 shadow-lg"
              >
                <CheckCircle className="w-4 h-4" />{" "}
                {loading === "save-form" ? "Publishing..." : "Publish Form"}
              </button>
            </div>
          </div>
        )}

        {/* --- LIVE PUBLISHED FORM TAB --- */}
        {settingsSubTab === "PUBLISHED" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-emerald-800 font-bold text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> This is the Live Form
                </h3>
                <p className="text-emerald-600 text-xs mt-1">Students are seeing this exact structure on their portal right now.</p>
              </div>
            </div>

            <div className="clay-card p-6 sm:p-10 pointer-events-none opacity-90">
              <div className="border-b border-slate-200/80 pb-5 mb-6">
                <h2 className="text-2xl font-extrabold text-[#0F2547]">{formTitle}</h2>
                <p className="text-sm text-slate-500 mt-1">{formDescription}</p>
              </div>

              <div className="space-y-6">
                {publishedFields.length > 0 ? publishedFields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 ml-1">
                      {field.fieldLabel} {field.isRequired && <span className="text-red-500">*</span>}
                    </label>

                    {field.fieldType === "TEXT" && (
                      <input type="text" disabled className="clay-input w-full px-4 py-3.5 text-sm font-medium bg-slate-50" placeholder="Type your answer..." />
                    )}

                    {field.fieldType === "DROPDOWN" && (
                      <select disabled className="clay-input w-full px-4 py-3.5 text-sm font-medium bg-slate-50">
                        <option value="">Select an option...</option>
                        {field.options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                      </select>
                    )}

                    {field.fieldType === "CHECKBOX" && (
                      <div className="space-y-3 mt-3">
                        {field.options.map((opt, i) => (
                          <label key={i} className="flex items-center gap-3">
                            <input type="checkbox" disabled className="w-5 h-5 text-blue-600 bg-slate-100 border-slate-300 rounded" />
                            <span className="text-sm font-medium text-slate-500">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {field.fieldType === "FILE_UPLOAD" && (
                      <div className="clay-inset p-4 rounded-xl border border-slate-200 border-dashed bg-slate-50">
                        <input type="file" disabled className="block w-full text-sm text-slate-400" />
                      </div>
                    )}
                  </div>
                )) : (
                  <p className="text-slate-400 text-sm italic">No form published yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- VIEW RESPONSES TAB --- */}
        {settingsSubTab === "RESPONSES" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Total Submissions: {studentResponses.length}
                </h3>
                <p className="text-xs text-slate-500">
                  View detailed descriptions and documents below.
                </p>
              </div>
              <button
                onClick={downloadCSV}
                className="clay-btn-primary w-full sm:w-auto px-5 py-2.5 text-xs font-bold flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Export CSV
              </button>
            </div>

            <div className="overflow-x-auto w-full rounded-xl border border-slate-200">
              {studentResponses.length > 0 ? (
                <table className="w-full min-w-[550px] text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-[10px] uppercase font-black text-slate-500 tracking-wider">
                      <th className="p-3 rounded-tl-lg">Applicant</th>
                      <th className="p-3">Selected Options</th>
                      <th className="p-3">Document</th>
                      <th className="p-3 rounded-tr-lg">Applied On</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs text-slate-700 font-medium">
                    {studentResponses.map((res) => (
                      <tr
                        key={res.id}
                        onClick={() => setSelectedStudent(res)}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="p-3">
                          <p className="font-bold text-[#0F2547] text-sm">
                            {res.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {res.email}
                          </p>
                        </td>
                        <td className="p-3 text-blue-700 bg-blue-50/30 rounded-lg">
                          {res.topic}
                        </td>
                        <td className="p-3">
                          <button className="flex items-center gap-1 text-emerald-600 hover:underline">
                            <FileText className="w-3.5 h-3.5" /> {res.document}
                          </button>
                        </td>
                        <td className="p-3 text-slate-400">{res.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-10">
                  <Database className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-500">
                    No applications received yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* --- STUDENT DETAILS POPUP MODAL --- */}
        {selectedStudent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto clay-card">
              <div className="sticky top-0 bg-white/90 backdrop-blur-md p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between z-10">
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-[#0F2547]">
                    {selectedStudent.name || selectedStudent.user?.name || "Unknown"}
                  </h3>
                  <p className="text-xs text-slate-500 break-all sm:break-normal">
                    {selectedStudent.email || selectedStudent.user?.email || "No email"}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors font-bold shrink-0 ml-2"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="clay-inset p-3.5 sm:p-4 rounded-xl">
                    <span className="text-[10px] font-black text-slate-400 uppercase">
                      Selected Topic
                    </span>
                    <p className="text-sm font-bold text-blue-700 mt-1">
                      {selectedStudent.topic || selectedStudent.topicInterested}
                    </p>
                  </div>
                  <div className="clay-inset p-3.5 sm:p-4 rounded-xl">
                    <span className="text-[10px] font-black text-slate-400 uppercase">
                      Applied On
                    </span>
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
                  <div className="space-y-4">
                    {(() => {
                      // Attempt to parse dynamic JSON data
                      let parsedData = {};
                      try {
                        const rawData = selectedStudent.description || selectedStudent.dynamicData;
                        parsedData = typeof rawData === 'string' ? JSON.parse(rawData) : {};
                      } catch (e) {
                        parsedData = { "Raw Input": selectedStudent.description || "No data provided." };
                      }

                      // Filter out empty or hidden fields (like Next.js action tokens)
                      const entries = Object.entries(parsedData).filter(([key, value]) => !key.startsWith('$ACTION_'));

                      if (entries.length === 0) {
                        return <p className="text-sm text-slate-500 italic">No additional details submitted.</p>;
                      }

                      return entries.map(([key, value], index) => (
                        <div key={index} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">{key}</span>
                          <p className="text-xs text-slate-800 mt-1.5 leading-relaxed font-medium">
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
    </section>
  );
}