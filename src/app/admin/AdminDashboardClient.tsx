"use client";

import { useState } from "react";
import { 
  runAutoQueue, 
  toggleStudentSelection, 
  updateApplicationStatus, 
  toggleSlotPublish, 
  updateSlotTheme, 
  sendInvitesToShortlisted 
} from "@/actions/admin";
import { AppStatus } from "@prisma/client";
import { 
  Zap, 
  Mail, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  Clock, 
  UserPlus, 
  UserMinus, 
  Award,
  Video,
  RotateCcw
} from "lucide-react";

type Trainee = {
  id: string;
  course: string;
  semester: string;
  topicInterested: string;
  status: string;
  appliedAt: Date;
  weeklySlotId: string | null;
  user: {
    name: string;
    email: string;
  };
};

type Slot = {
  id: string;
  theme: string | null;
  isPublished: boolean;
  selectedTrainees: Trainee[];
};

export default function AdminDashboardClient({ 
  initialSlot, 
  initialApplications 
}: { 
  initialSlot: Slot; 
  initialApplications: Trainee[];
}) {
  const [slot, setSlot] = useState<Slot>(initialSlot);
  const [themeText, setThemeText] = useState(initialSlot.theme || "");
  const [filter, setFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState<string>("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const selectedStudents = slot.selectedTrainees || [];

  function notify(text: string, type: "success" | "error" = "success") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  }

  // 1. Auto-Queue
  async function handleAutoQueue() {
    setLoading("auto-queue");
    const res = await runAutoQueue(slot.id);
    if (res.error) {
      notify(res.error, "error");
    } else {
      notify(`Auto-Queue Successful: ${res.count} students shortlisted!`);
      window.location.reload();
    }
    setLoading("");
  }

  // 2. Toggle Publish
  async function handleTogglePublish() {
    setLoading("publish");
    const newStatus = !slot.isPublished;
    const res = await toggleSlotPublish(slot.id, newStatus);
    if (res.success) {
      setSlot({ ...slot, isPublished: newStatus });
      notify(newStatus ? "Slot published! Ab yeh Program Home Page par live dikhega." : "Slot unpublished (hidden from Home).");
    }
    setLoading("");
  }

  // 3. Save Theme
  async function handleSaveTheme() {
    setLoading("theme");
    const res = await updateSlotTheme(slot.id, themeText);
    if (res.success) {
      setSlot({ ...slot, theme: themeText });
      notify("Theme name successfully updated!");
    }
    setLoading("");
  }

  // 4. Send Invites
  async function handleSendInvites() {
    setLoading("email");
    const res = await sendInvitesToShortlisted(slot.id);
    if (res.error) {
      notify(res.error, "error");
    } else {
      notify(res.message || "Invites sent successfully!");
    }
    setLoading("");
  }

  // 5. Toggle Selection
  async function handleToggleSelect(appId: string) {
    setLoading(appId);
    const res = await toggleStudentSelection(appId, slot.id);
    if (res.error) {
      notify(res.error, "error");
    } else {
      notify("Selection updated successfully.");
      window.location.reload();
    }
    setLoading("");
  }

  // 6. Update Status
  async function handleStatusChange(appId: string, status: AppStatus) {
    setLoading(appId);
    const res = await updateApplicationStatus(appId, status);
    if (res.success) {
      notify(`Status updated to ${status}.`);
      window.location.reload();
    }
    setLoading("");
  }

  // Filter list
  const filteredApps = initialApplications.filter(app => {
    if (filter === "ALL") return true;
    return app.status === filter;
  });

  return (
    <div className="space-y-8 pb-16">
      {/* Toast Notification */}
      {message && (
        <div className={`p-4 rounded-2xl text-xs sm:text-sm font-bold text-center border shadow-md transition-all ${
          message.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
            : "bg-red-50 text-red-800 border-red-200"
        }`}>
          {message.text}
        </div>
      )}

      {/* 1. TOP CONTROL PANEL: ACTIVE WEEKLY SLOT */}
      <section className="clay-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="clay-badge-blue px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase">
                Active Week Management
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                slot.isPublished 
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300" 
                  : "bg-amber-100 text-amber-800 border border-amber-300"
              }`}>
                {slot.isPublished ? "🟢 Live on Program Home" : "🟡 Hidden from Home"}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F2547]">
              This Week&apos;s Bulletin Roster &amp; Broadcast Setup
            </h2>
          </div>

          {/* Quick Slot Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleTogglePublish}
              disabled={loading === "publish"}
              className={`clay-btn px-4 py-2.5 text-xs flex items-center gap-1.5 ${
                slot.isPublished ? "hover:bg-amber-50 text-amber-800" : "hover:bg-emerald-50 text-emerald-800"
              }`}
            >
              {slot.isPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{slot.isPublished ? "Hide from Home" : "Publish to Home"}</span>
            </button>

            <button
              onClick={handleAutoQueue}
              disabled={loading === "auto-queue"}
              className="clay-btn-primary px-4 py-2.5 text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>{loading === "auto-queue" ? "Selecting..." : "Run Auto-Queue (Pick 2)"}</span>
            </button>

            <button
              onClick={handleSendInvites}
              disabled={loading === "email" || selectedStudents.length === 0}
              className="clay-btn px-4 py-2.5 text-xs flex items-center gap-1.5 hover:bg-blue-50 text-blue-700 disabled:opacity-50"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{loading === "email" ? "Sending..." : "Send Screening Invites (Email)"}</span>
            </button>
          </div>
        </div>

        {/* Theme Settings Bar */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          <div className="w-full">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Week Theme / Topic Focus
            </label>
            <input
              type="text"
              value={themeText}
              onChange={(e) => setThemeText(e.target.value)}
              className="clay-input w-full px-4 py-2.5 text-xs sm:text-sm font-semibold"
              placeholder="e.g. Network Security & Zero-Day Vulnerability Lifecycle"
            />
          </div>
          <button
            onClick={handleSaveTheme}
            disabled={loading === "theme"}
            className="clay-btn px-5 py-2.5 mt-5 sm:mt-5 text-xs font-bold shrink-0"
          >
            {loading === "theme" ? "Saving..." : "Save Theme"}
          </button>
        </div>

        {/* Selected 2 Presenters Slots */}
        <div className="space-y-3 pt-2">
          <p className="text-xs font-black text-[#0F2547] uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-4 h-4 text-blue-600" />
            <span>Assigned Presenters for This Week ({selectedStudents.length} / 2 Selected)</span>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[0, 1].map((index) => {
              const trainee = selectedStudents[index];
              return trainee ? (
                <div key={trainee.id} className="clay-card p-5 bg-white/90 space-y-3 relative">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-black text-blue-600 uppercase">Slot #{index + 1}</span>
                      <h4 className="font-extrabold text-[#0F2547] text-sm">{trainee.user.name}</h4>
                      <p className="text-[11px] text-slate-500">{trainee.course} • {trainee.semester}</p>
                    </div>
                    <button
                      onClick={() => handleToggleSelect(trainee.id)}
                      className="clay-btn px-2.5 py-1 text-[11px] text-red-600 flex items-center gap-1 hover:bg-red-50"
                      title="Remove from slot"
                    >
                      <UserMinus className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  </div>

                  <div className="clay-inset p-2.5 rounded-xl text-xs font-medium text-slate-700">
                    <span className="font-bold text-blue-700">Topic:</span> {trainee.topicInterested}
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[10px] font-semibold text-slate-500">
                    <span>Email: {trainee.user.email}</span>
                    <span className="text-amber-600 font-bold">{trainee.status}</span>
                  </div>
                </div>
              ) : (
                <div key={index} className="clay-soft-blue p-6 rounded-2xl border-2 border-dashed border-blue-200 text-center flex flex-col items-center justify-center space-y-1.5">
                  <span className="text-xs font-black text-slate-400">Slot #{index + 1} (Empty)</span>
                  <p className="text-xs text-slate-500">Click &quot;Auto-Queue&quot; or manually pick a student from the list below.</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 2. ALL STUDENT APPLICATIONS QUEUE */}
      <section className="clay-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Candidate Pipeline</span>
            <h3 className="text-xl font-extrabold text-[#0F2547]">All Enrolled Applications</h3>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {["ALL", "WAITING", "SHORTLISTED", "SCREENING_DONE", "COMPLETED", "REJECTED"].map((st) => (
              <button
                key={st}
                onClick={() => setFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filter === st
                    ? "clay-btn-primary shadow-sm"
                    : "clay-btn text-slate-600 hover:text-blue-600"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* List of Applications */}
        {filteredApps.length > 0 ? (
          <div className="space-y-3.5">
            {filteredApps.map((app) => {
              const isSelectedInSlot = app.weeklySlotId === slot.id;
              return (
                <div 
                  key={app.id} 
                  className={`clay-pill p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isSelectedInSlot ? "ring-2 ring-blue-500/50 bg-blue-50/20" : ""
                  }`}
                >
                  {/* Left Info */}
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-[#0F2547] text-sm">{app.user.name}</h4>
                      <span className="text-[11px] text-slate-400">•</span>
                      <span className="text-xs font-semibold text-slate-600">{app.course} ({app.semester})</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        app.status === "WAITING" ? "bg-amber-100 text-amber-800" :
                        app.status === "SHORTLISTED" ? "bg-blue-100 text-blue-800" :
                        app.status === "SCREENING_DONE" ? "bg-purple-100 text-purple-800" :
                        app.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                      }`}>
                        {app.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700">
                      <strong className="text-blue-700 font-bold">Topic:</strong> {app.topicInterested}
                    </p>

                    <p className="text-[11px] text-slate-400">
                      Email: {app.user.email} • Applied: {new Date(app.appliedAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Slot Toggle Button */}
                    <button
                      onClick={() => handleToggleSelect(app.id)}
                      disabled={loading === app.id}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                        isSelectedInSlot 
                          ? "bg-red-100 text-red-700 hover:bg-red-200" 
                          : "clay-btn hover:bg-blue-50 text-blue-700"
                      }`}
                    >
                      {isSelectedInSlot ? <UserMinus className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                      <span>{isSelectedInSlot ? "Remove from Slot" : "Shortlist for Week"}</span>
                    </button>

                    {/* Status Transitions */}
                    {app.status !== "SCREENING_DONE" && (
                      <button
                        onClick={() => handleStatusChange(app.id, "SCREENING_DONE")}
                        className="clay-btn px-2.5 py-1.5 text-[11px] text-purple-700 hover:bg-purple-50"
                        title="Mark screening passed"
                      >
                        <CheckCircle className="w-3 h-3 text-purple-600" />
                        <span className="hidden sm:inline">Screened</span>
                      </button>
                    )}

                    {app.status !== "COMPLETED" && (
                      <button
                        onClick={() => handleStatusChange(app.id, "COMPLETED")}
                        className="clay-btn px-2.5 py-1.5 text-[11px] text-emerald-700 hover:bg-emerald-50"
                        title="Mark video finished & published"
                      >
                        <Video className="w-3 h-3 text-emerald-600" />
                        <span className="hidden sm:inline">Featured</span>
                      </button>
                    )}

                    {app.status !== "WAITING" && (
                      <button
                        onClick={() => handleStatusChange(app.id, "WAITING")}
                        className="clay-btn px-2 py-1.5 text-[11px] text-slate-500 hover:bg-slate-100"
                        title="Reset back to waiting queue"
                      >
                        <RotateCcw className="w-3 h-3" />
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
            <p className="text-sm font-bold text-slate-600">No applications found in this filter.</p>
            <p className="text-xs text-slate-400">Students who register via the portal will automatically populate here.</p>
          </div>
        )}
      </section>
    </div>
  );
}
