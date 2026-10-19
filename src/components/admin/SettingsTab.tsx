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

  const [settingsSubTab, setSettingsSubTab] = useState<"BUILDER" | "RESPONSES">(
    "BUILDER",
  );

  const [formTitle, setFormTitle] = useState("Weekly Bulletin Registration");
  const [formDescription, setFormDescription] = useState(
    "Please fill out this application form to participate in the upcoming cybersecurity screening.",
  );

  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [pendingExecutives, setPendingExecutives] = useState<
    PendingExecutive[]
  >([]);

  // SECURE: Blank array for real database data (No more dummy data)
  const [studentResponses, setStudentResponses] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  function notify(text: string, type: "success" | "error" = "success") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  }

  // --- FETCH 100% REAL DATA ON LOAD ---
  useEffect(() => {
    async function loadData() {
      // 1. Load Form Fields
      const fieldsRes = await getFormFields();
      if (fieldsRes.success && fieldsRes.data) {
        const loadedFields = fieldsRes.data.map((f) => ({
          id: f.id,
          fieldName: f.fieldName,
          fieldLabel: f.fieldLabel,
          fieldType: f.fieldType as FieldType,
          options: f.options,
          isRequired: f.isRequired,
          wordLimit: (f as any).wordLimit || 0,
        }));

        if (loadedFields.length === 0) {
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
        } else {
          setFormFields(loadedFields);
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
          document: "Pending Upload", // Update this when file upload logic is added
          date: new Date(app.appliedAt).toLocaleDateString(),
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
      wordLimit: type === "TEXT" ? 100 : undefined,
    };
    setFormFields([...formFields, newField]);
  }

  function updateField(id: string, key: keyof FormField, value: any) {
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
    if (res.error) notify(res.error, "error");
    else notify(res.message || "Form successfully published to DB!");
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
      <div className="clay-card p-6 sm:p-8 space-y-5">
        <div className="border-b border-slate-200 pb-3">
          <h2 className="text-lg font-extrabold text-[#0F2547] flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" /> Executive Access
            Requests
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
                className="clay-inset p-4 flex items-center justify-between rounded-xl"
              >
                <div>
                  <h4 className="font-bold text-sm text-slate-800">
                    {exec.name}
                  </h4>
                  <p className="text-xs text-slate-500">{exec.email}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveExecutive(exec.id)}
                    disabled={loading === exec.id}
                    className="clay-btn-primary px-4 py-2 text-xs font-bold"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRejectExecutive(exec.id)}
                    disabled={loading === exec.id}
                    className="px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg"
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
      <div className="clay-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-[#0F2547] flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-600" /> Portal Data &
              Forms
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Manage the live application form and export real student
              submissions.
            </p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setSettingsSubTab("BUILDER")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${settingsSubTab === "BUILDER" ? "bg-white shadow text-blue-700" : "text-slate-500"}`}
            >
              Form Builder
            </button>
            <button
              onClick={() => setSettingsSubTab("RESPONSES")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${settingsSubTab === "RESPONSES" ? "bg-white shadow text-blue-700" : "text-slate-500"}`}
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

                  <div className="flex md:flex-col items-center justify-between md:justify-center gap-4 md:w-32 md:border-l border-slate-200 md:pl-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.isRequired}
                        onChange={(e) =>
                          updateField(field.id, "isRequired", e.target.checked)
                        }
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-xs font-bold text-slate-600">
                        Required
                      </span>
                    </label>
                    <button
                      onClick={() => removeField(field.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl"
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

        {/* --- VIEW RESPONSES TAB --- */}
        {settingsSubTab === "RESPONSES" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
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
                className="clay-btn-primary px-5 py-2.5 text-xs font-bold flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Export CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              {studentResponses.length > 0 ? (
                <table className="w-full text-left border-collapse">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto clay-card">
              <div className="sticky top-0 bg-white/90 backdrop-blur-md p-5 border-b border-slate-100 flex items-center justify-between z-10">
                <div>
                  <h3 className="text-xl font-extrabold text-[#0F2547]">
                    {selectedStudent.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedStudent.email}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="clay-inset p-4 rounded-xl">
                    <span className="text-[10px] font-black text-slate-400 uppercase">
                      Selected Topic
                    </span>
                    <p className="text-sm font-bold text-blue-700 mt-1">
                      {selectedStudent.topic}
                    </p>
                  </div>
                  <div className="clay-inset p-4 rounded-xl">
                    <span className="text-[10px] font-black text-slate-400 uppercase">
                      Applied On
                    </span>
                    <p className="text-sm font-bold text-slate-700 mt-1">
                      {selectedStudent.date}
                    </p>
                  </div>
                </div>

                {/* Detailed Form Fields (Dynamic Data Map) */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 border-b pb-2">
                    Full Application Details
                  </h4>
                  <div className="space-y-4">
                    {/* Jab real dynamic data aayega, yahan map karenge. Example layout: */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500">
                        Why do you want to join?
                      </span>
                      <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">
                        {selectedStudent.description ||
                          "Student description will appear here securely."}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500">
                        Attached Documents
                      </span>
                      <p className="text-xs text-emerald-600 font-bold mt-1.5 flex items-center gap-1.5">
                        📄 {selectedStudent.document}
                      </p>
                    </div>
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
