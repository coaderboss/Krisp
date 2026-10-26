"use client";

import { useState, useEffect } from "react";
import { Users, Shield, UserCheck, Clock, UserMinus, UserX, Database, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { fetchTeamData, changeUserAccess } from "@/actions/team";
import { toggleUserBlacklist, deleteUser } from "@/actions/admin";

type UserData = {
  isBlacklisted?: boolean;
  id: string;
  name: string;
  email: string;
  role: string;
  isApproved: boolean;
  createdAt: Date;
};

export default function TeamTab() {
  const [subTab, setSubTab] = useState<"ACTIVE" | "PENDING" | "ALL">("ACTIVE");
  const [loading, setLoading] = useState<string>("init");
  const [users, setUsers] = useState<UserData[]>([]);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  function notify(text: string, type: "success" | "error" = "success") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  }

  // --- FETCH ALL DATA ON LOAD ---
  useEffect(() => {
    async function loadUsers() {
      const res = await fetchTeamData();
      if (res.success && res.data) {
        setUsers(res.data);
      } else if (res.error) {
        notify(res.error, "error");
      }
      setLoading("");
    }
    loadUsers();
  }, []);

  // --- ACTIONS ---
  async function handleAccessChange(userId: string, role: "STUDENT" | "EXECUTIVE" | "CLUB_ADMIN", isApproved: boolean) {
    setLoading(userId);
    const res = await changeUserAccess(userId, role, isApproved);
    
    if (res.success) {
      // Update local state to reflect changes instantly without reloading page
      setUsers(users.map(u => u.id === userId ? { ...u, role, isApproved } : u));
      notify(res.message || "Access updated!");
    } else {
      notify(res.error || "Action failed.", "error");
    }
    setLoading("");
  }

  async function handleBlacklist(userId: string, currentStatus: boolean) {
    setLoading(userId);
    const res = await toggleUserBlacklist(userId, !currentStatus);
    if (res.success) {
      setUsers(users.map(u => u.id === userId ? { ...u, isBlacklisted: !currentStatus } : u));
      notify(res.message || "Status updated!");
    } else notify(res.error || "Action failed", "error");
    setLoading("");
  }

  async function handleDelete(userId: string) {
    if (!confirm("Are you sure you want to permanently delete this user? This destroys all associated data.")) return;
    setLoading(userId);
    const res = await deleteUser(userId);
    if (res.success) {
      setUsers(users.filter(u => u.id !== userId));
      notify("User deleted permanently.");
    } else notify(res.error || "Failed to delete user.", "error");
    setLoading("");
  }

  // Categorize Data for UI
  const activeTeam = users.filter(u => (u.role === "EXECUTIVE" && u.isApproved) || u.role === "CLUB_ADMIN");
  const pendingApprovals = users.filter(u => u.role === "EXECUTIVE" && !u.isApproved);
  const allSystemUsers = users;

  if (loading === "init") {
    return <div className="p-8 text-center text-slate-500 font-bold">Loading Team Database...</div>;
  }

  return (
    <section className="clay-card p-4 sm:p-6 md:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Toast Notification */}
      {message && (
        <div className={`p-4 rounded-2xl text-xs sm:text-sm font-bold text-center border shadow-md transition-all ${
          message.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"
        }`}>
          {message.text}
        </div>
      )}

      {/* Header & Sub-Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 mb-6 gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#0F2547]">Access &amp; Identity Control</h2>
          <p className="text-xs text-slate-500 mt-1">Manage core team members, approvals, and view system registry.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar shrink-0">
          <button 
            onClick={() => setSubTab("ACTIVE")} 
            className={`flex-1 md:flex-none px-3.5 sm:px-4 py-2 text-[11px] uppercase tracking-wider font-bold rounded-lg transition-all text-center whitespace-nowrap shrink-0 ${subTab === "ACTIVE" ? "bg-white shadow text-blue-700" : "text-slate-500"}`}
          >
            Active Team
          </button>
          <button 
            onClick={() => setSubTab("PENDING")} 
            className={`flex-1 md:flex-none px-3.5 sm:px-4 py-2 text-[11px] uppercase tracking-wider font-bold rounded-lg transition-all flex items-center justify-center gap-1 whitespace-nowrap shrink-0 ${subTab === "PENDING" ? "bg-white shadow text-blue-700" : "text-slate-500"}`}
          >
            Approvals {pendingApprovals.length > 0 && <span className="bg-amber-500 text-white px-1.5 py-0.5 rounded-md text-[9px]">{pendingApprovals.length}</span>}
          </button>
          <button 
            onClick={() => setSubTab("ALL")} 
            className={`flex-1 md:flex-none px-3.5 sm:px-4 py-2 text-[11px] uppercase tracking-wider font-bold rounded-lg transition-all text-center whitespace-nowrap shrink-0 ${subTab === "ALL" ? "bg-white shadow text-blue-700" : "text-slate-500"}`}
          >
            System DB
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: ACTIVE TEAM */}
      {subTab === "ACTIVE" && (
        <div className="space-y-4 animate-in fade-in">
          {activeTeam.map(user => (
            <div key={user.id} className="clay-inset p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border border-slate-100">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-inner shrink-0 ${user.role === 'CLUB_ADMIN' ? 'bg-blue-600 text-white' : 'bg-purple-100 text-purple-600'}`}>
                  {user.role === 'CLUB_ADMIN' ? <Shield className="w-5 h-5 sm:w-6 sm:h-6" /> : <Users className="w-5 h-5 sm:w-6 sm:h-6" />}
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-[#0F2547] flex items-center gap-2">
                    {user.name}
                    {user.role === 'CLUB_ADMIN' && <span className="bg-blue-100 text-blue-700 text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">Supreme</span>}
                  </h4>
                  <p className="text-xs text-slate-500 break-all sm:break-normal">{user.email}</p>
                </div>
              </div>
              
              {/* Cannot demote the Supreme Admin (You) */}
              {user.role !== 'CLUB_ADMIN' && (
                <button 
                  onClick={() => handleAccessChange(user.id, "STUDENT", true)} 
                  disabled={loading === user.id}
                  className="clay-btn w-full sm:w-auto px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center justify-center gap-1.5"
                >
                  <UserMinus className="w-4 h-4" /> Revoke Access
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* SUB-TAB 2: PENDING APPROVALS */}
      {subTab === "PENDING" && (
        <div className="space-y-4 animate-in fade-in">
          {pendingApprovals.length > 0 ? (
            pendingApprovals.map(user => (
              <div key={user.id} className="clay-inset p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border border-amber-100 bg-amber-50/30">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-inner shrink-0">
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-[#0F2547]">{user.name}</h4>
                    <p className="text-xs text-slate-500 break-all sm:break-normal">{user.email}</p>
                    <p className="text-[10px] font-bold text-amber-600 mt-0.5 uppercase tracking-wider">Requested Executive Rights</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => handleAccessChange(user.id, "EXECUTIVE", true)} 
                    disabled={loading === user.id}
                    className="clay-btn-primary flex-1 sm:flex-none px-4 py-2 text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" /> Approve
                  </button>
                  <button 
                    onClick={() => {
                      if(confirm("Reject this executive request? They will become a standard student.")) {
                        handleAccessChange(user.id, "STUDENT", true);
                      }
                    }} 
                    disabled={loading === user.id}
                    className="clay-btn flex-1 sm:flex-none px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">No Pending Requests</h3>
              <p className="text-xs text-slate-500 mt-1">All executive applications have been processed.</p>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: ALL USERS REGISTRY */}
      {subTab === "ALL" && (
        <div className="space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between px-2 mb-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-4 h-4" /> System Registry ({allSystemUsers.length} Users)
            </h3>
          </div>
          
          <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1 sm:pr-2 custom-scrollbar">
            {allSystemUsers.map(user => (
              <div key={user.id} className="bg-slate-50 border border-slate-200 p-3 sm:p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 hover:bg-slate-100 transition-colors">
                <div>
                  <h4 className="font-bold text-sm text-[#0F2547]">{user.name}</h4>
                  <p className="text-xs text-slate-500 break-all sm:break-normal">{user.email}</p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                  <span className="text-[10px] text-slate-400 font-medium">
                    Joined: {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                    user.isBlacklisted ? 'bg-red-100 text-red-700 border border-red-200 shadow-sm animate-pulse' :
                    user.role === 'CLUB_ADMIN' ? 'bg-blue-100 text-blue-700' :
                    user.role === 'EXECUTIVE' ? 'bg-purple-100 text-purple-700' :
                    'bg-slate-200 text-slate-600'
                  }`}>
                    {user.isBlacklisted ? 'BLOCKED' : user.role}
                  </span>
                </div>

                {/* Admin Danger Controls */}
                <div className="flex items-center gap-2 pt-2 mt-2 border-t border-slate-200/60 sm:border-none sm:pt-0 sm:mt-0 w-full sm:w-auto justify-end">
                   {user.role !== 'CLUB_ADMIN' && (
                     <>
                       <button onClick={() => handleBlacklist(user.id, user.isBlacklisted || false)} disabled={loading === user.id} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${user.isBlacklisted ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'}`}>
                         {user.isBlacklisted ? 'Restore Access' : 'Blacklist'}
                       </button>
                       <button onClick={() => handleDelete(user.id)} disabled={loading === user.id} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Delete User Completely">
                         <Trash2 className="w-3.5 h-3.5" />
                       </button>
                     </>
                   )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </section>
  );
}