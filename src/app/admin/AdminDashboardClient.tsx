"use client";

import { useState, useEffect } from "react";
import { LayoutDashboard, Video, Users, Send, Settings as SettingsIcon, Bell, CheckCircle, XCircle, Eye, Type, List, CheckSquare, Upload, ArrowRight } from "lucide-react";
import OverviewTab from "@/components/admin/OverviewTab";
import WorkflowTab from "@/components/admin/WorkflowTab";
import TeamTab from "@/components/admin/TeamTab";
import CommunicationTab from "@/components/admin/CommunicationTab";
import SettingsTab from "@/components/admin/SettingsTab";
import { getPendingRequests, approveRequest, rejectRequest } from "@/actions/requests";

type Trainee = {
  id: string;
  course?: string | null;     
  semester?: string | null;   
  topicInterested: string;
  status: string;
  appliedAt: Date;
  weeklySlotId: string | null;
  user: { name: string; email: string; };
};

type Slot = {
  id: string;
  theme: string | null;
  isPublished: boolean;
  selectedTrainees: Trainee[];
};

import AttendancePortal from "@/components/admin/AttendancePortal"; // 🟢 ADDED IMPORT

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
  
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loadingReqId, setLoadingReqId] = useState<string>("");
  const [viewingPayload, setViewingPayload] = useState<any | null>(null);

  // Mount hote hi notification count fetch karo
  useEffect(() => {
    loadRequests(); 
  }, []);

  useEffect(() => {
    if (activeTab === "INBOX") {
      loadRequests();
    }
  }, [activeTab]);

  async function loadRequests() {
    const res = await getPendingRequests();
    if (res.success && res.data) {
      setPendingRequests(res.data);
    }
  }

  async function handleApprove(id: string) {
    setLoadingReqId(id);
    const res = await approveRequest(id);
    if (res.success) {
      setPendingRequests(prev => prev.filter(req => req.id !== id));
      setViewingPayload(null);
      alert(res.message);
      window.location.reload(); // UI ko fresh DB data ke saath sync karein
    } else {
      alert(res.error);
    }
    setLoadingReqId("");
  }

  async function handleReject(id: string) {
    if (!confirm("Are you sure you want to reject this request?")) return;
    setLoadingReqId(id);
    const res = await rejectRequest(id);
    if (res.success) {
      setPendingRequests(prev => prev.filter(req => req.id !== id));
      setViewingPayload(null);
    }
    setLoadingReqId("");
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Supreme Admin Navigation Tabs */}
      <div className="overflow-x-auto no-scrollbar scroll-smooth flex items-center gap-2 border-b border-slate-200 pb-2 flex-nowrap w-full">
        <button onClick={() => setActiveTab("OVERVIEW")} className={`shrink-0 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all ${activeTab === "OVERVIEW" ? "bg-purple-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"}`}>
          <div className="flex items-center gap-1.5 sm:gap-2"><LayoutDashboard className="w-4 h-4" /> Command Center</div>
        </button>
        <button onClick={() => setActiveTab("WORKFLOW")} className={`shrink-0 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all ${activeTab === "WORKFLOW" ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"}`}>
          <div className="flex items-center gap-1.5 sm:gap-2"><Video className="w-4 h-4" /> Presenter Workflow</div>
        </button>
        <button onClick={() => setActiveTab("TEAM")} className={`shrink-0 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all ${activeTab === "TEAM" ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"}`}>
          <div className="flex items-center gap-1.5 sm:gap-2"><Users className="w-4 h-4" /> Team Management</div>
        </button>
        <button onClick={() => setActiveTab("COMMUNICATION")} className={`shrink-0 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all ${activeTab === "COMMUNICATION" ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"}`}>
          <div className="flex items-center gap-1.5 sm:gap-2"><Send className="w-4 h-4" /> Communication</div>
        </button>
        <button onClick={() => setActiveTab("SETTINGS")} className={`shrink-0 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all ${activeTab === "SETTINGS" ? "bg-slate-800 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"}`}>
          <div className="flex items-center gap-1.5 sm:gap-2"><SettingsIcon className="w-4 h-4" /> System Settings</div>
        </button>
        
        <button onClick={() => setActiveTab("INBOX")} className={`shrink-0 ml-auto px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all ${activeTab === "INBOX" ? "bg-amber-500 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"}`}>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Bell className="w-4 h-4" /> 
            Inbox {pendingRequests.length > 0 && <span className="bg-red-500 text-white px-1.5 rounded-full text-[10px]">{pendingRequests.length}</span>}
          </div>
        </button>
      </div>

      {activeTab === "OVERVIEW" && <OverviewTab navigateTo={setActiveTab} />}
      {activeTab === "ATTENDANCE" && <AttendancePortal onClose={() => setActiveTab("OVERVIEW")} />}
      {/* 🟢 FIX: Passing pre-filtered applications strictly meant for Workflow */}
      {activeTab === "WORKFLOW" && <WorkflowTab initialSlot={initialSlot} initialApplications={initialApplications} onNavigateToComm={() => setActiveTab("COMMUNICATION")} />}
      {activeTab === "TEAM" && <TeamTab />}
      {activeTab === "COMMUNICATION" && <CommunicationTab slot={initialSlot} />}
      {activeTab === "SETTINGS" && <SettingsTab />}

      {activeTab === "INBOX" && (
        <div className="clay-card p-4 sm:p-6 md:p-8 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-lg sm:text-xl font-extrabold text-[#0F2547]">Executive Approvals Inbox</h2>
            <p className="text-xs text-slate-500 mt-1">Review and execute system changes requested by your core team.</p>
          </div>

          <div className="space-y-4">
            {pendingRequests.length > 0 ? pendingRequests.map(req => (
              <div key={req.id} className="clay-inset p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div>
                  <span className="px-2 py-1 bg-amber-100 text-amber-800 text-[10px] font-black uppercase rounded-lg">
                    {req.actionType.replace(/_/g, " ")}
                  </span>
                  <h4 className="font-extrabold text-slate-800 mt-2 text-sm">Requested by: {req.executive.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">Submitted on {new Date(req.createdAt).toLocaleString()}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <button onClick={() => setViewingPayload(req)} className="clay-btn px-4 py-2 text-xs font-bold w-full md:w-auto flex items-center gap-2 justify-center">
                    <Eye className="w-4 h-4" /> Compare Changes
                  </button>
                  <button onClick={() => handleApprove(req.id)} disabled={loadingReqId === req.id} className="clay-btn-primary px-4 py-2 text-xs flex items-center gap-1.5 w-full md:w-auto justify-center">
                    <CheckCircle className="w-4 h-4" /> Approve
                  </button>
                </div>
              </div>
            )) : (
              <div className="text-center py-10">
                <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-500">No pending requests at the moment.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* SMART PAYLOAD PREVIEW MODAL (DIFF VIEWER)  */}
      {/* ========================================== */}
      {viewingPayload && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden clay-card border border-slate-200">
            
            <div className="bg-slate-50 p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-[10px] font-black uppercase rounded-lg">
                    {viewingPayload.actionType.replace(/_/g, " ")}
                  </span>
                  <h3 className="text-base sm:text-lg font-extrabold text-[#0F2547]">Changes Diff Viewer</h3>
                </div>
                {/* 🟢 FIX: Added strict visual indicator distinguishing Master vs Event Form */}
                {(() => {
                  let isMasterPayload = false;
                  try {
                    const parsed = JSON.parse(viewingPayload.payload);
                    isMasterPayload = parsed.isMaster;
                  } catch(e) {}
                  return (
                    <p className="text-xs text-slate-500 mt-2 flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${isMasterPayload ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                        Target: {isMasterPayload ? '⭐ MASTER FORM' : '📄 EVENT FORM'}
                      </span>
                      Requested by: <strong>{viewingPayload.executive.name}</strong>
                    </p>
                  )
                })()}
              </div>
              <button onClick={() => setViewingPayload(null)} className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-colors font-bold shadow-sm">✕</button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50">
              {(() => {
                let data = null;
                try { data = JSON.parse(viewingPayload.payload); } 
                catch (e) { return <div className="text-red-500 font-bold text-sm">Failed to parse payload data.</div>; }

                if (viewingPayload.actionType === "UPDATE_FORM") {
                  const liveFields = initialFormFields || [];
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
                    <div className="space-y-6">
                      <div className="flex items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-200 pb-2">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Added</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Modified</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Deleted</span>
                      </div>

                      {comparedFields.map((field: any, idx: number) => (
                        <div key={idx} className={`p-4 rounded-xl border flex items-start gap-4 shadow-sm transition-all
                          ${field.diffStatus === "NEW" ? "bg-emerald-50/50 border-emerald-200" : 
                            field.diffStatus === "MODIFIED" ? "bg-amber-50/30 border-amber-200" : "bg-white border-slate-200 opacity-70"}`}>
                          
                          <div className={`p-2 rounded-lg ${field.diffStatus === "NEW" ? "bg-emerald-100" : field.diffStatus === "MODIFIED" ? "bg-amber-100" : "bg-slate-100"}`}>
                            {field.fieldType === "TEXT" && <Type className="w-5 h-5 text-slate-700" />}
                            {field.fieldType === "DROPDOWN" && <List className="w-5 h-5 text-slate-700" />}
                            {field.fieldType === "CHECKBOX" && <CheckSquare className="w-5 h-5 text-slate-700" />}
                            {field.fieldType === "FILE_UPLOAD" && <Upload className="w-5 h-5 text-slate-700" />}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h5 className="font-bold text-slate-800 text-sm">{field.fieldLabel}</h5>
                              {field.diffStatus === "NEW" && <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-700 uppercase">🟢 New Field</span>}
                              {field.diffStatus === "MODIFIED" && <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-700 uppercase">🟡 Modified</span>}
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">Type: {field.fieldType}</span>
                              {field.isRequired && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">Required</span>}
                              {field.isHighlighted && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">📌 Pinned</span>}
                            </div>

                            {field.diffStatus === "MODIFIED" && field.oldLive && (
                              <div className="mt-3 p-2 bg-white/60 border border-amber-200 rounded-lg text-xs flex flex-col gap-1">
                                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Previous State:</span>
                                <span className="text-slate-600 strike line-through">{field.oldLive.fieldLabel} ({field.oldLive.fieldType})</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {deletedFields.map((field: any, idx: number) => (
                        <div key={`del-${idx}`} className="p-4 rounded-xl border border-red-200 bg-red-50/50 flex items-start gap-4 opacity-70">
                          <div className="p-2 rounded-lg bg-red-100">
                            <XCircle className="w-5 h-5 text-red-500" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h5 className="font-bold text-slate-800 text-sm line-through">{field.fieldLabel}</h5>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-red-100 text-red-700 uppercase">🔴 Will be Deleted</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">This field and its data structure will be removed.</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-slate-700">Raw Configuration Data:</h4>
                    <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl shadow-inner text-xs overflow-x-auto">
                      {JSON.stringify(data, null, 2)}
                    </pre>
                  </div>
                );
              })()}
            </div>

            <div className="bg-white p-4 sm:p-5 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 z-10">
              <button onClick={() => setViewingPayload(null)} className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors text-center">
                Cancel
              </button>
              <button onClick={() => handleReject(viewingPayload.id)} disabled={loadingReqId === viewingPayload.id} className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors flex items-center justify-center gap-2">
                <XCircle className="w-4 h-4" /> Reject Request
              </button>
              <button onClick={() => handleApprove(viewingPayload.id)} disabled={loadingReqId === viewingPayload.id} className="clay-btn-primary w-full sm:w-auto px-6 py-2.5 text-xs flex items-center justify-center gap-2 shadow-lg">
                <CheckCircle className="w-4 h-4" /> {loadingReqId === viewingPayload.id ? "Approving..." : "Approve & Apply Live"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}