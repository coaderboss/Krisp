"use client";

import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Video, 
  Users, 
  Send, 
  Settings as SettingsIcon, 
  Bell, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Type, 
  List, 
  CheckSquare, 
  Upload, 
  ArrowRight,
  ScanLine,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Radio,
  SlidersHorizontal,
  X
} from "lucide-react";
import OverviewTab from "@/components/admin/OverviewTab";
import WorkflowTab from "@/components/admin/WorkflowTab";
import TeamTab from "@/components/admin/TeamTab";
import CommunicationTab from "@/components/admin/CommunicationTab";
import SettingsTab from "@/components/admin/SettingsTab";
import AttendancePortal from "@/components/admin/AttendancePortal";
import { getPendingRequests, approveRequest, rejectRequest } from "@/actions/requests";
import { fetchTeamData } from "@/actions/team";
import { getOrCreateCurrentSlot, fetchAllApplications } from "@/actions/admin";
import { getLiveAdminSession } from "@/actions/attendance";
import { motion, AnimatePresence } from "framer-motion";

type Trainee = {
  id: string;
  course?: string | null;     
  semester?: string | null;   
  topicInterested: string;
  status: string;
  appliedAt: Date;
  weeklySlotId: string | null;
  user: { name: string; email: string; };
  dynamicData?: string | null;
  highlightedData?: string | null;
  name?: string;
  email?: string;
  formId?: string;
};

type Slot = {
  id: string;
  theme: string | null;
  isPublished: boolean;
  selectedTrainees: Trainee[];
  weekStartDate?: Date;
  weekEndDate?: Date;
};

