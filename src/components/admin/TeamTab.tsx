"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Shield, 
  UserCheck, 
  Clock, 
  UserMinus, 
  UserX, 
  Database, 
  CheckCircle, 
  XCircle, 
  Trash2,
  Search,
  Sparkles,
  ShieldAlert,
  ArrowRight
} from "lucide-react";
import { fetchTeamData, changeUserAccess } from "@/actions/team";
import { toggleUserBlacklist, deleteUser } from "@/actions/admin";
import { motion, AnimatePresence } from "framer-motion";

type UserData = {
  isBlacklisted?: boolean;
  id: string;
  name: string;
  email: string;
  role: string;
  isApproved: boolean;
  createdAt: Date;
  accountStatus?: string;
};

export default function TeamTab({ onUpdatePendingCount }: { onUpdatePendingCount?: (count: number) => void }) {
  const [subTab, setSubTab] = useState<"ACTIVE" | "PENDING" | "ALL">("ACTIVE");
  const [loading, setLoading] = useState<string>("init");
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  function notify(text: string, type: "success" | "error" = "success") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4500);
  }

  // --- FETCH ALL DATA ON LOAD ---
  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading("init");
    try {
      const res = await fetchTeamData();
      if (res.success && res.data) {
        setUsers(res.data);
        const pending = res.data.filter((u: any) => u.role === "EXECUTIVE" && !u.isApproved).length;
        if (onUpdatePendingCount) onUpdatePendingCount(pending);
      } else if (res.error) {
        notify(res.error, "error");
      }
    } catch {
      notify("Failed to fetch user database.", "error");
    } finally {
      setLoading("");
    }
  }

  // --- ACTIONS ---
  async function handleAccessChange(userId: string, role: "STUDENT" | "EXECUTIVE" | "CLUB_ADMIN", isApproved: boolean) {
    setLoading(userId);
    try {
      const res = await changeUserAccess(userId, role, isApproved);
      if (res.success) {
        const updatedUsers = users.map(u => u.id === userId ? { ...u, role, isApproved } : u);
        setUsers(updatedUsers);
        const pending = updatedUsers.filter(u => u.role === "EXECUTIVE" && !u.isApproved).length;
        if (onUpdatePendingCount) onUpdatePendingCount(pending);
        notify(res.message || "User authorization updated successfully!");
      } else {
        notify(res.error || "Action failed.", "error");
      }
    } catch {
      notify("Network error while updating access", "error");
    } finally {
      setLoading("");
    }
  }

  async function handleBlacklist(userId: string, currentStatus: boolean) {
    setLoading(userId);
    try {
      const res = await toggleUserBlacklist(userId, !currentStatus);
      if (res.success) {
        setUsers(users.map(u => u.id === userId ? { ...u, isBlacklisted: !currentStatus } : u));
        notify(res.message || "User account access status updated!");
      } else {
        notify(res.error || "Action failed", "error");
      }
    } catch {
      notify("Network error while updating blacklist status", "error");
    } finally {
      setLoading("");
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm("Are you sure you want to permanently delete this user? All their submissions and records will be deleted.")) return;
    setLoading(userId);
    try {
      const res = await deleteUser(userId);
      if (res.success) {
        const updatedUsers = users.filter(u => u.id !== userId);
        setUsers(updatedUsers);
        const pending = updatedUsers.filter(u => u.role === "EXECUTIVE" && !u.isApproved).length;
        if (onUpdatePendingCount) onUpdatePendingCount(pending);
        notify("User permanently deleted from system registry.");
      } else {
        notify(res.error || "Failed to delete user.", "error");
      }
    } catch {
      notify("Network error while deleting user", "error");
    } finally {
      setLoading("");
    }
  }

  // Categorize Data for UI
  const activeTeam = users.filter(u => (u.role === "EXECUTIVE" && u.isApproved) || u.role === "CLUB_ADMIN");
  const pendingApprovals = users.filter(u => u.role === "EXECUTIVE" && !u.isApproved);
  const filteredAllUsers = users.filter(u => {
    const s = searchTerm.toLowerCase();
    return u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || u.role.toLowerCase().includes(s);
  });

  if (loading === "init") {
    return (
      <div className="clay-card p-12 text-center flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 animate-spin shadow-inner">
          <Users className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-black text-[#0F2547] uppercase tracking-wider">Loading Access &amp; Identity Registry</h4>
        <p className="text-xs text-slate-500 font-medium">Fetching active team, pending executive applicants and student directory...</p>
      </div>
    );
  }

  return (
    <section className="clay-card p-5 sm:p-7 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 border border-white shadow-md">
      
      {/* Toast Notification */}
      {message && (
        <div className={`p-4 rounded-2xl text-xs sm:text-sm font-bold text-center border shadow-md transition-all ${
          message.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"
        }`}>
          {message.text}
        </div>
      )}

      {/* Header & Sub-Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-blue-200/50 pb-4 gap-4">
        <div>
          <span className="clay-badge-blue px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-1.5 inline-block">
            Identity &amp; Governance
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0F2547]">Team &amp; Access Control</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Manage executive permissions, review pending core-team promotions, and inspect the registry.</p>
        </div>
        
        {/* Sub-tab pills */}
        <div className="flex bg-white/70 p-1.5 rounded-2xl border border-white shadow-inner w-full md:w-auto overflow-x-auto no-scrollbar shrink-0 gap-1">
          <button 
            onClick={() => setSubTab("ACTIVE")} 
            className={`flex-1 md:flex-none px-4 py-2 text-xs uppercase tracking-wider font-black rounded-xl transition-all text-center whitespace-nowrap shrink-0 ${
              subTab === "ACTIVE" 
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25" 
                : "text-slate-600 hover:text-blue-600 hover:bg-white"
            }`}
          >
            Active Team ({activeTeam.length})
          </button>
          
          <button 
            onClick={() => setSubTab("PENDING")} 
            className={`flex-1 md:flex-none px-4 py-2 text-xs uppercase tracking-wider font-black rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
              subTab === "PENDING" 
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/25" 
                : "text-slate-600 hover:text-amber-600 hover:bg-white"
            }`}
          >
            <span>Approvals</span>
            {pendingApprovals.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                subTab === "PENDING" ? "bg-white text-amber-800" : "bg-amber-500 text-white animate-pulse"
              }`}>
                {pendingApprovals.length}
              </span>
            )}
          </button>

          <button 
            onClick={() => setSubTab("ALL")} 
            className={`flex-1 md:flex-none px-4 py-2 text-xs uppercase tracking-wider font-black rounded-xl transition-all text-center whitespace-nowrap shrink-0 ${
              subTab === "ALL" 
                ? "bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-md shadow-slate-800/30" 
                : "text-slate-600 hover:text-slate-900 hover:bg-white"
            }`}
          >
            System Directory ({users.length})
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SUB-TAB 1: ACTIVE CORE TEAM                              */}
      {/* ======================================================== */}
      {subTab === "ACTIVE" && (
        <div className="space-y-3.5 animate-in fade-in">
          {activeTeam.map(user => (
            <div 
              key={user.id} 
              className="clay-pill p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border border-white hover:-translate-y-0.5 transition-all shadow-sm"
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shadow-inner shrink-0 ${
                  user.role === 'CLUB_ADMIN' 
                    ? 'clay-navy text-amber-400' 
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {user.role === 'CLUB_ADMIN' ? <Shield className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-black text-sm sm:text-base text-[#0F2547]">{user.name}</h4>
                    {user.role === 'CLUB_ADMIN' ? (
                      <span className="clay-badge-amber text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Supreme Admin
                      </span>
                    ) : (
                      <span className="bg-purple-100 text-purple-700 border border-purple-200 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Executive Member
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium break-all sm:break-normal">{user.email}</p>
                </div>
              </div>
              
              {/* Cannot demote the Supreme Admin (You) */}
              {user.role !== 'CLUB_ADMIN' && (
                <button 
                  onClick={() => handleAccessChange(user.id, "STUDENT", true)} 
                  disabled={loading === user.id}
                  className="clay-btn w-full sm:w-auto px-4 py-2 text-xs font-black text-red-600 hover:bg-red-50 flex items-center justify-center gap-1.5 border-red-100"
                >
                  <UserMinus className="w-4 h-4" /> 
                  <span>{loading === user.id ? "Updating..." : "Revoke to Student"}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 2: PENDING EXECUTIVE APPROVALS                   */}
      {/* ======================================================== */}
      {subTab === "PENDING" && (
        <div className="space-y-4 animate-in fade-in">
          {pendingApprovals.length > 0 ? (
            pendingApprovals.map(user => (
              <div 
                key={user.id} 
                className="clay-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border border-amber-200 bg-amber-50/20 shadow-md"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-inner shrink-0">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm sm:text-base text-[#0F2547]">{user.name}</h4>
                    <p className="text-xs text-slate-500 font-medium break-all sm:break-normal">{user.email}</p>
                    <span className="inline-block text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md mt-1 uppercase tracking-wider">
                      Executive Promotion Requested
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => handleAccessChange(user.id, "EXECUTIVE", true)} 
                    disabled={loading === user.id}
                    className="clay-btn-primary flex-1 sm:flex-none px-4 py-2.5 text-xs font-black flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>{loading === user.id ? "Processing..." : "Approve Executive"}</span>
                  </button>
                  <button 
                    onClick={() => {
                      if(confirm("Reject this executive promotion? The user will remain a verified student.")) {
                        handleAccessChange(user.id, "STUDENT", true);
                      }
                    }} 
                    disabled={loading === user.id}
                    className="clay-btn flex-1 sm:flex-none px-4 py-2.5 text-xs font-black text-red-600 hover:bg-red-50 flex items-center justify-center gap-1.5 border-red-100"
                  >
                    <XCircle className="w-4 h-4" /> 
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="clay-inset p-12 rounded-3xl text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-white shadow-inner flex items-center justify-center text-slate-300 mx-auto">
                <UserCheck className="w-7 h-7 text-emerald-500" />
              </div>
              <h4 className="text-base font-black text-[#0F2547]">No Pending Executive Requests</h4>
              <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
                All executive registration requests have been cleared and assigned proper credentials.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 3: ALL USERS DIRECTORY                          */}
      {/* ======================================================== */}
      {subTab === "ALL" && (
        <div className="space-y-4 animate-in fade-in">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-4 h-4 text-blue-500" /> System Registry ({filteredAllUsers.length} of {users.length} Users)
            </h3>
            
            {/* Search Input */}
            <div className="relative w-full sm:w-64 min-w-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search registry by name, email..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="clay-input w-full pl-9 pr-4 py-2 text-xs font-bold"
              />
            </div>
          </div>
          
          <div className="max-h-[550px] overflow-y-auto space-y-2.5 pr-1 no-scrollbar">
            {filteredAllUsers.map(user => (
              <div 
                key={user.id} 
                className="clay-pill p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:-translate-y-0.5 transition-all shadow-sm"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-black text-sm text-[#0F2547] truncate">{user.name}</h4>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      user.isBlacklisted 
                        ? 'bg-red-100 text-red-700 border border-red-300 animate-pulse' 
                        : user.role === 'CLUB_ADMIN' ? 'clay-badge-amber' 
                        : user.role === 'EXECUTIVE' ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {user.isBlacklisted ? 'BLOCKED' : user.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium truncate">{user.email}</p>
                  <p className="text-[10px] text-slate-400 font-bold">
                    Joined: {new Date(user.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>

                {/* Admin Danger Controls */}
                <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-none border-blue-100 justify-start md:justify-end shrink-0">
                  {user.role !== 'CLUB_ADMIN' && (
                    <>
                      <button 
                        onClick={() => handleBlacklist(user.id, user.isBlacklisted || false)} 
                        disabled={loading === user.id} 
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                          user.isBlacklisted 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                            : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        {user.isBlacklisted ? 'Restore Access' : 'Suspend / Blacklist'}
                      </button>

                      <button 
                        onClick={() => handleDelete(user.id)} 
                        disabled={loading === user.id} 
                        className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 transition-colors" 
                        title="Delete User Completely"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {filteredAllUsers.length === 0 && (
              <div className="clay-soft-blue p-8 text-center rounded-2xl text-xs font-bold text-slate-500">
                No user records match your search filter.
              </div>
            )}
          </div>
        </div>
      )}

    </section>
  );
}