export default function AdminDashboardClient({ 
  initialSlot, 
  initialApplications,
  initialFormFields
}: { 
  initialSlot: Slot; 
  initialApplications: Trainee[];
  initialFormFields: any[];
}) {
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "WORKFLOW" | "TEAM" | "COMMUNICATION" | "SETTINGS" | "INBOX" | "ATTENDANCE">("OVERVIEW");
  
  // Dynamic in-memory state (eliminates full page reloads)
  const [slot, setSlot] = useState<Slot>(initialSlot);
  const [applications, setApplications] = useState<Trainee[]>(initialApplications);
  const [formFields, setFormFields] = useState<any[]>(initialFormFields);

  // Badge notification states
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [pendingTeamCount, setPendingTeamCount] = useState<number>(0);
  const [isLiveSessionActive, setIsLiveSessionActive] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [loadingReqId, setLoadingReqId] = useState<string>("");
  const [viewingPayload, setViewingPayload] = useState<any | null>(null);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  function notify(text: string, type: "success" | "error" = "success") {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4500);
  }

  // Load badge data on mount
  useEffect(() => {
    loadAllBadges();
  }, []);

  useEffect(() => {
    if (activeTab === "INBOX") {
      loadRequests();
    }
  }, [activeTab]);

  async function loadAllBadges() {
    await Promise.all([
      loadRequests(),
      loadPendingTeam(),
      checkActiveAttendance()
    ]);
  }

  async function loadRequests() {
    try {
      const res = await getPendingRequests();
      if (res.success && res.data) {
        setPendingRequests(res.data);
      }
    } catch {}
  }

  async function loadPendingTeam() {
    try {
      const teamRes = await fetchTeamData();
      if (teamRes.success && teamRes.data) {
        const pending = teamRes.data.filter((u: any) => u.role === "EXECUTIVE" && !u.isApproved).length;
        setPendingTeamCount(pending);
      }
    } catch {}
  }

  async function checkActiveAttendance() {
    try {
      const sessRes = await getLiveAdminSession();
      if (sessRes.success && sessRes.data && sessRes.data.isActive) {
        setIsLiveSessionActive(true);
      } else {
        setIsLiveSessionActive(false);
      }
    } catch {}
  }

  // Smooth background datastream sync without page reload
  async function syncAllData() {
    setIsSyncing(true);
    try {
      const [slotData, appsRes] = await Promise.all([
        getOrCreateCurrentSlot(),
        fetchAllApplications(),
        loadAllBadges()
      ]);

      if (slotData) setSlot(slotData as Slot);
      if (appsRes.success && appsRes.data) {
        const filteredApps = appsRes.data.filter((a: any) => a.weeklySlotId !== undefined && a.status !== "RECORDED");
        setApplications(filteredApps);
      }
      notify("Datastream synced successfully.", "success");
    } catch (e) {
      notify("Failed to sync latest data.", "error");
    } finally {
      setIsSyncing(false);
    }
  }

  // In-memory request approval (No full page reload!)
  async function handleApprove(id: string) {
    setLoadingReqId(id);
    try {
      const res = await approveRequest(id);
      if (res.success) {
        setPendingRequests(prev => prev.filter(req => req.id !== id));
        setViewingPayload(null);
        notify(res.message || "Request approved & changes applied live!", "success");
        // Refetch slot and applications seamlessly
        await syncAllData();
      } else {
        notify(res.error || "Approval execution failed", "error");
      }
    } catch (e) {
      notify("Network error while approving request", "error");
    } finally {
      setLoadingReqId("");
    }
  }

  // In-memory request rejection
  async function handleReject(id: string) {
    setLoadingReqId(id);
    try {
      const res = await rejectRequest(id);
      if (res.success) {
        setPendingRequests(prev => prev.filter(req => req.id !== id));
        setViewingPayload(null);
        notify(res.message || "Request has been rejected.", "success");
      } else {
        notify(res.error || "Failed to reject request", "error");
      }
    } catch {
      notify("Network error while rejecting request", "error");
    } finally {
      setLoadingReqId("");
    }
  }

  // Calculate waiting candidates count for workflow badge
  const waitingApplicantsCount = applications.filter(a => a.status === "WAITING").length;

  return (
    <div className="space-y-6 pb-20 selection:bg-blue-500 selection:text-white">
      
      {/* GLOBAL TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[110] max-w-lg w-[90%] px-4"
          >
            <div className={`p-4 rounded-2xl text-xs font-black shadow-xl border flex items-center justify-between gap-3 backdrop-blur-md ${
              toast.type === "success" 
                ? "bg-emerald-500/95 text-white border-emerald-400 shadow-emerald-500/20" 
                : "bg-red-500/95 text-white border-red-400 shadow-red-500/20"
            }`}>
              <div className="flex items-center gap-2">
                {toast.type === "success" ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                <span>{toast.text}</span>
              </div>
              <button onClick={() => setToast(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* SOFT CLAYMORPHISM MASTER NAVIGATION BAR                  */}
      {/* ======================================================== */}
      <div className="clay-card p-2 sm:p-2.5 flex items-center justify-between gap-2 border border-white/80 shadow-md">
        
        {/* Scrollable Tab Container */}
        <div className="overflow-x-auto no-scrollbar scroll-smooth flex items-center gap-1.5 sm:gap-2 flex-nowrap w-full">
          
          {/* TAB 1: COMMAND CENTER */}
          <button 
            onClick={() => setActiveTab("OVERVIEW")} 
            className={`shrink-0 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs font-black uppercase tracking-wider rounded-2xl transition-all flex items-center gap-2 ${
              activeTab === "OVERVIEW" 
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25 scale-[1.02]" 
                : "text-slate-600 hover:text-purple-600 hover:bg-white/60"
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Command Center</span>
          </button>

          {/* TAB 2: PRESENTER WORKFLOW */}
          <button 
            onClick={() => setActiveTab("WORKFLOW")} 
            className={`shrink-0 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs font-black uppercase tracking-wider rounded-2xl transition-all flex items-center gap-2 ${
              activeTab === "WORKFLOW" 
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]" 
                : "text-slate-600 hover:text-blue-600 hover:bg-white/60"
            }`}
          >
            <Video className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Workflow</span>
            {waitingApplicantsCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === "WORKFLOW" ? "bg-white text-blue-700 shadow-sm" : "bg-blue-100 text-blue-800"
              }`}>
                {waitingApplicantsCount}
              </span>
            )}
          </button>

          {/* TAB 3: TEAM MANAGEMENT (With live pending approval badge) */}
          <button 
            onClick={() => setActiveTab("TEAM")} 
            className={`shrink-0 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs font-black uppercase tracking-wider rounded-2xl transition-all flex items-center gap-2 ${
              activeTab === "TEAM" 
                ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-cyan-500/25 scale-[1.02]" 
                : "text-slate-600 hover:text-blue-600 hover:bg-white/60"
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Team Access</span>
            {pendingTeamCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black animate-pulse ${
                activeTab === "TEAM" ? "bg-amber-400 text-slate-900 shadow-sm" : "bg-amber-100 text-amber-800 border border-amber-300"
              }`}>
                {pendingTeamCount} pending
              </span>
            )}
          </button>

          {/* TAB 4: COMMUNICATION */}
          <button 
            onClick={() => setActiveTab("COMMUNICATION")} 
            className={`shrink-0 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs font-black uppercase tracking-wider rounded-2xl transition-all flex items-center gap-2 ${
              activeTab === "COMMUNICATION" 
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]" 
                : "text-slate-600 hover:text-blue-600 hover:bg-white/60"
            }`}
          >
            <Send className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Broadcast</span>
          </button>

          {/* TAB 5: SYSTEM SETTINGS */}
          <button 
            onClick={() => setActiveTab("SETTINGS")} 
            className={`shrink-0 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs font-black uppercase tracking-wider rounded-2xl transition-all flex items-center gap-2 ${
              activeTab === "SETTINGS" 
                ? "bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-md shadow-slate-800/30 scale-[1.02]" 
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Form & Vault</span>
          </button>

          {/* TAB 6: ATTENDANCE PORTAL QUICK LAUNCHER */}
          <button 
            onClick={() => setActiveTab("ATTENDANCE")} 
            className={`shrink-0 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs font-black uppercase tracking-wider rounded-2xl transition-all flex items-center gap-2 ${
              activeTab === "ATTENDANCE" 
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/25 scale-[1.02]" 
                : "text-slate-600 hover:text-purple-600 hover:bg-white/60"
            }`}
          >
            <ScanLine className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Attendance</span>
            {isLiveSessionActive && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500 text-white animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white"></span> LIVE
              </span>
            )}
          </button>

          {/* TAB 7: INBOX & REVIEW REQUESTS */}
          <button 
            onClick={() => setActiveTab("INBOX")} 
            className={`shrink-0 ml-auto px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs font-black uppercase tracking-wider rounded-2xl transition-all flex items-center gap-2 ${
              activeTab === "INBOX" 
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/25 scale-[1.02]" 
                : "text-slate-600 hover:text-amber-600 hover:bg-white/60"
            }`}
          >
            <Bell className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap hidden sm:inline">Review Inbox</span>
            {pendingRequests.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === "INBOX" ? "bg-white text-amber-700 shadow-sm" : "bg-red-500 text-white animate-bounce"
              }`}>
                {pendingRequests.length}
              </span>
            )}
          </button>

          {/* QUICK SYNC DATA BUTTON */}
          <button
            onClick={syncAllData}
            disabled={isSyncing}
            title="Sync all backend states without reload"
            className="shrink-0 p-2 sm:px-3 sm:py-2 text-xs font-bold text-slate-600 hover:text-blue-600 hover:bg-white/70 rounded-2xl transition-all flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-blue-600" : ""}`} />
            <span className="hidden md:inline text-[11px] font-extrabold">Sync</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB CONTENT PANELS WITH SMOOTH MOUNT TRANSITIONS        */}
      {/* ======================================================== */}
      <div className="w-full">
        {activeTab === "OVERVIEW" && (
          <OverviewTab 
            navigateTo={(tabName) => setActiveTab(tabName as any)}
            slot={slot}
            applications={applications}
            pendingRequestsCount={pendingRequests.length}
            pendingTeamCount={pendingTeamCount}
            isLiveSessionActive={isLiveSessionActive}
          />
        )}

        {activeTab === "ATTENDANCE" && (
          <AttendancePortal onClose={() => setActiveTab("OVERVIEW")} />
        )}

        {activeTab === "WORKFLOW" && (
          <WorkflowTab 
            initialSlot={slot} 
            initialApplications={applications} 
            onNavigateToComm={() => setActiveTab("COMMUNICATION")}
            onRefreshApplications={(newApps: any[]) => setApplications(newApps)}
            onRefreshSlot={(newSlot: any) => setSlot(newSlot)}
          />
        )}

        {activeTab === "TEAM" && (
          <TeamTab 
            onUpdatePendingCount={(count: number) => setPendingTeamCount(count)}
          />
        )}

        {activeTab === "COMMUNICATION" && (
          <CommunicationTab slot={slot} />
        )}

        {activeTab === "SETTINGS" && (
          <SettingsTab />
        )}

        {/* INBOX SUB-PANEL */}
        {activeTab === "INBOX" && (
          <div className="clay-card p-5 sm:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-blue-200/50 gap-3">
              <div>
                <span className="clay-badge-amber text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block mb-1">
                  Governance Pipeline
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-[#0F2547]">Executive Approvals Inbox</h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">Review and execute system changes requested by your core executive team.</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 bg-white/70 px-3 py-1.5 rounded-xl border border-white">
                  Pending: <strong className="text-amber-600">{pendingRequests.length}</strong>
                </span>
                <button
                  onClick={loadRequests}
                  className="clay-btn px-3 py-1.5 text-xs font-bold text-slate-600 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {pendingRequests.length > 0 ? (
                pendingRequests.map(req => (
                  <div key={req.id} className="clay-card p-4 sm:p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center border border-white hover:border-blue-200 transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-black uppercase rounded-lg">
                          {req.actionType.replace(/_/g, " ")}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">
                          {new Date(req.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-[#0F2547] text-sm sm:text-base">
                        Requested by: <span className="text-blue-600">{req.executive.name}</span>
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">{req.executive.email}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                      <button 
                        onClick={() => setViewingPayload(req)} 
                        className="clay-btn px-4 py-2.5 text-xs font-extrabold text-slate-700 flex-1 md:flex-none flex items-center gap-2 justify-center hover:text-blue-600"
                      >
                        <Eye className="w-4 h-4 text-blue-500" /> Compare Changes
                      </button>
                      <button 
                        onClick={() => handleReject(req.id)} 
                        disabled={loadingReqId === req.id} 
                        className="clay-btn px-3.5 py-2.5 text-xs font-extrabold text-red-600 hover:bg-red-50 flex-1 md:flex-none flex items-center gap-1.5 justify-center border-red-200"
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                      <button 
                        onClick={() => handleApprove(req.id)} 
                        disabled={loadingReqId === req.id} 
                        className="clay-btn-primary px-5 py-2.5 text-xs font-black flex-1 md:flex-none flex items-center gap-1.5 justify-center shadow-lg"
                      >
                        <CheckCircle className="w-4 h-4" /> {loadingReqId === req.id ? "Approving..." : "Approve & Execute"}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="clay-inset p-12 rounded-3xl text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-inner flex items-center justify-center text-slate-300 mx-auto">
                    <ShieldCheck className="w-7 h-7 text-emerald-500" />
                  </div>
                  <h4 className="text-base font-extrabold text-[#0F2547]">Inbox Clean & Cleared</h4>
                  <p className="text-xs font-medium text-slate-500 max-w-sm mx-auto">
                    All executive change requests and form configurations have been reviewed. No pending tasks.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SMART PAYLOAD PREVIEW MODAL (DIFF VIEWER)               */}
      {/* ======================================================== */}
      {viewingPayload && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden clay-card border border-white">
            
            {/* Modal Header */}
            <div className="bg-slate-50 p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between z-10">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-[10px] font-black uppercase rounded-lg">
                    {viewingPayload.actionType.replace(/_/g, " ")}
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-[#0F2547]">Changes Diff Viewer</h3>
                </div>
                {(() => {
                  let isMasterPayload = false;
                  try {
                    const parsed = JSON.parse(viewingPayload.payload);
                    isMasterPayload = parsed.isMaster;
                  } catch(e) {}
                  return (
                    <p className="text-xs text-slate-500 mt-2 flex items-center gap-2 font-medium">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${isMasterPayload ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                        Target: {isMasterPayload ? '⭐ MASTER FORM' : '📄 EVENT FORM'}
                      </span>
                      <span>Requested by: <strong className="text-slate-800">{viewingPayload.executive.name}</strong></span>
                    </p>
                  )
                })()}
              </div>
              <button 
                onClick={() => setViewingPayload(null)} 
                className="w-9 h-9 rounded-2xl bg-white border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-colors font-bold shadow-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50 space-y-4">
              {(() => {
                let data = null;
                try { data = JSON.parse(viewingPayload.payload); } 
                catch (e) { return <div className="text-red-500 font-bold text-sm">Failed to parse payload data.</div>; }

                if (viewingPayload.actionType === "UPDATE_FORM") {
                  const liveFields = formFields || [];
                  const proposedFields = data.fields || [];

                  const liveMap = new Map(liveFields.map(f => [f.fieldName, f]));
                  const proposedMap = new Map(proposedFields.map((f: any) => [f.fieldName, f]));

                  // Find Deleted Fields
                  const deletedFields = liveFields.filter(f => !proposedMap.has(f.fieldName));

                  // Find New & Modified Fields
                  const comparedFields = proposedFields.map((prop: any) => {
                    const live = liveMap.get(prop.fieldName);
                    if (!live) return { ...prop, diffStatus: "NEW" };
                    
                    const isModified = 
                      live.fieldLabel !== prop.fieldLabel || 
                      live.fieldType !== prop.fieldType || 
                      live.isRequired !== prop.isRequired || 
                      live.isHighlighted !== prop.isHighlighted;
                    
                    return { ...prop, diffStatus: isModified ? "MODIFIED" : "UNCHANGED", oldLive: live };
                  });

                  return (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 text-xs font-black text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-200">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Added</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Modified</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Deleted</span>
                      </div>

                      {comparedFields.map((field: any, idx: number) => (
                        <div key={idx} className={`p-4 rounded-2xl border flex items-start gap-4 shadow-sm transition-all
                          ${field.diffStatus === "NEW" ? "bg-emerald-50/70 border-emerald-300" : 
                            field.diffStatus === "MODIFIED" ? "bg-amber-50/50 border-amber-300" : "bg-white border-slate-200"}`}>
                          
                          <div className={`p-2.5 rounded-xl ${field.diffStatus === "NEW" ? "bg-emerald-100 text-emerald-800" : field.diffStatus === "MODIFIED" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>
                            {field.fieldType === "TEXT" && <Type className="w-5 h-5" />}
                            {field.fieldType === "DROPDOWN" && <List className="w-5 h-5" />}
                            {field.fieldType === "CHECKBOX" && <CheckSquare className="w-5 h-5" />}
                            {field.fieldType === "FILE_UPLOAD" && <Upload className="w-5 h-5" />}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h5 className="font-extrabold text-[#0F2547] text-sm">{field.fieldLabel}</h5>
                              {field.diffStatus === "NEW" && <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase">New Field</span>}
                              {field.diffStatus === "MODIFIED" && <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-800 uppercase">Modified</span>}
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">Type: {field.fieldType}</span>
                              {field.isRequired && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">Required</span>}
                              {field.isHighlighted && <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">📌 Pinned to Vault</span>}
                            </div>

                            {field.diffStatus === "MODIFIED" && field.oldLive && (
                              <div className="mt-3 p-2.5 bg-white/80 border border-amber-200 rounded-xl text-xs flex flex-col gap-1">
                                <span className="text-slate-400 font-black uppercase text-[9px] tracking-wider">Previous State:</span>
                                <span className="text-slate-600 line-through">{field.oldLive.fieldLabel} ({field.oldLive.fieldType})</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {deletedFields.map((field: any, idx: number) => (
                        <div key={`del-${idx}`} className="p-4 rounded-2xl border border-red-200 bg-red-50/60 flex items-start gap-4">
                          <div className="p-2.5 rounded-xl bg-red-100 text-red-600">
                            <XCircle className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h5 className="font-extrabold text-slate-800 text-sm line-through">{field.fieldLabel}</h5>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-red-100 text-red-700 uppercase">Will be Deleted</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">This question field and its configuration will be removed.</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Raw Action Payload:</h4>
                    <pre className="bg-slate-900 text-emerald-400 p-4 rounded-2xl shadow-inner text-xs font-mono overflow-x-auto leading-relaxed">
                      {JSON.stringify(data, null, 2)}
                    </pre>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="bg-white p-4 sm:p-5 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 z-10">
              <button 
                onClick={() => setViewingPayload(null)} 
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-extrabold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors text-center"
              >
                Close Preview
              </button>
              <button 
                onClick={() => handleReject(viewingPayload.id)} 
                disabled={loadingReqId === viewingPayload.id} 
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" /> Reject Request
              </button>
              <button 
                onClick={() => handleApprove(viewingPayload.id)} 
                disabled={loadingReqId === viewingPayload.id} 
                className="clay-btn-primary w-full sm:w-auto px-6 py-2.5 text-xs flex items-center justify-center gap-2 shadow-lg"
              >
                <CheckCircle className="w-4 h-4" /> {loadingReqId === viewingPayload.id ? "Applying..." : "Approve & Apply Live"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
